from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class PlatformEnum(str, enum.Enum):
    facebook = "facebook"
    instagram = "instagram"
    linkedin = "linkedin"


class SocialAccount(TimestampMixin, Base):
    __tablename__ = "social_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    platform = Column(Enum(PlatformEnum), nullable=False)
    account_name = Column(String(255), nullable=False)
    account_id = Column(String(255), nullable=False)
    # access_token is encrypted at the application layer before storage
    access_token = Column(Text, nullable=False)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("ix_social_accounts_user_id_platform", "user_id", "platform"),
    )

    # Relationships
    user: User = relationship("User", back_populates="social_accounts")

    def __repr__(self) -> str:
        return f"<SocialAccount id={self.id} user_id={self.user_id} platform={self.platform}>"
