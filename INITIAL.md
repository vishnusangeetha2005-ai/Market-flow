# INITIAL.md - MarketFlow Product Definition

> Two-role digital marketing automation platform: Owner manages clients/plans/revenue; Clients generate AI content, banners, and schedule social posts.

---

## PRODUCT

**Name:** MarketFlow

**Description:** A B2B SaaS platform where one owner (admin) manages multiple client accounts. Clients log in to generate AI marketing content (hooks, captions, banners) and schedule posts to Facebook, Instagram, and LinkedIn. The owner monitors all clients, manages subscriptions and plans, tracks revenue, and views AI usage analytics.

**Type:** MicroSaaS (Two-role: Owner + Client)

**Target Users:**
- **Owner:** Digital marketing agency owner managing client accounts
- **Clients:** Small businesses and brands paying for the service

---

## TECH STACK

| Layer | Choice |
|-------|--------|
| Backend | FastAPI + Python 3.11 |
| Frontend | React + TypeScript + Vite |
| Database | PostgreSQL + SQLAlchemy + Alembic |
| Auth | JWT + bcrypt (no OAuth — owner is hardcoded, clients login with email/password) |
| UI | Tailwind + Framer Motion |
| AI | OpenAI GPT-4o (captions/hooks) + DALL-E 3 (banners) |
| Social | Facebook Graph API, Instagram Graph API, LinkedIn API |
| Scheduler | APScheduler |
| Deploy | Docker + GitHub Actions |

---

## ROLES

### Owner (Single Admin)
- Hardcoded credentials (no public registration)
- Full access to all client data, plans, revenue, AI usage
- Can create/edit/suspend/delete clients
- Can manage banner templates used by all clients

### Client (Multiple)
- Registered by owner (no self-signup)
- Login with email + password
- Account locked after 5 failed attempts
- Scoped to their own data only
- Limited by subscription plan (token limit, banner count, post count)

---

## MODULES

### Module 1: Authentication

**Models:** Owner, Client (with login tracking fields), LoginLog

**Endpoints:**
```
POST /auth/owner-login        - Owner login (hardcoded credentials)
POST /auth/client-login       - Client login with account lock
POST /auth/refresh            - Refresh access token
POST /auth/logout             - Invalidate refresh token
GET  /auth/me                 - Get current user info
```

