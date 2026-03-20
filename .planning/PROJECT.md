# InvestIQ — Investment Shortlist App

## What This Is

A personal investment research hub for a small team that automatically scans and fetches quarterly reports, financial metrics, and news for companies matching growth and value investing criteria. Users can view a curated shortlist of qualifying companies across US, German, Chinese, and EU markets, and maintain structured investment theses and personal notes — all in one place.

## Core Value

The agent-powered shortlist: automatically surface qualifying companies so users spend time on decisions, not data gathering.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Agent fetches 10-Q/10-K filings, earnings summaries, key financial ratios, and news for each company
- [ ] Preset growth and value investing screening criteria with configurable thresholds
- [ ] Coverage of US (NYSE/NASDAQ), Germany (XETRA), China (A-shares/HK), and EU markets
- [ ] Dashboard with company overview cards and drill-down detail pages
- [ ] Structured investment thesis template (bull/bear case, target price, conviction) + free-form notes per company
- [ ] Scheduled + on-demand data refresh
- [ ] Google OAuth login with individual user accounts
- [ ] Responsive web app + mobile app (React Native / Expo)

### Out of Scope

- Real-time market data / live prices — data cadence is quarterly/daily, not tick-by-tick
- Paid financial data APIs — free sources only (yfinance, SEC EDGAR, OpenBB)
- Portfolio tracking / trade execution — this is a research and shortlist tool, not a brokerage
- Public SaaS / multi-tenant — small team use, not a public product

## Context

- Target users: small investment group (2-5 people), each with personal notes and shared company data
- Markets: US (SEC EDGAR, yfinance), Germany (yfinance .DE tickers), China (yfinance HK/A-share), EU broad
- Free data sources: yfinance, SEC EDGAR XBRL API, OpenBB, NewsAPI (free tier)
- Agent framework: Python-based async agent with APScheduler for scheduling
- Global market coverage adds timezone and data availability complexity

## Constraints

- **Data**: Free APIs only — yfinance, SEC EDGAR, OpenBB, NewsAPI free tiers
- **Auth**: Google OAuth via Supabase Auth — no custom password management
- **Stack**: Next.js (web) + React Native/Expo (mobile) + FastAPI (backend) + PostgreSQL via Supabase
- **Users**: Small group (~5 users) — no horizontal scaling needed for v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for auth + DB | Google OAuth built-in, PostgreSQL, free tier generous for small team | — Pending |
| FastAPI Python backend | Best ecosystem for financial data agents (yfinance, pandas, APScheduler) | — Pending |
| React Native + Expo for mobile | Share business logic with Next.js web app, single codebase | — Pending |
| Free APIs only | User constraint — avoids ongoing data costs | — Pending |
| yfinance for global coverage | Covers US, .DE, HK/China, EU tickers with single library | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

---
*Last updated: 2026-03-20 after initialization*
