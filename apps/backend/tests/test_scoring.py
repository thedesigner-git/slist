"""
Unit tests for apps/backend/agent/scoring.py
Tests: compute_ttm_metrics (with mock DB), score_company (pure function)
"""
from unittest.mock import MagicMock, patch

import pytest

# We test score_company as a pure function (no DB needed)
# We test compute_ttm_metrics with a mock SQLAlchemy session


def _make_settings(**kwargs):
    """Create a UserCriteriaSettings-like object with all defaults, overriding with kwargs."""
    defaults = dict(
        growth_enabled=True,
        value_enabled=True,
        growth_revenue_growth_yoy=0.15,
        growth_eps_growth_yoy=0.10,
        growth_roe=0.15,
        growth_fcf_margin=0.0,
        growth_revenue_growth_yoy_enabled=True,
        growth_eps_growth_yoy_enabled=True,
        growth_roe_enabled=True,
        growth_fcf_margin_enabled=True,
        value_pe_ratio=20.0,
        value_pb_ratio=2.0,
        value_fcf_margin=0.0,
        value_debt_to_equity=1.0,
        value_pe_ratio_enabled=True,
        value_pb_ratio_enabled=True,
        value_fcf_margin_enabled=True,
        value_debt_to_equity_enabled=True,
        shortlist_threshold=0.70,
    )
    defaults.update(kwargs)
    settings = MagicMock()
    for k, v in defaults.items():
        setattr(settings, k, v)
    return settings


# ---------------------------------------------------------------------------
# compute_ttm_metrics tests
# ---------------------------------------------------------------------------

