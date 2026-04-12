# InvestIQ Web App — Design Flow & Architecture
**Phase:** 04 - Dashboard & Company Details
**Version:** 1.0
**Design Language:** Revolut-inspired (Dark mode, Clean cards, Minimal interactions)
**Target:** Web app (Next.js + Tailwind + shadcn/ui)

---

## 🎯 Core Flow (Simplest User Journey)

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────────┐       ┌─────────────┐
│   Login     │──────▶│ Shortlist        │──────▶│ Company Detail  │──────▶│ Investment  │
│  (Google    │       │  Dashboard       │       │     Page        │       │   Thesis    │
│   OAuth)    │       │                  │       │                 │       │    View     │
└─────────────┘       └──────────────────┘       └─────────────────┘       └─────────────┘
                              ▲                           │                       │
                              │                           │                       │
                              └───────────── Back ────────┴───────────────────────┘
```

---

## 📱 Screen Breakdown

### 1. **Login / Onboarding Screen**
**Path:** `/`
**Purpose:** Authenticate user with Google OAuth

#### Components:
- **Header**: Logo + Hero tagline
- **Auth Button**: "Sign in with Google"
- **Footer**: Terms of service link
- **Colors**: Dark blue gradient (#0F1419 → #1A3A52)

#### Key Interactions:
- Click Google button → Redirect to Google OAuth → Redirect to dashboard on success

#### Figma Components:
- `Button/Primary` (Large, blue)
- `Typography/Title` (32px bold)
- `Typography/Body` (14px secondary)

---

### 2. **Dashboard / Shortlist Screen** (Main Hub)
**Path:** `/dashboard`
**Purpose:** View curated company shortlist with filtering & search

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ Header (Logo | Nav | User Menu)                             │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────────────────────────────────────┐   │
│ │ Sidebar  │ │ Your Shortlist | 🔄 Refresh             │   │
│ │ Filters  │ ├──────────────────────────────────────────┤   │
│ │          │ │ ┌─────────────────────────────────────┐ │   │
│ │ • Market │ │ │ Total: 24 | Growth: 15 | Updated   │ │   │
│ │   - US   │ │ │ Today                               │ │   │
│ │   - 🇩🇪   │ │ └─────────────────────────────────────┘ │   │
│ │   - 🇨🇳   │ ├──────────────────────────────────────────┤   │
│ │          │ │ COMPANY TABLE                            │   │
│ │ • Type   │ │ ┌────┬───────┬────┬────┬────┬─────┬────┐ │   │
│ │   Growth │ │ │Name│Ticker│Mkt │Scr │P/E │RevG │Act │ │   │
│ │   Value  │ │ ├────┼───────┼────┼────┼────┼─────┼────┤ │   │
│ │          │ │ │AAPL│AAPL  │US  │92  │24.5│12.3%│[V] │ │   │
│ │ • Sector │ │ │MSFT│MSFT  │US  │88  │32.1│18.7%│[V] │ │   │
│ │   Tech   │ │ │BMW │BMW.DE│🇩🇪  │76  │6.2 │8.4% │[V] │ │   │
│ │   Finance│ │ └────┴───────┴────┴────┴────┴─────┴────┘ │   │
│ └──────────┘ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Components:

**Header:**
- Logo + Brand name (InvestIQ)
- Navigation tabs (Shortlist, Research, Settings)
- User avatar menu (Logout)

**Sidebar (Sticky Left):**
- Market filter (US, Germany, China, EU)
- Type filter (Growth, Value, Watch)
- Sector filter (Tech, Finance, Industrials, etc.)
- **Clear all filters** button

**Stats Cards Row:**
- Total Companies (24)
- Growth Stocks (15)
- Last Updated (Today)

**Shortlist Table:**
- **Columns:** Company | Ticker | Market | Score | P/E | Revenue Growth | Action
- **Row Actions:** "View" button → Detail page
- **Sorting:** Click column header to sort
- **Colors:**
  - Score 85+: Green (#26C281)
  - Score 70-84: Orange (#F5A623)
  - Score <70: Red (#EE5A52)

**Refresh Button:**
- Triggers background agent to refetch data
- Shows spinner during refresh
- Toast notification on complete

#### Key Interactions:
1. **Filter by Market**: Click checkbox → Table updates
2. **Filter by Type**: Click chip → Table updates
3. **Sort**: Click column header → Sorts ascending/descending
4. **Search**: Type company name → Filters table
5. **View Company**: Click "View" button → Navigate to detail page
6. **Refresh Data**: Click refresh → Triggers agent, shows loading state

#### Figma Components:
- `Filter/Checkbox`
- `Filter/ChipGroup`
- `Table/Header` + `Table/Row`
- `Badge/Score` (color-coded)
- `Button/Secondary` (Refresh)
- `Button/Primary` (View)
- `Card/Stat` (3x cards with metrics)

---

### 3. **Company Detail Page**
**Path:** `/companies/:ticker`
**Purpose:** Drill down into company research, financials, news, and thesis

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ Header (Back | Company Name | Settings)                     │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐   │
│ │ APPLE INC (AAPL)                                      │   │
│ │ Score: 92/100 | US Market | Updated: Today           │   │
│ │ Strategy: Growth                                       │   │
│ └───────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ FINANCIAL METRICS (2-Column Grid)                           │
│ ┌──────────────────┐ ┌──────────────────┐                  │
│ │ P/E Ratio        │ │ Price-to-Book    │                  │
│ │ 24.5             │ │ 42.3             │                  │
│ │ Market Avg: 28.0 │ │ Market Avg: 35.0 │                  │
│ └──────────────────┘ └──────────────────┘                  │
│ ┌──────────────────┐ ┌──────────────────┐                  │
│ │ Revenue Growth   │ │ EPS Growth       │                  │
│ │ 12.3% YoY        │ │ 8.7% YoY         │                  │
│ └──────────────────┘ └──────────────────┘                  │
│ ┌──────────────────┐ ┌──────────────────┐                  │
│ │ ROE              │ │ Debt/Equity      │                  │
│ │ 84.2%            │ │ 1.2x             │                  │
│ └──────────────────┘ └──────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│ SCREENING CRITERIA (What passes/fails)                      │
│ ✅ Revenue Growth > 10%     (12.3%)                         │
│ ✅ P/E < Market Avg         (24.5 < 28.0)                  │
│ ❌ ROE > 15%               (84.2% ✓ but custom threshold)   │
├─────────────────────────────────────────────────────────────┤
│ LATEST EARNINGS (from SEC EDGAR)                            │
│ Q4 2025 Earnings Report                                     │
│ EPS: $2.18 | Revenue: $124.3B | Guidance: +15% YoY          │
│ [View SEC Filing →]                                         │
├─────────────────────────────────────────────────────────────┤
│ RECENT NEWS                                                 │
│ • Apple announces M4 chips integration (Reuters, 2h ago)    │
│ • Q1 earnings beat expectations (Bloomberg, 5h ago)        │
│ • New product launch planned (CNBC, 1d ago)                │
│ [See all news →]                                            │
├─────────────────────────────────────────────────────────────┤
│ MY INVESTMENT THESIS                                        │
│ [Edit] | [Share]                                            │
│ Bull Case: Strong ecosystem, consistent growth, services    │
│ Bear Case: Valuation premium, regulatory risks             │
│ Target Price: $245 | Conviction: 8/10                       │
│ [+ Add Notes]                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Components:

**Header:**
- Back button (← to Dashboard)
- Company name + logo
- Save/bookmark button
- More menu (Share, Add to watchlist, etc.)

**Hero Card:**
- Company name + ticker
- Overall score (large, color-coded)
- Market info (US, Germany, etc.)
- Strategy tag (Growth / Value / Watch)
- Last updated timestamp

**Financial Metrics Grid:**
- 2x3 card grid showing key ratios
- Each card has: Title | Value | Market/Benchmark comparison
- Color indicators: Red (bad), Orange (neutral), Green (good)

**Screening Criteria Checklist:**
- ✅/❌ indicators
- Shows which criteria company passes/fails
- Expandable to show thresholds

**Earnings Summary Card:**
- Latest quarterly earnings data
- EPS, Revenue, Guidance
- Link to SEC EDGAR filing

**Recent News Section:**
- 3-5 recent headlines
- Source + timestamp
- Link to full article
- "See all news" link

**Investment Thesis Section:**
- Bull case text area
- Bear case text area
- Target price input
- Conviction slider (1-10)
- Free-form notes area
- [Save Thesis] button
- [Share with Team] button

#### Key Interactions:
1. **Back button**: Navigate back to dashboard
2. **Edit Thesis**: Click "Edit" → Text editor opens
3. **Save Thesis**: Click "Save" → Persists to backend
4. **View SEC Filing**: Click link → Opens EDGAR in new tab
5. **View News**: Click headline → Opens article in new tab
6. **Add Notes**: Click button → Rich text editor opens
7. **Share**: Click share icon → Copy link or email

#### Figma Components:
- `Card/Metric` (with comparison)
- `Badge/Score` (large variant)
- `Button/Tertiary` (Back)
- `Checklist/Item` (✅/❌)
- `Text/RichEditor` (Thesis editing)
- `Card/News` (with thumbnail)
- `Slider/Conviction`

---

### 4. **Settings / Screening Criteria Page**
**Path:** `/settings`
**Purpose:** Configure screening thresholds, manage preferences

#### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ Header (Settings | User Prefs)                              │
├─────────────────────────────────────────────────────────────┤
│ SCREENING CRITERIA                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ GROWTH INVESTING PRESET                              [>] │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Revenue Growth (YoY)                                    │ │
│ │ Threshold: 15% ↕                         [Active]      │ │
│ │                                                         │ │
│ │ EPS Growth (YoY)                                        │ │
│ │ Threshold: 10% ↕                         [Active]      │ │
│ │                                                         │ │
│ │ ROE                                                     │ │
│ │ Threshold: 15% ↕                         [Active]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VALUE INVESTING PRESET                              [>] │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ P/E Ratio (below market)                                │ │
│ │ Threshold: 0.9x ↕                        [Active]      │ │
│ │                                                         │ │
│ │ Price-to-Book (below)                                   │ │
│ │ Threshold: 2.0x ↕                        [Inactive]    │ │
│ │                                                         │ │
│ │ Free Cash Flow                                          │ │
│ │ Threshold: Positive ↕                    [Active]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ PERSONAL PREFERENCES                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Markets to Track:                                       │ │
│ │ ☑ US (NYSE/NASDAQ)  ☑ Germany (XETRA)                 │ │
│ │ ☑ China (A/HK)      ☑ EU Broad                        │ │
│ │                                                         │ │
│ │ Refresh Frequency:                                      │ │
│ │ • Daily (10 AM UTC)                                     │ │
│ │ • Weekly (Monday 9 AM UTC)                              │ │
│ │ • Manual only                                           │ │
│ │                                                         │ │
│ │ Email Alerts:                                           │ │
│ │ ☑ New company enters shortlist                          │ │
│ │ ☑ Company drops below thresholds                        │ │
│ │ ☐ Daily digest email                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Reset to Defaults] [Save Changes]                         │
└─────────────────────────────────────────────────────────────┘
```

