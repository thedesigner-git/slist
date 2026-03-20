"""
Screening engine: TTM metric computation and company scoring.

Public API:
  - compute_ttm_metrics(db, company_id) -> dict
  - score_company(ttm, settings) -> dict
  - score_all_companies(db, user_id) -> None
"""
import logging
from typing import Optional

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from models.company import Company
from models.growth import GrowthMetric
from models.ratios import Ratio
from models.screening import ShortlistScore, UserCriteriaSettings

logger = logging.getLogger(__name__)


def _avg(values: list) -> Optional[float]:
    """Average non-None numeric values. Returns None if all are None."""
    non_null = [float(v) for v in values if v is not None]
    if not non_null:
        return None
    return sum(non_null) / len(non_null)


def compute_ttm_metrics(db: Session, company_id: int) -> dict:
    """
    Compute TTM (trailing twelve months) averaged metrics for a company.

    Queries last 4 quarters from growth_metrics and ratios tables, averages
    all non-null values per field. Returns a dict with 7 metric keys; each
    value is a float or None if all available quarters had null data.

    Per D-11: companies with fewer than 4 quarters are screened on whatever
    data is available — we average what we have.
    """
    growth_rows = (
        db.query(GrowthMetric)
        .filter(GrowthMetric.company_id == company_id)
        .order_by(GrowthMetric.period.desc())
        .limit(4)
        .all()
    )
    ratio_rows = (
        db.query(Ratio)
        .filter(Ratio.company_id == company_id)
        .order_by(Ratio.period.desc())
        .limit(4)
        .all()
    )

    return {
        "revenue_growth_yoy": _avg([r.revenue_growth_yoy for r in growth_rows]),
        "eps_growth_yoy": _avg([r.eps_growth_yoy for r in growth_rows]),
        "fcf_margin": _avg([r.fcf_margin for r in growth_rows]),
        # ROE is in the ratios table (not growth_metrics) per plan spec
        "roe": _avg([r.roe for r in ratio_rows]),
        "pe_ratio": _avg([r.pe_ratio for r in ratio_rows]),
        "pb_ratio": _avg([r.pb_ratio for r in ratio_rows]),
        "debt_to_equity": _avg([r.debt_to_equity for r in ratio_rows]),
    }


def score_company(ttm: dict, settings: UserCriteriaSettings) -> dict:
    """
    Score a company against user criteria settings. Pure function — no DB access.

    Returns:
        score: float (0.0–1.0) — percentage of active criteria passed
        criteria_passed: int
        criteria_total: int
        growth_passed: bool — passes growth preset threshold
        value_passed: bool — passes value preset threshold
        is_shortlisted: bool — score >= threshold (per D-02)

    Per D-03: threshold applies proportionally to active criteria only.
    Per D-04: null metric values count as failed.
    """
    growth_passed_count = 0
    growth_total = 0
    value_passed_count = 0
    value_total = 0

    def _check(metric_key: str, threshold: float, direction: str) -> bool:
        """Evaluate a single criterion. Returns True if passes, False if fails or null (D-04)."""
        val = ttm.get(metric_key)
        if val is None:
            return False
        if direction == ">":
            return float(val) > float(threshold)
        else:  # "<"
            return float(val) < float(threshold)

    # --- Growth criteria ---
    if settings.growth_enabled:
        if settings.growth_revenue_growth_yoy_enabled:
            growth_total += 1
            if _check("revenue_growth_yoy", settings.growth_revenue_growth_yoy, ">"):
                growth_passed_count += 1

        if settings.growth_eps_growth_yoy_enabled:
            growth_total += 1
            if _check("eps_growth_yoy", settings.growth_eps_growth_yoy, ">"):
                growth_passed_count += 1

        if settings.growth_roe_enabled:
            growth_total += 1
            if _check("roe", settings.growth_roe, ">"):
                growth_passed_count += 1

        if settings.growth_fcf_margin_enabled:
            growth_total += 1
            if _check("fcf_margin", settings.growth_fcf_margin, ">"):
                growth_passed_count += 1

    # --- Value criteria ---
    if settings.value_enabled:
        if settings.value_pe_ratio_enabled:
            value_total += 1
            if _check("pe_ratio", settings.value_pe_ratio, "<"):
                value_passed_count += 1

        if settings.value_pb_ratio_enabled:
            value_total += 1
            if _check("pb_ratio", settings.value_pb_ratio, "<"):
                value_passed_count += 1

        if settings.value_fcf_margin_enabled:
            value_total += 1
            if _check("fcf_margin", settings.value_fcf_margin, ">"):
                value_passed_count += 1

        if settings.value_debt_to_equity_enabled:
            value_total += 1
            if _check("debt_to_equity", settings.value_debt_to_equity, "<"):
                value_passed_count += 1

    criteria_total = growth_total + value_total
    criteria_passed = growth_passed_count + value_passed_count
    score = criteria_passed / criteria_total if criteria_total > 0 else 0.0

    threshold = float(settings.shortlist_threshold)

    # D-13: growth_passed = passes growth preset threshold; False if preset disabled
    growth_passed = (
        (growth_passed_count / growth_total) >= threshold
        if settings.growth_enabled and growth_total > 0
        else False
    )
    # D-13: value_passed = passes value preset threshold; False if preset disabled
    value_passed = (
        (value_passed_count / value_total) >= threshold
        if settings.value_enabled and value_total > 0
        else False
    )

    # D-02: is_shortlisted = overall score >= threshold
    is_shortlisted = score >= threshold

    return {
        "score": score,
        "criteria_passed": criteria_passed,
        "criteria_total": criteria_total,
        "growth_passed": growth_passed,
        "value_passed": value_passed,
        "is_shortlisted": is_shortlisted,
    }


