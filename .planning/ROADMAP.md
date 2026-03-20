# Roadmap: InvestIQ

**Created:** 2026-03-20
**Granularity:** Standard (5-8 phases)
**Strategy:** Parallel execution where plans are independent

---

## Phase 1 — Foundation & Auth

**Goal:** Working app skeleton with Google login, database, and project infrastructure.

**Deliverables:**
- Next.js 14+ project with TypeScript and Tailwind CSS
- FastAPI Python backend with project structure
- Supabase project (PostgreSQL + Auth)
- Google OAuth login flow (web)
- User profile model in database
- Local dev environment with Docker Compose
- CI skeleton (lint, typecheck)

**Requirements covered:** AUTH-01, AUTH-02, AUTH-03

**Exit criteria:** A user can sign in with Google, see their name, and sign out. Backend health endpoint responds.

---

## Phase 2 — Data Agent & Scheduler

**Goal:** Agent that fetches and stores financial data for companies across all target markets.

**Deliverables:**
- Company data models (PostgreSQL schema): companies, financials, ratios, filings, news
- yfinance integration for US, Germany (.DE), China (HK), and EU tickers
- SEC EDGAR XBRL API integration for US 10-Q/10-K filings
- Earnings summary parser (EPS, revenue, guidance)
- Key financial ratio computation (P/E, P/B, ROE, EV/EBITDA, D/E, FCF)
- News fetcher (NewsAPI free tier or yfinance news)
- APScheduler background job (daily default)
- On-demand refresh API endpoint
- Fetch status and error logging per company per run
- Seed list of ~100 companies across all markets to start

**Requirements covered:** AGENT-01 through AGENT-07

**Exit criteria:** Running the agent populates the database with financials, ratios, filings, and news for seed companies. Logs show success/failure per company.

---

## Phase 3 — Screening Engine

**Goal:** Automated shortlisting of companies based on configurable growth and value criteria.

**Deliverables:**
- Preset growth criteria: revenue growth >15% YoY, EPS growth >10%, ROE >15%, debt-to-equity <1
- Preset value criteria: P/E below sector median, P/B <2, positive FCF, dividend yield >0% optional
- Screening criteria stored in database, configurable per user
- Criteria configuration UI (threshold sliders/inputs in settings)
- Scoring engine: companies scored against active criteria after each agent run
- Shortlist model: companies that pass criteria are flagged and ranked
- Manual override: user can tag company as Growth / Value / Watch regardless of score

**Requirements covered:** SCREEN-01 through SCREEN-05

**Exit criteria:** After agent run, companies meeting thresholds appear on shortlist. User can adjust a threshold and shortlist updates.

---

## Phase 4 — Dashboard & Company Detail

**Goal:** Full UI for browsing the shortlist and drilling into company data.

**Deliverables:**
- Dashboard page: company cards with ticker, market, strategy tag, P/E, revenue growth, score, last updated
- Filter bar: by market (US / DE / CN / EU) and strategy (Growth / Value / Watch)
- Sortable columns on dashboard
- Agent status banner: last run time, next scheduled run, companies updated
- Company detail page: full financial metrics, ratio trend sparklines
- Detail page: earnings summary section, SEC filing links (US companies)
- Detail page: news headlines with source and link
- Detail page: criteria pass/fail checklist showing which rules triggered shortlisting
- Responsive design (mobile-friendly web)

**Requirements covered:** DASH-01 through DASH-05, DETAIL-01 through DETAIL-04

**Exit criteria:** Dashboard shows shortlisted companies with filters and sort working. Clicking a company shows full detail with financials, news, and criteria breakdown.

---

## Phase 5 — Notes & Research Workspace

**Goal:** Per-user investment thesis and notes attached to each company.

**Deliverables:**
- Structured thesis form per company: bull case, bear case, target price, conviction (1–5), time horizon
- Free-form rich text notes editor (markdown or simple WYSIWYG)
- Notes stored per user per company in database
- Notes visible on company detail page
- Notes persist across sessions and devices

**Requirements covered:** NOTES-01 through NOTES-04

**Exit criteria:** User can write a thesis and notes on a company, refresh the page, and see them persisted. Another user sees their own separate notes.

---

## Phase 6 — Mobile App

**Goal:** React Native / Expo app covering core flows: dashboard, detail, and notes.

**Deliverables:**
- Expo project setup with shared TypeScript types from backend
- Google OAuth login in Expo (expo-auth-session)
- Dashboard screen with company cards and filters
- Company detail screen with metrics and news
- Notes screen with thesis form and free-form notes
- API client shared with web (same FastAPI backend)
- Build configs for iOS and Android

**Requirements covered:** MOB-01, MOB-02, MOB-03

**Exit criteria:** Mobile app builds and runs. User can log in with Google, view shortlist, see company detail, and write/read notes.

---

## Phase 7 — Polish & Production

**Goal:** Production-ready deployment with monitoring, error handling, and performance.

**Deliverables:**
- Error boundary and fallback UI in web and mobile
- Agent error alerting (email or log aggregation)
- Performance: dashboard loads in <2s, detail page in <1s
- Rate limiting on API endpoints
- Environment configs for staging and production
- Deployment: Vercel (Next.js), Railway or Render (FastAPI), Supabase (DB + Auth)
- Basic monitoring: uptime check, agent run health dashboard
- README and setup documentation

**Requirements covered:** (All — production hardening)

**Exit criteria:** App deployed to production URL. Agent runs daily without intervention. Team members can sign in and use all features.

---

## Milestone Map

| Milestone | Phases | Description |
|-----------|--------|-------------|
| M1 — Working Core | 1–3 | Auth + data pipeline + screening engine |
| M2 — Full UI | 4–5 | Dashboard, detail, and notes |
| M3 — Mobile + Ship | 6–7 | Mobile app + production deploy |

---
*Roadmap created: 2026-03-20*
*Last updated: 2026-03-20 after initialization*
