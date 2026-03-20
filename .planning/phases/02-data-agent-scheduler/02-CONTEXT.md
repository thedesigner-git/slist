# Phase 2 Context: Data Agent & Scheduler

**Phase:** 2 — Data Agent & Scheduler
**Created:** 2026-03-20
**Status:** Ready for planning

---

## Core Constraint (carried from Phase 1)

No data collection from users. No analytics. No tracking. Every authenticated user has identical access.

---

## Decisions

### Seed Company Universe

**Scope:** Tech industry companies with market cap > $5B across all 4 markets.

**Target tickers by market:**

| Market | Examples | Source |
|--------|---------|--------|
| US (NYSE/NASDAQ) | AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA, AMD, ORCL, CRM, ADBE, INTC, QCOM, AVGO, TXN, MU, AMAT, ASML (US-listed), IBM, HPE, DELL, SNOW, PLTR, NET, DDOG, ZS, CRWD | yfinance |
| Germany (XETRA) | SAP.DE, IFX.DE, DTE.DE, SIE.DE (tech segment) | yfinance `.DE` suffix |
| China / HK | 0700.HK (Tencent), 9988.HK (Alibaba), 9618.HK (JD), 1810.HK (Xiaomi), 9999.HK (NetEase), 3690.HK (Meituan), BIDU (US-listed) | yfinance HK tickers + US-listed ADRs |
| EU (broad) | ASML.AS, NOKIA.HE, ERICB.ST, CAP.PA, DSY.PA, STM.MI, ADYEN.AS | yfinance exchange suffixes |

**~80–100 companies total.** Stored in a `companies` seed table — admin-editable, not hardcoded.

**Ticker seed file:** `apps/backend/data/seed_companies.json` — list of objects with `ticker`, `name`, `market`, `exchange`.

---

### Database Schema

**Design:** Time-series — keep full quarterly history, never overwrite.

Tables:

```
companies          — master company list (ticker, name, market, exchange, sector, market_cap)
financials         — quarterly income statement snapshots (company_id, period, revenue, gross_profit, operating_income, net_income, eps_diluted)
balance_sheets     — quarterly balance sheet snapshots (company_id, period, total_assets, total_debt, total_equity, cash)
cash_flows         — quarterly cash flow snapshots (company_id, period, operating_cf, capex, free_cash_flow)
ratios             — computed ratios per snapshot (company_id, period, pe_ratio, pb_ratio, roe, ev_ebitda, debt_to_equity)
growth_metrics     — computed YoY growth rates (company_id, period, revenue_growth_yoy, eps_growth_yoy, gross_margin, operating_margin, fcf_margin)
signals            — red/green flags (company_id, period, signal_type, direction, value, description)
news               — headlines (company_id, headline, source, url, published_at)
agent_runs         — run logs (id, started_at, completed_at, status, companies_total, companies_success, companies_failed)
agent_run_results  — per-company result within a run (run_id, company_id, status, error_message, fetched_at)
```

**Period format:** `YYYY-QN` string (e.g. `"2024-Q3"`). Unique constraint on `(company_id, period)` for financial tables — use `ON CONFLICT DO UPDATE` (upsert) to refresh data if re-fetched.

---

### Agent Architecture

**Language:** Python, lives in `apps/backend/agent/`

**Structure:**
```
apps/backend/agent/
  fetcher.py       — yfinance + SEC EDGAR fetch per company
  parser.py        — extract structured financials from raw yfinance data
  ratios.py        — compute P/E, P/B, ROE, EV/EBITDA, D/E from raw numbers
  growth.py        — compute YoY growth rates and margin trends
  signals.py       — generate red/green flag signals
  news.py          — fetch and store news headlines
  scheduler.py     — APScheduler setup and job registration
  runner.py        — orchestrates full run: fetch → parse → compute → store → log
```

**On-demand refresh:** FastAPI endpoint `POST /api/agent/run` — triggers `runner.run_all()` as a background task. `POST /api/agent/run/{ticker}` — single company refresh.

---

### Scheduler

**Tool:** APScheduler (`apscheduler>=3.10`) running inside FastAPI via lifespan event.

**Schedule:** Daily at **11:00 UTC** (= 6:00 AM ET, accounts for EST; adjust in summer for EDT — use `America/New_York` timezone in APScheduler).

