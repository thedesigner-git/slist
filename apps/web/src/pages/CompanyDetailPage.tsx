import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Star, Trash2, ChevronDown, ChevronUp,
  MapPin, Users, Building2, Calendar, FileText, ExternalLink,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useCriteria } from '@/hooks/useCriteria'
import { COLUMN_MAP } from '@/lib/criteriaMap'
import { StockPriceChart } from '@/components/charts/StockPriceChart'
import { NotesModal } from '@/components/modals/NotesModal'
import { Spinner } from '@/components/ui/Spinner'
import type { CompanyDetail, CriterionResult } from '@/lib/types'

// ── helpers ───────────────────────────────────────────────────────────────────

/** Returns the first 2 substantive sentences of a description for mobile display. */
function mobileSummary(text: string): string {
  if (!text) return ''
  // Split on sentence-ending punctuation followed by whitespace or end-of-string
  const raw = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [text]
  const sentences = raw
    .map(s => s.trim())
    .filter(s => s.length > 20) // skip very short fragments
  return sentences.slice(0, 2).join(' ').trim() || text
}

const AVATAR_COLORS = [
  '#4CAF50','#2196F3','#F97316','#A855F7',
  '#EF4444','#14B8A6','#F59E0B','#0EA5E9',
]
function avatarBg(ticker: string) {
  let h = 0
  for (let i = 0; i < ticker.length; i++) h = ticker.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function fmtLargeNum(n: number | null) {
  if (n == null) return '—'
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  return `$${n.toFixed(2)}`
}

function fmtPct(n: number | null) {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── sub-components ────────────────────────────────────────────────────────────

function MetricTile({ label, value, context, passed }: {
  label: string; value: string; context?: string; passed?: boolean | null
}) {
  return (
    <div className="rounded-none border p-4" style={{ borderColor: 'var(--border)' }}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2"
           style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-[22px] font-bold leading-none mb-1" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      {context && (
        <div className="text-[11px]" style={{
          color: passed === true ? 'var(--signal-up)'
               : passed === false ? 'var(--signal-down)'
               : 'var(--text-muted)',
        }}>
          {context}
        </div>
      )}
    </div>
  )
}

function fmtCriterionValue(id: string, value: number | null): string {
  if (value == null) return '—'
  const col = COLUMN_MAP[id]
  if (!col) return value.toFixed(1)
  if (col.format === 'pct') return `${(value * 100).toFixed(1)}%`
  if (col.format === 'times') return `${value.toFixed(1)}×`
  if (col.format === 'bool') return value ? 'Yes' : 'No'
  return value.toFixed(2)
}

function fmtCriterionThreshold(id: string, threshold: number | string | null, direction: string): string {
  if (threshold == null) return ''
  if (typeof threshold === 'string') return threshold
  const col = COLUMN_MAP[id]
  if (!col) return `${direction} ${threshold}`
  if (col.format === 'pct') return `${direction} ${(threshold * 100).toFixed(0)}%`
  if (col.format === 'times') return `${direction} ${threshold.toFixed(1)}×`
  return `${direction} ${threshold}`
}

