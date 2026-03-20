# Requirements: InvestIQ

**Defined:** 2026-03-20
**Core Value:** Agent-powered shortlist — automatically surface qualifying companies so users spend time on decisions, not data gathering.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign in with Google account (OAuth)
- [ ] **AUTH-02**: User session persists across browser/app refresh
- [ ] **AUTH-03**: Each user has their own profile with personal notes isolated

### Data Agent

- [x] **AGENT-01**: Agent fetches 10-Q and 10-K filings from SEC EDGAR for US companies
- [x] **AGENT-02**: Agent fetches earnings summaries (EPS, revenue, guidance) via yfinance
- [x] **AGENT-03**: Agent computes key financial ratios (P/E, P/B, ROE, EV/EBITDA, debt-to-equity)
- [x] **AGENT-04**: Agent fetches recent news and analyst ratings per company
- [x] **AGENT-05**: Agent covers US (NYSE/NASDAQ), Germany (XETRA .DE), China (HK/A-share), and EU markets
- [x] **AGENT-06**: Agent runs on a configurable schedule (daily default) and supports on-demand refresh
- [x] **AGENT-07**: Agent logs fetch status and errors per company per run

### Screening Engine

- [ ] **SCREEN-01**: Preset growth investing criteria (e.g., revenue growth >15%, EPS growth >10%, ROE >15%)
- [ ] **SCREEN-02**: Preset value investing criteria (e.g., P/E < market average, P/B < 2, positive FCF)
- [ ] **SCREEN-03**: Each criterion threshold is configurable by the user in the app UI
- [ ] **SCREEN-04**: Companies are automatically scored and shortlisted when they meet active criteria
- [ ] **SCREEN-05**: User can tag a company as Growth, Value, or Watch (manual override)

### Dashboard

- [ ] **DASH-01**: Main dashboard shows shortlisted companies as overview cards with key metrics
- [ ] **DASH-02**: Cards display: company name, ticker, market, score, P/E, revenue growth, last updated
- [ ] **DASH-03**: User can filter shortlist by market (US / Germany / China / EU) and strategy (Growth / Value)
- [ ] **DASH-04**: User can sort by any metric column
- [ ] **DASH-05**: Dashboard shows last agent run time and next scheduled run

### Company Detail

- [ ] **DETAIL-01**: Detail page shows full financial metrics, ratio history, and trend charts
- [ ] **DETAIL-02**: Detail page embeds latest earnings summary and SEC filing links
- [ ] **DETAIL-03**: Detail page shows recent news headlines with links
- [ ] **DETAIL-04**: Detail page shows which screening criteria the company passes/fails

### Notes & Research

- [ ] **NOTES-01**: User can write a structured investment thesis (bull case, bear case, target price, conviction level)
- [ ] **NOTES-02**: User can write free-form notes in a rich text editor on the company detail page
- [ ] **NOTES-03**: Notes are saved per user per company (private to each user)
- [ ] **NOTES-04**: Notes are persisted and visible on next login

### Mobile App

- [ ] **MOB-01**: React Native / Expo app covers dashboard, detail page, and notes
- [ ] **MOB-02**: Mobile app authenticates via same Google OAuth
- [ ] **MOB-03**: Mobile app syncs data with the same backend as web

## v2 Requirements

### Alerts & Notifications

- **NOTF-01**: User receives email/push alert when a new company enters the shortlist
- **NOTF-02**: User receives alert when a company drops below screening thresholds
- **NOTF-03**: User can configure alert preferences per company

### Collaboration

- **COLLAB-01**: Users can share notes or thesis with other team members
- **COLLAB-02**: Shared watchlist visible to all team members

### Advanced Screening

- **ADV-01**: Custom formula-based criteria (user writes own screening rules)
- **ADV-02**: Backtesting — show historical shortlist performance
- **ADV-03**: Peer comparison within sector

## Out of Scope

| Feature | Reason |
|---------|--------|
| Paid financial data APIs | User constraint — free sources only for v1 |
| Real-time / live prices | Quarterly research cadence, not trading tool |
| Portfolio tracking / P&L | This is a research tool, not a brokerage interface |
| Trade execution | Out of scope — research only |
| Public multi-tenant SaaS | Small team use only for v1 |
| AI-generated buy/sell recommendations | Regulatory risk; notes are user-authored |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AGENT-01 | Phase 2 | Complete |
| AGENT-02 | Phase 2 | Complete |
| AGENT-03 | Phase 2 | Complete |
| AGENT-04 | Phase 2 | Complete |
| AGENT-05 | Phase 2 | Complete |
| AGENT-06 | Phase 2 | Complete |
| AGENT-07 | Phase 2 | Complete |
| SCREEN-01 | Phase 3 | Pending |
| SCREEN-02 | Phase 3 | Pending |
| SCREEN-03 | Phase 3 | Pending |
| SCREEN-04 | Phase 3 | Pending |
| SCREEN-05 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| DETAIL-01 | Phase 4 | Pending |
| DETAIL-02 | Phase 4 | Pending |
| DETAIL-03 | Phase 4 | Pending |
| DETAIL-04 | Phase 4 | Pending |
| NOTES-01 | Phase 5 | Pending |
| NOTES-02 | Phase 5 | Pending |
| NOTES-03 | Phase 5 | Pending |
| NOTES-04 | Phase 5 | Pending |
| MOB-01 | Phase 6 | Pending |
| MOB-02 | Phase 6 | Pending |
| MOB-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after initial definition*
