"""
Unit tests for apps/backend/agent/scoring.py (v2 — 20 criteria, JSONB settings)
Tests: compute_ttm_metrics (mock DB), score_company (pure function)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from unittest.mock import MagicMock
import pytest

from criteria_defs import build_default_settings, GROWTH_CRITERIA, VALUE_CRITERIA


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_settings(**overrides):
    """Create a UserCriteriaSettings-like mock with defaults from build_default_settings()."""
    defaults = build_default_settings()
    settings = MagicMock()
    settings.growth_enabled = overrides.get("growth_enabled", defaults["growth_enabled"])
    settings.value_enabled = overrides.get("value_enabled", defaults["value_enabled"])
    settings.growth_pass_threshold = overrides.get("growth_pass_threshold", defaults["growth_pass_threshold"])
    settings.value_pass_threshold = overrides.get("value_pass_threshold", defaults["value_pass_threshold"])
    settings.shortlist_threshold = overrides.get("shortlist_threshold", defaults["shortlist_threshold"])

    # Merge criteria overrides into defaults
    criteria = {k: dict(v) for k, v in defaults["criteria"].items()}
    for crit_id, crit_override in overrides.get("criteria", {}).items():
        if crit_id in criteria:
            criteria[crit_id].update(crit_override)
        else:
            criteria[crit_id] = crit_override
    settings.criteria = criteria
    return settings


def _make_growth_row(**kwargs):
    row = MagicMock()
    row.revenue_growth_yoy = kwargs.get("revenue_growth_yoy")
    row.eps_growth_yoy = kwargs.get("eps_growth_yoy")
    row.fcf_margin = kwargs.get("fcf_margin")
    row.gross_margin = kwargs.get("gross_margin")
    row.operating_margin = kwargs.get("operating_margin")
    row.net_profit_margin = kwargs.get("net_profit_margin")
    row.fcf_growth = kwargs.get("fcf_growth")
    row.rd_percent = kwargs.get("rd_percent")
    return row


def _make_ratio_row(**kwargs):
    row = MagicMock()
    row.pe_ratio = kwargs.get("pe_ratio")
    row.pb_ratio = kwargs.get("pb_ratio")
    row.roe = kwargs.get("roe")
    row.ev_ebitda = kwargs.get("ev_ebitda")
    row.debt_to_equity = kwargs.get("debt_to_equity")
    row.dividend_yield = kwargs.get("dividend_yield")
    row.price_to_sales = kwargs.get("price_to_sales")
    row.current_ratio = kwargs.get("current_ratio")
    row.interest_coverage = kwargs.get("interest_coverage")
    row.price_fcf = kwargs.get("price_fcf")
    return row


def _mock_db(growth_rows, ratio_rows):
    from models.growth import GrowthMetric
    from models.ratios import Ratio
    db = MagicMock()

    def query_side_effect(model):
        q = MagicMock()
        if model is GrowthMetric:
            q.filter.return_value.order_by.return_value.limit.return_value.all.return_value = growth_rows
        elif model is Ratio:
            q.filter.return_value.order_by.return_value.limit.return_value.all.return_value = ratio_rows
        return q

    db.query.side_effect = query_side_effect
    return db


def _all_passing_ttm():
    """TTM dict with all 20 criteria passing (5 growth + 5 value enabled by default)."""
    return {
        # Growth (5 enabled by default)
        "revenue_growth_yoy": 0.20,    # > 0.15 ✓
        "eps_growth_yoy": 0.15,        # > 0.10 ✓
        "roe": 0.20,                   # > 0.15 ✓
        "gross_margin": 0.50,          # > 0.40 ✓
        "operating_margin": 0.20,      # > 0.15 ✓
        # Growth (disabled by default — set passing values anyway)
        "fcf_growth": 0.20,            # > 0.15
        "net_profit_margin": 0.15,     # > 0.10
        "rd_percent": 0.10,            # > 0.08
        "earnings_consistency": True,  # boolean
        "pe_relative": True,           # boolean

        # Value (5 enabled by default)
        "pe_lt_market": True,          # boolean ✓
        "pb_ratio": 1.5,               # < 2.0 ✓
        "fcf_positive": True,          # boolean ✓
        "debt_to_equity": 0.5,         # < 1.0 ✓
        "ev_ebitda": 10.0,             # < 15.0 ✓
        # Value (disabled by default)
        "dividend_yield": 0.03,        # > 0.02
        "price_to_sales": 2.0,         # < 3.0
        "current_ratio": 2.0,          # > 1.5
        "interest_coverage": 8.0,      # > 5.0
        "price_fcf": 20.0,             # < 25.0

        # Extras used in boolean computation
        "fcf_margin": 0.10,
        "pe_ratio": 18.0,
    }


# ---------------------------------------------------------------------------
# compute_ttm_metrics tests
# ---------------------------------------------------------------------------

class TestComputeTtmMetrics:

    def test_four_quarters_averages_correctly(self):
        from agent.scoring import compute_ttm_metrics
        growth_rows = [
            _make_growth_row(revenue_growth_yoy=0.20, eps_growth_yoy=0.15, gross_margin=0.50, operating_margin=0.20, fcf_margin=0.10),
            _make_growth_row(revenue_growth_yoy=0.18, eps_growth_yoy=0.12, gross_margin=0.48, operating_margin=0.18, fcf_margin=0.08),
            _make_growth_row(revenue_growth_yoy=0.16, eps_growth_yoy=0.11, gross_margin=0.46, operating_margin=0.16, fcf_margin=0.09),
            _make_growth_row(revenue_growth_yoy=0.14, eps_growth_yoy=0.10, gross_margin=0.44, operating_margin=0.14, fcf_margin=0.07),
        ]
        ratio_rows = [
            _make_ratio_row(pe_ratio=18.0, pb_ratio=1.5, roe=0.20, debt_to_equity=0.5, ev_ebitda=10.0),
            _make_ratio_row(pe_ratio=17.0, pb_ratio=1.4, roe=0.18, debt_to_equity=0.6, ev_ebitda=11.0),
            _make_ratio_row(pe_ratio=19.0, pb_ratio=1.6, roe=0.22, debt_to_equity=0.4, ev_ebitda=9.0),
            _make_ratio_row(pe_ratio=16.0, pb_ratio=1.3, roe=0.16, debt_to_equity=0.7, ev_ebitda=12.0),
        ]
        db = _mock_db(growth_rows, ratio_rows)
        result = compute_ttm_metrics(db, company_id=1, market="US")

        assert result["revenue_growth_yoy"] == pytest.approx(0.17, abs=0.01)
        assert result["eps_growth_yoy"] == pytest.approx(0.12, abs=0.01)
        assert result["gross_margin"] == pytest.approx(0.47, abs=0.01)
        assert result["operating_margin"] == pytest.approx(0.17, abs=0.01)
        assert result["pe_ratio"] == pytest.approx(17.5, abs=0.1)
        assert result["pb_ratio"] == pytest.approx(1.45, abs=0.01)
        assert result["roe"] == pytest.approx(0.19, abs=0.01)
        assert result["ev_ebitda"] == pytest.approx(10.5, abs=0.1)

    def test_fewer_than_four_quarters_still_averages(self):
        from agent.scoring import compute_ttm_metrics
        growth_rows = [
            _make_growth_row(revenue_growth_yoy=0.20, eps_growth_yoy=0.15),
            _make_growth_row(revenue_growth_yoy=0.18, eps_growth_yoy=0.12),
        ]
        ratio_rows = [_make_ratio_row(pe_ratio=18.0, pb_ratio=1.5, roe=0.20)]
        db = _mock_db(growth_rows, ratio_rows)
        result = compute_ttm_metrics(db, company_id=1)

        assert result["revenue_growth_yoy"] == pytest.approx(0.19, abs=0.01)
        assert result["pe_ratio"] == pytest.approx(18.0, abs=0.01)

    def test_all_null_returns_none(self):
        from agent.scoring import compute_ttm_metrics
        growth_rows = [_make_growth_row(), _make_growth_row()]
        ratio_rows = [_make_ratio_row()]
        db = _mock_db(growth_rows, ratio_rows)
        result = compute_ttm_metrics(db, company_id=1)

        assert result["revenue_growth_yoy"] is None
        assert result["eps_growth_yoy"] is None
        assert result["pe_ratio"] is None

    def test_earnings_consistency_true_when_three_positive_eps(self):
        from agent.scoring import compute_ttm_metrics
        growth_rows = [
            _make_growth_row(eps_growth_yoy=0.15),
            _make_growth_row(eps_growth_yoy=0.12),
            _make_growth_row(eps_growth_yoy=0.10),
            _make_growth_row(eps_growth_yoy=0.08),
        ]
        db = _mock_db(growth_rows, [])
        result = compute_ttm_metrics(db, company_id=1)
        assert result["earnings_consistency"] is True

    def test_earnings_consistency_false_when_negative_eps(self):
        from agent.scoring import compute_ttm_metrics
        growth_rows = [
            _make_growth_row(eps_growth_yoy=0.15),
            _make_growth_row(eps_growth_yoy=-0.05),  # negative
            _make_growth_row(eps_growth_yoy=0.10),
        ]
        db = _mock_db(growth_rows, [])
        result = compute_ttm_metrics(db, company_id=1)
        assert result["earnings_consistency"] is False

    def test_pe_lt_market_true_for_us_company_below_avg(self):
        from agent.scoring import compute_ttm_metrics
        # US market avg = 26.1; P/E of 20 should pass
        ratio_rows = [_make_ratio_row(pe_ratio=20.0)]
        db = _mock_db([], ratio_rows)
        result = compute_ttm_metrics(db, company_id=1, market="US")
        assert result["pe_lt_market"] is True

    def test_pe_lt_market_false_for_high_pe(self):
        from agent.scoring import compute_ttm_metrics
        # US market avg = 26.1; P/E of 30 should fail
        ratio_rows = [_make_ratio_row(pe_ratio=30.0)]
        db = _mock_db([], ratio_rows)
        result = compute_ttm_metrics(db, company_id=1, market="US")
        assert result["pe_lt_market"] is False


# ---------------------------------------------------------------------------
# score_company tests
# ---------------------------------------------------------------------------

class TestScoreCompany:

    def test_all_default_criteria_passing(self):
        """Default settings: 5 growth + 5 value = 10 enabled. All passing → score=1.0."""
        from agent.scoring import score_company
        ttm = _all_passing_ttm()
        settings = _make_settings()
        result = score_company(ttm, settings)

        assert result["criteria_total"] == 10   # 5 growth + 5 value
        assert result["criteria_passed"] == 10
        assert result["score"] == pytest.approx(1.0)
        assert result["growth_passed"] is True   # 5 >= growth_pass_threshold(4)
        assert result["value_passed"] is True    # 5 >= value_pass_threshold(3)
        assert result["is_shortlisted"] is True

    def test_null_metric_counts_as_failed(self):
        """D-04: null metric → criterion fails."""
        from agent.scoring import score_company
        ttm = _all_passing_ttm()
        ttm["pe_lt_market"] = None  # None for boolean → fails
        ttm["revenue_growth_yoy"] = None

        settings = _make_settings()
        result = score_company(ttm, settings)

        assert result["criteria_passed"] == 8  # 10 - 2 failed
        assert result["score"] == pytest.approx(8 / 10)

    def test_growth_preset_disabled(self):
        """Growth disabled → only 5 value criteria evaluated."""
        from agent.scoring import score_company
        settings = _make_settings(growth_enabled=False)
        ttm = _all_passing_ttm()
        result = score_company(ttm, settings)

        assert result["criteria_total"] == 5
        assert result["criteria_passed"] == 5
        assert result["growth_passed"] is False
        assert result["value_passed"] is True

    def test_value_preset_disabled(self):
        """Value disabled → only 5 growth criteria evaluated."""
        from agent.scoring import score_company
        settings = _make_settings(value_enabled=False)
        ttm = _all_passing_ttm()
        result = score_company(ttm, settings)

        assert result["criteria_total"] == 5
        assert result["criteria_passed"] == 5
        assert result["growth_passed"] is True
        assert result["value_passed"] is False

    def test_both_presets_disabled_score_zero(self):
        """All presets off → criteria_total=0, score=0.0."""
        from agent.scoring import score_company
        settings = _make_settings(growth_enabled=False, value_enabled=False)
        result = score_company(_all_passing_ttm(), settings)

        assert result["criteria_total"] == 0
        assert result["score"] == pytest.approx(0.0)
        assert result["is_shortlisted"] is False

    def test_individual_criterion_disabled_excluded(self):
        """Disabled criterion excluded from total count."""
        from agent.scoring import score_company
        settings = _make_settings(criteria={
            "revenueGrowth": {"enabled": False},
            "evEbitda": {"enabled": False},
        })
        result = score_company(_all_passing_ttm(), settings)

        assert result["criteria_total"] == 8  # 10 - 2 disabled

    def test_score_below_threshold_not_shortlisted(self):
        """score < threshold → is_shortlisted=False."""
        from agent.scoring import score_company
        settings = _make_settings(shortlist_threshold=0.90)
        ttm = _all_passing_ttm()
        ttm["revenue_growth_yoy"] = 0.01   # fail
        ttm["roe"] = 0.05                  # fail
        ttm["pb_ratio"] = 5.0              # fail

        result = score_company(ttm, settings)

        assert result["criteria_passed"] == 7   # 10 - 3 failed
        assert result["score"] == pytest.approx(7 / 10)
        assert result["is_shortlisted"] is False  # 0.70 < 0.90

    def test_custom_threshold_on_criterion(self):
        """User sets revenueGrowth threshold to 0.30; 20% growth should fail."""
        from agent.scoring import score_company
        settings = _make_settings(criteria={
            "revenueGrowth": {"enabled": True, "threshold": 0.30},
        })
        ttm = _all_passing_ttm()
        ttm["revenue_growth_yoy"] = 0.20  # < 0.30 → fail

        result = score_company(ttm, settings)
        assert result["criteria_passed"] == 9  # 10 - 1

    def test_growth_pass_threshold_respected(self):
        """growth_pass_threshold=5 means all 5 growth must pass for growth_passed=True."""
        from agent.scoring import score_company
        settings = _make_settings(growth_pass_threshold=5)
        ttm = _all_passing_ttm()
        ttm["revenue_growth_yoy"] = 0.01  # fail one growth criterion

        result = score_company(ttm, settings)
        # 4/5 growth pass, threshold=5 → growth_passed=False
        assert result["growth_passed"] is False

    def test_boolean_criterion_evaluated_correctly(self):
        """Boolean criteria: True passes, False fails, None fails (D-04)."""
        from agent.scoring import score_company

        # Enable earningsConsistency for this test
        settings = _make_settings(criteria={
            "earningsConsistency": {"enabled": True},
        })
        ttm = _all_passing_ttm()

        # Boolean True → passes
        ttm["earnings_consistency"] = True
        result = score_company(ttm, settings)
        # earningsConsistency now enabled (was disabled by default), 11 total
        passed_with_true = result["criteria_passed"]

        # Boolean False → fails
        ttm["earnings_consistency"] = False
        result = score_company(ttm, settings)
        assert result["criteria_passed"] == passed_with_true - 1

        # Boolean None → fails (D-04)
        ttm["earnings_consistency"] = None
        result = score_company(ttm, settings)
        assert result["criteria_passed"] == passed_with_true - 1

    def test_enabling_extra_criterion_adds_to_total(self):
        """Enable a disabled-by-default criterion → criteria_total increases."""
        from agent.scoring import score_company
        settings = _make_settings(criteria={
            "dividendYield": {"enabled": True, "threshold": 0.02},
        })
        ttm = _all_passing_ttm()
        result = score_company(ttm, settings)
        assert result["criteria_total"] == 11   # 10 default + 1 extra
