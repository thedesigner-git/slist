-- Migration: Replace hardcoded 8-criterion columns with JSONB for 20 criteria support
-- This drops and recreates user_criteria_settings with a JSONB criteria column.
-- shortlist_scores is kept as-is (unchanged schema).

DROP TABLE IF EXISTS user_criteria_settings CASCADE;

CREATE TABLE user_criteria_settings (
    id              SERIAL PRIMARY KEY,
    user_id         VARCHAR(255) NOT NULL UNIQUE,

    -- Preset toggles
    growth_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    value_enabled   BOOLEAN NOT NULL DEFAULT TRUE,

    -- Pass thresholds: how many criteria within each preset must pass
    growth_pass_threshold INTEGER NOT NULL DEFAULT 4,
    value_pass_threshold  INTEGER NOT NULL DEFAULT 3,

    -- Overall shortlist threshold (D-02: default 70%)
    shortlist_threshold NUMERIC NOT NULL DEFAULT 0.70,

    -- JSONB: per-criterion settings
    -- Structure: { "revenueGrowth": {"enabled": true, "threshold": 0.15}, ... }
    criteria        JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_user_criteria_settings_user UNIQUE (user_id)
);

-- Add new columns to ratios table for extended metrics
ALTER TABLE ratios
    ADD COLUMN IF NOT EXISTS dividend_yield NUMERIC,
    ADD COLUMN IF NOT EXISTS price_to_sales NUMERIC,
    ADD COLUMN IF NOT EXISTS current_ratio NUMERIC,
    ADD COLUMN IF NOT EXISTS interest_coverage NUMERIC,
    ADD COLUMN IF NOT EXISTS price_fcf NUMERIC;

-- Add new columns to growth_metrics for extended metrics
ALTER TABLE growth_metrics
    ADD COLUMN IF NOT EXISTS net_profit_margin NUMERIC,
    ADD COLUMN IF NOT EXISTS fcf_growth NUMERIC,
    ADD COLUMN IF NOT EXISTS rd_percent NUMERIC;
