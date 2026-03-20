-- Migration: Agent schema — companies, financials, signals, news, agent runs
-- All writes go through FastAPI backend (service role).
-- Authenticated users can SELECT all rows — no row-level filtering.

-- ============================================================
-- companies
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
    id              BIGSERIAL PRIMARY KEY,
    ticker          VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    market          VARCHAR(5) NOT NULL,        -- US, DE, CN, EU
    exchange        VARCHAR(50),
    sector          VARCHAR(100),
    market_cap      NUMERIC,
    currency        VARCHAR(5),
    last_fetched_at TIMESTAMPTZ,
    last_fetch_status VARCHAR(20),              -- success, failed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select companies"
    ON companies FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- financials
-- ============================================================
CREATE TABLE IF NOT EXISTS financials (
    id               BIGSERIAL PRIMARY KEY,
    company_id       BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period           VARCHAR(10) NOT NULL,      -- YYYY-QN
    revenue          NUMERIC,
    gross_profit     NUMERIC,
    operating_income NUMERIC,
    net_income       NUMERIC,
    eps_diluted      NUMERIC,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_financials_company_period UNIQUE (company_id, period)
);

ALTER TABLE financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select financials"
    ON financials FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- balance_sheets
-- ============================================================
CREATE TABLE IF NOT EXISTS balance_sheets (
    id           BIGSERIAL PRIMARY KEY,
    company_id   BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period       VARCHAR(10) NOT NULL,
    total_assets NUMERIC,
    total_debt   NUMERIC,
    total_equity NUMERIC,
    cash         NUMERIC,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_balance_sheets_company_period UNIQUE (company_id, period)
);

ALTER TABLE balance_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select balance_sheets"
    ON balance_sheets FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- cash_flows
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_flows (
    id              BIGSERIAL PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period          VARCHAR(10) NOT NULL,
    operating_cf    NUMERIC,
    capex           NUMERIC,
    free_cash_flow  NUMERIC,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cash_flows_company_period UNIQUE (company_id, period)
);

ALTER TABLE cash_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select cash_flows"
    ON cash_flows FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- ratios
-- ============================================================
CREATE TABLE IF NOT EXISTS ratios (
    id              BIGSERIAL PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period          VARCHAR(10) NOT NULL,
    pe_ratio        NUMERIC,
    pb_ratio        NUMERIC,
    roe             NUMERIC,
    ev_ebitda       NUMERIC,
    debt_to_equity  NUMERIC,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ratios_company_period UNIQUE (company_id, period)
);

ALTER TABLE ratios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select ratios"
    ON ratios FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- growth_metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS growth_metrics (
    id                  BIGSERIAL PRIMARY KEY,
    company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period              VARCHAR(10) NOT NULL,
    revenue_growth_yoy  NUMERIC,
    eps_growth_yoy      NUMERIC,
    gross_margin        NUMERIC,
    operating_margin    NUMERIC,
    fcf_margin          NUMERIC,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_growth_metrics_company_period UNIQUE (company_id, period)
);

ALTER TABLE growth_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select growth_metrics"
    ON growth_metrics FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- signals
-- ============================================================
CREATE TABLE IF NOT EXISTS signals (
    id           BIGSERIAL PRIMARY KEY,
    company_id   BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period       VARCHAR(10) NOT NULL,
    signal_type  VARCHAR(50) NOT NULL,
    direction    VARCHAR(10) NOT NULL,          -- red, green
    value        NUMERIC,
    description  VARCHAR(500),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_signals_company_period_type UNIQUE (company_id, period, signal_type)
);

ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select signals"
    ON signals FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- news
-- ============================================================
CREATE TABLE IF NOT EXISTS news (
    id           BIGSERIAL PRIMARY KEY,
    company_id   BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    headline     VARCHAR(500) NOT NULL,
    source       VARCHAR(200),
    url          VARCHAR(1000) NOT NULL UNIQUE,
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select news"
    ON news FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- agent_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_runs (
    id                BIGSERIAL PRIMARY KEY,
    started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at      TIMESTAMPTZ,
    status            VARCHAR(20) NOT NULL,     -- running, completed, failed
    companies_total   INTEGER,
    companies_success INTEGER,
    companies_failed  INTEGER
);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select agent_runs"
    ON agent_runs FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- agent_run_results
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_run_results (
    id            BIGSERIAL PRIMARY KEY,
    run_id        BIGINT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    company_id    BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    status        VARCHAR(20) NOT NULL,         -- success, failed, skipped
    error_message VARCHAR(1000),
    fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agent_run_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select agent_run_results"
    ON agent_run_results FOR SELECT
    TO authenticated
    USING (true);