def score_all_companies(db: Session, user_id: str) -> None:
    """
    Compute and upsert ShortlistScore for every company for the given user.

    Per D-08: if no UserCriteriaSettings exists for this user, create one with defaults.
    Per D-14: preserves existing is_watch flags — Watch bookmarks are not overwritten.
    Per D-02: is_shortlisted = score >= threshold OR is_watch.
    """
    # Load or create user settings
    settings = db.query(UserCriteriaSettings).filter(
        UserCriteriaSettings.user_id == user_id
    ).first()
    if settings is None:
        settings = UserCriteriaSettings(user_id=user_id)
        db.add(settings)
        db.flush()  # get server defaults applied in-memory
        logger.info("Created default criteria settings for user %s", user_id)

    # Load existing Watch flags to preserve them
    existing_watches: dict[int, bool] = {}
    existing_rows = db.query(ShortlistScore).filter(
        ShortlistScore.user_id == user_id
    ).all()
    for row in existing_rows:
        existing_watches[row.company_id] = row.is_watch

    # Score all companies
    company_ids = [row.id for row in db.query(Company.id).all()]
    logger.info("Scoring %d companies for user %s", len(company_ids), user_id)

    for company_id in company_ids:
        ttm = compute_ttm_metrics(db, company_id)
        score_result = score_company(ttm, settings)

        is_watch = existing_watches.get(company_id, False)
        is_shortlisted = score_result["is_shortlisted"] or is_watch

        data = {
            "user_id": user_id,
            "company_id": company_id,
            "score": score_result["score"],
            "criteria_passed": score_result["criteria_passed"],
            "criteria_total": score_result["criteria_total"],
            "growth_passed": score_result["growth_passed"],
            "value_passed": score_result["value_passed"],
            "is_watch": is_watch,
            "is_shortlisted": is_shortlisted,
        }
        stmt = pg_insert(ShortlistScore).values(**data)
        # Preserve is_watch on conflict — only update score fields
        update_cols = {
            k: stmt.excluded[k]
            for k in data
            if k not in ("user_id", "company_id", "is_watch")
        }
        stmt = stmt.on_conflict_do_update(
            index_elements=["user_id", "company_id"],
            set_=update_cols,
        )
        db.execute(stmt)

    db.commit()
    logger.info("Scoring complete for user %s", user_id)
