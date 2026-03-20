import logging

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from agent.scoring import score_all_companies
from auth import get_current_user
from db import Session as DBSession
from db import get_db
from models.company import Company
from models.screening import ShortlistScore, UserCriteriaSettings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/criteria", tags=["criteria"])

# Module-level dict tracking per-user background recalculation state
_recalc_in_progress: dict[str, bool] = {}


# ---------------------------------------------------------------------------
# Pydantic schema for partial settings update
# ---------------------------------------------------------------------------

class CriteriaSettingsUpdate(BaseModel):
    growth_enabled: bool | None = None
    value_enabled: bool | None = None

    growth_revenue_growth_yoy: float | None = None
    growth_eps_growth_yoy: float | None = None
    growth_roe: float | None = None
    growth_fcf_margin: float | None = None

    growth_revenue_growth_yoy_enabled: bool | None = None
    growth_eps_growth_yoy_enabled: bool | None = None
    growth_roe_enabled: bool | None = None
    growth_fcf_margin_enabled: bool | None = None

    value_pe_ratio: float | None = None
    value_pb_ratio: float | None = None
    value_fcf_margin: float | None = None
    value_debt_to_equity: float | None = None

    value_pe_ratio_enabled: bool | None = None
    value_pb_ratio_enabled: bool | None = None
    value_fcf_margin_enabled: bool | None = None
    value_debt_to_equity_enabled: bool | None = None

    shortlist_threshold: float | None = None


# ---------------------------------------------------------------------------
# Helper: serialize settings to dict
# ---------------------------------------------------------------------------

def _settings_to_dict(s: UserCriteriaSettings) -> dict:
    return {
        "growth_enabled": s.growth_enabled,
        "value_enabled": s.value_enabled,
        "growth_revenue_growth_yoy": float(s.growth_revenue_growth_yoy),
        "growth_eps_growth_yoy": float(s.growth_eps_growth_yoy),
        "growth_roe": float(s.growth_roe),
        "growth_fcf_margin": float(s.growth_fcf_margin),
        "growth_revenue_growth_yoy_enabled": s.growth_revenue_growth_yoy_enabled,
        "growth_eps_growth_yoy_enabled": s.growth_eps_growth_yoy_enabled,
        "growth_roe_enabled": s.growth_roe_enabled,
        "growth_fcf_margin_enabled": s.growth_fcf_margin_enabled,
        "value_pe_ratio": float(s.value_pe_ratio),
        "value_pb_ratio": float(s.value_pb_ratio),
        "value_fcf_margin": float(s.value_fcf_margin),
        "value_debt_to_equity": float(s.value_debt_to_equity),
        "value_pe_ratio_enabled": s.value_pe_ratio_enabled,
        "value_pb_ratio_enabled": s.value_pb_ratio_enabled,
        "value_fcf_margin_enabled": s.value_fcf_margin_enabled,
        "value_debt_to_equity_enabled": s.value_debt_to_equity_enabled,
        "shortlist_threshold": float(s.shortlist_threshold),
    }


# ---------------------------------------------------------------------------
# Helper: load or create settings for a user (seeds defaults on first access)
# ---------------------------------------------------------------------------

def _get_or_create_settings(db: Session, user_id: str) -> UserCriteriaSettings:
    settings = db.query(UserCriteriaSettings).filter(
        UserCriteriaSettings.user_id == user_id
    ).first()
    if settings is None:
        settings = UserCriteriaSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
        logger.info("Created default criteria settings for user %s", user_id)
    return settings


# ---------------------------------------------------------------------------
# Background recalculation wrapper
# ---------------------------------------------------------------------------

