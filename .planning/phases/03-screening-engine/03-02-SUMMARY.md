---
phase: 03-screening-engine
plan: 02
subsystem: api
tags: [fastapi, sqlalchemy, screening, criteria, scoring, watch, shortlist]

requires:
  - phase: 03-01
    provides: scoring engine (scoring.py), screening models (UserCriteriaSettings, ShortlistScore)
  - phase: 02-data-agent-scheduler
    provides: runner pipeline (runner.py), company data models, agent infrastructure

provides:
  - Authenticated criteria settings API (GET/PUT /api/criteria/settings)
  - Watch bookmark toggle API (PATCH /api/criteria/watch/{company_id})
  - Shortlist query API (GET /api/criteria/shortlist, GET /api/criteria/scores)
  - Background recalculation status API (GET /api/criteria/status)
  - Scoring integrated into agent runner (run_all, run_single)

affects: [04-dashboard-company-detail, frontend-criteria-drawer]

tech-stack:
  added: []
  patterns:
    - Background recalculation via FastAPI BackgroundTasks with module-level state dict
    - Settings seeded on first access (GET creates defaults, not a separate seed endpoint)
    - Partial update via Pydantic model_dump(exclude_unset=True) + setattr loop
    - Scoring errors in runner caught with try/except — agent run never blocked by scoring failure

key-files:
  created:
    - apps/backend/routers/criteria.py
  modified:
    - apps/backend/agent/runner.py
    - apps/backend/main.py

key-decisions:
  - "BackgroundTasks (not APScheduler) chosen for on-demand recalculation — triggered per user on settings update"
  - "Module-level _recalc_in_progress dict tracks per-user background job state for status endpoint"
  - "Watch toggle without score row creates ShortlistScore with score=0 and is_shortlisted=True immediately"
  - "Scoring in runner.py placed after final db.commit() to avoid blocking agent run status"

patterns-established:
  - "Criteria router pattern: APIRouter(prefix='/api/criteria', tags=['criteria']) with Depends(get_current_user)"
  - "score_all_companies_wrapper: opens own DB session, sets recalc flag, calls scoring, closes session"
  - "_get_or_create_settings helper: reusable within router for both GET and Watch endpoints"

requirements-completed: [SCREEN-03, SCREEN-04, SCREEN-05]

duration: 3min
completed: 2026-03-20
---

# Phase 3 Plan 02: Criteria API and Runner Integration Summary

**Authenticated criteria settings API with Watch bookmarks and automatic scoring after every agent data refresh via FastAPI BackgroundTasks and runner integration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T23:37:54Z
- **Completed:** 2026-03-20T23:41:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `routers/criteria.py` with 6 authenticated endpoints: GET/PUT settings, PATCH watch toggle, GET shortlist, GET scores, GET status
- Integrated scoring into `runner.py` — `run_all()` and `run_single()` both score all users after data refresh (per D-12)
- Registered criteria router in `main.py` so all `/api/criteria/*` routes are live
- Settings seeded with defaults on first GET access (per D-08); partial updates apply only provided fields

## Task Commits

1. **Task 1: Create criteria settings and Watch API router** - `17fc8fc` (feat)
2. **Task 2: Integrate scoring into agent runner and register router** - `d3137c9` (feat)

## Files Created/Modified

- `apps/backend/routers/criteria.py` — Criteria API: settings GET/PUT, Watch PATCH, shortlist/scores GET, recalc status GET
- `apps/backend/agent/runner.py` — Added score_all_companies call in both run_all and run_single after company processing
- `apps/backend/main.py` — Imported criteria module and registered criteria.router

## Decisions Made

- Used FastAPI `BackgroundTasks` (not APScheduler) for on-demand per-user recalculation triggered by settings PUT — APScheduler is for scheduled runs; BackgroundTasks better fits the request-scoped trigger
- Module-level `_recalc_in_progress: dict[str, bool]` provides lightweight per-user state for the `/status` endpoint without a DB round-trip
- Watch toggle without an existing score row creates the row immediately with `score=0, is_shortlisted=True` — avoids requiring a prior agent run before a user can bookmark
- Scoring block in `run_all()` placed after final `db.commit()` (after updating run status) so scoring failures do not affect the run completion record

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all imports resolved cleanly against models and auth infrastructure from Plans 01/02.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Criteria API is fully wired and authenticated; frontend can call `/api/criteria/settings` and `/api/criteria/shortlist`
- Scoring runs automatically after every agent data refresh — no manual trigger needed
- Watch bookmarks functional; shortlist includes both score-based and Watch entries
- Ready for Phase 4: dashboard company cards that read from the shortlist API

---
*Phase: 03-screening-engine*
*Completed: 2026-03-20*