#### Components:

**Criteria Accordion:**
- Growth Investing Preset (expandable)
  - Revenue Growth threshold (%)
  - EPS Growth threshold (%)
  - ROE threshold (%)
  - Each criterion has: Input field + Active/Inactive toggle

- Value Investing Preset (expandable)
  - P/E ratio threshold (vs market avg multiplier)
  - P/B threshold
  - Free Cash Flow requirement
  - Debt/Equity cap

**Market Selection Checkboxes:**
- US
- Germany
- China
- EU

**Refresh Schedule Radio:**
- Daily (10 AM UTC)
- Weekly (Monday 9 AM UTC)
- Manual only

**Alerts Checkboxes:**
- New company enters shortlist
- Company drops out
- Daily digest email

**Action Buttons:**
- "Reset to Defaults" (tertiary)
- "Save Changes" (primary, blue)

#### Key Interactions:
1. **Change Threshold**: Type new value → Input validation → Live preview of affected companies
2. **Toggle Criterion**: Click active/inactive → Immediately updates shortlist
3. **Select Markets**: Click checkbox → Filters companies in shortlist
4. **Change Refresh Schedule**: Click radio → Updates background job
5. **Configure Alerts**: Click checkbox → Email preference updates
6. **Save Changes**: Click button → POST to backend, show success toast

