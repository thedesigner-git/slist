"""
Companies router — endpoints consumed by the Alphascreen-web frontend.

Provides:
  GET  /api/companies                       - shortlist rows (list view)
  GET  /api/companies/{ticker}              - company detail
  GET  /api/companies/{ticker}/price-history - yfinance OHLCV data
  POST /api/companies/{ticker}/watch        - add to watchlist
  POST /api/companies/{ticker}/unwatch      - remove from watchlist
"""
import logging
import re
from typing import Optional

import yfinance as yf
from fastapi import APIRouter, Depends, HTTPException

_TICKER_RE = re.compile(r'^[A-Z0-9.\-]{1,12}$')


def _validate_ticker(ticker: str) -> str:
    t = ticker.upper().strip()
    if not _TICKER_RE.match(t):
        raise HTTPException(status_code=400, detail="Invalid ticker format")
    return t
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from auth import get_current_user
from criteria_defs import ALL_CRITERIA, CRITERIA_BY_ID, build_default_settings
from db import get_db
from models.company import Company
from models.filing import Filing
from models.growth import GrowthMetric
from models.news import News
from models.ratios import Ratio
from models.screening import ShortlistScore, UserCriteriaSettings
from agent.scoring import compute_ttm_metrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/companies", tags=["companies"])


# ---------------------------------------------------------------------------
# Helpers
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
    return settings


def _get_score_row(db: Session, user_id: str, company_id: int) -> Optional[ShortlistScore]:
    return db.query(ShortlistScore).filter(
        ShortlistScore.user_id == user_id,
        ShortlistScore.company_id == company_id,
    ).first()


def _labels_for(score_row: Optional[ShortlistScore]) -> list[str]:
    if score_row is None:
        return []
    labels = []
    g = score_row.growth_criteria_passed or 0
    v = score_row.value_criteria_passed or 0

    if score_row.growth_passed and score_row.value_passed:
        # Both pass: categorize by whichever has more criteria passed
        labels.append("Growth" if g >= v else "Value")
    elif score_row.growth_passed:
        labels.append("Growth")
    elif score_row.value_passed:
        labels.append("Value")
    else:
        # Neither passes: assign best-fit based on criteria counts
        if g > 0 or v > 0:
            labels.append("Growth" if g >= v else "Value")

    if score_row.is_watch:
        labels.append("Watch")
    return labels


def _get_latest_ratio(db: Session, company_id: int) -> Optional[Ratio]:
    return (
        db.query(Ratio)
        .filter(Ratio.company_id == company_id)
        .order_by(Ratio.period.desc())
        .first()
    )


def _get_latest_growth(db: Session, company_id: int) -> Optional[GrowthMetric]:
    return (
        db.query(GrowthMetric)
        .filter(GrowthMetric.company_id == company_id)
        .order_by(GrowthMetric.period.desc())
        .first()
    )


def _current_price_and_change(ticker: str) -> tuple[Optional[float], Optional[float]]:
    """Fetch today's price and % change from yfinance. Returns (None, None) on error."""
    try:
        info = yf.Ticker(ticker).fast_info
        price = float(info.last_price) if info.last_price else None
        prev_close = float(info.previous_close) if info.previous_close else None
        change_pct = None
        if price is not None and prev_close and prev_close != 0:
            change_pct = (price - prev_close) / prev_close * 100
        return price, change_pct
    except Exception:
        return None, None


def _build_criteria_results(
    ttm: dict,
    settings: UserCriteriaSettings,
) -> list[dict]:
    """Build per-criterion pass/fail breakdown for the detail view."""
    criteria_config = settings.criteria or {}
    results = []
    for cdef in ALL_CRITERIA:
        crit_cfg = criteria_config.get(cdef.id, {})
        enabled = crit_cfg.get("enabled", cdef.default_enabled)
        threshold = crit_cfg.get("threshold", cdef.default_threshold)
        val = ttm.get(cdef.metric_key)

        if val is None:
            passed = None
        elif cdef.is_boolean:
            passed = bool(val)
        else:
            t = float(threshold) if threshold is not None else None
            if t is None:
                passed = None
            else:
                fval = float(val)
                passed = fval > t if cdef.direction == ">" else fval < t

        results.append({
            "id": cdef.id,
            "label": cdef.label,
            "group": cdef.preset,
            "enabled": enabled,
            "passed": passed,
            "value": float(val) if val is not None and not isinstance(val, bool) else None,
            "threshold": threshold,
        })
    return results


