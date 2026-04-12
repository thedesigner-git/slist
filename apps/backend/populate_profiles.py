"""
One-time script to populate company description, location, employees fields
from yfinance for all existing companies in the database.

Run: python populate_profiles.py
"""
import logging
import time
import yfinance as yf
from sqlalchemy.orm import Session as OrmSession
from db import Session as DBSession
from models.company import Company

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def populate():
    db: OrmSession = DBSession()
    try:
        companies = db.query(Company).filter(Company.description.is_(None)).all()
        logger.info("Found %d companies to populate", len(companies))

        for i, company in enumerate(companies):
            try:
                t = yf.Ticker(company.ticker)
                info = t.info or {}

                city = info.get("city")
                country = info.get("country")
                location = None
                if city and country:
                    location = f"{city}, {country}"
                elif country:
                    location = country

                company.description = info.get("longBusinessSummary")
                company.location = location
                company.employees = info.get("fullTimeEmployees")
                # yfinance doesn't provide founded year directly

                db.commit()
                logger.info("[%d/%d] %s — %s", i + 1, len(companies), company.ticker,
                            "OK" if company.description else "no data")
            except Exception as e:
                logger.warning("[%d/%d] %s — failed: %s", i + 1, len(companies), company.ticker, e)
                db.rollback()

            time.sleep(0.3)
    finally:
        db.close()


if __name__ == "__main__":
    populate()
