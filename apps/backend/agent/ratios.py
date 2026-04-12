def _ttm_sum(df, *row_keys: str) -> float | None:
    """Sum the latest 4 quarterly values for one of the given row keys (TTM).

    Tries each key in order; uses the first one found.
    """
    if df is None or df.empty:
        return None
    index_lower = {k.lower(): k for k in df.index}
    for key in row_keys:
        actual = index_lower.get(key.lower())
        if actual is None:
            continue
        try:
            cols = sorted(df.columns, reverse=True)[:4]
            vals = [df.loc[actual, c] for c in cols if c in df.columns]
            floats = [float(v) for v in vals if v is not None and str(v) != "nan"]
            if floats:
                return sum(floats)
        except Exception:
            continue
    return None


def _latest_val(df, *row_keys: str) -> float | None:
    """Get the most recent non-null value for any of the given row keys."""
    if df is None or df.empty:
        return None
    index_lower = {k.lower(): k for k in df.index}
    for key in row_keys:
        actual = index_lower.get(key.lower())
        if actual is None:
            continue
        try:
            col = sorted(df.columns, reverse=True)[0]
            val = df.loc[actual, col]
            if val is not None and str(val) != "nan":
                return float(val)
        except Exception:
            continue
    return None


def compute_ratios(info: dict, df_income=None, df_balance=None, df_cashflow=None) -> dict:
    """Extract pre-computed ratios from yfinance .info dict.

    df_income:   optional quarterly income statement DataFrame
    df_balance:  optional quarterly balance sheet DataFrame
    df_cashflow: optional quarterly cash flow DataFrame

    For metrics missing from .info (common for EU/HK companies), falls back to
    computing from quarterly financial statement DataFrames.
    """
    def safe_float(v):
        try:
            return float(v) if v is not None else None
        except (TypeError, ValueError):
            return None

    market_cap = safe_float(info.get("marketCap"))

    # ── ROA ──────────────────────────────────────────────────────────────────
    roa = safe_float(info.get("returnOnAssets"))
    if roa is None and df_income is not None and df_balance is not None:
        ttm_ni = _ttm_sum(df_income, "Net Income", "Net Income Common Stockholders")
        total_assets = _latest_val(df_balance, "Total Assets")
        if ttm_ni is not None and total_assets and total_assets > 0:
            roa = ttm_ni / total_assets

    # ── Current Ratio ─────────────────────────────────────────────────────────
    current_ratio = safe_float(info.get("currentRatio"))
    if current_ratio is None and df_balance is not None:
        curr_a = _latest_val(df_balance, "Current Assets", "Total Current Assets")
        curr_l = _latest_val(df_balance, "Current Liabilities", "Total Current Liabilities")
        if curr_a is not None and curr_l and curr_l > 0:
            current_ratio = curr_a / curr_l

    # ── Price / Sales ─────────────────────────────────────────────────────────
    price_to_sales = safe_float(info.get("priceToSalesTrailing12Months"))
    if price_to_sales is None and market_cap and df_income is not None:
        ttm_rev = _ttm_sum(df_income, "Total Revenue")
        if ttm_rev and ttm_rev > 0:
            price_to_sales = market_cap / ttm_rev

    # ── Price / FCF ───────────────────────────────────────────────────────────
    fcf = safe_float(info.get("freeCashflow"))
    if fcf is None and df_cashflow is not None:
        fcf = _ttm_sum(df_cashflow, "Free Cash Flow")
    price_fcf = (market_cap / fcf) if market_cap and fcf and fcf > 0 else None

    return {
        "pe_ratio": safe_float(info.get("trailingPE")),
        "pb_ratio": safe_float(info.get("priceToBook")),
        "roe": safe_float(info.get("returnOnEquity")),
        "ev_ebitda": safe_float(info.get("enterpriseToEbitda")),
        # yfinance returns debtToEquity as percentage (102 = 1.02×); normalize to ratio
        "debt_to_equity": (safe_float(info.get("debtToEquity")) or 0) / 100 or None,
        # yfinance returns dividendYield as percentage (0.42 = 0.42%); normalize to fraction
        "dividend_yield": (safe_float(info.get("dividendYield")) or 0) / 100 or None,
        "price_to_sales": price_to_sales,
        "current_ratio": current_ratio,
        "interest_coverage": _compute_interest_coverage(info, df_income),
        "price_fcf": price_fcf,
        "roa": roa,
    }


def _compute_interest_coverage(info: dict, df_income=None) -> float | None:
    """operating_income / interest_expense.

    Tries .info first, falls back to quarterly income statement DataFrame.
    Returns None if interest expense is zero or missing (company has no debt obligations).
    """
    try:
        oi = info.get("operatingIncome") or info.get("ebit")
        ie = info.get("interestExpense")

        # Fallback: pull from income statement DataFrame (most recent quarter)
        if (oi is None or ie is None) and df_income is not None and not df_income.empty:
            keys = list(df_income.index)
            def _find(label):
                match = next((k for k in keys if k.lower() == label.lower()), None)
                if match is None:
                    return None
                cols = sorted(df_income.columns, reverse=True)
                val = df_income.loc[match, cols[0]]
                return float(val) if val is not None and str(val) != "nan" else None

            if oi is None:
                oi = _find("Operating Income") or _find("EBIT")
            if ie is None:
                ie = _find("Interest Expense") or _find("Interest Expense Non Operating")

        if oi is None or ie is None or ie == 0:
            return None
        return float(oi) / abs(float(ie))
    except (TypeError, ValueError, ZeroDivisionError):
        return None
