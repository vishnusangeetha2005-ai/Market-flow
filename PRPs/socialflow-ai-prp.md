# PRP: SocialFlow AI

> Implementation blueprint for parallel agent execution

---

## METADATA

| Field | Value |
|-------|-------|
| **Product** | SocialFlow AI |
| **Type** | SaaS |
| **Version** | 1.0 |
| **Created** | 2026-02-25 |
| **Complexity** | High |

---

## PRODUCT OVERVIEW

**Description:** AI-powered social media automation tool for digital marketers. Users connect Facebook, Instagram, and LinkedIn accounts, generate AI banners (DALL-E 3) and AI hooks/captions (GPT-4o), then publish or schedule posts to multiple platforms from a single dashboard.

**Value Proposition:** Digital marketers save hours of manual content creation and cross-platform posting. One tool replaces Canva + ChatGPT + Buffer.

**MVP Scope:**
- [ ] User registration/login (JWT + Google OAuth)
- [ ] Connect Facebook, Instagram, LinkedIn via OAuth
- [ ] AI banner generation (DALL-E 3)
- [ ] AI hook + caption generation (GPT-4o)
- [ ] Publish post immediately to selected platforms
- [ ] Schedule posts for a future date/time
- [ ] Dashboard with activity overview and stats

---

## TECH STACK

| Layer | Technology | Skill Reference |
|-------|------------|-----------------|
| Backend | FastAPI + Python 3.11+ | skills/BACKEND.md |
| Frontend | React + TypeScript + Vite | skills/FRONTEND.md |
| Database | PostgreSQL + SQLAlchemy | skills/DATABASE.md |
| Auth | JWT + bcrypt + Google OAuth | skills/BACKEND.md |
| UI | Tailwind CSS + Framer Motion | skills/FRONTEND.md |
| AI | OpenAI API (DALL-E 3 + GPT-4o) | - |
| Social APIs | Facebook Graph API, Instagram Graph API, LinkedIn API | - |
| Storage | Cloudinary (banner images) | - |
| Payments | Stripe | skills/BACKEND.md |
| Testing | pytest + Vitest + RTL | skills/TESTING.md |
| Deployment | Docker + GitHub Actions | skills/DEPLOYMENT.md |

---

## DATABASE MODELS

### User
```
id: int (PK)
email: str (unique)
hashed_password: str
full_name: str
is_active: bool (default: True)
is_verified: bool (default: False)
oauth_provider: str (nullable) -- "google"
oauth_id: str (nullable)
stripe_customer_id: str (nullable)
created_at: datetime
updated_at: datetime
```

### RefreshToken
```
id: int (PK)
user_id: int (FK -> User)
token: str (unique)
expires_at: datetime
created_at: datetime
```

### SocialAccount
```
id: int (PK)
user_id: int (FK -> User)
platform: enum (facebook, instagram, linkedin)
account_name: str
account_id: str
access_token: str  -- encrypted
token_expires_at: datetime (nullable)
is_active: bool (default: True)
created_at: datetime
updated_at: datetime
```

### GeneratedContent
```
id: int (PK)
user_id: int (FK -> User)
type: enum (banner, hook, caption)
prompt: str
result_url: str (nullable)   -- for banners
result_text: str (nullable)  -- for hooks/captions
platform: enum (facebook, instagram, linkedin, all)
created_at: datetime
```

### Post
```
id: int (PK)
user_id: int (FK -> User)
title: str
caption: str
banner_url: str (nullable)
platforms: JSON  -- list of platform names
status: enum (draft, scheduled, published, failed)
scheduled_at: datetime (nullable)
published_at: datetime (nullable)
created_at: datetime
updated_at: datetime
```

### PostResult
```
id: int (PK)
post_id: int (FK -> Post)
platform: str
platform_post_id: str (nullable)
status: enum (success, failed)
error_message: str (nullable)
published_at: datetime (nullable)
```

---

## MODULES

### Module 1: Authentication
**Agents:** DATABASE-AGENT + BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Get JWT tokens |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Invalidate refresh token |
| GET | /auth/me | Get current user |
| GET | /auth/google | Start Google OAuth |
| GET | /auth/google/callback | Handle Google callback |

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /login | LoginPage | LoginForm, GoogleLoginButton |
| /register | RegisterPage | RegisterForm |
| /profile | ProfilePage | ProfileCard, EditProfileForm |

---

### Module 2: Social Accounts
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/social-accounts | List connected accounts |
| POST | /api/social-accounts/connect | Start OAuth for platform |
| GET | /api/social-accounts/callback/{platform} | OAuth callback |
| DELETE | /api/social-accounts/{id} | Disconnect account |

