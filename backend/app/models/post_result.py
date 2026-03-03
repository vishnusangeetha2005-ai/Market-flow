import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class PostResult(Base):
    __tablename__ = "post_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("posts.id"), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("success", "failed", name="result_status"), nullable=False
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    post: Mapped["Post"] = relationship("Post", back_populates="results")
