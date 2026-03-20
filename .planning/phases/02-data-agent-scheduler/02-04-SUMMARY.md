---
phase: 02-data-agent-scheduler
plan: 04
subsystem: backend/agent
tags: [computation, ratios, growth, signals, store, upsert, pure-functions]
dependency_graph:
  requires: ["02-02"]
  provides: ["compute_ratios", "compute_growth", "generate_signals", "upsert_financials", "upsert_company", "upsert_ratios", "upsert_growth", "upsert_signals", "upsert_filings"]
  affects: ["02-05"]
tech_stack:
  added: []
  patterns: ["pure-function computation", "postgresql upsert on_conflict_do_update", "batch commit pattern"]
key_files:
  created:
    - apps/backend/agent/ratios.py
    - apps/backend/agent/growth.py
    - apps/backend/agent/signals.py
    - apps/backend/agent/store.py
  modified:
    - apps/backend/agent/signals.py  # ruff fix: removed unused eps_growth, de_ratio
decisions:
  - "eps_growth and de_ratio kept as parameters in generate_signals signature (for future use) but unused local vars removed to satisfy ruff F841"
  - "upsert_financials splits a quarter dict into three separate table upserts (Financials, BalanceSheet, CashFlow) in one commit batch"
metrics:
  duration: "2min"
  completed: "2026-03-20"
  tasks: 2
  files: 4
---

# Phase 2 Plan 4: Computation Layer (Ratios, Growth, Signals, Store) Summary

**One-liner:** Pure computation functions for financial ratios/growth/signals plus PostgreSQL upsert helpers covering all six financial model tables.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Ratios, growth, and signals computation | 334241a | ratios.py, growth.py, signals.py |
| 2 | DB store helpers (upsert) | f32e5b7 | store.py, signals.py (ruff fix) |

## What Was Built

**Computation layer (pure functions, no DB deps):**

- `agent/ratios.py` — `compute_ratios(info)` extracts five valuation ratios from yfinance `.info` dict using `safe_float` guard for None/invalid values
- `agent/growth.py` — `compute_growth(quarters)` calculates YoY revenue/eps growth and gross/operating/FCF margins by pairing each quarter with its year-ago equivalent (index + 4); returns empty list for fewer than 5 quarters
- `agent/signals.py` — `generate_signals(period, growth, ratios, balance)` emits typed red/green signals: `revenue_miss` (red), `fcf_negative` (red), `margin_compression` (red, when delta provided), `revenue_acceleration` (green), `fcf_strong` (green)

**Store layer (upsert helpers, all DB writes):**

- `agent/store.py` — six upsert functions covering every financial model:
  - `upsert_company` — returns company id, on_conflict by ticker
  - `upsert_financials` — upserts Financials + BalanceSheet + CashFlow per quarter in one commit
  - `upsert_ratios` — upserts Ratio by (company_id, period)
  - `upsert_growth` — upserts GrowthMetric list
  - `upsert_signals` — upserts Signal list, conflict on (company_id, period, signal_type)
  - `upsert_filings` — upserts Filing list, conflict on accession_number

## Verification

- All four modules import cleanly
- `ruff check apps/backend/agent/` — all checks passed
- `compute_growth` with <5 quarters returns `[]`
- `generate_signals` with `revenue_growth_yoy=-0.1` returns `[{signal_type: "revenue_miss", direction: "red"}]`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ruff F841 unused variables in signals.py**
- **Found during:** Task 2 (ruff check at verification)
- **Issue:** `eps_growth` and `de_ratio` were assigned but never used in `generate_signals`; these are in the plan's reference implementation verbatim
- **Fix:** Removed the two unused local variable assignments; `eps_growth` and `de_ratio` remain available via the `growth`/`ratios` dicts if future signals need them
- **Files modified:** `apps/backend/agent/signals.py`
- **Commit:** f32e5b7

**2. [Rule 3 - Blocking] Ruff I001 import ordering and E501 line length in store.py**
- **Found during:** Task 2 (ruff check at verification)
- **Issue:** Plan's reference code had stdlib/third-party/local imports unsorted and one line >100 chars
- **Fix:** Sorted imports per isort convention, split long `_upsert` calls across lines
- **Files modified:** `apps/backend/agent/store.py`
- **Commit:** f32e5b7

## Known Stubs

None — all functions are complete implementations. No hardcoded placeholders or TODO markers.

## Self-Check: PASSED

Files exist:
- apps/backend/agent/ratios.py — FOUND
- apps/backend/agent/growth.py — FOUND
- apps/backend/agent/signals.py — FOUND
- apps/backend/agent/store.py — FOUND

Commits exist:
- 334241a — FOUND
- f32e5b7 — FOUND
