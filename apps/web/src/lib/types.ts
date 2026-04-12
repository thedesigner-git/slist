// ── Company ──────────────────────────────────────────────────────────────────
export type Market = 'US' | 'EU' | 'DE' | 'CN'
export type Label  = 'Growth' | 'Value' | 'Watch'
export type RowTag = 'Up' | 'Down' | 'New' | 'Trust'

export interface Company {
  id: number
  ticker: string
  name: string
  market: Market
  sector: string | null
  description?: string | null
  location?: string | null
  employees?: number | null
  founded?: string | null
  is_watched: boolean
}

// ── Ratios (latest) ──────────────────────────────────────────────────────────
export interface Ratios {
  pe_ratio: number | null
  pb_ratio: number | null
  ev_ebitda: number | null
  debt_equity: number | null
  dividend_yield: number | null
  price_to_sales: number | null
  current_ratio: number | null
  interest_coverage: number | null
  price_fcf: number | null
  current_price: number | null
  market_cap: number | null
  period: string
}

// ── Growth metrics (latest TTM) ──────────────────────────────────────────────
export interface GrowthMetrics {
  revenue_growth_yoy: number | null
  eps_growth_yoy: number | null
  roe: number | null
  gross_margin: number | null
  operating_margin: number | null
  net_profit_margin: number | null
  fcf_growth: number | null
  rd_percent: number | null
  period: string
}

// ── Score ────────────────────────────────────────────────────────────────────
export interface CriterionResult {
  id: string
  label: string
  group: 'growth' | 'value'
  enabled: boolean
  passed: boolean | null   // null = missing data
  value: number | null
  threshold: number | string | null
}

export interface CompanyScore {
  company_id: number
  score: number              // 0–100
  growth_passed: number
  value_passed: number
  labels: Label[]
  criteria: CriterionResult[]
  scored_at: string
}

// ── Earnings ─────────────────────────────────────────────────────────────────
export interface Earnings {
  period: string
  reported_date: string | null
  beat: boolean | null
  revenue: number | null
  revenue_growth_yoy: number | null
  eps: number | null
  eps_growth_yoy: number | null
  next_earnings_date: string | null
}

// ── Filing ────────────────────────────────────────────────────────────────────
export interface Filing {
  type: string   // '10-K', '10-Q', etc.
  period: string
  filed_date: string
  url: string | null
}

// ── Company Detail (full) ────────────────────────────────────────────────────
export interface CompanyDetail extends Company {
  ratios: Ratios | null
  growth: GrowthMetrics | null
  score: CompanyScore | null
  news: NewsItem[]
  earnings?: Earnings | null
  filings?: Filing[]
}

// ── Shortlist row (list API) — all metric fields for dynamic columns ──────────
export interface ShortlistRow {
  id: number
  ticker: string
  name: string
  market: Market
  sector: string | null
  is_watched: boolean
  tag?: RowTag | null

  // Price
  current_price: number | null
  price_change_pct: number | null   // day change %

  // Growth metrics
  revenue_growth_yoy: number | null
  eps_growth_yoy: number | null
  roe: number | null
  gross_margin: number | null
  operating_margin: number | null
  net_profit_margin: number | null
  fcf_growth: number | null
  rd_percent: number | null
  fcf_margin: number | null
  peg_ratio: number | null

  // Ratios
  roa: number | null
  pe_ratio: number | null
  pb_ratio: number | null
  ev_ebitda: number | null
  debt_equity: number | null
  dividend_yield: number | null
  price_to_sales: number | null
  current_ratio: number | null
  interest_coverage: number | null
  price_fcf: number | null

  // Score
  score: number | null
  labels: Label[]
  growth_passed: boolean
  value_passed: boolean
  growth_criteria_passed: number | null
  value_criteria_passed: number | null
}

// ── Price history ────────────────────────────────────────────────────────────
export interface PricePoint {
  date: string   // YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ── News ─────────────────────────────────────────────────────────────────────
export interface NewsItem {
  id: number
  headline: string
  source: string | null
  url: string | null
  published_at: string | null
}

// ── Criteria definitions ─────────────────────────────────────────────────────
export interface CriterionDef {
  id: string
  label: string
  preset: 'growth' | 'value'
  direction: '>' | '<'
  default_threshold: number | null
  default_enabled: boolean
  is_boolean: boolean
  suffix: string
}

export interface CriteriaSettings {
  criteria: Record<string, { enabled: boolean; threshold: number | null }>
  growth_pass_threshold: number
  value_pass_threshold: number
}

// ── Agent run ────────────────────────────────────────────────────────────────
export interface AgentRun {
  id: number
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at: string | null
  companies_processed: number | null
  errors: number | null
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string
  full_name: string | null
  email: string
  job_title: string | null
}

// ── Notes (localStorage) ─────────────────────────────────────────────────────
export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}
