---
phase: 02-data-agent-scheduler
verified: 2026-03-20T22:00:00Z
status: human_needed
score: 14/14 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 12/14
  gaps_closed:
    - "Each company result written to agent_run_results with status and error_message — migration 20260320000004 makes company_id nullable with SET NULL, aligning DB with ORM"
    - "US-only guard: BIDU correctly classified as non-US via seed market lookup in edgar.py"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Run POST /api/agent/run against running stack and observe agent_runs/agent_run_results tables"
    expected: "All 85 companies processed; company_id NULL rows appear for any pre-upsert failures; scheduler fires at 6am ET without manual intervention"
    why_human: "Requires live network access to yfinance and SEC EDGAR; cannot verify actual data quality or scheduler timing programmatically"
  - test: "Run supabase db reset then trigger a deliberate pre-upsert failure"
    expected: "AgentRunResult row inserted with company_id=NULL, status=failed, error_message populated — no DB constraint violation"
    why_human: "Requires Supabase running locally and intentionally triggering the failure path via a non-existent ticker"
  - test: "APScheduler auto-fire verification"
    expected: "At 6:00 AM America/New_York a new AgentRun row appears without a manual API call"
    why_human: "Timing-dependent; cannot verify scheduler firing programmatically without running the app"
---

# Phase 2: Data Agent and Scheduler — Re-Verification Report

**Phase Goal:** Agent that fetches and stores financial data for companies across US, Germany, China, and EU markets.
**Verified:** 2026-03-20T22:00:00Z
**Status:** human_needed — all automated checks passed; 3 items require live-stack validation
**Re-verification:** Yes — after gap closure plans 02-06 and 02-07

---

## Re-Verification Summary

Previous score: 12/14 (2 gaps found)
Current score: 14/14 (0 gaps remaining)

Both gaps identified in the initial verification have been closed:

- **Gap 1 (Blocker):** Migration `20260320000004_agent_run_results_nullable.sql` (commit `a390c5a`) drops the `NOT NULL` constraint on `agent_run_results.company_id` and replaces the `ON DELETE CASCADE` FK with `ON DELETE SET NULL`. The DB schema now matches the ORM model exactly.
- **Gap 2 (Warning):** `edgar.py` (commit `de80e5c`) now loads `seed_companies.json` into a `_load_seed_markets()` cache and checks the seed market field before the dot-suffix heuristic. `is_us_ticker('BIDU')` now correctly returns `False` because BIDU's seed market is `HK`.

No regressions were found in any previously-verified artifact.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All database tables created by running supabase db reset | VERIFIED | Migrations 00001–00004 apply in order; 00004 ALTERs agent_run_results without re-creating any table |
| 2 | SQLAlchemy models importable with no errors | VERIFIED | All 10 model files exist; agent_run.py unchanged and correct |
| 3 | Seed companies JSON contains at least 80 tech companies across US/DE/HK/EU | VERIFIED | 85 companies confirmed: US=50, DE=10, HK=15, EU=10 |
| 4 | fetcher.fetch_company() returns a FetchResult with income/balance/cashflow/info/news | VERIFIED | FetchResult dataclass with all required fields; 0.5s rate-limit delay present |
| 5 | parser.parse_financials() returns structured dicts matching model columns | VERIFIED | Keys match Financials, BalanceSheet, CashFlow model columns exactly |
| 6 | edgar.get_filings() returns filings list for US tickers; skips non-US including BIDU | VERIFIED | is_us_ticker() checks seed market first; BIDU (market=HK) returns False; get_filings('BIDU') returns [] |
| 7 | compute_ratios() returns pe_ratio, pb_ratio, roe, ev_ebitda, debt_to_equity | VERIFIED | ratios.py returns all 5 keys with safe_float conversion |
| 8 | compute_growth() calculates YoY revenue_growth and eps_growth as decimals | VERIFIED | growth.py: _yoy_growth() and _safe_margin(); returns empty list when <5 quarters |
| 9 | generate_signals() returns red/green signals for known inputs | VERIFIED | signals.py: revenue_miss (red), revenue_acceleration (green), fcf_negative (red), fcf_strong (green) |
| 10 | store.py upserts financials without duplicating rows | VERIFIED | All 6 upsert functions use on_conflict_do_update with named UniqueConstraints |
| 11 | POST /api/agent/run triggers full pipeline in background | VERIFIED | BackgroundTasks.add_task(run_all); requires get_current_user |
| 12 | POST /api/agent/run/{ticker} triggers single-company refresh | VERIFIED | Reads seed JSON to resolve market, calls run_single(ticker, market) |
| 13 | GET /api/agent/runs returns run history | VERIFIED | Queries AgentRun ordered by started_at desc |
| 14 | APScheduler fires daily at 6am America/New_York | VERIFIED | CronTrigger(hour=6, minute=0) in main.py lifespan |
| 15 | Each company result written to agent_run_results with status and error_message | VERIFIED | Migration 00004 drops NOT NULL and changes FK to SET NULL; ORM and DB now aligned |

