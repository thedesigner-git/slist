from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from db import Base


class Ratio(Base):
    __tablename__ = "ratios"
    __table_args__ = (UniqueConstraint("company_id", "period", name="uq_ratios_company_period"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    period: Mapped[str] = mapped_column(String(10), nullable=False)
    pe_ratio: Mapped[float] = mapped_column(Numeric, nullable=True)
    pb_ratio: Mapped[float] = mapped_column(Numeric, nullable=True)
    roe: Mapped[float] = mapped_column(Numeric, nullable=True)
    ev_ebitda: Mapped[float] = mapped_column(Numeric, nullable=True)
    debt_to_equity: Mapped[float] = mapped_column(Numeric, nullable=True)
    # Extended metrics (v2)
    dividend_yield: Mapped[float] = mapped_column(Numeric, nullable=True)
    price_to_sales: Mapped[float] = mapped_column(Numeric, nullable=True)
    current_ratio: Mapped[float] = mapped_column(Numeric, nullable=True)
    interest_coverage: Mapped[float] = mapped_column(Numeric, nullable=True)
    price_fcf: Mapped[float] = mapped_column(Numeric, nullable=True)
    roa: Mapped[float] = mapped_column(Numeric, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
