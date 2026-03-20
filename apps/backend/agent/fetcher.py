import time
import logging
from dataclasses import dataclass, field
from typing import Any

import yfinance as yf

logger = logging.getLogger(__name__)
FETCH_DELAY_SECONDS = 0.5


@dataclass
class FetchResult:
    ticker: str
    success: bool
    info: dict = field(default_factory=dict)
    quarterly_financials: Any = None   # DataFrame or None
    quarterly_balance_sheet: Any = None
    quarterly_cashflow: Any = None
    news: list = field(default_factory=list)
    error: str | None = None


def fetch_company(ticker: str) -> FetchResult:
    """Fetch all available data for a single ticker via yfinance."""
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}

        # DataFrames — may be empty for some international tickers
        financials = t.quarterly_financials
        balance = t.quarterly_balance_sheet
        cashflow = t.quarterly_cashflow
        news = t.news or []

        # Validate we got something useful
        if not info and (financials is None or financials.empty):
            return FetchResult(ticker=ticker, success=False,
                               error="No data returned from yfinance")

        return FetchResult(
            ticker=ticker,
            success=True,
            info=info,
            quarterly_financials=financials,
            quarterly_balance_sheet=balance,
            quarterly_cashflow=cashflow,
            news=news[:10],  # cap at 10 headlines
        )
    except Exception as e:
        logger.warning(f"Failed to fetch {ticker}: {e}")
        return FetchResult(ticker=ticker, success=False, error=str(e))
    finally:
        time.sleep(FETCH_DELAY_SECONDS)
