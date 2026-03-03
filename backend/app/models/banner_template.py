import datetime
from sqlalchemy import Integer, String, DateTime, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import Base


class BannerTemplate(Base):
    __tablename__ = "banner_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Canvas size
    width: Mapped[int] = mapped_column(Integer, default=1080)
    height: Mapped[int] = mapped_column(Integer, default=1080)

    # Background
    background_color: Mapped[str] = mapped_column(String(20), default="#1a1a2e")
    background_image: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Text field definitions (JSON array)
    # [{"name":"headline","x":100,"y":200,"font":"Roboto-Bold.ttf",
    #   "font_size":64,"color":"#FFFFFF","align":"left","max_chars":40}]
    fields: Mapped[list | None] = mapped_column(JSONB, default=list)

    # Thumbnail shown to clients
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    banners: Mapped[list["Banner"]] = relationship("Banner", back_populates="template")
