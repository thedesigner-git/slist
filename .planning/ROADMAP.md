# Roadmap: InvestIQ

## Overview

Seven phases taking InvestIQ from a blank repo to a production-deployed investment shortlist app. The agent-powered data pipeline and screening engine are built first so the UI has real data to display. Mobile follows the web UI. Production hardening closes the project.

## Phases

- [ ] **Phase 1: Foundation & Auth** - Project skeleton, Supabase, Google OAuth, local dev environment
- [ ] **Phase 2: Data Agent & Scheduler** - Agent fetches financials, filings, and news; APScheduler; on-demand refresh
- [ ] **Phase 3: Screening Engine** - Growth/value criteria presets, configurable thresholds, shortlist scoring
- [ ] **Phase 4: Dashboard & Company Detail** - Overview cards, filters, company detail page, metrics and news
- [ ] **Phase 5: Notes & Research Workspace** - Structured thesis template, free-form rich text notes per user per company
- [ ] **Phase 6: Mobile App** - React Native / Expo app covering dashboard, detail, and notes
- [ ] **Phase 7: Polish & Production** - Error handling, monitoring, deployment, documentation

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: Working app skeleton with Google login, database, and project infrastructure across Next.js, FastAPI, and Supabase.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. User can sign in with Google and see their name in the app
  2. User session persists across page refresh
  3. FastAPI backend health endpoint responds
  4. Local dev environment starts with a single command (Docker Compose)
**Plans**: TBD

Plans:
- [ ] 01-01: Next.js + FastAPI + Supabase project setup and Docker Compose
- [ ] 01-02: Google OAuth login flow and user profile model
- [ ] 01-03: CI skeleton (lint, typecheck, basic test run)

### Phase 2: Data Agent & Scheduler
**Goal**: Agent that fetches and stores financial data for companies across US, Germany, China, and EU markets.
**Depends on**: Phase 1
**Requirements**: AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05, AGENT-06, AGENT-07
**Success Criteria** (what must be TRUE):
  1. Running the agent populates the database with financials, ratios, filings, and news for seed companies
  2. Agent logs show success/failure per company per run
  3. On-demand refresh API endpoint triggers agent for a specific company
  4. Scheduled daily run completes without manual intervention
**Plans**: TBD

Plans:
- [x] 02-01: Database schema (companies, financials, ratios, filings, news, agent_runs)
- [x] 02-02: yfinance integration for US, Germany (.DE), China (HK), and EU tickers
- [x] 02-03: SEC EDGAR XBRL API integration for 10-Q/10-K filings
- [ ] 02-04: Earnings summary, financial ratio computation, news fetcher
- [ ] 02-05: APScheduler setup, on-demand refresh endpoint, error logging

### Phase 3: Screening Engine
**Goal**: Automated shortlisting of companies based on configurable growth and value investing criteria.
**Depends on**: Phase 2
**Requirements**: SCREEN-01, SCREEN-02, SCREEN-03, SCREEN-04, SCREEN-05
**Success Criteria** (what must be TRUE):
  1. After agent run, companies meeting thresholds appear on shortlist
  2. User can adjust a threshold in settings and shortlist updates
  3. Manual Growth / Value / Watch tag overrides automatic screening
  4. Both growth and value preset criteria are independently togglable
**Plans**: TBD

Plans:
- [ ] 03-01: Preset criteria definitions (growth and value rules) and scoring engine
- [ ] 03-02: Criteria configuration UI (threshold sliders/inputs in settings)
- [ ] 03-03: Shortlist model, scoring pipeline, manual override tagging

### Phase 4: Dashboard & Company Detail
**Goal**: Full UI for browsing the shortlist and drilling into company data.
**Depends on**: Phase 3
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DETAIL-01, DETAIL-02, DETAIL-03, DETAIL-04
**Success Criteria** (what must be TRUE):
  1. Dashboard shows shortlisted companies with filter and sort working
  2. Agent status banner shows last run time and next scheduled run
  3. Clicking a company opens detail page with full financials and news
  4. Detail page shows which criteria the company passes and fails
**Plans**: TBD

Plans:
- [ ] 04-01: Dashboard page with company cards, filter bar, sort, and agent status banner
- [ ] 04-02: Company detail page with financial metrics, ratio sparklines, earnings summary
- [ ] 04-03: Detail page news section, SEC filing links, criteria pass/fail checklist

### Phase 5: Notes & Research Workspace
**Goal**: Per-user investment thesis and notes attached to each company, persisted across sessions.
**Depends on**: Phase 4
**Requirements**: NOTES-01, NOTES-02, NOTES-03, NOTES-04
**Success Criteria** (what must be TRUE):
  1. User can write a structured thesis (bull/bear, target price, conviction) and it persists on refresh
  2. User can write free-form notes and they persist on refresh
  3. Another user sees only their own notes on the same company
**Plans**: TBD

Plans:
- [ ] 05-01: Notes database model, API endpoints, per-user isolation
- [ ] 05-02: Structured thesis form UI (bull case, bear case, target price, conviction 1-5, time horizon)
- [ ] 05-03: Free-form rich text notes editor integrated into company detail page

### Phase 6: Mobile App
**Goal**: React Native / Expo app covering core flows — dashboard, company detail, and notes.
**Depends on**: Phase 5
**Requirements**: MOB-01, MOB-02, MOB-03
**Success Criteria** (what must be TRUE):
  1. App builds and runs on iOS and Android simulators
  2. User can sign in with Google OAuth in the Expo app
  3. User can view shortlist, company detail, and write/read notes on mobile
**Plans**: TBD

Plans:
- [ ] 06-01: Expo project setup with shared TypeScript types and API client
- [ ] 06-02: Google OAuth in Expo (expo-auth-session), dashboard screen, detail screen
- [ ] 06-03: Notes screen, build configs for iOS and Android

### Phase 7: Polish & Production
**Goal**: Production-ready deployment with error handling, monitoring, and documentation.
**Depends on**: Phase 6
**Requirements**: (All — production hardening)
**Success Criteria** (what must be TRUE):
  1. App deployed to production URL accessible by all team members
  2. Agent runs daily without manual intervention and errors are surfaced
  3. Dashboard loads in under 2 seconds, detail page under 1 second
**Plans**: TBD

Plans:
- [ ] 07-01: Error handling, fallback UI, rate limiting, environment configs
- [ ] 07-02: Deployment (Vercel + Railway/Render + Supabase), uptime monitoring
- [ ] 07-03: Agent health dashboard, README and setup documentation

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 0/3 | Not started | - |
| 2. Data Agent & Scheduler | 3/5 | In Progress|  |
| 3. Screening Engine | 0/3 | Not started | - |
| 4. Dashboard & Company Detail | 0/3 | Not started | - |
| 5. Notes & Research Workspace | 0/3 | Not started | - |
| 6. Mobile App | 0/3 | Not started | - |
| 7. Polish & Production | 0/3 | Not started | - |
