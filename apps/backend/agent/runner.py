import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from agent.edgar import get_filings
from agent.fetcher import fetch_company
from agent.growth import compute_growth
from agent.news import save_news
from agent.parser import parse_financials, parse_info, parse_news
from agent.ratios import compute_ratios
from agent.signals import generate_signals
from agent.store import (
    upsert_company,
    upsert_filings,
    upsert_financials,
    upsert_growth,
    upsert_ratios,
    upsert_signals,
)
from agent.scoring import score_all_companies
from db import Session
from models.agent_run import AgentRun, AgentRunResult
from models.company import Company
from models.screening import UserCriteriaSettings

logger = logging.getLogger(__name__)
SEED_PATH = Path(__file__).parent.parent / "data" / "seed_companies.json"


def _load_seed_companies() -> list[dict]:
    with open(SEED_PATH) as f:
        return json.load(f)


def run_company(db, company_seed: dict, run_id: int) -> tuple[str, int | None, str | None]:
    """Run the full pipeline for one company.

    Returns (status, company_id, error_message).
    status is 'success' or 'failed'.
    company_id is set on success; None if the company upsert itself failed.
    error_message is set on failure; None on success.
    """
    ticker = company_seed["ticker"]
    market = company_seed["market"]
    company_id: int | None = None
    try:
        # 1. Fetch
        result = fetch_company(ticker)
        if not result.success:
            raise ValueError(result.error or "fetch failed")

        # 2. Parse + store company
        parsed_info = parse_info(ticker, result.info)
        company_id = upsert_company(db, ticker, market, parsed_info)

        # 3. Financials
        quarters = parse_financials(
            ticker,
            result.quarterly_financials,
            result.quarterly_balance_sheet,
            result.quarterly_cashflow,
        )
        if quarters:
            upsert_financials(db, company_id, quarters)

            # 4. Ratios (latest quarter)
            latest_period = quarters[0]["period"]
            ratios = compute_ratios(result.info)
            upsert_ratios(db, company_id, latest_period, ratios)

            # 5. Growth metrics
            growth_metrics = compute_growth(quarters)
            if growth_metrics:
                upsert_growth(db, company_id, growth_metrics)

                # 6. Signals (latest period with growth data)
                latest_growth = growth_metrics[0]
                signals = generate_signals(
                    latest_growth["period"], latest_growth, ratios,
                    quarters[0].get("balance_sheet", {}),
                )
                upsert_signals(db, company_id, signals)

        # 7. SEC filings (US only)
        filings = get_filings(ticker)
        if filings:
            upsert_filings(db, company_id, filings)

        # 8. News
        news_items = parse_news(ticker, company_id, result.news)
        save_news(db, company_id, news_items)

        # 9. Update company fetch status
        db.query(Company).filter(Company.id == company_id).update({
            "last_fetched_at": datetime.now(timezone.utc),
            "last_fetch_status": "success",
        })
        db.commit()
        return "success", company_id, None

    except Exception as e:
        logger.error(f"Failed to process {ticker}: {e}")
        db.rollback()
        return "failed", company_id, str(e)


def run_all():
    """Full agent run: fetch all seed companies, log results."""
    companies = _load_seed_companies()
    db = Session()
    run = AgentRun(
        started_at=datetime.now(timezone.utc),
        status="running",
        companies_total=len(companies),
        companies_success=0,
        companies_failed=0,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    success_count = 0
    failed_count = 0

    for company in companies:
        status, company_id, error = run_company(db, company, run.id)

        result = AgentRunResult(
            run_id=run.id,
            company_id=company_id,
            status=status,
            error_message=error,
            fetched_at=datetime.now(timezone.utc),
        )
        db.add(result)

        if status == "success":
            success_count += 1
        else:
            failed_count += 1

    run.completed_at = datetime.now(timezone.utc)
    run.status = "completed"
    run.companies_success = success_count
    run.companies_failed = failed_count
    db.commit()

    # Score all companies for each user with criteria settings (per D-12)
    user_settings = db.query(UserCriteriaSettings).all()
    for settings in user_settings:
        try:
            score_all_companies(db, settings.user_id)
        except Exception as e:
            logger.error(f"Scoring failed for user {settings.user_id}: {e}")

    db.close()
    logger.info(f"Agent run complete: {success_count} success, {failed_count} failed")


def run_single(ticker: str, market: str):
    """On-demand single company refresh."""
    db = Session()
    try:
        run_company(db, {"ticker": ticker, "market": market}, run_id=0)

        # Score all companies for each user with criteria settings (per D-12)
        user_settings = db.query(UserCriteriaSettings).all()
        for settings in user_settings:
            try:
                score_all_companies(db, settings.user_id)
            except Exception as e:
                logger.error(f"Scoring failed for user {settings.user_id}: {e}")
    finally:
        db.close()
