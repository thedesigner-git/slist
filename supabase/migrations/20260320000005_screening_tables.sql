CREATE TABLE IF NOT EXISTS user_criteria_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    growth_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    value_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    growth_revenue_growth_yoy NUMERIC NOT NULL DEFAULT 0.15,
    growth_eps_growth_yoy NUMERIC NOT NULL DEFAULT 0.10,
    growth_roe NUMERIC NOT NULL DEFAULT 0.15,
    growth_fcf_margin NUMERIC NOT NULL DEFAULT 0.0,
    growth_revenue_growth_yoy_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    growth_eps_growth_yoy_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    growth_roe_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    growth_fcf_margin_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    value_pe_ratio NUMERIC NOT NULL DEFAULT 20.0,
    value_pb_ratio NUMERIC NOT NULL DEFAULT 2.0,
    value_fcf_margin NUMERIC NOT NULL DEFAULT 0.0,
    value_debt_to_equity NUMERIC NOT NULL DEFAULT 1.0,
    value_pe_ratio_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    value_pb_ratio_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    value_fcf_margin_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    value_debt_to_equity_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    shortlist_threshold NUMERIC NOT NULL DEFAULT 0.70,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shortlist_scores (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    score NUMERIC NOT NULL,
    criteria_passed INTEGER NOT NULL,
    criteria_total INTEGER NOT NULL,
    growth_passed BOOLEAN NOT NULL DEFAULT FALSE,
    value_passed BOOLEAN NOT NULL DEFAULT FALSE,
    is_watch BOOLEAN NOT NULL DEFAULT FALSE,
    is_shortlisted BOOLEAN NOT NULL DEFAULT FALSE,
    scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shortlist_user_company UNIQUE (user_id, company_id)
);

CREATE INDEX idx_shortlist_scores_user_shortlisted ON shortlist_scores (user_id, is_shortlisted);
CREATE INDEX idx_shortlist_scores_user_company ON shortlist_scores (user_id, company_id);
