import logging

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from models.company import Company
from models.filing import Filing
from models.financials import BalanceSheet, CashFlow, Financials
from models.growth import GrowthMetric
from models.ratios import Ratio
from models.signals import Signal

logger = logging.getLogger(__name__)


def _upsert(db: Session, model, data: dict, conflict_cols: list[str]):
    stmt = pg_insert(model).values(**data)
    update_cols = {k: stmt.excluded[k] for k in data if k not in conflict_cols}
    stmt = stmt.on_conflict_do_update(index_elements=conflict_cols, set_=update_cols)
    db.execute(stmt)


def upsert_company(db: Session, ticker: str, market: str, parsed_info: dict) -> int:
    """Insert or update company record. Returns company id."""
    stmt = pg_insert(Company).values(
        ticker=ticker, market=market,
        name=parsed_info.get("name", ticker),
        sector=parsed_info.get("sector"),
        market_cap=parsed_info.get("market_cap"),
        currency=parsed_info.get("currency"),
        description=parsed_info.get("description"),
        location=parsed_info.get("location"),
        employees=parsed_info.get("employees"),
        founded=parsed_info.get("founded"),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["ticker"],
        set_={
            "name": stmt.excluded.name, "sector": stmt.excluded.sector,
            "market_cap": stmt.excluded.market_cap, "currency": stmt.excluded.currency,
            "description": stmt.excluded.description, "location": stmt.excluded.location,
            "employees": stmt.excluded.employees, "founded": stmt.excluded.founded,
        }
    ).returning(Company.id)
    result = db.execute(stmt)
    db.commit()
    return result.scalar_one()


def upsert_financials(db: Session, company_id: int, quarters: list[dict]):
    # Columns not in the Financials table (used only for growth computation)
    _financials_exclude = {"research_development"}
    for q in quarters:
        period = q["period"]
        fin = {k: v for k, v in q["financials"].items() if k not in _financials_exclude}
        _upsert(
            db, Financials,
            {"company_id": company_id, "period": period, **fin},
            ["company_id", "period"],
        )
        _upsert(
            db, BalanceSheet,
            {"company_id": company_id, "period": period, **q["balance_sheet"]},
            ["company_id", "period"],
        )
        _upsert(
            db, CashFlow,
            {"company_id": company_id, "period": period, **q["cash_flow"]},
            ["company_id", "period"],
        )
    db.commit()


def upsert_ratios(db: Session, company_id: int, period: str, ratios: dict):
    _upsert(db, Ratio, {"company_id": company_id, "period": period, **ratios},
            ["company_id", "period"])
    db.commit()


def upsert_growth(db: Session, company_id: int, growth_metrics: list[dict]):
    for gm in growth_metrics:
        _upsert(db, GrowthMetric, {"company_id": company_id, **gm}, ["company_id", "period"])
    db.commit()


def upsert_signals(db: Session, company_id: int, signals: list[dict]):
    for s in signals:
        _upsert(db, Signal, {"company_id": company_id, **s},
                ["company_id", "period", "signal_type"])
    db.commit()


def upsert_filings(db: Session, company_id: int, filings: list[dict]):
    for f in filings:
        stmt = pg_insert(Filing).values(company_id=company_id, **f)
        stmt = stmt.on_conflict_do_update(
            index_elements=["accession_number"],
            set_={"doc_url": stmt.excluded.doc_url, "filed_date": stmt.excluded.filed_date}
        )
        db.execute(stmt)
    db.commit()
