---
phase: 02-data-agent-scheduler
plan: 06
subsystem: db-migration
tags: [supabase, postgresql, migration, schema, sqlalchemy, nullability]

# Dependency graph
requires:
  - phase: 02-data-agent-scheduler
    provides: agent_run_results table definition (02-01, 20260320000002_agent_schema.sql)
  - phase: 02-data-agent-scheduler
    provides: AgentRunResult ORM model with nullable company_id (02-05)
provides:
  - DB schema aligned with ORM: agent_run_results.company_id nullable with ON DELETE SET NULL
affects: [02-data-agent-scheduler runner.py, 03-screening-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PostgreSQL ALTER TABLE to drop and re-add FK constraint with different action (DROP CONSTRAINT + ADD CONSTRAINT)
    - Two-step nullability fix: drop NOT NULL then replace FK constraint with SET NULL action

key-files:
  created:
    - supabase/migrations/20260320000004_agent_run_results_nullable.sql
  modified: []

key-decisions:
  - "Migration drops and re-adds the FK constraint rather than using ALTER CONSTRAINT — PostgreSQL requires this to change ON DELETE action"
  - "company_id made nullable at DB level so pre-upsert failures in runner.py can INSERT AgentRunResult with company_id=NULL without constraint violation"

requirements-completed: [AGENT-07]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 2 Plan 06: Fix agent_run_results.company_id Nullability Summary

**Gap-closure migration making agent_run_results.company_id nullable with ON DELETE SET NULL, aligning DB schema with the ORM model that was already correct**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20
- **Completed:** 2026-03-20
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created migration `20260320000004_agent_run_results_nullable.sql` that:
  1. Drops the existing `agent_run_results_company_id_fkey` FK (which was NOT NULL + CASCADE)
  2. ALTERs the column to DROP NOT NULL
  3. Re-adds the FK constraint with `ON DELETE SET NULL`
- Schema now matches `apps/backend/models/agent_run.py` exactly: `nullable=True`, `ondelete="SET NULL"`
- Prevents DB constraint violations when runner.py inserts AgentRunResult with `company_id=None` (pre-upsert failure path)

## Task Commits

1. **Task 1: Migration for nullable company_id with SET NULL FK** — `a390c5a` (feat)

## Files Created/Modified

- `supabase/migrations/20260320000004_agent_run_results_nullable.sql` — ALTER TABLE dropping NOT NULL and replacing CASCADE FK with SET NULL FK

## Decisions Made

- Migration uses DROP CONSTRAINT + ADD CONSTRAINT pattern rather than ALTER CONSTRAINT because PostgreSQL does not support changing ON DELETE action via ALTER CONSTRAINT
- No ORM changes needed — `apps/backend/models/agent_run.py` was already correct with `nullable=True` and `ondelete="SET NULL"`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `supabase/migrations/20260320000004_agent_run_results_nullable.sql` — FOUND
- Commit `a390c5a` — FOUND (git log verified)
- `DROP NOT NULL` present in file — VERIFIED (grep count: 1)
- `ON DELETE SET NULL` present in file — VERIFIED (grep count: 1)
- `ON DELETE CASCADE` absent from file — VERIFIED (grep exit 1)

## Next Phase Readiness

- DB schema and ORM are now fully aligned for agent_run_results.company_id
- Runner.py can safely insert AgentRunResult rows with company_id=NULL for companies that fail before upsert_company()
- AGENT-07 requirement fully satisfied at both schema and ORM layers
- No blockers for Phase 03 (Screening Engine)

---
*Phase: 02-data-agent-scheduler*
*Completed: 2026-03-20*