#### Figma Components:
- `Input/Number` (with validation)
- `Toggle/Active-Inactive`
- `Checkbox/Group`
- `Radio/Group`
- `Accordion/Preset`
- `Button/Primary` (Save)
- `Button/Tertiary` (Reset)

---

## 🎨 Design System

### Colors (Revolut-inspired)
```
Dark Background:      #0F1419  (Almost black)
Card Background:      #1A1F2E  (Lighter dark)
Accent/Header:        #1A3A52  (Dark teal)
Primary Blue:         #0066FF  (Action)
Success Green:        #26C281  (Positive)
Warning Orange:       #F5A623  (Caution)
Error Red:            #EE5A52  (Negative)
Text Primary:         #FFFFFF  (White)
Text Secondary:       #A0A8B8  (Gray)
Border:               #2A3142  (Subtle)
```

### Typography
```
Titles (32px):        Bold, white, leading
Headings (24px):      Semibold, white
Subheadings (16px):   Semibold, white
Body (14px):          Regular, gray secondary
Labels (12px):        Semibold, gray
Captions (11px):      Regular, gray secondary
```

### Spacing
```
XS:   4px
SM:   8px
MD:   16px  (base)
LG:   24px
XL:   32px
XXL:  48px
```

### Components
```
Button:       44px height, 12px font, rounded-8
Card:         Rounded-12, padding-16, fill-#1A1F2E
Input:        44px height, rounded-8, border-#2A3142
Badge/Score:  Green (85+), Orange (70-84), Red (<70)
Tabs:         Pill-shaped, 36px height
Icons:        20-24px, monospace emojis or SVGs
```