# ---------------------------------------------------------------------------
# GET /api/companies
# ---------------------------------------------------------------------------

def _safe_float(val) -> Optional[float]:
    """Safely convert a DB numeric value to float or None."""
    if val is None:
        return None
    return float(val)


@router.get("")
def list_companies(
    market: Optional[str] = None,
    strategy: Optional[str] = None,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return ALL companies as ShortlistRow objects with full metrics.
    Companies without a ShortlistScore are included with empty labels.
    Optionally filter by market (US/EU/DE/CN) and strategy (Growth/Value).
    """
    user_id: str = user["sub"]

    # Query all companies, left-joining with user's score data
    query = (
        db.query(Company, ShortlistScore)
        .outerjoin(
            ShortlistScore,
            (ShortlistScore.company_id == Company.id) & (ShortlistScore.user_id == user_id),
        )
    )

    if market:
        query = query.filter(Company.market == market.upper())

    if strategy == "Growth":
        query = query.filter(ShortlistScore.growth_passed == True)
    elif strategy == "Value":
        query = query.filter(ShortlistScore.value_passed == True)

    rows = query.all()

    results = []
    for company, score_row in rows:
        ratio = _get_latest_ratio(db, company.id)
        growth = _get_latest_growth(db, company.id)

        results.append({
            "id": company.id,
            "ticker": company.ticker,
            "name": company.name,
            "market": company.market,
            "sector": company.sector,
            "is_watched": score_row.is_watch if score_row else False,
            "current_price": None,
            "price_change_pct": None,
            # Growth metrics (all fields)
            "revenue_growth_yoy": _safe_float(growth.revenue_growth_yoy) if growth else None,
            "eps_growth_yoy": _safe_float(growth.eps_growth_yoy) if growth else None,
            "roe": _safe_float(ratio.roe) if ratio else None,
            "gross_margin": _safe_float(growth.gross_margin) if growth else None,
            "operating_margin": _safe_float(growth.operating_margin) if growth else None,
            "net_profit_margin": _safe_float(growth.net_profit_margin) if growth else None,
            "fcf_growth": _safe_float(growth.fcf_growth) if growth else None,
            "rd_percent": _safe_float(growth.rd_percent) if growth else None,
            "fcf_margin": _safe_float(growth.fcf_margin) if growth else None,
            # Derived: PEG = pe_ratio / (eps_growth_yoy * 100), null when growth <= 0
            "peg_ratio": (
                _safe_float(ratio.pe_ratio) / (_safe_float(growth.eps_growth_yoy) * 100)
                if ratio and growth
                   and ratio.pe_ratio is not None
                   and growth.eps_growth_yoy is not None
                   and float(growth.eps_growth_yoy) > 0
                else None
            ),
            # Ratio metrics (all fields)
            "roa": _safe_float(ratio.roa) if ratio else None,
            "pe_ratio": _safe_float(ratio.pe_ratio) if ratio else None,
            "pb_ratio": _safe_float(ratio.pb_ratio) if ratio else None,
            "ev_ebitda": _safe_float(ratio.ev_ebitda) if ratio else None,
            "debt_equity": _safe_float(ratio.debt_to_equity) if ratio else None,
            "dividend_yield": _safe_float(ratio.dividend_yield) if ratio else None,
            "price_to_sales": _safe_float(ratio.price_to_sales) if ratio else None,
            "current_ratio": _safe_float(ratio.current_ratio) if ratio else None,
            "interest_coverage": _safe_float(ratio.interest_coverage) if ratio else None,
            "price_fcf": _safe_float(ratio.price_fcf) if ratio else None,
            # Score
            "score": round(float(score_row.score) * 100, 1) if score_row and score_row.score is not None else None,
            "labels": _labels_for(score_row),
            "growth_passed": score_row.growth_passed if score_row else False,
            "value_passed": score_row.value_passed if score_row else False,
            "growth_criteria_passed": score_row.growth_criteria_passed if score_row else None,
            "value_criteria_passed": score_row.value_criteria_passed if score_row else None,
        })

    return results


# ---------------------------------------------------------------------------
# GET /api/companies/{ticker}
# ---------------------------------------------------------------------------

@router.get("/{ticker}")
def get_company(
    ticker: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return full company detail including ratios, growth metrics, score, and criteria breakdown."""
    user_id: str = user["sub"]
    ticker = _validate_ticker(ticker)

    company = db.query(Company).filter(Company.ticker == ticker).first()
    if company is None:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")

    ratio = _get_latest_ratio(db, company.id)
    growth = _get_latest_growth(db, company.id)
    score_row = _get_score_row(db, user_id, company.id)
    settings = _get_or_create_settings(db, user_id)

    current_price, _ = _current_price_and_change(ticker)

    ttm = compute_ttm_metrics(db, company.id, market=company.market or "US")
    criteria_results = _build_criteria_results(ttm, settings)

    ratios_out = None
    if ratio is not None:
        ratios_out = {
            "period": ratio.period,
            "pe_ratio": float(ratio.pe_ratio) if ratio.pe_ratio is not None else None,
            "pb_ratio": float(ratio.pb_ratio) if ratio.pb_ratio is not None else None,
            "ev_ebitda": float(ratio.ev_ebitda) if ratio.ev_ebitda is not None else None,
            "debt_equity": float(ratio.debt_to_equity) if ratio.debt_to_equity is not None else None,
            "dividend_yield": float(ratio.dividend_yield) if ratio.dividend_yield is not None else None,
            "price_to_sales": float(ratio.price_to_sales) if ratio.price_to_sales is not None else None,
            "current_ratio": float(ratio.current_ratio) if ratio.current_ratio is not None else None,
            "interest_coverage": float(ratio.interest_coverage) if ratio.interest_coverage is not None else None,
            "price_fcf": float(ratio.price_fcf) if ratio.price_fcf is not None else None,
            "current_price": current_price,
            "market_cap": float(company.market_cap) if company.market_cap is not None else None,
        }

    growth_out = None
    if growth is not None:
        growth_out = {
            "period": growth.period,
            "revenue_growth_yoy": float(growth.revenue_growth_yoy) if growth.revenue_growth_yoy is not None else None,
            "eps_growth_yoy": float(growth.eps_growth_yoy) if growth.eps_growth_yoy is not None else None,
            "roe": float(ratio.roe) if ratio and ratio.roe is not None else None,
            "gross_margin": float(growth.gross_margin) if growth.gross_margin is not None else None,
            "operating_margin": float(growth.operating_margin) if growth.operating_margin is not None else None,
            "net_profit_margin": float(growth.net_profit_margin) if growth.net_profit_margin is not None else None,
            "fcf_growth": float(growth.fcf_growth) if growth.fcf_growth is not None else None,
            "rd_percent": float(growth.rd_percent) if growth.rd_percent is not None else None,
        }

    score_out = None
    if score_row is not None:
        score_out = {
            "company_id": company.id,
            "score": round(float(score_row.score) * 100, 1),
            "growth_passed": score_row.growth_passed,
            "value_passed": score_row.value_passed,
            "labels": _labels_for(score_row),
            "criteria": criteria_results,
            "scored_at": score_row.scored_at.isoformat() if score_row.scored_at else None,
        }

    # News
    news_rows = (
        db.query(News)
        .filter(News.company_id == company.id)
        .order_by(News.published_at.desc().nullslast())
        .limit(10)
        .all()
    )
    news_out = [
        {
            "id": n.id,
            "headline": n.headline,
            "source": n.source,
            "url": n.url,
            "published_at": n.published_at.isoformat() if n.published_at else None,
        }
        for n in news_rows
    ]

    # Filings (SEC EDGAR)
    filing_rows = (
        db.query(Filing)
        .filter(Filing.company_id == company.id)
        .order_by(Filing.filed_date.desc().nullslast())
        .limit(10)
        .all()
    )
    filings_out = [
        {
            "type": f.form_type,
            "period": f.form_type,
            "filed_date": f.filed_date.isoformat() if f.filed_date else None,
            "url": f.doc_url,
        }
        for f in filing_rows
    ]

    # Earnings from latest financials (approximate from growth metrics)
    earnings_out = None
    if growth is not None:
        earnings_out = {
            "period": growth.period,
            "reported_date": None,
            "beat": None,
            "revenue": None,
            "revenue_growth_yoy": _safe_float(growth.revenue_growth_yoy),
            "eps": None,
            "eps_growth_yoy": _safe_float(growth.eps_growth_yoy),
            "next_earnings_date": None,
        }

    return {
        "id": company.id,
        "ticker": company.ticker,
        "name": company.name,
        "market": company.market,
        "sector": company.sector,
        "description": company.description,
        "location": company.location,
        "employees": company.employees,
        "founded": company.founded,
        "is_watched": score_row.is_watch if score_row else False,
        "ratios": ratios_out,
        "growth": growth_out,
        "score": score_out,
        "news": news_out,
        "filings": filings_out,
        "earnings": earnings_out,
    }


# ---------------------------------------------------------------------------
# GET /api/companies/{ticker}/price-history
# ---------------------------------------------------------------------------

@router.get("/{ticker}/price-history")
def get_price_history(
    ticker: str,
    period: str = "1y",
    interval: str = "1d",
    user: dict = Depends(get_current_user),
):
    """
    Fetch OHLCV price history from yfinance.

    period: 1mo, 3mo, 6mo, 1y, 2y, 5y
    interval: 1d, 1wk, 1mo
    """
    valid_periods = {"1mo", "3mo", "6mo", "1y", "2y", "5y"}
    valid_intervals = {"1d", "1wk", "1mo"}
    if period not in valid_periods:
        period = "1y"
    if interval not in valid_intervals:
        interval = "1d"

    ticker = _validate_ticker(ticker)
    try:
        hist = yf.Ticker(ticker).history(period=period, interval=interval)
        if hist.empty:
            return []
        hist = hist.reset_index()
        result = []
        for _, row in hist.iterrows():
            date_val = row["Date"]
            if hasattr(date_val, "date"):
                date_str = date_val.date().isoformat()
            else:
                date_str = str(date_val)[:10]
            result.append({
                "date": date_str,
                "open": round(float(row["Open"]), 4),
                "high": round(float(row["High"]), 4),
                "low": round(float(row["Low"]), 4),
                "close": round(float(row["Close"]), 4),
                "volume": int(row["Volume"]) if row["Volume"] is not None else 0,
            })
        return result
    except Exception as e:
        logger.warning("price-history error for %s: %s", ticker, e)
        raise HTTPException(status_code=502, detail=f"Failed to fetch price data: {e}")


# ---------------------------------------------------------------------------
# POST /api/companies/{ticker}/watch
# POST /api/companies/{ticker}/unwatch
# ---------------------------------------------------------------------------

def _set_watch(ticker: str, watched: bool, user_id: str, db: Session):
    ticker = ticker.upper()
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if company is None:
        raise HTTPException(status_code=404, detail=f"Company {ticker} not found")

    row = db.query(ShortlistScore).filter(
        ShortlistScore.user_id == user_id,
        ShortlistScore.company_id == company.id,
    ).first()

    if row is None:
        row = ShortlistScore(
            user_id=user_id,
            company_id=company.id,
            score=0.0,
            criteria_passed=0,
            criteria_total=0,
            growth_passed=False,
            value_passed=False,
            is_watch=watched,
            is_shortlisted=watched,
        )
        db.add(row)
    else:
        row.is_watch = watched
        if watched:
            row.is_shortlisted = True
        else:
            settings = _get_or_create_settings(db, user_id)
            row.is_shortlisted = float(row.score) >= float(settings.shortlist_threshold)

    db.commit()
    return {"ticker": ticker, "is_watched": watched}


@router.post("/{ticker}/watch")
def watch_company(
    ticker: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _set_watch(_validate_ticker(ticker), True, user["sub"], db)


@router.post("/{ticker}/unwatch")
def unwatch_company(
    ticker: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _set_watch(_validate_ticker(ticker), False, user["sub"], db)
