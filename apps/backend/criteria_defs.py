"""
Canonical criteria definitions for the Alphascreen scoring engine.

IDs match Stock Screening investData.ts exactly. Each criterion defines:
  - id: unique key (used in JSONB settings and TTM metrics dict)
  - label: human-readable name
  - preset: "growth" or "value"
  - metric_key: key into the TTM metrics dict
  - direction: ">" means higher is better, "<" means lower is better
  - default_threshold: seeded on first user access
  - default_enabled: whether enabled by default
  - is_boolean: True for pass/fail criteria with no numeric threshold
  - suffix: display unit for the frontend (%, x, etc.)
"""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class CriterionDef:
    id: str
    label: str
    preset: str  # "growth" or "value"
    metric_key: str
    direction: str  # ">" or "<"
    default_threshold: Optional[float]
    default_enabled: bool
    is_boolean: bool = False
    suffix: str = "%"


GROWTH_CRITERIA: list[CriterionDef] = [
    CriterionDef("revenueGrowth", "Revenue YoY Growth", "growth", "revenue_growth_yoy", ">", 0.15, True),
    CriterionDef("epsGrowth", "EPS YoY Growth", "growth", "eps_growth_yoy", ">", 0.10, True),
    CriterionDef("roe", "Return on Equity", "growth", "roe", ">", 0.15, True),
    CriterionDef("grossMargin", "Gross Margin", "growth", "gross_margin", ">", 0.40, True),
    CriterionDef("operatingMargin", "Operating Margin", "growth", "operating_margin", ">", 0.15, True),
    CriterionDef("fcfGrowth", "Free Cash Flow Growth", "growth", "fcf_growth", ">", 0.15, False),
    CriterionDef("netProfitMargin", "Net Profit Margin", "growth", "net_profit_margin", ">", 0.10, False),
    CriterionDef("rdPercent", "R&D as % of Revenue", "growth", "rd_percent", ">", 0.08, False),
    CriterionDef("earningsConsistency", "PEG Ratio", "growth", "peg_ratio", "<", 1.5, False, suffix="×"),
    CriterionDef("peRelative", "Return on Assets", "growth", "roa", ">", 0.05, False),
]

VALUE_CRITERIA: list[CriterionDef] = [
    CriterionDef("peLtMarket", "P/E Ratio", "value", "pe_ratio", "<", 20.0, True, suffix="×"),
    CriterionDef("pb", "Price-to-Book", "value", "pb_ratio", "<", 2.0, True, suffix="x"),
    CriterionDef("fcfPositive", "FCF Margin", "value", "fcf_margin", ">", 0.0, True),
    CriterionDef("debtEquity", "Debt/Equity", "value", "debt_to_equity", "<", 1.0, True, suffix="x"),
    CriterionDef("evEbitda", "EV/EBITDA", "value", "ev_ebitda", "<", 15.0, True, suffix="x"),
    CriterionDef("dividendYield", "Dividend Yield", "value", "dividend_yield", ">", 0.02, False),
    CriterionDef("priceToSales", "Price/Sales", "value", "price_to_sales", "<", 3.0, False, suffix="x"),
    CriterionDef("currentRatio", "Current Ratio", "value", "current_ratio", ">", 1.5, False, suffix="x"),
    CriterionDef("interestCoverage", "Interest Coverage", "value", "interest_coverage", ">", 5.0, False, suffix="x"),
    CriterionDef("priceFCF", "Price/FCF", "value", "price_fcf", "<", 25.0, False, suffix="x"),
]

ALL_CRITERIA = GROWTH_CRITERIA + VALUE_CRITERIA

# Quick lookup by ID
CRITERIA_BY_ID: dict[str, CriterionDef] = {c.id: c for c in ALL_CRITERIA}


def build_default_settings() -> dict:
    """Build the default JSONB criteria settings for a new user."""
    return {
        "growth_enabled": True,
        "value_enabled": True,
        "growth_pass_threshold": 4,
        "value_pass_threshold": 3,
        "shortlist_threshold": 0.70,
        "criteria": {
            c.id: {
                "enabled": c.default_enabled,
                "threshold": c.default_threshold,
            }
            for c in ALL_CRITERIA
        },
    }
