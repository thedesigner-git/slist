def _yoy_growth(current, prior) -> float | None:
    if current is None or prior is None or prior == 0:
        return None
    return (current - prior) / abs(prior)


def _safe_margin(numerator, denominator) -> float | None:
    if numerator is None or denominator is None or denominator == 0:
        return None
    return numerator / denominator


def compute_growth(quarters: list[dict]) -> list[dict]:
    """
    quarters: list of {period, financials: {...}, cash_flow: {...}} dicts, newest first.
    Returns list of growth_metric dicts for each quarter that has a year-ago comparison.
    Requires at least 5 quarters (4 trailing + 1 year-ago offset).
    """
    results = []
    for i, q in enumerate(quarters):
        year_ago_idx = i + 4  # same quarter prior year
        if year_ago_idx >= len(quarters):
            break
        ya = quarters[year_ago_idx]

        fin = q.get("financials", {})
        ya_fin = ya.get("financials", {})
        cf = q.get("cash_flow", {})

        rev = fin.get("revenue")
        ya_rev = ya_fin.get("revenue")
        eps = fin.get("eps_diluted")
        ya_eps = ya_fin.get("eps_diluted")
        gp = fin.get("gross_profit")
        oi = fin.get("operating_income")
        fcf = cf.get("free_cash_flow")

        results.append({
            "period": q["period"],
            "revenue_growth_yoy": _yoy_growth(rev, ya_rev),
            "eps_growth_yoy": _yoy_growth(eps, ya_eps),
            "gross_margin": _safe_margin(gp, rev),
            "operating_margin": _safe_margin(oi, rev),
            "fcf_margin": _safe_margin(fcf, rev),
        })
    return results
