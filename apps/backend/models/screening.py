from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from db import Base


class UserCriteriaSettings(Base):
    __tablename__ = "user_criteria_settings"
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_criteria_settings_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    # Preset toggles
    growth_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    value_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    # Growth thresholds
    growth_revenue_growth_yoy: Mapped[float] = mapped_column(Numeric, nullable=False, server_default="0.15")
    growth_eps_growth_yoy: Mapped[float] = mapped_column(Numeric, nullable=False, server_default="0.10")
    growth_roe: Mapped[float] = mapped_column(Numeric, nullable=False, server_default="0.15")
    growth_fcf_margin: Mapped[float] = mapped_column(Numeric, nullable=False, server_default="0.0")

    # Growth individual toggles
    growth_revenue_growth_yoy_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    growth_eps_growth_yoy_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    growth_roe_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    growth_fcf_margin_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    # Value thresholds
    value_pe_ratio: Mapped[float] = mapped_column(Numeric, nullable=False, server_default="20.0")
    value_pb_ratio: Mapped[float] = mapped_column(Numeric, nullable=False, server_default="2.0")
    value_fcf_margin: Mapped[float] = mapped_column(Numeric, nullable=False, server_default="0.0")
    value_debt_to_equity: Mapped[float] = mapped_column(Numeric, nullable=False, server_default="1.0")

    # Value individual toggles
    value_pe_ratio_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    value_pb_ratio_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    value_fcf_margin_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    value_debt_to_equity_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    # Shortlist threshold (D-02: default 70%)
    shortlist_threshold: Mapped[float] = mapped_column(Numeric, nullable=False, server_default="0.70")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ShortlistScore(Base):
    __tablename__ = "shortlist_scores"
    __table_args__ = (UniqueConstraint("user_id", "company_id", name="uq_shortlist_user_company"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)

    # Score (0.0–1.0 percentage)
    score: Mapped[float] = mapped_column(Numeric, nullable=False)
    criteria_passed: Mapped[int] = mapped_column(Integer, nullable=False)
    criteria_total: Mapped[int] = mapped_column(Integer, nullable=False)

    # Preset-level pass flags (D-13)
    growth_passed: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    value_passed: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    # Manual bookmark override (D-14)
    is_watch: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    # Shortlisted = score >= threshold OR is_watch
    is_shortlisted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    scored_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
