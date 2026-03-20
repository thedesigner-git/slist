from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Numeric, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from db import Base


class Financials(Base):
    __tablename__ = "financials"
    __table_args__ = (UniqueConstraint("company_id", "period", name="uq_financials_company_period"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    period: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-QN
    revenue: Mapped[float] = mapped_column(Numeric, nullable=True)
    gross_profit: Mapped[float] = mapped_column(Numeric, nullable=True)
    operating_income: Mapped[float] = mapped_column(Numeric, nullable=True)
    net_income: Mapped[float] = mapped_column(Numeric, nullable=True)
    eps_diluted: Mapped[float] = mapped_column(Numeric, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BalanceSheet(Base):
    __tablename__ = "balance_sheets"
    __table_args__ = (UniqueConstraint("company_id", "period", name="uq_balance_sheets_company_period"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    period: Mapped[str] = mapped_column(String(10), nullable=False)
    total_assets: Mapped[float] = mapped_column(Numeric, nullable=True)
    total_debt: Mapped[float] = mapped_column(Numeric, nullable=True)
    total_equity: Mapped[float] = mapped_column(Numeric, nullable=True)
    cash: Mapped[float] = mapped_column(Numeric, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CashFlow(Base):
    __tablename__ = "cash_flows"
    __table_args__ = (UniqueConstraint("company_id", "period", name="uq_cash_flows_company_period"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    period: Mapped[str] = mapped_column(String(10), nullable=False)
    operating_cf: Mapped[float] = mapped_column(Numeric, nullable=True)
    capex: Mapped[float] = mapped_column(Numeric, nullable=True)
    free_cash_flow: Mapped[float] = mapped_column(Numeric, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
