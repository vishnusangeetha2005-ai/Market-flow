import datetime
from sqlalchemy import Integer, String, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class AutomationSettings(Base):
    __tablename__ = "automation_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), unique=True, nullable=False)

    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    post_time: Mapped[str] = mapped_column(String(5), default="10:00")   # HH:MM (IST)
    post_days: Mapped[list] = mapped_column(JSONB, default=lambda: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
    platforms: Mapped[list] = mapped_column(JSONB, default=lambda: ["facebook", "instagram"])
    automation_mode: Mapped[str] = mapped_column(String(10), default="auto")   # "basic" | "auto"
    banner_rotation_index: Mapped[int] = mapped_column(Integer, default=0)
    content_rotation_index: Mapped[int] = mapped_column(Integer, default=0)
    last_posted_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    client: Mapped["Client"] = relationship("Client")
