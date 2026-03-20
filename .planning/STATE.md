---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 02-01 complete (1 of 5 plans in Phase 02)
status: executing
last_updated: "2026-03-20T20:32:15.202Z"
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 8
  completed_plans: 6
---

# State: InvestIQ

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-20)

**Core value:** Agent-powered shortlist — automatically surface qualifying companies so users spend time on decisions, not data gathering.
**Current focus:** Phase 02 — data-agent-scheduler

## Current Phase

**Phase 2 — Data Agent & Scheduler**
Status: Executing Phase 02
Started: 2026-03-20
Current Plan: 02-01 complete (1 of 5 plans in Phase 02)

## Phase History

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1 — Foundation & Auth | Complete | 2026-03-20 |
| Phase 2 — Data Agent & Scheduler | In Progress (1/5 plans) | — |
| Phase 3 — Screening Engine | Not started | — |
| Phase 4 — Dashboard & Company Detail | Not started | — |
| Phase 5 — Notes & Research Workspace | Not started | — |
| Phase 6 — Mobile App | Not started | — |
| Phase 7 — Polish & Production | Not started | — |

## Deferred Ideas

Ideas captured during planning that are out of scope for v1 but worth revisiting:

- Email/push alerts when companies enter or leave shortlist
- Shared team watchlist and collaborative notes
- Custom formula-based screening rules
- Historical backtest of shortlist performance
- Peer/sector comparison view

## Decisions

- SQLAlchemy 2.0 DeclarativeBase with Mapped/mapped_column (typed ORM pattern)
- All Numeric financial columns nullable (international tickers have sparse data)
- Period format YYYY-QN string for all financial snapshots
- RLS allows authenticated SELECT on all tables; all writes via FastAPI service role only
- Seed JSON has 85 companies: 50 US, 10 DE, 15 HK, 10 EU
- [Phase 02-data-agent-scheduler]: SEC EDGAR User-Agent header required by SEC API; set to InvestIQ research@investiq.local
- [Phase 02-data-agent-scheduler]: US-only guard implemented as dot-suffix check in is_us_ticker; non-US tickers return empty list from get_filings
- [Phase 02-data-agent-scheduler]: CIK map LRU-cached per process lifetime to minimize SEC API calls; news URL dedup via on_conflict_do_nothing
- [Phase 02-data-agent-scheduler]: FetchResult dataclass (not dict) for fetch output — typed success/error fields for downstream use
- [Phase 02-data-agent-scheduler]: parse_financials returns list[dict] per quarter with keys matching DB column names directly
- [Phase 02-data-agent-scheduler]: Agent fetch+parse separation: fetcher returns raw yfinance objects, parser converts to DB-ready dicts

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 02-data-agent-scheduler | 02-01 | 4min | 2 | 12 |
| Phase 02-data-agent-scheduler P02-03 | 4min | 2 tasks | 6 files |
| Phase 02-data-agent-scheduler P02-02 | 2min | 2 tasks | 3 files |

## Notes

- Initialized 2026-03-20
- Stack decided: Next.js + FastAPI + Supabase + React Native/Expo
- Free APIs only: yfinance, SEC EDGAR, OpenBB, NewsAPI free tier
- Global market scope: US, Germany, China, EU

---
*Last updated: 2026-03-20 after plan 02-01 complete*
