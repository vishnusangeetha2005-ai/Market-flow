import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.exceptions import AppException, app_exception_handler
from app.database import engine, get_db
from app.models.base import Base
from app.services.scheduler_service import start_scheduler, stop_scheduler
from app.services.seed_service import seed_owner, seed_plans, seed_demo_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import all models so create_all sees them
    from app.models import automation_content  # noqa: F401
    from app.models import client_social_token  # noqa: F401

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Migrate new columns on existing tables
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE automation_settings "
            "ADD COLUMN IF NOT EXISTS automation_mode VARCHAR(10) DEFAULT 'auto'"
        ))
        conn.execute(text(
            "ALTER TABLE automation_settings "
            "ADD COLUMN IF NOT EXISTS content_rotation_index INTEGER DEFAULT 0"
        ))
        conn.execute(text(
            "ALTER TABLE clients ADD COLUMN IF NOT EXISTS website VARCHAR(255)"
        ))
        conn.execute(text(
            "ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)"
        ))
        conn.execute(text(
            "ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_data BYTEA"
        ))
        conn.execute(text(
            "ALTER TABLE banners ADD COLUMN IF NOT EXISTS image_data BYTEA"
        ))
        conn.commit()

    # Seed initial data
    from sqlalchemy.orm import Session
    db = Session(bind=engine)
    try:
        seed_owner(db)
        seed_plans(db)
        seed_demo_client(db)
    finally:
        db.close()
    # Start scheduler
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(AppException, app_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict:
    return {"status": "healthy", "app": settings.APP_NAME}


# Import and include all routers
from app.routers import auth, clients, plans, subscriptions, generate, banner_templates, banners, posts, dashboard, profile, automation, social_tokens, owner_settings

app.include_router(auth.router, prefix="/api/v1")
app.include_router(clients.router, prefix="/api/v1")
app.include_router(plans.router, prefix="/api/v1")
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(generate.router, prefix="/api/v1")
app.include_router(banner_templates.router, prefix="/api/v1")
app.include_router(banners.router, prefix="/api/v1")
app.include_router(posts.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(automation.router, prefix="/api/v1")
app.include_router(social_tokens.router, prefix="/api/v1")
app.include_router(owner_settings.router, prefix="/api/v1")

# Serve generated banners as static files
_banners_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "generated", "banners"))
os.makedirs(_banners_dir, exist_ok=True)
app.mount("/static/banners", StaticFiles(directory=_banners_dir), name="banners")

# Serve uploaded template images
_templates_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "generated", "templates"))
os.makedirs(_templates_dir, exist_ok=True)
app.mount("/static/templates", StaticFiles(directory=_templates_dir), name="templates")

# Serve client logos
_logos_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "generated", "logos"))
os.makedirs(_logos_dir, exist_ok=True)
app.mount("/static/logos", StaticFiles(directory=_logos_dir), name="logos")