**Score:** 14/14 truths verified (no partials remaining)

---

## Gap Closure Verification

### Gap 1: agent_run_results.company_id nullability (CLOSED)

**File:** `supabase/migrations/20260320000004_agent_run_results_nullable.sql`

Verified contents:
- `DROP CONSTRAINT agent_run_results_company_id_fkey` — removes the NOT NULL FK
- `ALTER COLUMN company_id DROP NOT NULL` — makes column nullable at DB level
- `ADD CONSTRAINT agent_run_results_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL` — new FK with correct action

Negative checks (both passed):
- `ON DELETE CASCADE` absent from migration — confirmed
- No new `NOT NULL` imposed on company_id — confirmed (only appears in `DROP NOT NULL` clause and comment text)

ORM model `apps/backend/models/agent_run.py` line 28–30: `nullable=True`, `ondelete="SET NULL"` — unchanged and correct. Schema and ORM are fully aligned.

Migration ordering: 00001 → 00002 → 00003 → 00004 — correct sequential ordering, no gaps.

Commit `a390c5a` confirmed in git log.

### Gap 2: BIDU EDGAR misclassification (CLOSED)

**File:** `apps/backend/agent/edgar.py`

Verified additions:
- `import json` and `from pathlib import Path` at module top (lines 1, 4)
- `_SEED_PATH = Path(__file__).parent.parent / "data" / "seed_companies.json"` (line 11)
- `@lru_cache(maxsize=1)` on `_load_seed_markets()` (lines 14–23) — reads seed JSON, returns `dict[str, str]` mapping ticker to market
- `is_us_ticker()` updated (lines 38–43): checks `_load_seed_markets()` first; if ticker in map returns `market == "US"`; else falls back to `"." not in ticker`

Seed data confirmed: `seed_companies.json` line 70 — `{"ticker": "BIDU", "name": "Baidu Inc.", "market": "HK", "exchange": "NASDAQ"}` — unchanged.

Logic trace for BIDU: `is_us_ticker("BIDU")` → seed map hit → `"HK" == "US"` → `False` → `get_filings("BIDU")` returns `[]`. Correct.

Logic trace for AAPL: seed map hit → `"US" == "US"` → `True` → EDGAR proceeds. Correct.

Logic trace for unknown ticker `NEWCO` (no dot): not in seed map → fallback `"." not in "NEWCO"` → `True`. Conservative default preserved.

Commit `de80e5c` confirmed in git log.

---

## Required Artifacts

### Plan 02-01 (Schema and Models)

