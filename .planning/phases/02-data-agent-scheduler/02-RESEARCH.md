# Phase 2 Research: Data Agent & Scheduler

**Date:** 2026-03-20

---

## Key Findings

### 1. yfinance API

`yfinance` covers all target markets via ticker suffixes — no extra configuration needed.

```python
import yfinance as yf

ticker = yf.Ticker("AAPL")          # US
ticker = yf.Ticker("SAP.DE")        # Germany XETRA
ticker = yf.Ticker("0700.HK")       # Hong Kong (Tencent)
ticker = yf.Ticker("ASML.AS")       # Amsterdam (ASML)
```

**Key attributes:**

| Attribute | Returns | Use |
|-----------|---------|-----|
| `ticker.info` | dict | market cap, P/E, P/B, sector, name, currency |
| `ticker.quarterly_financials` | DataFrame | income statement (columns=dates, rows=line items) |
| `ticker.quarterly_balance_sheet` | DataFrame | balance sheet |
| `ticker.quarterly_cashflow` | DataFrame | cash flow statement |
| `ticker.news` | list[dict] | recent headlines |

**Row keys for income statement:**
- `Total Revenue`, `Gross Profit`, `Operating Income`, `Net Income`, `Diluted EPS`

**Row keys for balance sheet:**
- `Total Assets`, `Total Debt`, `Stockholders Equity`, `Cash And Cash Equivalents`

**Row keys for cashflow:**
- `Operating Cash Flow`, `Capital Expenditure`, `Free Cash Flow`

**Ratios from `.info`:**
- `trailingPE`, `priceToBook`, `returnOnEquity`, `enterpriseToEbitda`, `debtToEquity`

**Rate limiting:** yfinance will 429 if called too fast. Add `time.sleep(0.5)` between tickers.

**Gotcha — DataFrame orientation:**
```python
df = ticker.quarterly_financials  # columns are Timestamps, rows are metrics
# Access: df.loc["Total Revenue", df.columns[0]]  ← most recent quarter
# Transpose for easier iteration: df.T → rows=dates, cols=metrics
```

**Gotcha — missing data:** `.info`, `.quarterly_financials` can return empty dict/DataFrame for some international tickers. Always wrap in try/except and check `df.empty`.

---

### 2. SEC EDGAR Filing Metadata (US only)

EDGAR provides a free JSON API — no auth, no rate limits stated (but be polite: 10 req/s max).

**Step 1 — Get CIK from ticker:**
```python
# company_tickers.json maps ticker → CIK
resp = requests.get("https://www.sec.gov/files/company_tickers.json")
mapping = {v["ticker"]: str(v["cik_str"]).zfill(10) for v in resp.json().values()}
cik = mapping.get("AAPL")  # "0000320193"
```

Cache this mapping at startup — it's ~1MB but rarely changes.

**Step 2 — Get recent filings:**
```python
url = f"https://data.sec.gov/submissions/CIK{cik}.json"
data = requests.get(url).json()
filings = data["filings"]["recent"]
# filings["form"] → list of form types
# filings["accessionNumber"] → list of accession numbers
# filings["filingDate"] → list of dates
# filings["primaryDocument"] → list of primary doc names
```

**Step 3 — Build filing URL:**
```python
accession = "0000320193-24-000123"
accession_clean = accession.replace("-", "")
doc_url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_clean}/{primary_doc}"
```

**Store:** accession number, form type, filed date, and doc URL in a `filings` table. No download needed.

**Header requirement:** EDGAR requires a User-Agent header:
```python
headers = {"User-Agent": "InvestIQ research@investiq.local"}
```

---

### 3. SQLAlchemy 2.0 with PostgreSQL (Supabase)

Use SQLAlchemy 2.0 with `psycopg2` for the agent (synchronous — yfinance is sync).

**Connection:**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
Session = sessionmaker(bind=engine)
```

**Local Supabase DATABASE_URL:**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

**Model base:**
```python
class Base(DeclarativeBase):
    pass
```

**Upsert pattern** (for quarterly data — same company + period may be re-fetched):
```python
from sqlalchemy.dialects.postgresql import insert

stmt = insert(Financials).values(**data)
stmt = stmt.on_conflict_do_update(
    index_elements=["company_id", "period"],
    set_={k: stmt.excluded[k] for k in data if k not in ("company_id", "period")}
)
session.execute(stmt)
```

**Gotcha:** Supabase local uses port `54322` for direct DB connections (not `54321` which is the REST API).

---

### 4. APScheduler with FastAPI Lifespan

```python
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from contextlib import asynccontextmanager

scheduler = BackgroundScheduler(timezone="America/New_York")

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        run_agent_sync,
        CronTrigger(hour=6, minute=0),
        id="daily_agent_run",
        replace_existing=True,
    )
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)
```

Use `BackgroundScheduler` (not `AsyncIOScheduler`) because `run_agent_sync` calls yfinance (synchronous). The background scheduler runs jobs in a thread pool, keeping FastAPI's event loop free.

**On-demand trigger from FastAPI endpoint:**
```python
@app.post("/api/agent/run")
async def trigger_run(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_agent_sync)
    return {"status": "started"}
```

Use FastAPI `BackgroundTasks` for on-demand — simpler than triggering APScheduler directly.

---

### 5. Period Mapping (yfinance dates → YYYY-QN)

yfinance returns `Timestamp` objects as column headers in financial DataFrames. Map to quarter string:

```python
from datetime import datetime

def date_to_quarter(ts) -> str:
    dt = ts.to_pydatetime() if hasattr(ts, "to_pydatetime") else ts
    q = (dt.month - 1) // 3 + 1
    return f"{dt.year}-Q{q}"
# e.g. 2024-09-30 → "2024-Q3"
```

---

### 6. Growth Rate & Signal Computation

**YoY growth** requires same quarter prior year — need 5 quarters of data minimum (4 trailing + 1 year ago):

```python
def yoy_growth(current, prior_year) -> float | None:
    if prior_year is None or prior_year == 0:
        return None
    return (current - prior_year) / abs(prior_year)
```

**Signal generation** — run after growth metrics computed:
```python
signals = []
if revenue_growth_yoy is not None and revenue_growth_yoy < 0:
    signals.append({"type": "revenue_miss", "direction": "red", "value": revenue_growth_yoy})
if fcf < 0:
    signals.append({"type": "fcf_negative", "direction": "red", "value": fcf})
# etc.
```

---

## Recommended Approaches

### DB Connection
**Recommendation:** SQLAlchemy 2.0 + psycopg2, sync session, `DATABASE_URL` env var pointing to Supabase local port 54322.
**Gotcha:** Never use the REST port (54321) for SQLAlchemy — it needs a direct PostgreSQL connection.

### Agent Structure
**Recommendation:** Keep each concern in its own module (fetcher, parser, ratios, growth, signals, news). `runner.py` orchestrates and loops over companies with 0.5s sleep between each.
**Gotcha:** yfinance `.quarterly_financials` columns may be in descending order — always sort by date.

### SEC EDGAR
**Recommendation:** Cache `company_tickers.json` at agent startup (not per-run). Only fetch EDGAR data for US companies (skip .DE, .HK, .AS tickers).
**Gotcha:** User-Agent header required or requests get blocked.

### APScheduler
**Recommendation:** `BackgroundScheduler` (sync) since yfinance is blocking. Don't use `AsyncIOScheduler` — it would block the event loop.
**Gotcha:** APScheduler v3 and v4 have incompatible APIs. Pin to `apscheduler>=3.10,<4.0`.