---

## 🔄 Complete User Journey Map

### New User Flow:
```
1. User arrives at login page
2. Clicks "Sign in with Google"
3. Redirected to Google OAuth consent screen
4. Logs in with Google account
5. Redirected back to dashboard
6. Sees empty shortlist (no companies yet if first time)
7. Can configure screening criteria in Settings
8. Runs manual refresh to fetch initial data
9. Sees shortlist populated with companies
```

### Existing User Flow:
```
1. User logs in (or session restored)
2. Sees dashboard with persisted shortlist
3. Can:
   a. Click "View" on any company → Detail page
   b. Update filters → Table updates live
   c. Click "Refresh" → Agent fetches latest data
   d. Navigate to Settings → Update criteria
4. On detail page, can:
   a. View financial metrics
   b. Read recent news
   c. Add/edit investment thesis
   d. Save notes
5. Thesis saved to backend (private per user)
```

---

## 📊 Data Requirements

### Dashboard API:
- `GET /api/shortlist` → Returns company shortlist with applied filters
- `GET /api/shortlist?market=US&type=growth` → Filtered shortlist
- `POST /api/refresh` → Triggers agent refresh

### Detail Page API:
- `GET /api/companies/:ticker` → Full company profile
- `GET /api/companies/:ticker/news` → Recent news
- `GET /api/companies/:ticker/thesis` → User's thesis (private)

### Settings API:
- `GET /api/settings` → User's current criteria + preferences
- `PUT /api/settings` → Update criteria thresholds
- `PUT /api/settings/schedule` → Update refresh schedule

---

## 🎯 Success Metrics

1. **Dashboard Load Time**: < 2 seconds
2. **Filter Response**: < 500ms
3. **Company Detail Load**: < 1.5 seconds
4. **Data Refresh**: Shows progress, completes in < 5 min
5. **Thesis Save**: < 1 second

---

## 🚀 Implementation Phases

### Phase 4.1 (Current):
- [x] Design system tokens
- [x] Login page skeleton
- [x] Dashboard layout + table
- [x] Basic filtering

### Phase 4.2:
- [ ] Company detail page
- [ ] Financial metrics cards
- [ ] News section
- [ ] Thesis editor

### Phase 4.3:
- [ ] Settings page
- [ ] Criteria configuration
- [ ] Preferences UI
- [ ] Email alert setup

### Phase 4.4:
- [ ] Integration testing
- [ ] Performance optimization
- [ ] Accessibility audit (WCAG AA)
- [ ] Mobile responsive breakpoints

---

## ✅ Component Checklist (Figma)

- [ ] `Button/Primary` (blue, 44px)
- [ ] `Button/Secondary` (dark, 44px)
- [ ] `Button/Tertiary` (text-only)
- [ ] `Card/Base` (rounded-12, dark)
- [ ] `Card/Metric` (with label + value)
- [ ] `Card/Stat` (3-variant)
- [ ] `Table/Header`
- [ ] `Table/Row` (with hover state)
- [ ] `Badge/Score` (color-coded)
- [ ] `Badge/Tag`
- [ ] `Input/Text` (with validation)
- [ ] `Input/Number` (with spinner)
- [ ] `Checkbox/Single`
- [ ] `Checkbox/Group`
- [ ] `Radio/Group`
- [ ] `Toggle/Active-Inactive`
- [ ] `Tabs/Horizontal`
- [ ] `Tabs/Pills`
- [ ] `Breadcrumb`
- [ ] `Icon/Set` (24px)
- [ ] `Modal/Base`
- [ ] `Toast/Notification`
- [ ] `Spinner/Loading`

---

**Design Approved By:** (User)
**Last Updated:** 2026-03-21
**Next Review:** After Phase 4.1 implementation
