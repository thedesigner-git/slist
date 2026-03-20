---
phase: 02-data-agent-scheduler
plan: "03"
subsystem: backend-agent
tags: [edgar, sec, filings, news, sqlalchemy, migration]
dependency_graph:
  requires: ["02-01"]
  provides: ["agent/edgar.py", "agent/news.py", "models/filing.py"]
  affects: ["02-04", "02-05"]
tech_stack:
  added: ["requests (SEC EDGAR HTTP client)"]
  patterns: ["lru_cache for CIK map", "on_conflict_do_nothing for URL dedup", "US-only ticker guard via dot suffix check"]
key_files:
  created:
    - apps/backend/agent/__init__.py
    - apps/backend/agent/edgar.py
    - apps/backend/agent/news.py
    - apps/backend/models/filing.py
    - supabase/migrations/20260320000003_filings.sql
  modified:
    - apps/backend/models/__init__.py
decisions:
  - SEC EDGAR User-Agent header set to "InvestIQ research@investiq.local" per SEC API requirements
  - US-only guard implemented as dot-suffix check (SAP.DE, 0700.HK skipped)
  - CIK map cached via lru_cache(maxsize=1) to avoid repeated SEC API calls per process
  - news.save_news uses PostgreSQL on_conflict_do_nothing on url index for deduplication
metrics:
  duration: 4min
  completed: "2026-03-20"
  tasks: 2
  files: 6
---

# Phase 2 Plan 3: SEC EDGAR Fetcher and News Persistence Summary

**One-liner:** SEC EDGAR filing metadata fetcher with US-only guard and LRU-cached CIK map, plus PostgreSQL-backed news persistence with URL deduplication.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Filing model and migration | 7073b46 | models/filing.py, models/__init__.py, migrations/20260320000003_filings.sql |
| 2 | SEC EDGAR fetcher and news persistence | 57b085c | agent/edgar.py, agent/news.py, agent/__init__.py |

## What Was Built

**Filing model (models/filing.py):** SQLAlchemy 2.0 Mapped model for the `filings` table with `accession_number` unique constraint, CASCADE delete from companies, and timezone-aware `created_at`.

**Filings migration (20260320000003_filings.sql):** PostgreSQL table with RLS enabled, authenticated-user SELECT policy, and `idx_filings_company_id` index for join performance.

**EDGAR fetcher (agent/edgar.py):**
- `is_us_ticker(ticker)` — returns False for any ticker containing a dot (SAP.DE, 0700.HK, SAF.AS)
- `_load_cik_map()` — LRU-cached fetch of the SEC company_tickers.json, maps ticker -> 10-digit zero-padded CIK
- `get_filings(ticker, form_types, max_results)` — fetches recent 10-Q/10-K filings from EDGAR submissions API, constructs full doc URLs

**News persistence (agent/news.py):**
- `save_news(db, company_id, news_items)` — bulk inserts news rows with `on_conflict_do_nothing` on the `url` column, skips items missing a URL

## Verification Results

- `from agent.edgar import get_filings, is_us_ticker` — ok
- `from agent.news import save_news` — ok
- `is_us_ticker("SAP.DE")` == False
- `is_us_ticker("0700.HK")` == False
- `is_us_ticker("AAPL")` == True
- `ruff check apps/backend/agent/edgar.py apps/backend/agent/news.py` — All checks passed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created agent/ package directory**
- **Found during:** Task 2
- **Issue:** `apps/backend/agent/` directory did not exist; plan assumed it was present
- **Fix:** Created directory with `__init__.py` before writing agent modules
- **Files modified:** apps/backend/agent/__init__.py
- **Commit:** 57b085c

**2. [Rule 1 - Bug] Import ordering auto-fixed by ruff**
- **Found during:** Task 2 verification
- **Issue:** `ruff check` reported I001 import-sort violations in edgar.py and news.py
- **Fix:** Ran `ruff check --fix` to reorder stdlib/third-party/local imports
- **Files modified:** apps/backend/agent/edgar.py, apps/backend/agent/news.py
- **Commit:** 57b085c (included in same commit after fix)

## Known Stubs

None — all functions are fully implemented. `save_news` and `get_filings` are ready for integration in plan 02-04.

## Self-Check: PASSED

- apps/backend/agent/edgar.py — FOUND
- apps/backend/agent/news.py — FOUND
- apps/backend/models/filing.py — FOUND
- supabase/migrations/20260320000003_filings.sql — FOUND
- Commit 7073b46 — FOUND
- Commit 57b085c — FOUND
