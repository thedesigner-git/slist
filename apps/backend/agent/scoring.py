"""
Screening engine: TTM metric computation and company scoring.

v2: Supports all 20 criteria (10 growth + 10 value) dynamically via JSONB settings.

Public API:
  - compute_ttm_metrics(db, company_id, market) -> dict
  - score_company(ttm, settings) -> dict
  - score_all_companies(db, user_id) -> None
"""
import logging
from typing import Optional

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from criteria_defs import (
    ALL_CRITERIA,
    CRITERIA_BY_ID,
    GROWTH_CRITERIA,
    VALUE_CRITERIA,
    build_default_settings,
)
from models.company import Company
from models.financials import Financials
from models.growth import GrowthMetric
from models.ratios import Ratio
from models.screening import ShortlistScore, UserCriteriaSettings

logger = logging.getLogger(__name__)  # v2


def _avg(values: list) -> Optional[float]:
    """Average non-None numeric values. Returns None if all are None."""
    non_null = [float(v) for v in values if v is not None]
    if not non_null:
        return None
    return sum(non_null) / len(non_null)


def compute_ttm_metrics(db: Session, company_id: int, market: str = "US") -> dict:
    """
    Compute TTM (trailing twelve months) averaged metrics for a company.

    Queries last 4 quarters from growth_metrics and ratios tables, averages
    all non-null values per field. Returns a dict with metric keys matching
    criteria_defs.py metric_key values.

    Per D-11: companies with fewer than 4 quarters are screened on whatever
    data is available.
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

    avg_pe = _avg([r.pe_ratio for r in ratio_rows])
    avg_eps_growth = _avg([r.eps_growth_yoy for r in growth_rows])

    # PEG ratio: P/E divided by EPS growth rate (as a percentage, e.g. 0.15 → 15)
    # Undefined when EPS growth is zero or negative (would give misleading signal)
    if avg_pe is not None and avg_eps_growth is not None and avg_eps_growth > 0:
        peg_ratio = float(avg_pe) / (float(avg_eps_growth) * 100)
    else:
        peg_ratio = None

    return {
        # Growth metrics
        "revenue_growth_yoy": _avg([r.revenue_growth_yoy for r in growth_rows]),
        "eps_growth_yoy": avg_eps_growth,
        "roe": _avg([r.roe for r in ratio_rows]),
        "gross_margin": _avg([r.gross_margin for r in growth_rows]),
        "operating_margin": _avg([r.operating_margin for r in growth_rows]),
        "fcf_growth": _avg([r.fcf_growth for r in growth_rows]),
        "net_profit_margin": _avg([r.net_profit_margin for r in growth_rows]),
        "rd_percent": _avg([r.rd_percent for r in growth_rows]),
        "peg_ratio": peg_ratio,
        "roa": _avg([r.roa for r in ratio_rows]),

        # Value metrics
        "pe_ratio": avg_pe,
        "pb_ratio": _avg([r.pb_ratio for r in ratio_rows]),
        "fcf_margin": _avg([r.fcf_margin for r in growth_rows]),
        "debt_to_equity": _avg([r.debt_to_equity for r in ratio_rows]),
        "ev_ebitda": _avg([r.ev_ebitda for r in ratio_rows]),
        "dividend_yield": _avg([r.dividend_yield for r in ratio_rows]),
        "price_to_sales": _avg([r.price_to_sales for r in ratio_rows]),
        "current_ratio": _avg([r.current_ratio for r in ratio_rows]),
        "interest_coverage": _avg([r.interest_coverage for r in ratio_rows]),
        "price_fcf": _avg([r.price_fcf for r in ratio_rows]),
    }


def score_company(ttm: dict, settings: UserCriteriaSettings) -> dict:
    """
    Score a company against user criteria settings. Pure function — no DB access.

    Evaluates all 20 criteria dynamically from the JSONB criteria field.

    Returns:
        score: float (0.0-1.0)
        criteria_passed: int
        criteria_total: int
        growth_passed: bool
        value_passed: bool
        is_shortlisted: bool
    """
    criteria_config = settings.criteria or {}
    growth_passed_count = 0
    growth_total = 0
    value_passed_count = 0
    value_total = 0

    for cdef in ALL_CRITERIA:
        # Check if the preset is enabled
        if cdef.preset == "growth" and not settings.growth_enabled:
            continue
        if cdef.preset == "value" and not settings.value_enabled:
            continue

        # Check if individual criterion is enabled
        crit_settings = criteria_config.get(cdef.id, {})
        if not crit_settings.get("enabled", cdef.default_enabled):
            continue

        # Count toward preset total
        if cdef.preset == "growth":
            growth_total += 1
        else:
            value_total += 1

        # Evaluate
        passed = _evaluate_criterion(cdef, ttm, crit_settings)

        if passed:
            if cdef.preset == "growth":
                growth_passed_count += 1
            else:
                value_passed_count += 1

    criteria_total = growth_total + value_total
    criteria_passed = growth_passed_count + value_passed_count
    score = criteria_passed / criteria_total if criteria_total > 0 else 0.0

    threshold = float(settings.shortlist_threshold)

    # D-13: growth_passed = passes growth pass threshold
    growth_passed = (
        growth_passed_count >= int(settings.growth_pass_threshold)
        if settings.growth_enabled and growth_total > 0
        else False
    )
    value_passed = (
        value_passed_count >= int(settings.value_pass_threshold)
        if settings.value_enabled and value_total > 0
        else False
    )

    is_shortlisted = score >= threshold

    return {
        "score": score,
        "criteria_passed": criteria_passed,
        "criteria_total": criteria_total,
        "growth_passed": growth_passed,
        "value_passed": value_passed,
        "growth_criteria_passed": growth_passed_count,
        "value_criteria_passed": value_passed_count,
        "is_shortlisted": is_shortlisted,
    }


def _evaluate_criterion(cdef, ttm: dict, crit_settings: dict) -> bool:
    """
    Evaluate a single criterion against TTM metrics.

    Boolean criteria: the TTM value is already True/False.
    Numeric criteria: compare against the user's threshold (or default).

    Per D-04: None/missing metric values count as FAILED.
    """
    val = ttm.get(cdef.metric_key)

    if val is None:
        return False

    # Stored threshold may be null (e.g. criteria converted from boolean); fall back to default
    threshold = crit_settings.get("threshold")
    if threshold is None:
        threshold = cdef.default_threshold
    if threshold is None:
        return False

    val = float(val)
    threshold = float(threshold)

    if cdef.direction == ">":
        return val > threshold
    else:  # "<"
        return val < threshold


def score_all_companies(db: Session, user_id: str) -> None:
    """
    Compute and upsert ShortlistScore for every company for the given user.

    Per D-08: if no UserCriteriaSettings exists for this user, create one with defaults.
    Per D-14: preserves existing is_watch flags.
    Per D-02: is_shortlisted = score >= threshold OR is_watch.

    Stale-write protection: snapshots settings.updated_at at the start. Before
    committing, re-reads it from DB (bypassing the session identity-map cache).
    If settings were changed while this task was running, the commit is skipped —
    a newer scoring task (triggered by the latest PUT) will write the correct results.
    This eliminates the race condition where a slow task overwrites correct scores
    with results computed against old thresholds.
    """
    print(f"[SCORE_ALL] START user={user_id}", flush=True)
    settings = db.query(UserCriteriaSettings).filter(
        UserCriteriaSettings.user_id == user_id
    ).first()
    if settings is None:
        defaults = build_default_settings()
        settings = UserCriteriaSettings(
            user_id=user_id,
            growth_enabled=defaults["growth_enabled"],
            value_enabled=defaults["value_enabled"],
            growth_pass_threshold=defaults["growth_pass_threshold"],
            value_pass_threshold=defaults["value_pass_threshold"],
            shortlist_threshold=defaults["shortlist_threshold"],
            criteria=defaults["criteria"],
        )
        db.add(settings)
        db.flush()
        logger.info("Created default criteria settings for user %s", user_id)

    # Snapshot the key threshold values so we can detect changes later.
    # We compare using a direct SQL query (not the SQLAlchemy identity-map cache)
    # at the end of scoring to decide whether to commit or discard.
    vpt_snapshot = int(settings.value_pass_threshold)
    gpt_snapshot = int(settings.growth_pass_threshold)

    # Load existing Watch flags to preserve them
    existing_watches: dict[int, bool] = {}
    existing_rows = db.query(ShortlistScore).filter(
        ShortlistScore.user_id == user_id
    ).all()
    for row in existing_rows:
        existing_watches[row.company_id] = row.is_watch

    # Score all companies
    companies = db.query(Company).all()
    logger.info("Scoring %d companies for user %s", len(companies), user_id)

    for company in companies:
        ttm = compute_ttm_metrics(db, company.id, market=company.market or "US")
        score_result = score_company(ttm, settings)

        is_watch = existing_watches.get(company.id, False)
        is_shortlisted = score_result["is_shortlisted"] or is_watch

        data = {
            "user_id": user_id,
            "company_id": company.id,
            "score": score_result["score"],
            "criteria_passed": score_result["criteria_passed"],
            "criteria_total": score_result["criteria_total"],
            "growth_passed": score_result["growth_passed"],
            "value_passed": score_result["value_passed"],
            "growth_criteria_passed": score_result["growth_criteria_passed"],
            "value_criteria_passed": score_result["value_criteria_passed"],
            "is_watch": is_watch,
            "is_shortlisted": is_shortlisted,
        }
        stmt = pg_insert(ShortlistScore).values(**data)
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

    # Stale-write guard: bypass SQLAlchemy's identity-map cache with a raw SQL
    # query and compare current thresholds to our snapshot. If they changed
    # while we were scoring, our results are stale — skip the commit.
    # A newer task (triggered by the latest PUT) will write correct scores.
    from sqlalchemy import text
    row = db.execute(
        text("SELECT value_pass_threshold, growth_pass_threshold "
             "FROM user_criteria_settings WHERE user_id = :uid"),
        {"uid": user_id},
    ).fetchone()

    current_vpt = int(row[0]) if row else None
    current_gpt = int(row[1]) if row else None
    print(f"[STALE CHECK] user={user_id} snapshot vpt={vpt_snapshot} gpt={gpt_snapshot} | current vpt={current_vpt} gpt={current_gpt}", flush=True)

    if row is None or current_vpt != vpt_snapshot or current_gpt != gpt_snapshot:
        db.rollback()
        print(f"[STALE CHECK] ROLLING BACK — settings changed mid-run", flush=True)
        return

    db.commit()
    print(f"[STALE CHECK] COMMITTED vpt={vpt_snapshot}", flush=True)