**Services:**
- `FacebookOAuthService` — token exchange, page selection
- `InstagramOAuthService` — business account linking
- `LinkedInOAuthService` — profile + page token

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /accounts | AccountsPage | AccountCard, ConnectButton, PlatformBadge |

---

### Module 3: Content Generation (AI)
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/generate/banner | Generate image via DALL-E 3 |
| POST | /api/generate/hook | Generate hook headline via GPT-4o |
| POST | /api/generate/caption | Generate full caption via GPT-4o |
| GET | /api/generate/history | List all generated content |
| DELETE | /api/generate/{id} | Delete generated content |

**Request Schemas:**
```python
class BannerRequest(BaseModel):
    topic: str
    brand_name: str
    style: str = "modern"
    platform: PlatformEnum = PlatformEnum.all

class HookRequest(BaseModel):
    topic: str
    platform: PlatformEnum
    tone: str = "professional"
    include_cta: bool = True

class CaptionRequest(BaseModel):
    topic: str
    platform: PlatformEnum
    tone: str = "professional"
    include_hashtags: bool = True
    include_cta: bool = True
```

**Services:**
- `OpenAIService` — wraps DALL-E 3 image generation + GPT-4o chat
- `CloudinaryService` — upload + store generated banners

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /create | CreateStudioPage | BannerGenerator, HookGenerator, CaptionGenerator, PreviewCard |
| /create/history | ContentHistoryPage | ContentCard, FilterBar |

---

### Module 4: Posts (Publish & Schedule)
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/posts | List all posts (filter by status) |
| POST | /api/posts | Create post (draft) |
| GET | /api/posts/{id} | Get post detail |
| PUT | /api/posts/{id} | Update post |
| DELETE | /api/posts/{id} | Delete post |
| POST | /api/posts/{id}/publish | Publish immediately |
| POST | /api/posts/{id}/schedule | Schedule for later |
| GET | /api/posts/{id}/results | Get per-platform results |

**Services:**
- `PublisherService` — dispatch to Facebook/Instagram/LinkedIn APIs
- `SchedulerService` — APScheduler background job for scheduled posts
- `FacebookPublisher` — Graph API post creation
- `InstagramPublisher` — Reels/Feed post via Graph API
- `LinkedInPublisher` — UGC post via LinkedIn API

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /posts | PostsListPage | PostCard, StatusBadge, FilterTabs |
| /posts/new | NewPostPage | PostComposer, PlatformSelector, SchedulePicker |
| /posts/{id} | PostDetailPage | PostPreview, ResultsTable |
| /posts/{id}/edit | EditPostPage | PostComposer |

---

### Module 5: Dashboard
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | Post counts by status + platform |

**Response:**
```json
{
  "total_posts": 42,
  "published": 30,
  "scheduled": 5,
  "drafts": 7,
  "by_platform": {
    "facebook": 18,
    "instagram": 22,
    "linkedin": 10
  },
  "generated_banners": 15,
  "generated_captions": 28
}
```

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /dashboard | DashboardPage | StatsCard, ActivityFeed, QuickActions |
| /settings | SettingsPage | ProfileForm, BillingSection, DangerZone |

---

## PHASE EXECUTION PLAN

### Phase 1: Foundation (4 agents in PARALLEL)

**DATABASE-AGENT:**
- Create all SQLAlchemy models (User, RefreshToken, SocialAccount, GeneratedContent, Post, PostResult)
- Write Alembic migration: `initial_schema`
- Create `database.py` with session factory
- Output: `backend/app/models/`, `backend/alembic/`

**BACKEND-AGENT:**
- Scaffold FastAPI project: `main.py`, `config.py`, `database.py`
- Set up router registration, CORS, middleware
- Create `.env.example`
- Output: `backend/app/main.py`, `backend/app/config.py`

**FRONTEND-AGENT:**
- Scaffold Vite + React + TypeScript project
- Install Tailwind CSS, Framer Motion, React Query, React Router
- Create base layout, routing skeleton, API client (axios)
- Output: `frontend/src/`, `frontend/package.json`

**DEVOPS-AGENT:**
- `docker-compose.yml` (backend, frontend, postgres, redis)
- `Dockerfile` for backend and frontend
- GitHub Actions CI workflow
- Output: `docker-compose.yml`, `Dockerfile`, `.github/workflows/ci.yml`

**Validation Gate 1:**
```bash
cd backend && pip install -r requirements.txt && alembic upgrade head
cd frontend && npm install
docker-compose config
```

---

### Phase 2: Modules (SEQUENTIAL per dependency order)

**Step 2a: Auth Module (backend + frontend parallel)**
- BACKEND-AGENT: JWT auth endpoints, bcrypt, Google OAuth, refresh token rotation
- FRONTEND-AGENT: Login page, Register page, auth context, protected routes

