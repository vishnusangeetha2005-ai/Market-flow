from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Column, Index, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.generated_content import GeneratedContent
    from app.models.post import Post
    from app.models.refresh_token import RefreshToken
    from app.models.social_account import SocialAccount


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    oauth_provider = Column(String(50), nullable=True)
    oauth_id = Column(String(255), nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)

    # Relationships
    refresh_tokens: list[RefreshToken] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    social_accounts: list[SocialAccount] = relationship(
        "SocialAccount",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    generated_contents: list[GeneratedContent] = relationship(
        "GeneratedContent",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    posts: list[Post] = relationship(
        "Post",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"
