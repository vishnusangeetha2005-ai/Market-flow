import logging
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.config import settings
from app.models.owner import Owner
from app.models.plan import Plan
from app.models.client import Client

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed_owner(db: Session):
    """Seed owner record if not exists."""
    owner = db.query(Owner).first()
    if not owner:
        owner = Owner(
            email=settings.OWNER_EMAIL,
            password_hash=pwd_context.hash(settings.OWNER_PASSWORD),
            name=settings.OWNER_NAME,
        )
        db.add(owner)
        db.commit()
        logger.info(f"Owner seeded: {settings.OWNER_EMAIL}")


def seed_demo_client(db: Session):
    """Seed a demo client for testing if none exists."""
    existing = db.query(Client).filter(Client.email == "client@demo.com").first()
    if not existing:
        client = Client(
            name="Demo Client",
            email="client@demo.com",
            password_hash=pwd_context.hash("Client123456"),
            status="active",
        )
        db.add(client)
        db.commit()
        logger.info("Demo client seeded: client@demo.com")


def seed_plans(db: Session):
    """Seed default plans if not exists."""
    if db.query(Plan).count() == 0:
        plans = [
            Plan(
                name="Starter",
                ai_token_limit=50000,
                banner_limit=10,
                post_limit=20,
                price=29.00,
                description="Perfect for small businesses getting started with AI marketing.",
            ),
            Plan(
                name="Pro",
                ai_token_limit=200000,
                banner_limit=50,
                post_limit=100,
                price=79.00,
                description="For growing businesses that need more AI power.",
            ),
            Plan(
                name="Agency",
                ai_token_limit=1000000,
                banner_limit=-1,
                post_limit=-1,
                price=199.00,
                description="Unlimited banners and posts for agencies managing multiple brands.",
            ),
        ]
        for plan in plans:
            db.add(plan)
        db.commit()
        logger.info("Plans seeded: Starter, Pro, Agency")