**Step 2b: Social Accounts Module**
- BACKEND-AGENT: OAuth handlers for Facebook/Instagram/LinkedIn, token encryption
- FRONTEND-AGENT: Accounts page, connect/disconnect UI

**Step 2c: Content Generation Module**
- BACKEND-AGENT: OpenAI service (DALL-E 3 + GPT-4o), Cloudinary upload, generation endpoints
- FRONTEND-AGENT: Create Studio page, banner/hook/caption generators, live preview

**Step 2d: Posts Module**
- BACKEND-AGENT: Post CRUD, publisher services per platform, APScheduler for scheduled posts
- FRONTEND-AGENT: Post composer, platform selector, schedule picker, posts list

**Step 2e: Dashboard Module**
- BACKEND-AGENT: Stats aggregation endpoint
- FRONTEND-AGENT: Dashboard page with stats cards, activity feed

**Validation Gate 2:**
```bash
ruff check backend/ && mypy backend/
npm run lint && npm run type-check
```

---

### Phase 3: Quality (2 agents in PARALLEL)

**TEST-AGENT:**
- pytest: auth, social accounts, content generation, posts, dashboard (80%+ coverage)
- Vitest + RTL: component tests for all pages
- Output: `backend/tests/`, `frontend/src/**/*.test.tsx`

**REVIEW-AGENT:**
- Security audit: JWT secrets, token encryption, OAuth state params, SQL injection
- Performance review: N+1 queries, missing DB indexes, async patterns
- Code quality: naming, error handling, logging

**Final Validation:**
```bash
pytest --cov=app --cov-report=term --cov-fail-under=80
npm run test -- --coverage
docker-compose up -d && curl localhost:8000/health
```

---

## VALIDATION GATES

| Gate | Commands |
|------|----------|
| 1 - Foundation | `alembic upgrade head`, `npm install`, `docker-compose config` |
| 2 - Modules | `ruff check backend/`, `mypy backend/`, `npm run type-check` |
| 3 - Quality | `pytest --cov --cov-fail-under=80`, `npm test` |
| Final | `docker-compose up -d`, `curl localhost:8000/health` |

---

## ENVIRONMENT VARIABLES

```env
# App
DATABASE_URL=postgresql://user:password@localhost:5432/socialflow
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# Facebook / Instagram
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx

# LinkedIn
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx

# Cloudinary (banner storage)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Frontend
VITE_API_URL=http://localhost:8000
```

---

## PROJECT STRUCTURE (Expected Output)

```
socialflow-ai/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── social_account.py
│   │   │   ├── generated_content.py
│   │   │   └── post.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── social_account.py
│   │   │   ├── generate.py
│   │   │   └── post.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── social_accounts.py
│   │   │   ├── generate.py
│   │   │   ├── posts.py
│   │   │   └── dashboard.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── openai_service.py
│   │   │   ├── cloudinary_service.py
│   │   │   ├── facebook_publisher.py
│   │   │   ├── instagram_publisher.py
│   │   │   ├── linkedin_publisher.py
│   │   │   └── scheduler_service.py
│   │   └── auth/
│   │       ├── jwt.py
│   │       └── oauth.py
│   ├── alembic/
│   │   └── versions/
│   ├── tests/
│   │   ├── test_auth.py
│   │   ├── test_social_accounts.py
│   │   ├── test_generate.py
│   │   └── test_posts.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── BannerGenerator.tsx
│       │   ├── HookGenerator.tsx
│       │   ├── CaptionGenerator.tsx
│       │   ├── PostComposer.tsx
│       │   ├── PlatformSelector.tsx
│       │   └── StatsCard.tsx
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── AccountsPage.tsx
│       │   ├── CreateStudioPage.tsx
│       │   ├── PostsListPage.tsx
│       │   └── SettingsPage.tsx
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── usePosts.ts
│       │   └── useGenerate.ts
│       ├── services/
│       │   └── api.ts
│       ├── context/
│       │   └── AuthContext.tsx
│       └── types/
│           └── index.ts
├── docker-compose.yml
└── .github/
    └── workflows/
        └── ci.yml
```

---

## AGENT ASSIGNMENTS SUMMARY

| Agent | Phase | Deliverables |
|-------|-------|-------------|
| DATABASE-AGENT | 1 | All models + migrations |
| BACKEND-AGENT | 1+2 | FastAPI scaffold + all API modules |
| FRONTEND-AGENT | 1+2 | React scaffold + all pages/components |
| DEVOPS-AGENT | 1 | Docker + CI/CD |
| TEST-AGENT | 3 | 80%+ test coverage |
| REVIEW-AGENT | 3 | Security + quality audit |

---

## NEXT STEP

Execute with parallel agents:
```bash
/execute-prp PRPs/socialflow-ai-prp.md
```
