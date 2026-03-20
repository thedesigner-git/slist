import logging
from functools import lru_cache

import requests

logger = logging.getLogger(__name__)
HEADERS = {"User-Agent": "InvestIQ research@investiq.local"}
TICKER_CIK_URL = "https://www.sec.gov/files/company_tickers.json"


@lru_cache(maxsize=1)
def _load_cik_map() -> dict[str, str]:
    """Load and cache ticker->CIK mapping from SEC. Padded to 10 digits."""
    try:
        resp = requests.get(TICKER_CIK_URL, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        return {v["ticker"]: str(v["cik_str"]).zfill(10) for v in resp.json().values()}
    except Exception as e:
        logger.error(f"Failed to load CIK map: {e}")
        return {}


def is_us_ticker(ticker: str) -> bool:
    """Only fetch EDGAR data for US tickers (no dot suffix)."""
    return "." not in ticker


def get_filings(ticker: str, form_types: list[str] = None, max_results: int = 5) -> list[dict]:
    """Fetch recent 10-Q / 10-K filing metadata for a US ticker."""
    if not is_us_ticker(ticker):
        return []
    if form_types is None:
        form_types = ["10-Q", "10-K"]

    cik_map = _load_cik_map()
    cik = cik_map.get(ticker.upper())
    if not cik:
        logger.debug(f"No CIK found for {ticker}")
        return []

    try:
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        recent = data.get("filings", {}).get("recent", {})

        forms = recent.get("form", [])
        accessions = recent.get("accessionNumber", [])
        dates = recent.get("filingDate", [])
        docs = recent.get("primaryDocument", [])

        results = []
        cik_int = int(cik)
        for form, acc, date, doc in zip(forms, accessions, dates, docs):
            if form not in form_types:
                continue
            acc_clean = acc.replace("-", "")
            doc_url = f"https://www.sec.gov/Archives/edgar/data/{cik_int}/{acc_clean}/{doc}"
            results.append({
                "form_type": form,
                "accession_number": acc,
                "filed_date": date,
                "doc_url": doc_url,
            })
            if len(results) >= max_results:
                break
        return results
    except Exception as e:
        logger.warning(f"EDGAR fetch failed for {ticker}: {e}")
        return []