| Artifact | Status | Re-verification note |
|----------|--------|----------------------|
| `apps/backend/db.py` | VERIFIED | No change — regression check passed |
| `apps/backend/models/company.py` | VERIFIED | No change |
| `apps/backend/models/financials.py` | VERIFIED | No change |
| `apps/backend/models/ratios.py` | VERIFIED | No change |
| `apps/backend/models/growth.py` | VERIFIED | No change |
| `apps/backend/models/signals.py` | VERIFIED | No change |
| `apps/backend/models/news.py` | VERIFIED | No change |
| `apps/backend/models/agent_run.py` | VERIFIED | No change — was already correct with nullable=True, ondelete=SET NULL |
| `apps/backend/models/__init__.py` | VERIFIED | No change |
| `apps/backend/data/seed_companies.json` | VERIFIED | No change — BIDU entry intact, edgar.py now reads market field |
| `supabase/migrations/20260320000002_agent_schema.sql` | VERIFIED | No change — 00004 handles ALTER without touching original |
| `supabase/migrations/20260320000004_agent_run_results_nullable.sql` | VERIFIED | New — contains DROP NOT NULL and SET NULL FK; no NOT NULL or CASCADE on company_id |

### Plan 02-02 (Fetcher and Parser)

| Artifact | Status | Re-verification note |
|----------|--------|----------------------|
| `apps/backend/agent/fetcher.py` | VERIFIED | No change |
| `apps/backend/agent/parser.py` | VERIFIED | No change |

### Plan 02-03 (EDGAR and News)

| Artifact | Status | Re-verification note |
|----------|--------|----------------------|
| `apps/backend/agent/edgar.py` | VERIFIED | Updated — market-aware is_us_ticker() with seed JSON lookup + lru_cache |
| `apps/backend/agent/news.py` | VERIFIED | No change |
| `apps/backend/models/filing.py` | VERIFIED | No change |
| `supabase/migrations/20260320000003_filings.sql` | VERIFIED | No change |

### Plan 02-04 (Computation and Store)

| Artifact | Status | Re-verification note |
|----------|--------|----------------------|
| `apps/backend/agent/ratios.py` | VERIFIED | No change |
| `apps/backend/agent/growth.py` | VERIFIED | No change |
| `apps/backend/agent/signals.py` | VERIFIED | No change |
| `apps/backend/agent/store.py` | VERIFIED | No change |

### Plan 02-05 (Runner, API, Scheduler)

| Artifact | Status | Re-verification note |
|----------|--------|----------------------|
| `apps/backend/agent/runner.py` | VERIFIED | No change — failure path correctly sets company_id=None; now DB allows it |
| `apps/backend/routers/agent.py` | VERIFIED | No change |
| `apps/backend/main.py` | VERIFIED | No change |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `20260320000004_agent_run_results_nullable.sql` | `apps/backend/models/agent_run.py` | schema alignment | WIRED | Both now: nullable, ON DELETE SET NULL |
| `apps/backend/agent/edgar.py` | `apps/backend/data/seed_companies.json` | `_load_seed_markets()` JSON load | WIRED | `_SEED_PATH` resolves to data/seed_companies.json; lru_cache loaded on first call |
| `apps/backend/agent/edgar.py` | `apps/backend/agent/runner.py` | `is_us_ticker()` called in `get_filings()` | WIRED | get_filings called from runner.py line 84; BIDU now correctly returns [] |
| `supabase/migrations/20260320000002_agent_schema.sql` | `apps/backend/models/agent_run.py` | schema alignment | WIRED | 00004 bridges the previously broken link |
| All other key links from initial verification | — | — | WIRED | Confirmed unchanged; no regressions |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AGENT-01 | 02-01, 02-02, 02-03, **02-07** | Agent fetches 10-Q and 10-K filings from SEC EDGAR for US companies | SATISFIED | edgar.py market-aware guard now correctly excludes HK/DE/EU seeds; CIK map + EDGAR API intact |
| AGENT-02 | 02-01, 02-02, 02-04 | Agent fetches earnings summaries (EPS, revenue, guidance) via yfinance | SATISFIED | fetcher.py + parser.py unchanged; verified in initial pass |
| AGENT-03 | 02-01, 02-04 | Agent computes key financial ratios (P/E, P/B, ROE, EV/EBITDA, debt-to-equity) | SATISFIED | ratios.py + store.py unchanged |
| AGENT-04 | 02-01, 02-03 | Agent fetches recent news and analyst ratings per company | SATISFIED | news.py + models/news.py unchanged |
| AGENT-05 | 02-01, 02-02, 02-05, **02-07** | Agent covers US/Germany/China(HK)/EU markets | SATISFIED | BIDU now correctly routed as HK-market (EDGAR skipped); all 85 seeds unchanged |
| AGENT-06 | 02-01, 02-05 | Agent runs on configurable schedule and supports on-demand refresh | SATISFIED | APScheduler + endpoints unchanged |
| AGENT-07 | 02-01, 02-05, **02-06** | Agent logs fetch status and errors per company per run | SATISFIED | Migration 00004 closes the DB constraint blocker; runner.py failure path now succeeds at DB level |

