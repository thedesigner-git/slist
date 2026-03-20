from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Numeric, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from db import Base


class GrowthMetric(Base):
    __tablename__ = "growth_metrics"
    __table_args__ = (UniqueConstraint("company_id", "period", name="uq_growth_metrics_company_period"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    period: Mapped[str] = mapped_column(String(10), nullable=False)
    revenue_growth_yoy: Mapped[float] = mapped_column(Numeric, nullable=True)
    eps_growth_yoy: Mapped[float] = mapped_column(Numeric, nullable=True)
    gross_margin: Mapped[float] = mapped_column(Numeric, nullable=True)
    operating_margin: Mapped[float] = mapped_column(Numeric, nullable=True)
    fcf_margin: Mapped[float] = mapped_column(Numeric, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
