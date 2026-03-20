from datetime import datetime
from sqlalchemy import String, DateTime, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column
from db import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    market: Mapped[str] = mapped_column(String(5), nullable=False)   # US, DE, CN, EU
    exchange: Mapped[str] = mapped_column(String(50), nullable=True)
    sector: Mapped[str] = mapped_column(String(100), nullable=True)
    market_cap: Mapped[float] = mapped_column(Numeric, nullable=True)
    currency: Mapped[str] = mapped_column(String(5), nullable=True)
    last_fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    last_fetch_status: Mapped[str] = mapped_column(String(20), nullable=True)  # success, failed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
