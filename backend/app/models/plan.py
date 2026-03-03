from decimal import Decimal
from sqlalchemy import Integer, String, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    ai_token_limit: Mapped[int] = mapped_column(Integer, nullable=False)  # monthly
    banner_limit: Mapped[int] = mapped_column(Integer, nullable=False)    # -1=unlimited
    post_limit: Mapped[int] = mapped_column(Integer, nullable=False)      # -1=unlimited
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")

    subscriptions: Mapped[list["Subscription"]] = relationship(
        "Subscription", back_populates="plan"
    )
