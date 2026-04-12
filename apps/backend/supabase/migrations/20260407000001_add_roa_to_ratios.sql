-- Add ROA (Return on Assets) column to ratios table
-- Populated by agent/ratios.py via yfinance returnOnAssets field
ALTER TABLE ratios ADD COLUMN IF NOT EXISTS roa NUMERIC;
