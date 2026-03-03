import datetime
from sqlalchemy import Integer, String, DateTime, Date, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("clients.id"), unique=True, nullable=False
    )
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("plans.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("active", "expired", "cancelled", name="subscription_status"),
        default="active"
    )
    payment_status: Mapped[str] = mapped_column(
        Enum("paid", "pending", "overdue", name="payment_status"),
        default="pending"
    )
    start_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    client: Mapped["Client"] = relationship("Client", back_populates="subscription")
    plan: Mapped["Plan"] = relationship("Plan", back_populates="subscriptions")