All 7 AGENT requirements are marked Complete in REQUIREMENTS.md. No orphaned requirements found.

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found in gap-closure files | — | — | — |

Gap-closure files `20260320000004_agent_run_results_nullable.sql` and `edgar.py`:
- No TODO/FIXME/placeholder comments
- No empty return stubs
- No hardcoded empty data flowing to user-visible output
- `_load_seed_markets()` has an exception handler that returns `{}` (empty dict) — this is a safe fallback, not a stub: the dot-suffix heuristic activates as backup, preserving existing behavior

---

## Human Verification Required

### 1. Agent Run End-to-End with NULL company_id path

**Test:** Start the full stack (`docker-compose up backend` with Supabase running). Run `supabase db reset` to apply all 4 migrations. POST to `/api/agent/run` with an authenticated JWT for a ticker that does not exist in yfinance to force the pre-upsert failure path. Inspect `agent_run_results` in Supabase Studio.
**Expected:** AgentRunResult row inserted with `company_id=NULL`, `status="failed"`, `error_message` populated. No IntegrityError raised. All 85 companies produce result rows.
**Why human:** Requires live Supabase instance to apply migrations and intentionally trigger the failure path. Cannot be verified statically.

### 2. BIDU EDGAR Skip Confirmation

**Test:** Run `POST /api/agent/run/BIDU` against the live stack and inspect application logs.
**Expected:** Log line shows BIDU skipped by EDGAR module (get_filings returns []); yfinance data still fetched and stored for BIDU; no 10-Q/10-K filing rows appear in the `filings` table for BIDU.
**Why human:** Requires live network access to yfinance and the running backend to observe log output.

### 3. APScheduler Auto-Fire

**Test:** Start the backend and either wait until 6:00 AM America/New_York, or temporarily change `CronTrigger(hour=6)` to fire 1 minute from now, then revert. Confirm a new `agent_runs` row appears without a manual API call.
**Expected:** Scheduler auto-fires `run_all`, creates AgentRun record, processes all 85 companies.
**Why human:** Timing-dependent; cannot verify scheduler firing programmatically without running the app.

---

## Gaps Summary

No gaps remain. Both blockers from the initial verification are closed:

- The DB constraint blocker (AGENT-07) is resolved by migration `20260320000004_agent_run_results_nullable.sql`. The migration correctly uses the PostgreSQL two-step pattern (DROP CONSTRAINT, ALTER COLUMN DROP NOT NULL, ADD CONSTRAINT with new action) and does not introduce any new NOT NULL or CASCADE on company_id.
- The BIDU misclassification warning (AGENT-01, AGENT-05) is resolved by the market-aware `_load_seed_markets()` function in `edgar.py`. The seed JSON remains the authoritative source of truth for market classification; the dot-suffix heuristic is preserved as a safe fallback for tickers not present in the seed data.

The phase goal — an automated agent that fetches and stores financial data for companies across US, Germany, China, and EU markets — is fully implemented at the code and schema layer. Three human verification items remain, all requiring a running stack or network access, which is expected for an agent-based data pipeline.

---

_Verified: 2026-03-20T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — gap closure plans 02-06 and 02-07_
