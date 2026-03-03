import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import Base


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    caption: Mapped[str] = mapped_column(Text, nullable=False)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    platforms: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[str] = mapped_column(
        Enum("draft", "scheduled", "published", "partial", "failed", name="post_status"),
        default="draft"
    )
    scheduled_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    published_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    client: Mapped["Client"] = relationship("Client", back_populates="posts")
    results: Mapped[list["PostResult"]] = relationship(
        "PostResult", back_populates="post", cascade="all, delete-orphan"
    )
