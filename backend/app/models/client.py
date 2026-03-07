import datetime
from sqlalchemy import Integer, String, DateTime, Boolean, Enum, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
import enum


class ClientStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("active", "suspended", name="client_status"), default="active"
    )
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    account_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    login_count: Mapped[int] = mapped_column(Integer, default=0)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logo_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    reset_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reset_token_expires: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    # Relationships
    subscription: Mapped["Subscription"] = relationship(
        "Subscription", back_populates="client", uselist=False
    )
    login_logs: Mapped[list["LoginLog"]] = relationship(
        "LoginLog", back_populates="client"
    )
    generated_content: Mapped[list["GeneratedContent"]] = relationship(
        "GeneratedContent", back_populates="client"
    )
    banners: Mapped[list["Banner"]] = relationship(
        "Banner", back_populates="client"
    )
    posts: Mapped[list["Post"]] = relationship(
        "Post", back_populates="client"
    )
