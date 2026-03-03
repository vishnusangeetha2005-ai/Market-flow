from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "MarketFlow"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/marketflow"
    SECRET_KEY: str = "change-me-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Owner credentials (seeded on startup)
    OWNER_EMAIL: str = "owner@marketflow.io"
    OWNER_PASSWORD: str = "SecureOwnerPass123!"
    OWNER_NAME: str = "MarketFlow Owner"

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Facebook / Instagram
    FACEBOOK_APP_ID: str = ""
    FACEBOOK_APP_SECRET: str = ""

    # LinkedIn
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""

    # URLs
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"


settings = Settings()
