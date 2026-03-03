# MarketFlow — Product Requirements Plan (PRP)

**Generated:** 2026-02-26
**Product:** MarketFlow — Two-Role Digital Marketing Automation Platform
**Stack:** FastAPI + PostgreSQL + React + TypeScript + Tailwind + OpenAI + APScheduler

---

## 1. OVERVIEW

MarketFlow is a B2B MicroSaaS platform where:
- **One Owner** (admin) manages all client accounts, plans, revenue, banner templates, and AI usage
- **Multiple Clients** log in to generate AI content (hooks, captions, banners) and schedule social media posts

---

## 2. ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│  Owner UI          │          Client UI              │
│  /owner/*          │          /client/*              │
└────────────────────┬────────────────────────────────┘
                     │ REST API (JWT)
┌────────────────────▼────────────────────────────────┐
│                  FastAPI Backend                      │
│  Auth │ Clients │ Plans │ Generate │ Banners │ Posts │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              PostgreSQL Database                      │
│  Owner │ Client │ Plan │ Subscription │ Post │ ...   │
└─────────────────────────────────────────────────────┘
         │                              │
┌────────▼───────┐           ┌──────────▼──────────┐
│  OpenAI API    │           │  Social APIs         │
│  GPT-4o        │           │  Facebook / IG / LI  │
│  DALL-E 3      │           │  (APScheduler)       │
└────────────────┘           └─────────────────────┘
```

---

## 3. IMPLEMENTATION PHASES

### Phase 1: Foundation

#### 1.1 Database Models

**File structure:**
```
backend/app/models/
├── __init__.py
├── base.py
├── owner.py
├── client.py
├── login_log.py
├── plan.py
├── subscription.py
├── generated_content.py
├── banner_template.py
├── banner.py
├── post.py
└── post_result.py
```

**Models to implement:**

```python
# owner.py
class Owner(Base):
    __tablename__ = "owners"
    id: int (PK)
    email: str (unique)
    password_hash: str
    name: str
    created_at: datetime

# client.py
class Client(Base):
    __tablename__ = "clients"
    id: int (PK)
    name: str
    email: str (unique)
    password_hash: str
    status: Enum("active", "suspended") default="active"
    failed_attempts: int default=0
    account_locked: bool default=False
    last_login: datetime (nullable)
    login_count: int default=0
    created_at: datetime
    updated_at: datetime
    # relationships: subscription, login_logs, generated_content, banners, posts

# login_log.py
class LoginLog(Base):
    __tablename__ = "login_logs"
    id: int (PK)
    client_id: int (FK nullable — null for owner)
    is_owner: bool default=False
    login_time: datetime
    ip_address: str
    device_type: str
    browser: str
    location: str (nullable)
    status: Enum("success", "failed", "locked")

# plan.py
class Plan(Base):
    __tablename__ = "plans"
    id: int (PK)
    name: str  # Starter, Pro, Agency
    ai_token_limit: int
    banner_limit: int  # -1 = unlimited
    post_limit: int    # -1 = unlimited
    price: Decimal
    description: str

# subscription.py
class Subscription(Base):
    __tablename__ = "subscriptions"
    id: int (PK)
    client_id: int (FK unique)
    plan_id: int (FK)
    status: Enum("active", "expired", "cancelled") default="active"
    payment_status: Enum("paid", "pending", "overdue") default="pending"
    start_date: date
    end_date: date
    created_at: datetime
    updated_at: datetime

# generated_content.py
class GeneratedContent(Base):
    __tablename__ = "generated_content"
    id: int (PK)
    client_id: int (FK)
    type: Enum("hook", "caption")
    prompt: str
    result_text: str
    tokens_used: int
    platform: str (nullable)
    created_at: datetime

# banner_template.py
class BannerTemplate(Base):
    __tablename__ = "banner_templates"
    id: int (PK)
    name: str
    description: str (nullable)
    image_url: str (nullable)  # preview image
    font: str (nullable)
    colors: JSON  # {primary, secondary, background}
    cta_text: str (nullable)
    is_active: bool default=True
    created_at: datetime
    updated_at: datetime

# banner.py
class Banner(Base):
    __tablename__ = "banners"
    id: int (PK)
    client_id: int (FK)
    template_id: int (FK nullable)
    prompt: str
    result_url: str
    created_at: datetime

# post.py
class Post(Base):
    __tablename__ = "posts"
    id: int (PK)
    client_id: int (FK)
    caption: str
    banner_url: str (nullable)
    platforms: JSON  # ["facebook", "instagram", "linkedin"]
    status: Enum("draft", "scheduled", "published", "partial", "failed") default="draft"
    scheduled_at: datetime (nullable)
    published_at: datetime (nullable)
    created_at: datetime
    updated_at: datetime

# post_result.py
class PostResult(Base):
    __tablename__ = "post_results"
    id: int (PK)
    post_id: int (FK)
    platform: str
    status: Enum("success", "failed")
    error_message: str (nullable)
    published_at: datetime (nullable)
```

#### 1.2 Alembic Migration

```bash
alembic revision --autogenerate -m "initial_marketflow_schema"
alembic upgrade head
```

#### 1.3 Data Seeding

Seed on startup:
1. Owner record (from env vars OWNER_EMAIL + hashed OWNER_PASSWORD)
2. Three plan records (Starter/Pro/Agency with limits and pricing)

---

### Phase 2: Backend API

#### 2.1 Config Updates (config.py)

```python
class Settings(BaseSettings):
    APP_NAME: str = "MarketFlow"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/marketflow"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    OWNER_EMAIL: str = "owner@marketflow.io"
    OWNER_PASSWORD: str = "SecureOwnerPass123!"

    OPENAI_API_KEY: str = ""
    FACEBOOK_APP_ID: str = ""
    FACEBOOK_APP_SECRET: str = ""
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""

    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]
```

#### 2.2 JWT Auth (auth/jwt.py)

- `create_access_token(data: dict, role: str)` — embed role in payload
- `create_refresh_token(data: dict)` — longer expiry
- `verify_token(token: str) -> dict` — decode and return payload
- Dependencies:
  - `get_current_owner(token)` — verify role=="owner"
  - `get_current_client(token, db)` — verify role=="client", return Client object

#### 2.3 Auth Router (routers/auth.py)

```python
POST /auth/owner-login
  - Verify email+password against Owner record
  - Log attempt to LoginLog (is_owner=True)
  - Return {access_token, refresh_token, role:"owner"}

POST /auth/client-login
  - Check client exists and not locked
  - Verify password
  - On success: reset failed_attempts, update last_login
  - On failure: increment failed_attempts, lock if >=5
  - Log to LoginLog
  - Return {access_token, refresh_token, role:"client"}

POST /auth/refresh
  - Validate refresh token → return new access token

POST /auth/logout
  - Client-side token discard (stateless)

GET /auth/me
  - Return current user info + role
```

#### 2.4 Clients Router (routers/clients.py)

All endpoints require owner JWT.

```python
GET    /api/clients           # search by name/email, filter by status/plan
POST   /api/clients           # create client (hashes password), assigns plan
GET    /api/clients/{id}      # full client profile with subscription + usage stats
PUT    /api/clients/{id}      # update name, email
DELETE /api/clients/{id}      # soft delete or hard delete
POST   /api/clients/{id}/suspend     # set status="suspended"
POST   /api/clients/{id}/activate    # set status="active"
POST   /api/clients/{id}/unlock      # reset failed_attempts=0, account_locked=False
POST   /api/clients/{id}/reset-password  # hash new password, update
GET    /api/clients/{id}/activity   # login_logs + usage summary
```

#### 2.5 Plans Router (routers/plans.py)

```python
GET /api/plans               # list all plans (public to owner)
```

#### 2.6 Subscriptions Router (routers/subscriptions.py)

Owner only.

```python
GET    /api/subscriptions         # list all with client info
POST   /api/subscriptions         # assign plan to client
PUT    /api/subscriptions/{id}    # extend end_date, change payment_status
GET    /api/subscriptions/{id}    # detail
```

#### 2.7 Generate Router (routers/generate.py)

Client only. Check token limits before each call.

```python
POST /api/generate/hook
  - Check: client.subscription.plan.ai_token_limit vs tokens used this month
  - Call OpenAI GPT-4o with hook prompt
  - Save GeneratedContent record (type="hook", tokens_used)
  - Return {hook_text, tokens_used, tokens_remaining}

POST /api/generate/caption
  - Same flow as hook but type="caption"
  - Return {caption_text, tokens_used, tokens_remaining}

GET  /api/generate/history
  - List client's GeneratedContent (paginated)

DELETE /api/generate/{id}
  - Delete client's generated content item
```

#### 2.8 Banner Templates Router (routers/banner_templates.py)

Owner only for CRUD.

```python
GET    /api/banner-templates          # list active templates
POST   /api/banner-templates          # create template
PUT    /api/banner-templates/{id}     # update template
DELETE /api/banner-templates/{id}     # deactivate (is_active=False)
```

#### 2.9 Banners Router (routers/banners.py)

Client only.

```python
POST /api/banners/generate
  - Check banner limit for client's plan
  - Call OpenAI DALL-E 3 with banner prompt
  - Save Banner record
  - Return {banner_url, id}

GET /api/banners
  - List client's generated banners

DELETE /api/banners/{id}
  - Delete client's banner
```

#### 2.10 Posts Router (routers/posts.py)

Client only.

```python
GET    /api/posts             # list with status filter
POST   /api/posts             # create draft
GET    /api/posts/{id}        # detail + results
PUT    /api/posts/{id}        # update draft
DELETE /api/posts/{id}        # delete
POST   /api/posts/{id}/publish    # immediate publish to all platforms
POST   /api/posts/{id}/schedule   # set scheduled_at, status="scheduled"
POST   /api/posts/{id}/retry      # retry failed PostResults
GET    /api/posts/{id}/results    # list PostResults
```

#### 2.11 Dashboard Router (routers/dashboard.py)

```python
GET /api/dashboard/owner-stats
  - Aggregates: client counts, revenue, AI tokens, post stats, banner counts
  - Charts: revenue last 12 months, AI usage by client

GET /api/dashboard/client-stats
  - Client's own: posts (by status), banners, token usage vs limit
  - Recent 5 posts

GET /api/dashboard/revenue
  - Monthly revenue breakdown (for chart)
```

#### 2.12 Scheduler Service (services/scheduler_service.py)

```python
# APScheduler job runs every minute
# Finds posts where status="scheduled" AND scheduled_at <= now()
# For each post, calls publish_post(post)
# publish_post():
#   For each platform in post.platforms:
#     Call platform publisher (facebook/instagram/linkedin)
#     Create PostResult record
#   Update post.status based on results
```

---

### Phase 3: Frontend

#### 3.1 Auth Context (context/AuthContext.tsx)

```typescript
interface AuthState {
  user: Owner | Client | null;
  role: "owner" | "client" | null;
  isAuthenticated: boolean;
}

// login(email, password) → calls correct endpoint based on role attempt
// logout() → clear tokens
// refreshToken() → get new access token
```

#### 3.2 Protected Routes

```typescript
<OwnerRoute>   // redirects to /login if not owner
<ClientRoute>  // redirects to /login if not client
```

#### 3.3 Owner Pages

**OwnerDashboardPage** (`/owner/dashboard`):
- Stats cards: Total Clients, Active, Suspended, Revenue, AI Tokens, Scheduled Posts
- Revenue line chart (Recharts)
- Subscription donut chart
- AI usage bar chart

**ClientsPage** (`/owner/clients`):
- Table with search (name/email) + filter (status, plan)
- Columns: Name, Email, Plan, Status, Last Login, Lock Badge, Actions
- Actions: View, Suspend/Activate, Unlock, Delete
- Click row → open ClientDrawer

**ClientDrawer** (slide-over panel):
- Tabs: Profile | Subscription | AI Usage | Login History
- Profile: name, email, status, created
- Subscription: plan, payment status, dates, extend button
- AI Usage: token bar, banner count, post count
- Login History: table of recent login_logs

**SubscriptionsPage** (`/owner/subscriptions`):
- Table of all subscriptions
- Filter by status/payment
- Edit subscription (extend, change payment status)
- Assign plan to client

**BannerTemplatesPage** (`/owner/banner-templates`):
- Grid of template cards
- Create/Edit modal: name, description, font, colors picker, cta_text
- Toggle active/inactive
- Preview card

**SocialMonitorPage** (`/owner/social-monitor`):
- Table of all posts across all clients
- Filter by client, status, platform
- Show per-platform results

#### 3.4 Client Pages

**ClientDashboardPage** (`/client/dashboard`):
- Stats: Posts Published, Scheduled, Failed, Banners
- Token usage progress bar (used/limit)
- Subscription info card (plan, days remaining)
- Recent posts list

**GeneratePage** (`/client/generate`):
- Form: Topic, Platform (select), Tone (select), Include CTA (toggle)
- Generate Hook button → show hook result with Regenerate
- Generate Caption button → show caption result with Regenerate
- Token usage progress bar below
- Block with upgrade message when limit reached

**BannersPage** (`/client/banners`):
- Select template (grid of active templates)
- Enter prompt/customization
- Generate Banner button (DALL-E 3)
- Gallery of generated banners

**SchedulePage** (`/client/schedule`):
- Create post form: Caption (textarea), Banner URL or pick from gallery
- Platform checkboxes: Facebook, Instagram, LinkedIn
- Publish Now or Schedule (datetime picker)
- Posts list table: status badges, per-platform indicators, retry button

**ProfilePage** (`/client/profile`):
- Client info display
- Current subscription details
- Change password form

#### 3.5 Shared Components

```
components/
├── auth/
│   ├── LoginForm.tsx
│   ├── OwnerRoute.tsx
│   └── ClientRoute.tsx
├── layout/
│   ├── OwnerLayout.tsx        (sidebar with owner nav)
│   ├── ClientLayout.tsx       (sidebar with client nav)
│   ├── AppSidebar.tsx
│   └── PageWrapper.tsx
├── ui/
│   ├── GlassCard.tsx
│   ├── StatCard.tsx
│   ├── GradientButton.tsx
│   ├── StatusBadge.tsx
│   ├── TokenProgressBar.tsx
│   ├── AnimatedInput.tsx
│   └── ConfirmModal.tsx
└── charts/
    ├── RevenueChart.tsx
    ├── UsageChart.tsx
    └── SubscriptionDonut.tsx
```

---

## 4. API RESPONSE SCHEMAS

All responses follow:
```json
{
  "data": {...},
  "message": "success"
}
```

Errors follow:
```json
{
  "detail": "Error message here"
}
```

---

## 5. SECURITY REQUIREMENTS

1. All owner endpoints: verify `role == "owner"` in JWT
2. All client endpoints: verify `role == "client"` AND `client.status == "active"`
3. Clients can only access their own data (filter by client_id from JWT)
4. Passwords hashed with bcrypt (passlib)
5. JWT secret from env (never hardcoded)
6. Login attempts rate-limited (slowapi: 10/minute per IP)
7. Account locked after 5 consecutive failures

---

## 6. DEPLOYMENT

### docker-compose.dev.yml
```yaml
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: marketflow_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes: [postgres_dev_data:/var/lib/postgresql/data]

  backend:
    build: ./backend
    env_file: .env
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/marketflow_dev
    depends_on: [db]
    ports: ["8000:8000"]
    volumes: [./backend:/app]
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    image: node:20-alpine
    working_dir: /app
    volumes: [./frontend:/app, /app/node_modules]
    ports: ["3000:3000"]
    command: npm run dev -- --host 0.0.0.0
    environment:
      VITE_API_URL: http://localhost:8000
```

### Startup Commands
```bash
docker-compose -f docker-compose.dev.yml up --build
# Backend API: http://localhost:8000/docs
# Frontend: http://localhost:3000
```

---

## 7. TESTING

```python
# Tests to cover:
# - Owner login success/failure
# - Client login + lockout after 5 failures
# - Client CRUD (owner)
# - Plan limits (token/banner/post)
# - Post scheduling and publish
# - Dashboard stats accuracy
```

---

## 8. IMPLEMENTATION ORDER

1. Database models + Alembic migration
2. Seeder (owner + plans)
3. JWT auth + dependencies
4. Auth router (owner-login + client-login)
5. Clients router
6. Plans + subscriptions router
7. Generate router (with limit checking)
8. Banner templates + banners router
9. Posts router + scheduler
10. Dashboard router
11. Frontend: Auth + routing
12. Frontend: Owner pages
13. Frontend: Client pages
14. Docker config + .env.example

---

## 9. ENVIRONMENT SETUP

```bash
cp .env.example .env
# Edit .env with your keys
docker-compose -f docker-compose.dev.yml up --build
# Run migrations
docker-compose exec backend alembic upgrade head
# Access: http://localhost:3000
# Owner login: owner@marketflow.io / SecureOwnerPass123!
```