**Config:**
```python
scheduler.add_job(
    runner.run_all,
    trigger=CronTrigger(hour=11, minute=0, timezone="America/New_York"),
    id="daily_agent_run",
    replace_existing=True,
)
```

---

### Agent Failure Handling

**Policy:** Skip and log — continue with remaining companies, record each failure.

- Each company result written to `agent_run_results` with `status = "success" | "failed" | "skipped"`
- `error_message` field captures the exception message
- `companies` table gets `last_fetched_at` and `last_fetch_status` updated after each attempt
- UI will show "last updated X ago" and flag companies with fetch errors (Phase 4)
- No retries in v1 — if a company fails, it gets picked up next scheduled run

---

### Financial Data Extraction

**Source:** `yfinance` for all markets (US, DE, HK, EU).

**Statements to extract:**
- **Income statement:** revenue, gross_profit, operating_income, net_income, eps_diluted
- **Balance sheet:** total_assets, total_debt (long-term + short-term), total_equity, cash_and_equivalents
- **Cash flow:** operating_cash_flow, capital_expenditures, free_cash_flow (= operating CF − CapEx)
- **Ratios:** P/E (trailing), P/B, ROE (TTM), EV/EBITDA, debt-to-equity — from `yfinance.info` where available, computed otherwise

**SEC EDGAR (US only):** Use EDGAR full-text search API (`https://efts.sec.gov/LATEST/search-index?q=...`) to get 10-Q/10-K filing URLs. Store as metadata (accession number, filed date, doc URL) in a `filings` table — **do not download full PDFs**.

**Period detection:** yfinance returns quarterly data by default. Map to `YYYY-QN` format using the period end date.

---

### Computed Analysis

**Growth rates** (stored in `growth_metrics` table, computed after each fetch):
- `revenue_growth_yoy` — (current quarter revenue − same quarter prior year) / same quarter prior year
- `eps_growth_yoy` — same formula applied to EPS
- `gross_margin` — gross_profit / revenue
- `operating_margin` — operating_income / revenue
- `fcf_margin` — free_cash_flow / revenue

**Red/Green signals** (stored in `signals` table, one row per signal per company per period):

| Signal Type | Trigger | Direction |
|-------------|---------|-----------|
| `revenue_miss` | Revenue growth YoY < 0% | 🔴 red |
| `margin_compression` | Gross margin down > 3pp YoY | 🔴 red |
| `debt_spike` | D/E ratio up > 50% YoY | 🔴 red |
| `fcf_negative` | Free cash flow < 0 | 🔴 red |
| `revenue_acceleration` | Revenue growth > 20% YoY | 🟢 green |
| `margin_expansion` | Gross margin up > 3pp YoY | 🟢 green |
| `fcf_strong` | FCF margin > 15% | 🟢 green |

Signal thresholds are hardcoded in v1 — configurable in a future phase.

---

### News Fetching

**Source:** `yfinance` ticker news (`.news` attribute) — free, no API key needed.

**Data stored per article:** `headline`, `source` (publisher name), `url`, `published_at`

**Volume:** Last 10 headlines per company per agent run. Dedup by URL — don't re-insert if already in DB.

**No article summaries**, no scraping of article body, no AI summarization in Phase 2.

---

### What Downstream Agents Should Know

- All financial data flows through `apps/backend/agent/` — nothing fetches data directly from routes
- FastAPI routes only read from DB and trigger agent runs — they never call yfinance directly
- `agent_run_results` is the source of truth for which companies succeeded/failed per run
- Growth metrics and signals are always derived (never user-entered)
- The `signals` table drives the red/green indicators in Phase 3 and 4 UI
- Seed companies in `apps/backend/data/seed_companies.json` — not hardcoded in Python
- yfinance rate limits: add 0.5s delay between company fetches to avoid 429s
- US companies also get SEC EDGAR filing metadata (URL + date) — no PDF download

## Deferred Ideas

- User-configurable signal thresholds (noted for Phase 3 screening engine)
- AI-generated narrative quarterly summary (out of scope for now)
- Email/push alerts when signals fire (v2)
- Backtesting shortlist performance against market returns (v2)