class TestComputeTtmMetrics:
    """Tests for compute_ttm_metrics using a mock DB session."""

    def _make_growth_row(self, revenue_growth_yoy=None, eps_growth_yoy=None, fcf_margin=None):
        row = MagicMock()
        row.revenue_growth_yoy = revenue_growth_yoy
        row.eps_growth_yoy = eps_growth_yoy
        row.fcf_margin = fcf_margin
        return row

    def _make_ratio_row(self, pe_ratio=None, pb_ratio=None, roe=None, debt_to_equity=None):
        row = MagicMock()
        row.pe_ratio = pe_ratio
        row.pb_ratio = pb_ratio
        row.roe = roe
        row.debt_to_equity = debt_to_equity
        return row

    def _mock_db(self, growth_rows, ratio_rows):
        """Create a mock DB session that returns specified rows for GrowthMetric and Ratio queries."""
        db = MagicMock()

        def query_side_effect(model):
            from models.growth import GrowthMetric
            from models.ratios import Ratio
            q = MagicMock()
            if model is GrowthMetric:
                q.filter.return_value.order_by.return_value.limit.return_value.all.return_value = growth_rows
            elif model is Ratio:
                q.filter.return_value.order_by.return_value.limit.return_value.all.return_value = ratio_rows
            return q

        db.query.side_effect = query_side_effect
        return db

    def test_four_quarters_computes_averages(self):
        """Test 1: compute_ttm_metrics with 4 quarters of data returns averaged values."""
        from agent.scoring import compute_ttm_metrics

        growth_rows = [
            self._make_growth_row(revenue_growth_yoy=0.20, eps_growth_yoy=0.15, fcf_margin=0.10),
            self._make_growth_row(revenue_growth_yoy=0.18, eps_growth_yoy=0.12, fcf_margin=0.08),
            self._make_growth_row(revenue_growth_yoy=0.16, eps_growth_yoy=0.11, fcf_margin=0.09),
            self._make_growth_row(revenue_growth_yoy=0.14, eps_growth_yoy=0.10, fcf_margin=0.07),
        ]
        ratio_rows = [
            self._make_ratio_row(pe_ratio=18.0, pb_ratio=1.5, roe=0.20, debt_to_equity=0.5),
            self._make_ratio_row(pe_ratio=17.0, pb_ratio=1.4, roe=0.18, debt_to_equity=0.6),
            self._make_ratio_row(pe_ratio=19.0, pb_ratio=1.6, roe=0.22, debt_to_equity=0.4),
            self._make_ratio_row(pe_ratio=16.0, pb_ratio=1.3, roe=0.16, debt_to_equity=0.7),
        ]
        db = self._mock_db(growth_rows, ratio_rows)
        result = compute_ttm_metrics(db, company_id=1)

        assert result["revenue_growth_yoy"] == pytest.approx(0.17, abs=0.01)
        assert result["eps_growth_yoy"] == pytest.approx(0.12, abs=0.01)
        assert result["fcf_margin"] == pytest.approx(0.085, abs=0.01)
        assert result["pe_ratio"] == pytest.approx(17.5, abs=0.1)
        assert result["pb_ratio"] == pytest.approx(1.45, abs=0.01)
        assert result["roe"] == pytest.approx(0.19, abs=0.01)
        assert result["debt_to_equity"] == pytest.approx(0.55, abs=0.01)

    def test_fewer_than_four_quarters_returns_averages(self):
        """Test 2: compute_ttm_metrics with fewer than 4 quarters still averages available data."""
        from agent.scoring import compute_ttm_metrics

        growth_rows = [
            self._make_growth_row(revenue_growth_yoy=0.20, eps_growth_yoy=0.15, fcf_margin=0.10),
            self._make_growth_row(revenue_growth_yoy=0.18, eps_growth_yoy=0.12, fcf_margin=0.08),
        ]
        ratio_rows = [
            self._make_ratio_row(pe_ratio=18.0, pb_ratio=1.5, roe=0.20, debt_to_equity=0.5),
        ]
        db = self._mock_db(growth_rows, ratio_rows)
        result = compute_ttm_metrics(db, company_id=1)

        assert result["revenue_growth_yoy"] == pytest.approx(0.19, abs=0.01)
        assert result["eps_growth_yoy"] == pytest.approx(0.135, abs=0.01)
        assert result["pe_ratio"] == pytest.approx(18.0, abs=0.01)
        assert result["roe"] == pytest.approx(0.20, abs=0.01)

    def test_all_null_values_returns_none(self):
        """Test 3: compute_ttm_metrics with all-null values returns None for each field."""
        from agent.scoring import compute_ttm_metrics

        growth_rows = [
            self._make_growth_row(revenue_growth_yoy=None, eps_growth_yoy=None, fcf_margin=None),
            self._make_growth_row(revenue_growth_yoy=None, eps_growth_yoy=None, fcf_margin=None),
        ]
        ratio_rows = [
            self._make_ratio_row(pe_ratio=None, pb_ratio=None, roe=None, debt_to_equity=None),
        ]
        db = self._mock_db(growth_rows, ratio_rows)
        result = compute_ttm_metrics(db, company_id=1)

        assert result["revenue_growth_yoy"] is None
        assert result["eps_growth_yoy"] is None
        assert result["fcf_margin"] is None
        assert result["pe_ratio"] is None
        assert result["roe"] is None


# ---------------------------------------------------------------------------
# score_company tests
# ---------------------------------------------------------------------------

