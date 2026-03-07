import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import Base


class Banner(Base):
    __tablename__ = "banners"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    template_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("banner_templates.id"), nullable=True
    )
    # Values the client entered for each field: {"headline": "50% OFF", "subtext": "Shop now"}
    field_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    result_url: Mapped[str] = mapped_column(String(500), nullable=False)
    image_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    client: Mapped["Client"] = relationship("Client", back_populates="banners")
    template: Mapped["BannerTemplate | None"] = relationship(
        "BannerTemplate", back_populates="banners"
    )
