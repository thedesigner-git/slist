---
phase: 02-data-agent-scheduler
plan: 05
subsystem: api
tags: [apscheduler, fastapi, yfinance, sqlalchemy, cron, background-tasks]

# Dependency graph
requires:
  - phase: 02-data-agent-scheduler
    provides: fetcher, parser, edgar, ratios, growth, signals, store, news modules (02-01 through 02-04)
  - phase: 02-data-agent-scheduler
    provides: AgentRun/AgentRunResult models and DB migration (02-01)
provides:
  - Full agent orchestration pipeline in agent/runner.py (run_all, run_single)
  - Agent API endpoints: POST /api/agent/run, POST /api/agent/run/{ticker}, GET /api/agent/runs
  - APScheduler daily cron job firing at 6am America/New_York via FastAPI lifespan
affects: [03-screening-engine, 04-dashboard, 07-polish-production]

# Tech tracking
tech-stack:
  added: [apscheduler>=3.10.0 (BackgroundScheduler, CronTrigger)]
  patterns:
    - FastAPI lifespan context manager for scheduler lifecycle (start on startup, shutdown on teardown)
    - BackgroundTasks for non-blocking agent trigger from API endpoints
    - Typed (status, company_id, error) 3-tuple return from run_company for clean error propagation

key-files:
  created:
    - apps/backend/agent/runner.py
    - apps/backend/routers/agent.py
  modified:
    - apps/backend/main.py
    - apps/backend/models/agent_run.py

key-decisions:
  - "AgentRunResult.company_id is nullable (SET NULL FK) — pre-upsert failures must still record a run result row without a company reference"
  - "run_company returns typed 3-tuple (status, company_id, error) instead of mixed str/tuple for clean callsite handling"
  - "APScheduler BackgroundScheduler (not AsyncIOScheduler) — agent pipeline is sync SQLAlchemy; no async needed"
  - "Agent endpoints use FastAPI BackgroundTasks (not ThreadPoolExecutor) for non-blocking trigger; scheduler uses same run_all function"

patterns-established:
  - "FastAPI lifespan for external process lifecycle: scheduler.start() before yield, scheduler.shutdown() after"
  - "Seed-file-driven company list: runner.py reads data/seed_companies.json to determine which companies to process"

requirements-completed: [AGENT-05, AGENT-06, AGENT-07]

# Metrics
duration: 6min
completed: 2026-03-20
---

# Phase 2 Plan 05: Agent Runner, API Endpoints, and APScheduler Summary

**APScheduler daily 6am ET cron wired into FastAPI lifespan; runner.py orchestrates full fetch-parse-ratios-growth-signals-filings-news pipeline; three authenticated agent API endpoints added**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-20T20:37:26Z
- **Completed:** 2026-03-20T20:43:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `agent/runner.py` with `run_all` (full batch orchestration) and `run_single` (on-demand ticker refresh), writing AgentRun + AgentRunResult records per company
- Created `routers/agent.py` with three authenticated endpoints: POST /api/agent/run, POST /api/agent/run/{ticker}, GET /api/agent/runs
- Updated `main.py` with APScheduler BackgroundScheduler lifespan firing `run_all` daily at 6:00 AM America/New_York via CronTrigger

## Task Commits

Each task was committed atomically:

1. **Task 1: Agent runner** — `a19d6bb` (feat)
2. **Task 2: Agent API endpoints and APScheduler lifespan** — `60f1c81` (feat)

**Plan metadata:** (final docs commit — see below)

## Files Created/Modified

- `apps/backend/agent/runner.py` — Full pipeline orchestration: fetch→parse→ratios→growth→signals→filings→news per company, with AgentRun/AgentRunResult DB records
- `apps/backend/routers/agent.py` — Three authenticated REST endpoints for triggering and inspecting agent runs
- `apps/backend/main.py` — FastAPI lifespan with APScheduler; agent router included
- `apps/backend/models/agent_run.py` — Made `company_id` nullable (SET NULL) to handle pre-upsert failure case

## Decisions Made

- APScheduler `BackgroundScheduler` chosen over `AsyncIOScheduler` because the agent pipeline uses synchronous SQLAlchemy sessions (no async needed)
- `run_company` returns a typed 3-tuple `(status, company_id, error)` instead of the plan's mixed `str | tuple` pattern for clean callsite handling
- `AgentRunResult.company_id` made nullable with `SET NULL` cascade so failed runs (before company upsert) still produce a result row

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Made AgentRunResult.company_id nullable to handle pre-upsert failures**
- **Found during:** Task 1 (agent runner)
- **Issue:** Model had `company_id` as non-nullable FK, but the plan's `run_company` explicitly passes `company_id=None` when the company upsert itself fails — this would cause a DB constraint violation
- **Fix:** Changed `company_id` column to `nullable=True` with `ondelete="SET NULL"` in AgentRunResult model; updated runner to pass company_id directly (now always valid since nullable)
- **Files modified:** `apps/backend/models/agent_run.py`
- **Verification:** ruff passes; import checks pass; model accepts None company_id
- **Committed in:** a19d6bb (Task 1 commit)

**2. [Rule 1 - Bug] Typed run_company return value — replaced mixed str/tuple with 3-tuple**
- **Found during:** Task 1 (agent runner)
- **Issue:** Plan code returned either `"success"` (str) or `"failed", str(e)` (tuple), requiring isinstance check at callsite — fragile and error-prone
- **Fix:** Changed return type to explicit 3-tuple `(status, company_id, error)` with consistent unpacking at callsite
- **Files modified:** `apps/backend/agent/runner.py`
- **Verification:** Import check passes; callsite cleanly unpacks `status, company_id, error = run_company(...)`
- **Committed in:** a19d6bb (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes necessary for correct operation. No scope creep — model change aligns with plan's stated intent to handle pre-upsert failures.

## Issues Encountered

- ruff reported unsorted imports in runner.py and main.py — auto-fixed via `ruff check --fix`

## User Setup Required

None — no external service configuration required. The scheduler starts automatically on app startup. First actual data run requires internet access to yfinance/SEC EDGAR (see plan user_setup notes).

## Next Phase Readiness

- Full agent pipeline is wired end-to-end: daily scheduler + on-demand API triggers + per-company result logging
- Phase 03 (Screening Engine) can now query `agent_run_results`, `financials`, `growth_metrics`, `signals` tables populated by the agent
- No blockers

---
*Phase: 02-data-agent-scheduler*
*Completed: 2026-03-20*
