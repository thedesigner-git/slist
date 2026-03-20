from datetime import datetime


def date_to_quarter(ts) -> str:
    """Convert a Timestamp/date to 'YYYY-QN' string."""
    dt = ts.to_pydatetime() if hasattr(ts, "to_pydatetime") else ts
    q = (dt.month - 1) // 3 + 1
    return f"{dt.year}-Q{q}"


def _safe_get(df, row_key: str, col_idx: int = 0):
    """Safely extract a value from a yfinance DataFrame."""
    if df is None or df.empty:
        return None
    # Try exact key, then case-insensitive match
    keys = list(df.index)
    match = next((k for k in keys if k.lower() == row_key.lower()), None)
    if match is None:
        return None
    try:
        cols = sorted(df.columns, reverse=True)  # most recent first
        val = df.loc[match, cols[col_idx]]
        return float(val) if val is not None and str(val) != "nan" else None
    except Exception:
        return None


def parse_financials(ticker: str, df_income, df_balance, df_cashflow) -> list[dict]:
    """Parse all quarterly financial snapshots into list of dicts for DB insert."""
    if df_income is None or df_income.empty:
        return []

    results = []
    cols = sorted(df_income.columns, reverse=True)  # newest first

    for i, col in enumerate(cols):
        period = date_to_quarter(col)
        results.append({
            "ticker": ticker,
            "period": period,
            "financials": {
                "revenue": _safe_get(df_income, "Total Revenue", i),
                "gross_profit": _safe_get(df_income, "Gross Profit", i),
                "operating_income": _safe_get(df_income, "Operating Income", i),
                "net_income": _safe_get(df_income, "Net Income", i),
                "eps_diluted": _safe_get(df_income, "Diluted EPS", i),
            },
            "balance_sheet": {
                "total_assets": _safe_get(df_balance, "Total Assets", i),
                "total_debt": _safe_get(df_balance, "Total Debt", i),
                "total_equity": _safe_get(df_balance, "Stockholders Equity", i),
                "cash": _safe_get(df_balance, "Cash And Cash Equivalents", i),
            },
            "cash_flow": {
                "operating_cf": _safe_get(df_cashflow, "Operating Cash Flow", i),
                "capex": _safe_get(df_cashflow, "Capital Expenditure", i),
                "free_cash_flow": _safe_get(df_cashflow, "Free Cash Flow", i),
            },
        })
    return results


def parse_info(ticker: str, info: dict) -> dict:
    """Parse yfinance .info dict into company + ratio fields."""
    return {
        "name": info.get("longName") or info.get("shortName") or ticker,
        "sector": info.get("sector"),
        "market_cap": info.get("marketCap"),
        "currency": info.get("currency"),
        "ratios": {
            "pe_ratio": info.get("trailingPE"),
            "pb_ratio": info.get("priceToBook"),
            "roe": info.get("returnOnEquity"),
            "ev_ebitda": info.get("enterpriseToEbitda"),
            "debt_to_equity": info.get("debtToEquity"),
        },
    }


def parse_news(ticker: str, company_id: int, raw_news: list) -> list[dict]:
    """Parse yfinance news list into DB-ready dicts."""
    results = []
    for item in raw_news:
        url = item.get("link") or item.get("url")
        if not url:
            continue
        published_at = None
        ts = item.get("providerPublishTime")
        if ts:
            published_at = datetime.utcfromtimestamp(ts)
        results.append({
            "company_id": company_id,
            "headline": item.get("title", "")[:500],
            "source": item.get("publisher", "")[:100],
            "url": url[:1000],
            "published_at": published_at,
        })
    return results