class TestScoreCompany:
    """Tests for score_company — pure function, no DB."""

    def _all_passing_ttm(self):
        return {
            "revenue_growth_yoy": 0.20,  # > 0.15 pass
            "eps_growth_yoy": 0.15,      # > 0.10 pass
            "roe": 0.20,                 # > 0.15 pass
            "fcf_margin": 0.10,          # > 0.0 pass (growth) and > 0.0 pass (value)
            "pe_ratio": 15.0,            # < 20 pass
            "pb_ratio": 1.5,             # < 2.0 pass
            "debt_to_equity": 0.5,       # < 1.0 pass
        }

    def test_all_criteria_passing_score_one(self):
        """Test 4: All 8 active criteria passing → score=1.0, growth_passed=True, value_passed=True."""
        from agent.scoring import score_company

        ttm = self._all_passing_ttm()
        settings = _make_settings()
        result = score_company(ttm, settings)

        # 4 growth + 4 value = 8 total, all pass
        assert result["criteria_total"] == 8
        assert result["criteria_passed"] == 8
        assert result["score"] == pytest.approx(1.0)
        assert result["growth_passed"] is True
        assert result["value_passed"] is True
        assert result["is_shortlisted"] is True

    def test_five_of_seven_criteria_shortlisted(self):
        """Test 5: 5/7 active criteria → score ~0.714, is_shortlisted=True (above 0.70 threshold).
        We disable one criterion (fcf_margin_enabled=False for value) so 7 total criteria remain.
        Then fail 2 of 7 to get 5/7."""
        from agent.scoring import score_company

        # Disable value_fcf_margin to get 7 total criteria (4 growth + 3 value)
        settings = _make_settings(value_fcf_margin_enabled=False)
        ttm = self._all_passing_ttm()
        # Fail 2 criteria: eps_growth_yoy and debt_to_equity
        ttm["eps_growth_yoy"] = 0.05   # fail: < 0.10
        ttm["debt_to_equity"] = 1.5    # fail: > 1.0

        result = score_company(ttm, settings)

        assert result["criteria_total"] == 7
        assert result["criteria_passed"] == 5
        assert result["score"] == pytest.approx(5 / 7, abs=0.001)
        assert result["is_shortlisted"] is True  # 5/7 ≈ 0.714 > 0.70

    def test_null_metric_counts_as_failed(self):
        """Test 6: Null metric value → criterion counted as failed (D-04)."""
        from agent.scoring import score_company

        ttm = self._all_passing_ttm()
        ttm["pe_ratio"] = None  # null → fail

        settings = _make_settings()
        result = score_company(ttm, settings)

        # 8 criteria total, pe_ratio fails → 7 passed
        assert result["criteria_total"] == 8
        assert result["criteria_passed"] == 7
        assert result["score"] == pytest.approx(7 / 8)

    def test_growth_preset_disabled_only_value_evaluated(self):
        """Test 7: growth preset disabled → only value criteria evaluated, score based on value only."""
        from agent.scoring import score_company

        settings = _make_settings(growth_enabled=False)
        ttm = self._all_passing_ttm()
        result = score_company(ttm, settings)

        # Only 4 value criteria active
        assert result["criteria_total"] == 4
        assert result["criteria_passed"] == 4
        assert result["score"] == pytest.approx(1.0)
        # growth_passed = False when growth preset disabled
        assert result["growth_passed"] is False
        assert result["value_passed"] is True

    def test_individual_criterion_disabled_excluded_from_total(self):
        """Test 8: Individual criterion disabled → excluded from criteria_total count."""
        from agent.scoring import score_company

        # Disable eps_growth_yoy and pb_ratio
        settings = _make_settings(
            growth_eps_growth_yoy_enabled=False,
            value_pb_ratio_enabled=False,
        )
        ttm = self._all_passing_ttm()
        result = score_company(ttm, settings)

        # 8 total - 2 disabled = 6 active
        assert result["criteria_total"] == 6
        assert result["criteria_passed"] == 6
        assert result["score"] == pytest.approx(1.0)

    def test_score_below_threshold_not_shortlisted(self):
        """Extra: score below threshold → is_shortlisted=False."""
        from agent.scoring import score_company

        settings = _make_settings(shortlist_threshold=0.90)
        ttm = self._all_passing_ttm()
        # Fail 2 criteria
        ttm["eps_growth_yoy"] = 0.01
        ttm["pe_ratio"] = 25.0

        result = score_company(ttm, settings)

        # 8 criteria, 6 pass → score = 0.75, below 0.90
        assert result["criteria_passed"] == 6
        assert result["score"] == pytest.approx(6 / 8)
        assert result["is_shortlisted"] is False

    def test_empty_criteria_score_zero(self):
        """Extra: all presets disabled → criteria_total=0, score=0.0."""
        from agent.scoring import score_company

        settings = _make_settings(growth_enabled=False, value_enabled=False)
        ttm = self._all_passing_ttm()
        result = score_company(ttm, settings)

        assert result["criteria_total"] == 0
        assert result["criteria_passed"] == 0
        assert result["score"] == pytest.approx(0.0)
        assert result["growth_passed"] is False
        assert result["value_passed"] is False
        assert result["is_shortlisted"] is False