function ChecklistItem({ c }: { c: CriterionResult }) {
  const passed = c.passed === true
  const failed = c.passed === false
  const direction = c.group === 'value' ? '<' : '>'
  return (
    <div className="rounded-none border p-3.5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-1.5 mb-1">
        {passed ? (
          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
               style={{ background: 'var(--signal-up)' }}>
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : failed ? (
          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
               style={{ background: 'var(--signal-down)' }}>
            <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
              <path d="M1 1L5 5M5 1L1 5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
               style={{ background: 'var(--border)' }}>
            <span className="text-[8px] text-white font-bold">—</span>
          </div>
        )}
        <span className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>{c.label}</span>
      </div>
      <div className="text-[18px] font-bold"
           style={{ color: passed ? 'var(--signal-up)' : failed ? 'var(--signal-down)' : 'var(--text-muted)' }}>
        {fmtCriterionValue(c.id, c.value)}
      </div>
      {c.threshold != null && (
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {c.passed !== null ? (c.passed ? 'Passes' : 'Fails') : ''} {fmtCriterionThreshold(c.id, c.threshold, direction)}
        </div>
      )}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export function CompanyDetailPage() {
  const { ticker }  = useParams<{ ticker: string }>()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const { settings } = useCriteria()

  const [company,       setCompany]       = useState<CompanyDetail | null>(null)
  const [loadingC,      setLoadingC]      = useState(true)
  const [showAllM,      setShowAllM]      = useState(false)
  const [showAllCL,     setShowAllCL]     = useState(false)
  const [showAllF,      setShowAllF]      = useState(false)
  const [notesOpen,     setNotesOpen]     = useState(false)

  useEffect(() => {
    if (!ticker) return
    setLoadingC(true)
    api.companies.detail(ticker)
      .then(setCompany)
      .catch(() => {})
      .finally(() => setLoadingC(false))
  }, [ticker])

  const handleWatch = async () => {
    if (!company) return
    if (company.is_watched) await api.companies.unwatch(company.ticker)
    else                    await api.companies.watch(company.ticker)
    setCompany(prev => prev ? { ...prev, is_watched: !prev.is_watched } : prev)
  }

  if (loadingC)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    )

  if (!company)
    return (
      <div className="px-8 py-8">
        <p style={{ color: 'var(--text-muted)' }}>Company not found.</p>
      </div>
    )

  const criteria  = company.score?.criteria ?? []
  const metricMap = Object.fromEntries(criteria.map(c => [c.id, c]))

  /* Fixed 10 financial metrics — always shown, no pass/fail, never changes with settings.
     First 4 (2 growth + 2 value) are visible by default. */
  const g = company.growth
  const r = company.ratios
  const pct  = (v: number | null) => v != null ? `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%` : '—'
  const pctA = (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : '—'
  const fixedMetricTiles = [
    { label: 'REV. GROWTH', value: pct(g?.revenue_growth_yoy ?? null) },
    { label: 'ROE',         value: pctA(g?.roe ?? null) },
    { label: 'P/E RATIO',   value: r?.pe_ratio  != null ? `${r.pe_ratio.toFixed(1)}×`  : '—' },
    { label: 'P/B RATIO',   value: r?.pb_ratio  != null ? `${r.pb_ratio.toFixed(1)}×`  : '—' },
    { label: 'EPS GR.',     value: pct(g?.eps_growth_yoy ?? null) },
    { label: 'GROSS M.',    value: pctA(g?.gross_margin ?? null) },
    { label: 'OP. M.',      value: pctA(g?.operating_margin ?? null) },
    { label: 'D/E',         value: r?.debt_equity != null ? r.debt_equity.toFixed(2) : '—' },
    { label: 'EV/EBITDA',   value: r?.ev_ebitda   != null ? `${r.ev_ebitda.toFixed(1)}×` : '—' },
    { label: 'FCF+',        value: metricMap['fcfPositive']?.value != null
                                     ? (metricMap['fcfPositive'].value ? 'Yes' : 'No') : '—' },
  ]

  /* Screening checklist — frontend cache for enabled state, c.group for classification filter */
  const enabledIds  = new Set(Object.entries(settings?.criteria ?? {}).filter(([, v]) => v.enabled).map(([id]) => id))
  const compLabels  = company.score?.labels ?? []
  const hasGrowth   = compLabels.includes('Growth')
  const hasValue    = compLabels.includes('Value')
  const checklistItems = criteria.filter(c => {
    if (!enabledIds.has(c.id)) return false
    if (hasGrowth && !hasValue) return c.group === 'growth'
    if (hasValue  && !hasGrowth) return c.group === 'value'
    return true
  })

  const visibleCL = showAllCL ? checklistItems : checklistItems.slice(0, 4)
  const visibleM  = showAllM  ? fixedMetricTiles : fixedMetricTiles.slice(0, 4)

  return (
    <div className="px-4 sm:px-8 pt-4 sm:pt-6 pb-6">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <button onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-[13px] font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={14} /> Shortlist
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleWatch}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-lg border text-[13px] font-medium transition-colors hover:bg-gray-50"
                  style={company.is_watched
                    ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                    : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <Star size={13} strokeWidth={1.5}
                  style={company.is_watched ? { fill: 'var(--accent)', color: 'var(--accent)' } : {}} />
            Watchlist
          </button>
          <button className="flex items-center gap-1.5 h-9 px-4 rounded-lg border text-[13px] font-medium transition-colors hover:bg-red-50"
                  style={{ borderColor: '#FECACA', color: '#EF4444' }}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Company header card */}
      <div className="rounded-none border p-6 mb-5" style={{ borderColor: 'var(--border)' }}>
        {/*
          Grid layout: on mobile description + meta span full width (below logo).
          On desktop they're constrained to the second column (alongside logo).
        */}
        <div className="grid grid-cols-[56px_1fr] gap-x-4 sm:gap-x-5 gap-y-0">
          {/* Logo */}
          <div className="w-14 h-14 rounded-xl flex items-center justify-center"
               style={{ background: avatarBg(company.ticker) }}>
            <span className="text-white text-[16px] font-bold">{company.ticker.slice(0, 2)}</span>
          </div>

          {/* Name + ticker + strategy badges */}
          <div className="flex items-center gap-2.5 flex-wrap self-center min-w-0">
            <h1 className="text-[20px] sm:text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {company.name}
            </h1>
            <span className="px-2 py-0.5 rounded border text-[11px] font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              {company.ticker}
            </span>
            {company.score?.labels?.includes('Growth') && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium border"
                    style={{ borderColor: 'var(--strategy-growth)', color: 'var(--strategy-growth)' }}>
                Growth
              </span>
            )}
            {company.score?.labels?.includes('Value') && !company.score?.labels?.includes('Growth') && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium border"
                    style={{ borderColor: 'var(--strategy-value)', color: 'var(--strategy-value)' }}>
                Value
              </span>
            )}
          </div>

          {/* Description + meta — spans both columns on mobile, second col only on desktop */}
          <div className="col-span-2 sm:col-start-2 sm:col-span-1 mt-3">
            {company.description && (
              <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                <span className="sm:hidden">{mobileSummary(company.description)}</span>
                <span className="hidden sm:inline">{company.description}</span>
              </p>
            )}
            <div className="flex items-center gap-4 flex-wrap">
              {company.sector && (
                <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  <Building2 size={12} /> {company.sector}
                </span>
              )}
              {company.location && (
                <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  <MapPin size={12} /> {company.location}
                </span>
              )}
              {company.employees && (
                <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  <Users size={12} /> {company.employees.toLocaleString()} employees
                </span>
              )}
              {company.founded && (
                <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  <Calendar size={12} /> Founded {company.founded}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">

        {/* Left column */}
        <div className="flex flex-col gap-5">

          {/* Price Performance */}
          <StockPriceChart ticker={company.ticker} />

          {/* Financial Metrics */}
          <div className="rounded-none border" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b"
                 style={{ borderColor: 'var(--border)' }}>
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Financial Metrics
              </span>
              {fixedMetricTiles.length > 4 && !showAllM && (
                <button onClick={() => setShowAllM(true)}
                        className="text-[12px] font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}>
                  Show all <ChevronDown size={12} />
                </button>
              )}
              {showAllM && (
                <button onClick={() => setShowAllM(false)}
                        className="text-[12px] font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}>
                  Show less <ChevronUp size={12} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
              {visibleM.map(m => (
                <MetricTile key={m.label} {...m} />
              ))}
            </div>
          </div>

          {/* Screening Checklist */}
          <div className="rounded-none border" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b"
                 style={{ borderColor: 'var(--border)' }}>
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Screening Checklist
              </span>
              {checklistItems.length > 4 && !showAllCL && (
                <button onClick={() => setShowAllCL(true)}
                        className="text-[12px] font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}>
                  Show all <ChevronDown size={12} />
                </button>
              )}
              {showAllCL && (
                <button onClick={() => setShowAllCL(false)}
                        className="text-[12px] font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}>
                  Show less <ChevronUp size={12} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
              {visibleCL.map(c => <ChecklistItem key={c.id} c={c} />)}
              {checklistItems.length === 0 && (
                <p className="col-span-4 text-[13px] py-2" style={{ color: 'var(--text-muted)' }}>
                  No screening data available.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Research Notes — hidden on mobile */}
          <div className="hidden sm:block rounded-none border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b"
                 style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-1.5">
                <FileText size={13} style={{ color: 'var(--text-muted)' }} />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Research Notes
                </span>
              </div>
            </div>
            <div className="p-4">
              <button
                onClick={() => setNotesOpen(true)}
                className="w-full h-24 rounded-none border-2 border-dashed flex items-center justify-center transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--border)' }}>
                <span className="text-[22px]" style={{ color: 'var(--text-faint)' }}>+</span>
              </button>
            </div>
          </div>

          {/* Earnings */}
          <div className="rounded-none border p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Earnings
              </span>
              {company.earnings?.beat != null && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={company.earnings.beat
                        ? { background: '#DCFCE7', color: '#16A34A' }
                        : { background: '#FEE2E2', color: '#DC2626' }}>
                  {company.earnings.beat ? 'Beat' : 'Miss'}
                </span>
              )}
            </div>
            {company.earnings ? (
              <>
                <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
                  {company.earnings.period} · Reported {fmtDate(company.earnings.reported_date)}
                </p>
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between">
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Revenue</span>
                    <div className="text-right">
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {fmtLargeNum(company.earnings.revenue)}
                      </div>
                      {company.earnings.revenue_growth_yoy != null && (
                        <div className="text-[11px]" style={{ color: company.earnings.revenue_growth_yoy >= 0 ? 'var(--signal-up)' : 'var(--signal-down)' }}>
                          {fmtPct(company.earnings.revenue_growth_yoy)} YoY
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>EPS</span>
                    <div className="text-right">
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {company.earnings.eps != null ? `$${company.earnings.eps.toFixed(2)}` : '—'}
                      </div>
                      {company.earnings.eps_growth_yoy != null && (
                        <div className="text-[11px]" style={{ color: company.earnings.eps_growth_yoy >= 0 ? 'var(--signal-up)' : 'var(--signal-down)' }}>
                          {fmtPct(company.earnings.eps_growth_yoy)} YoY
                        </div>
                      )}
                    </div>
                  </div>
                  {company.earnings.next_earnings_date && (
                    <div className="flex justify-between">
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Next Earnings</span>
                      <span className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
                        {fmtDate(company.earnings.next_earnings_date)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No earnings data available yet.</p>
            )}
          </div>

          {/* Published Reports */}
          <div className="rounded-none border p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Published Reports
              </span>
              {company.filings && company.filings.length > 3 && !showAllF && (
                <button onClick={() => setShowAllF(true)}
                        className="text-[11px] flex items-center gap-0.5 transition-opacity hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}>
                  Show all <ChevronDown size={11} />
                </button>
              )}
              {showAllF && (
                <button onClick={() => setShowAllF(false)}
                        className="text-[11px] flex items-center gap-0.5 transition-opacity hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}>
                  Show less <ChevronUp size={11} />
                </button>
              )}
            </div>
            {company.filings && company.filings.length > 0 ? (
              <div className="flex flex-col gap-2">
                {(showAllF ? company.filings : company.filings.slice(0, 3)).map((f, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{ background: f.type === '10-K' ? '#FEF9C3' : '#EFF6FF',
                                     color: f.type === '10-K' ? '#854D0E' : '#1D4ED8' }}>
                        {f.type}
                      </span>
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{f.period}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                        {fmtDate(f.filed_date)}
                      </span>
                      {f.url && (
                        <a href={f.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                          <ExternalLink size={11} style={{ color: 'var(--text-faint)' }} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No published reports available yet.</p>
            )}
          </div>

          {/* Recent News */}
          <div className="rounded-none border p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Recent News
              </span>
            </div>
            {company.news && company.news.length > 0 ? (
              <div className="flex flex-col gap-3">
                {company.news.slice(0, 5).map(n => (
                  <div key={n.id} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                          style={{ background: 'var(--text-faint)' }} />
                    <div className="flex-1 min-w-0">
                      {n.url ? (
                        <a href={n.url} target="_blank" rel="noreferrer"
                           className="text-[12px] leading-snug hover:underline line-clamp-2"
                           style={{ color: 'var(--text-primary)' }}>
                          {n.headline}
                        </a>
                      ) : (
                        <p className="text-[12px] leading-snug line-clamp-2"
                           style={{ color: 'var(--text-primary)' }}>{n.headline}</p>
                      )}
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                        {n.source} · {timeAgo(n.published_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No recent news available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Notes modal */}
      <NotesModal
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        userId={user?.id}
        ticker={company.ticker}
        companyName={company.name}
      />

    </div>
  )
}
