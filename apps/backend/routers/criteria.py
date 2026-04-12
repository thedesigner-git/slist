import logging
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from agent.scoring import score_all_companies
from auth import get_current_user
from criteria_defs import ALL_CRITERIA, CRITERIA_BY_ID, build_default_settings
from db import Session as DBSession, get_db
from models.company import Company
from models.screening import ShortlistScore, UserCriteriaSettings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/criteria", tags=["criteria"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class CriterionSettingUpdate(BaseModel):
    enabled: Optional[bool] = None
    threshold: Optional[float] = None


class CriteriaSettingsUpdate(BaseModel):
    growth_enabled: Optional[bool] = None
    value_enabled: Optional[bool] = None
    growth_pass_threshold: Optional[int] = None
    value_pass_threshold: Optional[int] = None
    shortlist_threshold: Optional[float] = None
    criteria: Optional[dict[str, CriterionSettingUpdate]] = None


# ---------------------------------------------------------------------------
# Helper: serialize settings to dict
# ---------------------------------------------------------------------------

def _settings_to_dict(s: UserCriteriaSettings) -> dict:
    # Fill null thresholds with defaults so frontend always shows a value
    raw = s.criteria or {}
    criteria = {}
    for cid, vals in raw.items():
        t = vals.get("threshold")
        if t is None and cid in CRITERIA_BY_ID:
            t = CRITERIA_BY_ID[cid].default_threshold
        criteria[cid] = {**vals, "threshold": t}
    return {
        "growth_enabled": s.growth_enabled,
        "value_enabled": s.value_enabled,
        "growth_pass_threshold": int(s.growth_pass_threshold),
        "value_pass_threshold": int(s.value_pass_threshold),
        "shortlist_threshold": float(s.shortlist_threshold),
        "criteria": criteria,
    }


# ---------------------------------------------------------------------------
# Helper: load or create settings for a user (seeds defaults on first access)
# ---------------------------------------------------------------------------

def _get_or_create_settings(db: Session, user_id: str) -> UserCriteriaSettings:
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
        db.commit()
        db.refresh(settings)
        logger.info("Created default criteria settings for user %s", user_id)
    return settings


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
    # Trigger scoring on first load if no scores exist yet
    has_scores = db.query(ShortlistScore).filter(
        ShortlistScore.user_id == user_id
    ).first() is not None
    if not has_scores:
        scoring_db = DBSession()
        try:
            score_all_companies(scoring_db, user_id)
        except Exception as e:
            logger.error("Initial scoring failed for user %s: %s", user_id, e)
        finally:
            scoring_db.close()
    return _settings_to_dict(settings)


@router.put("/settings")
def update_settings(
    update: CriteriaSettingsUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update criteria thresholds/toggles.

    Settings saved immediately (per D-06). Score recalculates asynchronously.
    Supports partial updates — only provided fields are changed.
    """
    user_id: str = user["sub"]
    settings = _get_or_create_settings(db, user_id)

    update_data = update.model_dump(exclude_unset=True)

    # Handle top-level scalar fields
    for field in ("growth_enabled", "value_enabled", "growth_pass_threshold",
                  "value_pass_threshold", "shortlist_threshold"):
        if field in update_data:
            setattr(settings, field, update_data[field])

    # Handle criteria JSONB merge (partial update)
    if "criteria" in update_data and update_data["criteria"]:
        current_criteria = dict(settings.criteria or {})
        for crit_id, crit_update in update_data["criteria"].items():
            if crit_id not in current_criteria:
                current_criteria[crit_id] = {}
            if isinstance(crit_update, dict):
                current_criteria[crit_id].update(
                    {k: v for k, v in crit_update.items() if v is not None}
                )
            else:
                # Pydantic model
                for k, v in crit_update.model_dump(exclude_unset=True).items():
                    current_criteria[crit_id][k] = v
        # Force SQLAlchemy to detect JSONB mutation
        settings.criteria = current_criteria

    db.commit()
    db.refresh(settings)

    # Use a fresh session for scoring — the request session's identity map and
    # transaction state can cause score_all_companies to fail silently.
    scoring_db = DBSession()
    try:
        score_all_companies(scoring_db, user_id)
    except Exception as e:
        logger.error("Scoring failed for user %s: %s", user_id, e)
    finally:
        scoring_db.close()

    return JSONResponse(content=_settings_to_dict(settings))


@router.patch("/watch/{company_id}")
def toggle_watch(
    company_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle Watch bookmark for a company (per D-14, D-15)."""
    user_id: str = user["sub"]

    row = db.query(ShortlistScore).filter(
        ShortlistScore.user_id == user_id,
        ShortlistScore.company_id == company_id,
    ).first()

    if row is None:
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
        row.is_watch = not row.is_watch
        if row.is_watch:
            row.is_shortlisted = True
        else:
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
    """Return all shortlisted companies for the user."""
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
    """Return scores for ALL companies."""
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


@router.get("/definitions")
def get_criteria_definitions():
    """Return all 20 criteria definitions for the frontend to render the criteria modal."""
    return [
        {
            "id": c.id,
            "label": c.label,
            "preset": c.preset,
            "direction": c.direction,
            "default_threshold": c.default_threshold,
            "default_enabled": c.default_enabled,
            "is_boolean": c.is_boolean,
            "suffix": c.suffix,
        }
        for c in ALL_CRITERIA
    ]


@router.get("/status")
def get_recalc_status(
    user: dict = Depends(get_current_user),
):
    """Scoring is now synchronous — always returns recalculating=False."""
    return {"recalculating": False}
