---
phase: 03-screening-engine
plan: 01
subsystem: database
tags: [sqlalchemy, postgresql, screening, scoring, ttm, yfinance]

# Dependency graph
requires:
  - phase: 02-data-agent-scheduler
    provides: GrowthMetric and Ratio ORM models with per-company quarterly data

provides:
  - ShortlistScore ORM model (per-user company score with growth/value labels)
  - UserCriteriaSettings ORM model (per-user configurable thresholds)
  - DB migration 20260320000005_screening_tables.sql
  - compute_ttm_metrics(db, company_id) -> dict (averages last 4 quarters)
  - score_company(ttm, settings) -> dict (pure function, evaluates active criteria)
  - score_all_companies(db, user_id) -> None (upserts all company scores per user)

affects: [03-screening-engine, 04-dashboard-company-detail]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TTM averaging via _avg() helper over nullable Numeric fields
    - Pure scoring function (score_company) with no DB side effects for testability
    - Upsert with Watch preservation (on_conflict preserves is_watch, updates score fields)

key-files:
  created:
    - apps/backend/models/screening.py
    - apps/backend/agent/scoring.py
    - apps/backend/tests/test_scoring.py
    - supabase/migrations/20260320000005_screening_tables.sql
  modified:
    - apps/backend/models/__init__.py

key-decisions:
  - "Null metrics count as failed criterion per D-04 — no skipping of missing data"
  - "ROE sourced from ratios table (not growth_metrics) — ratios.roe is the canonical value"
  - "score_company is a pure function (no DB) — enables fast unit testing without mocks"
  - "score_all_companies preserves is_watch flag via on_conflict_do_update excluding is_watch column"
  - "TTM = average of all non-null values from last 4 quarters; fewer quarters still scored per D-11"

patterns-established:
  - "Scoring pattern: compute_ttm_metrics → score_company → upsert ShortlistScore"
  - "Preset pass test: (passed_count / total) >= shortlist_threshold — scales to active criteria per D-03"

requirements-completed: [SCREEN-01, SCREEN-02, SCREEN-04]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 3 Plan 01: Screening Models and Scoring Engine Summary

**Per-user scoring engine with TTM averaging, configurable growth/value criteria, and null-as-fail enforcement.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-20T23:31:14Z
- **Completed:** 2026-03-20T23:34:59Z
- **Tasks:** 2 completed
- **Files modified:** 5

## Accomplishments

- Created two new ORM models (UserCriteriaSettings, ShortlistScore) following SQLAlchemy 2.0 Mapped pattern
- Implemented TTM computation that averages last 4 quarters of growth/ratio data, returning None for all-null fields
- Implemented pure scoring function with 8 configurable criteria (4 growth + 4 value), null-as-fail, and proportional threshold per D-03
- 10 unit tests cover all key behaviors including edge cases (disabled presets, null metrics, below-threshold, empty criteria)

## Task Commits

1. **Task 1: Create screening models and migration** - `6839d16` (feat)
2. **Task 2: Add failing tests (RED)** - `1de9ca3` (test)
3. **Task 2: Implement scoring engine (GREEN)** - `4fb27b4` (feat)

## Files Created/Modified

- `apps/backend/models/screening.py` - UserCriteriaSettings (22 columns) and ShortlistScore (10 columns) ORM models
- `apps/backend/agent/scoring.py` - compute_ttm_metrics, score_company, score_all_companies
- `apps/backend/tests/test_scoring.py` - 10 unit tests for TTM and scoring logic
- `supabase/migrations/20260320000005_screening_tables.sql` - CREATE TABLE for both tables + 2 indexes
- `apps/backend/models/__init__.py` - Added ShortlistScore and UserCriteriaSettings to imports and __all__

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data flows are wired to DB queries. score_all_companies reads Company, GrowthMetric, Ratio tables and upserts to ShortlistScore.

## Self-Check: PASSED

- FOUND: apps/backend/models/screening.py
- FOUND: apps/backend/agent/scoring.py
- FOUND: apps/backend/tests/test_scoring.py
- FOUND: supabase/migrations/20260320000005_screening_tables.sql
- FOUND: .planning/phases/03-screening-engine/03-01-SUMMARY.md
- FOUND commit: 6839d16 (models and migration)
- FOUND commit: 1de9ca3 (failing tests)
- FOUND commit: 4fb27b4 (scoring engine implementation)
