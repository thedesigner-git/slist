def generate_signals(period: str, growth: dict, ratios: dict, balance: dict) -> list[dict]:
    """
    Generate red/green flag signals for a single period.
    Returns list of {period, signal_type, direction, value, description}.
    """
    signals = []

    def add(signal_type, direction, value, description):
        signals.append({
            "period": period,
            "signal_type": signal_type,
            "direction": direction,
            "value": value,
            "description": description,
        })

    rev_growth = growth.get("revenue_growth_yoy")
    eps_growth = growth.get("eps_growth_yoy")
    gross_margin = growth.get("gross_margin")
    fcf_margin = growth.get("fcf_margin")
    de_ratio = ratios.get("debt_to_equity")

    # Red signals
    if rev_growth is not None and rev_growth < 0:
        add("revenue_miss", "red", rev_growth, f"Revenue declined {rev_growth:.1%} YoY")
    if gross_margin is not None and growth.get("gross_margin_delta") is not None:
        if growth["gross_margin_delta"] < -0.03:
            add("margin_compression", "red", growth["gross_margin_delta"],
                f"Gross margin down {abs(growth['gross_margin_delta']):.1%} YoY")
    if fcf_margin is not None and fcf_margin < 0:
        add("fcf_negative", "red", fcf_margin, "Free cash flow negative")

    # Green signals
    if rev_growth is not None and rev_growth > 0.20:
        add("revenue_acceleration", "green", rev_growth, f"Revenue grew {rev_growth:.1%} YoY")
    if fcf_margin is not None and fcf_margin > 0.15:
        add("fcf_strong", "green", fcf_margin, f"FCF margin {fcf_margin:.1%}")

    return signals
