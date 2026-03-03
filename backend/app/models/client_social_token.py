import datetime
from sqlalchemy import Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class ClientSocialToken(Base):
    __tablename__ = "client_social_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)   # facebook | instagram | linkedin
    account_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    access_token: Mapped[str] = mapped_column(Text, nullable=False, default="")
    page_id: Mapped[str | None] = mapped_column(String(255), nullable=True)  # FB Page ID / IG Account ID / LinkedIn Org ID
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    client: Mapped["Client"] = relationship("Client")
