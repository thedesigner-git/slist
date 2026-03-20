def compute_ratios(info: dict) -> dict:
    """Extract pre-computed ratios from yfinance .info dict."""
    def safe_float(v):
        try:
            return float(v) if v is not None else None
        except (TypeError, ValueError):
            return None
    return {
        "pe_ratio": safe_float(info.get("trailingPE")),
        "pb_ratio": safe_float(info.get("priceToBook")),
        "roe": safe_float(info.get("returnOnEquity")),
        "ev_ebitda": safe_float(info.get("enterpriseToEbitda")),
        "debt_to_equity": safe_float(info.get("debtToEquity")),
    }