**Pages:** /login (shared, role-detect on login), /owner/*, /client/*

**Security:**
- Login log on every attempt: IP, device, browser, status
- Lock client after 5 consecutive failed attempts
- Owner never gets locked

---

### Module 2: Client Management (Owner only)

**Models:** Client

**Endpoints:**
```
GET    /api/clients                      - List all clients (search + filter)
POST   /api/clients                      - Create new client
GET    /api/clients/{id}                 - Get client detail
PUT    /api/clients/{id}                 - Update client
DELETE /api/clients/{id}                 - Delete client
POST   /api/clients/{id}/suspend         - Suspend client
POST   /api/clients/{id}/activate        - Activate client
POST   /api/clients/{id}/unlock          - Unlock locked account
POST   /api/clients/{id}/reset-password  - Reset client password
GET    /api/clients/{id}/activity        - Get login history + stats
```

**Pages:** /owner/clients, /owner/clients/{id} (drawer)

---

### Module 3: Subscription & Plans (Owner only)

**Models:** Plan, Subscription

**Plans (seeded):**
- Starter: 50k tokens, 10 banners, 20 posts/month — $29/mo
- Pro: 200k tokens, 50 banners, 100 posts/month — $79/mo
- Agency: 1M tokens, unlimited banners, unlimited posts — $199/mo

**Endpoints:**
```
GET    /api/plans                          - List all plans
GET    /api/subscriptions                  - List all subscriptions
POST   /api/subscriptions                  - Assign plan to client
PUT    /api/subscriptions/{id}             - Update subscription (extend, change plan)
GET    /api/subscriptions/{id}             - Get subscription detail
GET    /api/dashboard/revenue              - Revenue stats (monthly + total)
```

**Pages:** /owner/subscriptions

---

### Module 4: AI Content Generation (Client only)

**Models:** GeneratedContent

**Endpoints:**
```
POST /api/generate/hook        - Generate hook/headline (GPT-4o)
POST /api/generate/caption     - Generate full caption (GPT-4o)
GET  /api/generate/history     - List client's generated content
DELETE /api/generate/{id}      - Delete generated item
```

**Request body:**
```json
{
  "topic": "Summer sale promotion",
  "platform": "instagram",
  "tone": "energetic",
  "include_cta": true
}
```

**Logic:**
- Check client's remaining token allowance before generating
- Deduct tokens_used from GeneratedContent record
- Return 403 if plan limit reached
- Show token usage progress bar (used / limit)

**Pages:** /client/generate

---

### Module 5: Banner Generation (Owner templates + Client use)

**Models:** BannerTemplate, Banner

**Owner endpoints:**
```
GET    /api/banner-templates              - List all templates
POST   /api/banner-templates             - Create template
PUT    /api/banner-templates/{id}        - Update template
DELETE /api/banner-templates/{id}        - Delete template
```

**Client endpoints:**
```
POST   /api/banners/generate             - Generate banner from template (DALL-E 3)
GET    /api/banners                      - List client's generated banners
DELETE /api/banners/{id}                 - Delete banner
```

**Banner Template fields:**
- name, description, image_url (sample preview)
- font (heading font name), colors (JSON: primary, secondary, bg)
- cta_text (default CTA), is_active

**Pages:** /owner/banner-templates, /client/banners

---

### Module 6: Social Scheduler (Client only)

**Models:** Post, PostResult

**Endpoints:**
```
GET    /api/posts                         - List client's posts
POST   /api/posts                         - Create post (draft)
GET    /api/posts/{id}                    - Get post detail + results
PUT    /api/posts/{id}                    - Update post
DELETE /api/posts/{id}                    - Delete post
POST   /api/posts/{id}/publish            - Publish immediately
POST   /api/posts/{id}/schedule           - Schedule for later
POST   /api/posts/{id}/retry              - Retry failed platforms
GET    /api/posts/{id}/results            - Get per-platform publish results
```

**Post fields:**
- caption, banner_url (optional)
- platforms: list[str] (facebook, instagram, linkedin)
- status: draft | scheduled | published | partial | failed
- scheduled_at (nullable), published_at (nullable)

**Logic:**
- APScheduler polls for scheduled posts and publishes them
- Each platform returns success/failed individually
- PostResult stores per-platform status + error_message
- Retry only retries failed platforms

**Pages:** /client/schedule

---

### Module 7: Login Security (System)

**Model:** LoginLog

**Fields:**
```
id, client_id (nullable — null for owner), login_time, ip_address,
device_type, browser, location, status (success|failed|locked)
```

**Logic:**
- Every login attempt is logged (owner + client)
- After 5 consecutive failed attempts: client.account_locked = True
- Locked account returns 403 with "Account locked" message
- Owner can unlock any client
- Suspicious login detection: flag if new IP country (informational only)

---

### Module 8: Owner Dashboard

**Endpoint:** `GET /api/dashboard/owner-stats`

**Response:**
```json
{
  "total_clients": 24,
  "active_clients": 20,
  "suspended_clients": 3,
  "locked_clients": 1,
  "total_revenue": 4580.00,
  "monthly_revenue": 780.00,
  "total_ai_tokens_used": 1250000,
  "scheduled_posts": 45,
  "failed_posts": 3,
  "total_banners": 128,
  "revenue_chart": [...],
  "ai_usage_chart": [...],
  "subscription_breakdown": {...}
}
```

**Page:** /owner/dashboard

---

### Module 9: Client Dashboard

**Endpoint:** `GET /api/dashboard/client-stats`

**Response:**
```json
{
  "posts_published": 12,
  "posts_scheduled": 3,
  "posts_failed": 1,
  "banners_generated": 5,
  "tokens_used": 18500,
  "tokens_limit": 50000,
  "recent_posts": [...],
  "plan_name": "Starter",
  "subscription_status": "active",
  "subscription_end_date": "2026-03-31"
}
```

**Page:** /client/dashboard

---

## DATABASE MODELS (10)

```
1. Owner
   - id, email, password_hash, name, created_at

2. Client
   - id, name, email, password_hash
   - plan_id (FK → Plan), status (active|suspended)
   - last_login, login_count, failed_attempts, account_locked
   - created_at, updated_at

3. LoginLog
   - id, client_id (nullable), login_time
   - ip_address, device_type, browser, location
   - status (success|failed|locked)
   - is_owner (bool)

4. Plan
   - id, name (Starter|Pro|Agency)
   - ai_token_limit, banner_limit, post_limit
   - price (monthly USD)
   - description

5. Subscription
   - id, client_id (FK), plan_id (FK)
   - status (active|expired|cancelled)
   - payment_status (paid|pending|overdue)
   - start_date, end_date
   - created_at, updated_at

6. GeneratedContent
   - id, client_id (FK)
   - type (hook|caption)
   - prompt, result_text
   - tokens_used, platform
   - created_at

7. BannerTemplate
   - id, name, description
   - image_url (preview), font, colors (JSON)
   - cta_text, is_active
   - created_at, updated_at

8. Banner
   - id, client_id (FK), template_id (FK)
   - prompt, result_url
   - created_at

9. Post
   - id, client_id (FK)
   - caption, banner_url
   - platforms (JSON array)
   - status (draft|scheduled|published|partial|failed)
   - scheduled_at (nullable), published_at (nullable)
   - created_at, updated_at

10. PostResult
    - id, post_id (FK), platform
    - status (success|failed)
    - error_message (nullable)
    - published_at (nullable)
```

---

## API ENDPOINTS (30+)

```
# Auth
POST /auth/owner-login
POST /auth/client-login
POST /auth/refresh
POST /auth/logout
GET  /auth/me

# Clients (Owner)
GET    /api/clients
POST   /api/clients
GET    /api/clients/{id}
PUT    /api/clients/{id}
DELETE /api/clients/{id}
POST   /api/clients/{id}/suspend
POST   /api/clients/{id}/activate
POST   /api/clients/{id}/unlock
POST   /api/clients/{id}/reset-password
GET    /api/clients/{id}/activity

# Plans & Subscriptions (Owner)
GET    /api/plans
GET    /api/subscriptions
POST   /api/subscriptions
PUT    /api/subscriptions/{id}
GET    /api/subscriptions/{id}

# AI Generate (Client)
POST   /api/generate/hook
POST   /api/generate/caption
GET    /api/generate/history
DELETE /api/generate/{id}

# Banner Templates (Owner)
GET    /api/banner-templates
POST   /api/banner-templates
PUT    /api/banner-templates/{id}
DELETE /api/banner-templates/{id}

# Banners (Client)
POST   /api/banners/generate
GET    /api/banners
DELETE /api/banners/{id}

# Posts (Client)
GET    /api/posts
POST   /api/posts
GET    /api/posts/{id}
PUT    /api/posts/{id}
DELETE /api/posts/{id}
POST   /api/posts/{id}/publish
POST   /api/posts/{id}/schedule
POST   /api/posts/{id}/retry
GET    /api/posts/{id}/results

# Dashboard
GET    /api/dashboard/owner-stats
GET    /api/dashboard/client-stats
GET    /api/dashboard/revenue
```

---

## FRONTEND PAGES

### Owner Pages
```
/login                         - Shared login (detects role)
/owner/dashboard               - Owner stats overview
/owner/clients                 - Client list + search/filter
/owner/clients/{id}            - Client detail drawer (profile + subscription + AI + logs)
/owner/subscriptions           - Subscription management
/owner/banner-templates        - Banner template CRUD
/owner/social-monitor          - All clients' social posts overview
/owner/settings                - Owner profile settings
```

### Client Pages
```
/client/dashboard              - Client stats overview
/client/generate               - AI content generation (hook + caption)
/client/banners                - Generate banners from templates
/client/schedule               - Create + schedule social posts
/client/profile                - Client profile + subscription info
```

---

## ACCEPTANCE CRITERIA

- [ ] Owner can login with hardcoded credentials
- [ ] Owner can create, edit, suspend, activate, delete clients
- [ ] Owner can assign plans and manage subscriptions
- [ ] Owner can create/edit/delete banner templates
- [ ] Owner dashboard shows real-time stats
- [ ] Client login works with account lock after 5 failed attempts
- [ ] Client can generate AI hooks and captions within plan limits
- [ ] Client can generate banners from owner templates
- [ ] Client can create posts and schedule them for future publishing
- [ ] APScheduler auto-publishes scheduled posts
- [ ] All login attempts are logged with IP, device, browser
- [ ] Token usage progress bar reflects real plan limits
- [ ] Docker build succeeds and all services start

---

## ENVIRONMENT VARIABLES

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketflow
SECRET_KEY=your-secret-key-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Owner credentials (hardcoded)
OWNER_EMAIL=owner@marketflow.io
OWNER_PASSWORD=SecureOwnerPass123!

# OpenAI
OPENAI_API_KEY=sk-xxx

# Facebook
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx

# LinkedIn
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
VITE_API_URL=http://localhost:8000
```

---

## RUN

```bash
/generate-prp INITIAL.md
/execute-prp PRPs/marketflow-prp.md
```
