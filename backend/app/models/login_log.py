import datetime
from sqlalchemy import Integer, String, DateTime, Boolean, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class LoginLog(Base):
    __tablename__ = "login_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("clients.id"), nullable=True
    )
    is_owner: Mapped[bool] = mapped_column(Boolean, default=False)
    login_time: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    ip_address: Mapped[str] = mapped_column(String(50), nullable=False)
    device_type: Mapped[str] = mapped_column(String(100), nullable=False)
    browser: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("success", "failed", "locked", name="login_status"), nullable=False
    )

    client: Mapped["Client | None"] = relationship("Client", back_populates="login_logs")
