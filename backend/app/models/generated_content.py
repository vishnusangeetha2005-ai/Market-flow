import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class GeneratedContent(Base):
    __tablename__ = "generated_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    type: Mapped[str] = mapped_column(
        Enum("hook", "caption", name="content_type"), nullable=False
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    result_text: Mapped[str] = mapped_column(Text, nullable=False)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    platform: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    client: Mapped["Client"] = relationship("Client", back_populates="generated_content")
