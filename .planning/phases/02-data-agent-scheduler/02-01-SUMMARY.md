---
phase: 02-data-agent-scheduler
plan: 01
subsystem: database
tags: [sqlalchemy, postgresql, supabase, migration, seed-data, rls]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: Supabase project, DB connection, profiles migration

provides:
  - SQLAlchemy ORM models for all agent data tables (Company, Financials, BalanceSheet, CashFlow, Ratio, GrowthMetric, Signal, News, AgentRun, AgentRunResult)
  - Supabase migration 20260320000002_agent_schema.sql with RLS policies
  - Seed company JSON with 85 tech companies across US/DE/HK/EU markets

affects:
  - 02-02-data-fetcher
  - 02-03-agent-runner
  - 02-04-scheduler
  - 02-05-api-endpoints
  - 03-screening-engine
  - 04-dashboard

# Tech tracking
tech-stack:
  added:
    - sqlalchemy>=2.0.0 (ORM, DeclarativeBase, mapped_column)
    - psycopg2-binary>=2.9.0 (PostgreSQL driver)
    - apscheduler>=3.10.0,<4.0 (scheduler, used in later plans)
  patterns:
    - DeclarativeBase pattern (SQLAlchemy 2.0 style with Mapped/mapped_column)
    - UniqueConstraint on (company_id, period) for time-series financial tables
    - ON DELETE CASCADE on all FKs referencing companies.id
    - RLS enabled on all tables, authenticated role gets SELECT, writes via service role only
    - Period format YYYY-QN (e.g. "2024-Q3") for all financial snapshots

key-files:
  created:
    - apps/backend/db.py
    - apps/backend/models/__init__.py
    - apps/backend/models/company.py
    - apps/backend/models/financials.py
    - apps/backend/models/ratios.py
    - apps/backend/models/growth.py
    - apps/backend/models/signals.py
    - apps/backend/models/news.py
    - apps/backend/models/agent_run.py
    - supabase/migrations/20260320000002_agent_schema.sql
    - apps/backend/data/seed_companies.json
  modified:
    - apps/backend/requirements.txt

key-decisions:
  - "SQLAlchemy 2.0 DeclarativeBase with Mapped/mapped_column — avoids deprecated Column() style"
  - "All Numeric financial columns are nullable — international tickers frequently have sparse data"
  - "Period format YYYY-QN string (not date) — simpler grouping for quarterly time-series queries"
  - "RLS allows authenticated SELECT on all tables, no INSERT/UPDATE/DELETE from client — all writes via FastAPI service role"
  - "Seed JSON has 85 companies: 50 US, 10 DE, 15 HK, 10 EU — covers required market spread"

patterns-established:
  - "DB session: get_db() generator pattern, yield then finally close — for FastAPI Depends()"
  - "Models live in apps/backend/models/, imported via __init__.py, db.Base from apps/backend/db.py"
  - "UniqueConstraint named explicitly (uq_{table}_{columns}) for ON CONFLICT targeting"

requirements-completed: [AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05, AGENT-06, AGENT-07]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 2 Plan 01: Database Schema and Models Summary

**SQLAlchemy 2.0 ORM models for 10 financial data tables, Supabase migration with RLS, and 85-company seed JSON across US/DE/HK/EU markets**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-20T20:22:06Z
- **Completed:** 2026-03-20T20:25:52Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Created `apps/backend/db.py` with engine, session factory, DeclarativeBase, and `get_db()` for FastAPI dependency injection
- Defined 10 SQLAlchemy models: Company, Financials, BalanceSheet, CashFlow, Ratio, GrowthMetric, Signal, News, AgentRun, AgentRunResult
- Created Supabase migration with all 10 tables, RLS enabled, and authenticated SELECT policies
- Created seed company JSON with 85 tech companies (50 US, 10 DE, 15 HK, 10 EU)

## Task Commits

Each task was committed atomically:

1. **Task 1: SQLAlchemy models and DB session** - `d77b2a5` (feat)
2. **Task 2: Supabase migration and seed company JSON** - `5240416` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/backend/db.py` - Engine, Session, Base, get_db() generator
- `apps/backend/models/__init__.py` - Imports all models, defines __all__
- `apps/backend/models/company.py` - Company model (ticker, market, exchange, last_fetched_at)
- `apps/backend/models/financials.py` - Financials, BalanceSheet, CashFlow with UniqueConstraints
- `apps/backend/models/ratios.py` - Ratio model (pe_ratio, pb_ratio, roe, ev_ebitda, debt_to_equity)
- `apps/backend/models/growth.py` - GrowthMetric model (revenue_growth_yoy, margins)
- `apps/backend/models/signals.py` - Signal model (signal_type, direction red/green, UniqueConstraint per type)
- `apps/backend/models/news.py` - News model (unique url constraint)
- `apps/backend/models/agent_run.py` - AgentRun and AgentRunResult models
- `supabase/migrations/20260320000002_agent_schema.sql` - Full schema migration, 10 tables, RLS
- `apps/backend/data/seed_companies.json` - 85 companies across US/DE/HK/EU
- `apps/backend/requirements.txt` - Added sqlalchemy, psycopg2-binary, apscheduler

## Decisions Made

- Used SQLAlchemy 2.0 `DeclarativeBase` with `Mapped[T]` and `mapped_column()` — avoids deprecated `Column()` style, provides typed annotations
- All Numeric financial columns are `nullable=True` — international tickers frequently have sparse data from yfinance
- Period format is `YYYY-QN` string, not a date type — simpler for quarterly grouping, avoids timezone edge cases
- RLS: authenticated users SELECT all, no client writes — all mutations go through FastAPI with service role key

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- SQLAlchemy not installed in the shell Python environment — installed via `python3 -m pip install sqlalchemy psycopg2-binary` to verify model imports during execution. This does not affect the Docker-based FastAPI runtime which installs from requirements.txt.

## User Setup Required

- Run `supabase db reset` to apply migration `20260320000002_agent_schema.sql` to local Supabase
- Set `DATABASE_URL` env var for FastAPI backend (default: `postgresql://postgres:postgres@localhost:54322/postgres`)

## Next Phase Readiness

- All SQLAlchemy models are importable and referenced by subsequent plans (02-02 fetcher, 02-03 runner, 02-04 scheduler, 02-05 API)
- Seed JSON ready for loading via seeder script (built in 02-03 or 02-05)
- Migration must be applied before any agent plan runs: `supabase db reset`

---
*Phase: 02-data-agent-scheduler*
*Completed: 2026-03-20*
