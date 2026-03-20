# Phase 3: Screening Engine - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated shortlisting of companies based on configurable growth and value investing criteria. Delivers: scoring engine (backend), per-user criteria configuration (inline UI drawer), shortlist model with automatic Growth/Value labels and manual Watch bookmarks. Dashboard cards showing shortlisted companies are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Scoring Model
- **D-01:** Score = percentage of active criteria passed (not pass/fail, not weighted points)
- **D-02:** Default shortlist threshold ≈ 70% — user-configurable, stored per user
- **D-03:** Threshold scales proportionally with active criteria — if only growth preset (4 criteria) is on, the 70% applies to those 4, not the full 7
- **D-04:** Missing data (null metric from yfinance) counts as **failed** for that criterion — no skipping
- **D-05:** Score stored in DB after each agent run (not computed on-the-fly at query time)
- **D-06:** Score recalculated in the **background** when a user changes thresholds — settings save instantly, shortlist updates asynchronously

### Criteria Defaults & Configurable Scope
- **D-07:** Thresholds are **per-user** — each user has their own configuration; changes do not affect teammates
- **D-08:** New users are **seeded with preset defaults** on first login (rules of thumb per investing style — see below)
- **D-09:** Configuration UI is **inline on the shortlist page** — a drawer/sidebar that slides out, not a separate settings page

**Default thresholds (seeded on first login):**

Growth preset defaults:
- Revenue growth YoY > 15%
- EPS growth YoY > 10%
- ROE > 15%
- FCF margin > 0% (positive FCF)

Value preset defaults:
- P/E ratio < 20
- P/B ratio < 2
- FCF margin > 0% (positive FCF)
- Debt/Equity < 1.0

Both presets enabled by default. Users can disable either preset or individual criteria.

### Period Selection for Screening
- **D-10:** Scoring uses **TTM (trailing twelve months)** — average of last 4 quarters — for all criteria globally; no per-criterion override
- **D-11:** Companies with fewer than 4 quarters of data are screened on whatever data is available (missing quarters → failed criteria per D-04)
- **D-12:** TTM scores **recalculate automatically** as part of the agent run pipeline — no manual trigger needed

### Labels & Manual Override
- **D-13:** **Growth** and **Value** labels are assigned **automatically by the scoring engine** — a company earns the Growth label by passing the growth preset threshold, Value label by passing the value preset threshold; both labels can apply simultaneously
- **D-14:** **Watch** is a **manual user bookmark** — forces the company onto the shortlist regardless of score
- **D-15:** Users can remove a Watch bookmark to return the company to score-based eligibility
- **D-16:** No manual tagging of Growth/Value by users — these come from the engine only

### Claude's Discretion
- Exact background recalculation mechanism (Celery task, FastAPI BackgroundTasks, or APScheduler job — use APScheduler since it's already wired)
- TTM averaging strategy when some quarters have partial data
- Exact drawer/sidebar component design for criteria config UI
- DB indexing strategy for shortlist_scores queries

</decisions>

<specifics>
## Specific Ideas

- Criteria config drawer should feel lightweight — sliders or number inputs, toggle switches per criterion, one "apply" button that saves async and shows a spinner on the shortlist while recalculating
- Score percentage should be visible per company (e.g., "6/7 criteria" or "86%") so users understand why a company is or isn't on the shortlist
- Watch bookmark should be removable with a single click from the shortlist card

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing data pipeline (Phase 2)
- `apps/backend/agent/ratios.py` — `compute_ratios()`: produces pe_ratio, pb_ratio, roe, ev_ebitda, debt_to_equity per company/period
- `apps/backend/agent/growth.py` — `compute_growth()`: produces revenue_growth_yoy, eps_growth_yoy, gross_margin, operating_margin, fcf_margin per company/period
- `apps/backend/agent/store.py` — upsert helpers for all models; scoring pipeline must follow the same upsert pattern
- `apps/backend/agent/runner.py` — orchestrates fetch→parse→compute→store; scoring must hook in here as a final step after store

### Existing models (read before designing new ones)
- `apps/backend/models/ratios.py` — Ratio model schema (company_id, period, 5 ratio fields)
- `apps/backend/models/growth.py` — GrowthMetric model schema (company_id, period, 5 growth fields)
- `apps/backend/db.py` — SQLAlchemy session setup; all new models follow same pattern

### Auth / user context
- `apps/backend/auth.py` — JWT verification; per-user criteria settings must be scoped to `user_id` from auth token
- `apps/backend/routers/users.py` — existing user router pattern to follow for criteria settings endpoints

### Frontend patterns
- `apps/web/app/dashboard/page.tsx` — current dashboard shell (Phase 4 placeholder); criteria drawer will attach here
- `apps/web/lib/supabase/client.ts` — Supabase client for frontend data fetching

### Requirements
- `.planning/REQUIREMENTS.md` §Screening — SCREEN-01 through SCREEN-05 (all in scope for this phase)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `compute_ratios()` + `compute_growth()`: already produce all metric values needed for screening — scoring engine reads from the stored DB rows, does not re-call these
- `APScheduler` lifespan in `main.py`: background recalculation job can be added as a second scheduled task or triggered via `BackgroundTasks`
- `auth.py` JWT middleware: all criteria settings endpoints must be authenticated; follow existing pattern from `routers/agent.py`

### Established Patterns
- All new models: SQLAlchemy 2.0 declarative with `Mapped`/`mapped_column`, `UniqueConstraint` for upsert targets, `ForeignKey` with `ondelete="CASCADE"`
- All new migrations: Supabase SQL files in `supabase/migrations/`, numbered sequentially after `20260320000004`
- Upsert pattern: `on_conflict_do_update` via `store.py` — new `shortlist_scores` and `user_criteria_settings` tables follow same pattern

### Integration Points
- Scoring pipeline hooks into `runner.py` after `store_*` calls — receives `company_id` list and runs TTM computation + score upsert for all users
- Criteria settings API: new router `routers/criteria.py` (GET/PUT user thresholds, POST to seed defaults, POST Watch toggle)
- Frontend criteria drawer: fetches user settings from criteria API, renders inline on dashboard page

</code_context>

<deferred>
## Deferred Ideas

- Per-market P/E benchmarks (e.g., HK < 12 vs US < 20) — user said single user-defined threshold is sufficient for now
- Email alerts when a company enters/exits the shortlist — out of scope for v1
- Backtesting criteria against historical data — Phase 5 territory at earliest

</deferred>

---

*Phase: 03-screening-engine*
*Context gathered: 2026-03-20*
