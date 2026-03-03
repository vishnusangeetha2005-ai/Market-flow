import datetime
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class AutomationContent(Base):
    __tablename__ = "automation_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    hook_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    caption_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    client: Mapped["Client"] = relationship("Client")