def score_all_companies_wrapper(user_id: str) -> None:
    """Open a fresh DB session, run scoring for user, close session."""
    _recalc_in_progress[user_id] = True
    db = DBSession()
    try:
        score_all_companies(db, user_id)
    except Exception as e:
        logger.error("Background scoring failed for user %s: %s", user_id, e)
    finally:
        db.close()
        _recalc_in_progress[user_id] = False


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/settings")
def get_settings(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return user's criteria settings, seeding defaults on first access (per D-08)."""
    user_id: str = user["sub"]
    settings = _get_or_create_settings(db, user_id)
    return _settings_to_dict(settings)


@router.put("/settings")
def update_settings(
    update: CriteriaSettingsUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update criteria thresholds/toggles.

    Settings are saved immediately (per D-06). Score recalculates asynchronously
    in the background — response includes X-Recalculating: true header so the
    frontend can show a spinner.
    """
    user_id: str = user["sub"]
    settings = _get_or_create_settings(db, user_id)

    # Apply only the fields that were explicitly provided in the request body
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)

    # Trigger background recalculation (per D-06)
    background_tasks.add_task(score_all_companies_wrapper, user_id)

    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=_settings_to_dict(settings),
        headers={"X-Recalculating": "true"},
    )


@router.patch("/watch/{company_id}")
def toggle_watch(
    company_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Toggle Watch bookmark for a company (per D-14, D-15).

    Watch forces is_shortlisted=True regardless of score.
    Removing Watch restores score-based eligibility.
    """
    user_id: str = user["sub"]

    row = db.query(ShortlistScore).filter(
        ShortlistScore.user_id == user_id,
        ShortlistScore.company_id == company_id,
    ).first()

    if row is None:
        # No score row yet — create with Watch=True immediately (per D-14)
        row = ShortlistScore(
            user_id=user_id,
            company_id=company_id,
            score=0.0,
            criteria_passed=0,
            criteria_total=0,
            growth_passed=False,
            value_passed=False,
            is_watch=True,
            is_shortlisted=True,
        )
        db.add(row)
    else:
        # Flip the Watch flag
        row.is_watch = not row.is_watch
        if row.is_watch:
            # Watch ON → force onto shortlist (per D-14)
            row.is_shortlisted = True
        else:
            # Watch OFF → restore score-based eligibility (per D-15)
            settings = _get_or_create_settings(db, user_id)
            threshold = float(settings.shortlist_threshold)
            row.is_shortlisted = float(row.score) >= threshold

    db.commit()
    db.refresh(row)
    return {
        "company_id": company_id,
        "is_watch": row.is_watch,
        "is_shortlisted": row.is_shortlisted,
    }


@router.get("/shortlist")
def get_shortlist(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all shortlisted companies for the user (score >= threshold OR is_watch)."""
    user_id: str = user["sub"]

    rows = (
        db.query(ShortlistScore, Company)
        .join(Company, ShortlistScore.company_id == Company.id)
        .filter(
            ShortlistScore.user_id == user_id,
            ShortlistScore.is_shortlisted == True,
        )
        .all()
    )

    return [
        {
            "company_id": score.company_id,
            "ticker": company.ticker,
            "name": company.name,
            "market": company.market,
            "sector": company.sector,
            "score": float(score.score),
            "criteria_passed": score.criteria_passed,
            "criteria_total": score.criteria_total,
            "growth_passed": score.growth_passed,
            "value_passed": score.value_passed,
            "is_watch": score.is_watch,
        }
        for score, company in rows
    ]


@router.get("/scores")
def get_scores(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return scores for ALL companies (shortlisted or not) so frontend can show full list."""
    user_id: str = user["sub"]

    rows = (
        db.query(ShortlistScore, Company)
        .join(Company, ShortlistScore.company_id == Company.id)
        .filter(ShortlistScore.user_id == user_id)
        .all()
    )

    return [
        {
            "company_id": score.company_id,
            "ticker": company.ticker,
            "name": company.name,
            "market": company.market,
            "sector": company.sector,
            "score": float(score.score),
            "criteria_passed": score.criteria_passed,
            "criteria_total": score.criteria_total,
            "growth_passed": score.growth_passed,
            "value_passed": score.value_passed,
            "is_watch": score.is_watch,
        }
        for score, company in rows
    ]


@router.get("/status")
def get_recalc_status(
    user: dict = Depends(get_current_user),
):
    """Check whether background scoring recalculation is in progress for this user."""
    user_id: str = user["sub"]
    return {"recalculating": _recalc_in_progress.get(user_id, False)}
