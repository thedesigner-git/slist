import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ArrowUpRight, ArrowDownRight, ArrowUpDown, Star, Download } from 'lucide-react'
import { api } from '@/lib/api'
import { useCompanies, type Strategy } from '@/hooks/useCompanies'
import { useCriteria } from '@/hooks/useCriteria'
import { ScreeningModal } from '@/components/modals/ScreeningModal'
import { COLUMN_MAP } from '@/lib/criteriaMap'
import { useAuth } from '@/hooks/useAuth'
import type { Market, ShortlistRow, Label, RowTag } from '@/lib/types'

// ── helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#4CAF50','#2196F3','#F97316','#A855F7',
  '#EF4444','#14B8A6','#F59E0B','#0EA5E9',
]
function avatarBg(ticker: string) {
  let h = 0
  for (let i = 0; i < ticker.length; i++) h = ticker.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

type SortDir = 'asc' | 'desc' | null

// ── sub-components ────────────────────────────────────────────────────────────

function TagBadge({ tag }: { tag: RowTag }) {
  const styles: Record<RowTag, { color: string; border: string }> = {
    Up:    { color: '#22C55E', border: '#BBF7D0' },
    Down:  { color: '#EF4444', border: '#FECACA' },
    New:   { color: '#6B7280', border: '#E5E7EB' },
    Trust: { color: '#6B7280', border: '#E5E7EB' },
  }
  const s = styles[tag]
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
          style={{ color: s.color, borderColor: s.border }}>
      {tag}
    </span>
  )
}

function StrategyChip({ labels }: { labels: Label[] }) {
  const hasGrowth = labels.includes('Growth')
  const hasValue  = labels.includes('Value')
  if (!hasGrowth && !hasValue) return null
  const isGrowth = hasGrowth
  const text     = isGrowth ? 'Growth' : 'Value'
  const color    = isGrowth ? 'var(--strategy-growth)' : 'var(--strategy-value)'
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] font-medium border whitespace-nowrap"
          style={{ borderColor: color, color }}>
      {text}
    </span>
  )
}

function MetricCell({ row, criterionId }: { row: ShortlistRow; criterionId: string }) {
  const cfg = COLUMN_MAP[criterionId]
  if (!cfg) return <td className="px-2 py-4 text-right"><span style={{ color: 'var(--text-faint)' }}>—</span></td>

  const raw = row[cfg.field]

  if (raw == null || typeof raw === 'string')
    return <td className="px-2 py-4 text-right"><span className="text-[13px]" style={{ color: 'var(--text-faint)' }}>—</span></td>

  if (cfg.format === 'bool') {
    const val = raw as boolean
    return (
      <td className="px-2 py-4 text-right">
        <span className="text-[13px] font-medium" style={{ color: val ? 'var(--signal-up)' : 'var(--signal-down)' }}>
          {val ? 'Yes' : 'No'}
        </span>
      </td>
    )
  }

  const n       = raw as number
  const positive = n >= 0
  const color    = positive ? 'var(--signal-up)' : 'var(--signal-down)'
  const Icon     = positive ? ArrowUpRight : ArrowDownRight
  const formatted =
    cfg.format === 'pct'   ? `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%` :
    cfg.format === 'times' ? `${n.toFixed(1)}×` :
    n.toFixed(2)

  return (
    <td className="px-2 py-4 text-right">
      <span className="inline-flex items-center justify-end gap-0.5 text-[13px] font-medium tabular-nums"
            style={{ color }}>
        <Icon size={11} strokeWidth={2.5} />
        {formatted}
      </span>
    </td>
  )
}

function ColHeader({ label, sortKey, sortCol, onSort }: {
  label: string; sortKey: string
  sortCol: string | null
  onSort: (k: string) => void
}) {
  const active = sortCol === sortKey
  return (
    <th className="px-2 py-3 text-right cursor-pointer select-none" onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {label}
        <ArrowUpDown size={10} className={active ? 'opacity-100' : 'opacity-40'} />
      </span>
    </th>
  )
}

function CompanyTable({ rows, dashboardCols, sortCol, onSort, onRowClick, onToggleWatch }: {
  rows: ShortlistRow[]
  dashboardCols: string[]
  sortCol: string | null
  onSort: (k: string) => void
  onRowClick: (ticker: string) => void
  onToggleWatch: (ticker: string, watched: boolean) => void
}) {
  if (rows.length === 0)
    return <p className="text-[13px] py-8 px-5" style={{ color: 'var(--text-muted)' }}>No companies.</p>

  return (
    <div className="overflow-x-auto">
      {/*
        border-separate + border-spacing-0 (not border-collapse) so position:sticky
        cells don't bleed shared borders and create visual gaps when scrolling.
      */}
      <table className="w-full min-w-[900px] border-separate border-spacing-0 [table-layout:fixed]">
        {/* colgroup is authoritative for fixed layout — star/rank are 0-wide on mobile */}
        <colgroup>
          <col className="w-0 sm:w-[44px]" />
          <col className="w-0 sm:w-8" />
          <col className="w-[192px] sm:w-[260px]" />
          <col className="w-[90px]" />
          {dashboardCols.map(id => <col key={id} />)}
          <col className="w-8" />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>

            {/* Star col header — 0-width on mobile */}
            <th className="w-0 overflow-hidden p-0 sm:w-[44px] sm:px-3 sm:py-3" />

            {/* # col header — 0-width on mobile */}
            <th className="w-0 overflow-hidden p-0 sm:w-8 sm:px-2 sm:py-3 text-left text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}></th>

            {/* Company col header — sticky, pulled 1px left to cover wrapper border gap */}
            <th className="pr-0 pl-2 sm:pl-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide
                           sticky left-[-1px] z-[20] sm:static sm:z-auto
                           w-[192px] sm:w-[260px]"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)' }}>Company</th>

            <th className="px-2 py-3 w-[90px] text-left text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}>Strategy</th>

            {dashboardCols.map(id => (
              <ColHeader key={id} label={COLUMN_MAP[id]?.label ?? id}
                         sortKey={id} sortCol={sortCol} onSort={onSort} />
            ))}
            <th className="w-8 px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.ticker} onClick={() => onRowClick(row.ticker)}
                className="cursor-pointer group"
                style={{ borderBottom: '1px solid var(--border-light)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

              {/* Star — 0-width on mobile (desktop: normal click target) */}
              <td className="w-0 overflow-hidden p-0 sm:w-auto sm:px-3 sm:py-4"
                  onClick={e => { e.stopPropagation(); onToggleWatch(row.ticker, row.is_watched) }}>
                <Star size={13} strokeWidth={1.5}
                      style={row.is_watched
                        ? { fill: '#F97316', color: '#F97316' }
                        : { color: 'var(--text-faint)' }} />
              </td>

              {/* Rank — 0-width on mobile */}
              <td className="w-0 overflow-hidden p-0 sm:w-auto sm:px-2 sm:py-4">
                <span className="text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </td>

              {/* Company — sticky, pulled 1px left to cover wrapper border gap */}
              <td className="pr-0 pl-2 sm:pl-3 py-4
                             sticky left-[-1px] z-[10] bg-white
                             sm:static sm:z-auto sm:bg-transparent
                             w-[192px] sm:w-[260px]">
                <div className="flex items-center gap-1.5 sm:gap-2.5">

                  {/* Inline star — mobile only */}
                  <div className="sm:hidden shrink-0 p-0.5"
                       onClick={e => { e.stopPropagation(); onToggleWatch(row.ticker, row.is_watched) }}>
                    <Star size={12} strokeWidth={1.5}
                          style={row.is_watched
                            ? { fill: '#F97316', color: '#F97316' }
                            : { color: 'var(--text-faint)' }} />
                  </div>

                  {/* Avatar */}
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0"
                       style={{ background: avatarBg(row.ticker) }}>
                    <span className="text-white text-[10px] sm:text-[11px] font-bold">
                      {row.ticker.slice(0, 2)}
                    </span>
                  </div>

                  {/* Name & meta */}
                  <div className="flex-1 min-w-0">
                    {/* Overflow-hidden ensures truncation works in the flex row */}
                    <div className="flex items-center gap-1 flex-nowrap overflow-hidden">
                      <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {row.name}
                      </span>
                      {row.tag && <TagBadge tag={row.tag} />}
                    </div>
                    {/* Ticker — hidden on mobile */}
                    <span className="text-[11px] hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                      {row.ticker}
                    </span>
                    {/* Sector / market — hidden on mobile */}
                    {(row.sector || row.market) && (
                      <div className="hidden sm:flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {row.market && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
                                style={{ background: '#f0f0f0', color: '#888' }}>
                            {row.market}
                          </span>
                        )}
                        {row.sector && (
                          <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                            {row.sector}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </td>

              {/* Strategy */}
              <td className="px-2 py-4"><StrategyChip labels={row.labels} /></td>

              {/* Dynamic columns */}
              {dashboardCols.map(id => <MetricCell key={id} row={row} criterionId={id} />)}

              {/* Arrow */}
              <td className="px-2 py-4 text-right">
                <ArrowUpRight size={14} style={{ color: 'var(--text-faint)' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionHeader({ type, count }: { type: 'qualifying' | 'failing'; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-6 sm:mt-8">
      {type === 'qualifying' ? (
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
             style={{ background: '#22C55E' }}>
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
             style={{ background: '#EF4444' }}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 1L7 7M7 1L1 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      )}
      <span className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
        {type === 'qualifying' ? 'Qualifying' : 'Failing'}
      </span>
      <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{count}</span>
    </div>
  )
}

function StatCard({ label, count, subtitle, topColor, className = '' }: {
  label: string; count: number; subtitle: string; topColor: string; className?: string
}) {
  return (
    <div className={`flex-1 min-w-[100px] sm:min-w-[140px] rounded-none border p-3 sm:p-5 relative overflow-hidden bg-white ${className}`}
         style={{ borderColor: 'var(--border)' }}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: topColor }} />
      <div className="text-[10px] font-bold uppercase tracking-widest mb-1 sm:mb-2"
           style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-[22px] sm:text-[32px] font-bold leading-none mb-1 sm:mb-1.5"
           style={{ color: 'var(--text-primary)' }}>{count}</div>
      <div className="text-[11px] sm:text-[12px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border"
            style={active
              ? { background: '#111827', color: '#FFFFFF', borderColor: '#111827' }
              : { color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
      {label}
    </button>
  )
}

// ── sector dropdown ──────────────────────────────────────────────────────────

const SECTORS = [
  { value: 'ALL',                   label: 'All Sectors',             enabled: true  },
  { value: 'Technology',            label: 'Technology',              enabled: true  },
  { value: 'Financial Services',    label: 'Financial Services',      enabled: true  },
  { value: 'Healthcare',            label: 'Healthcare',              enabled: true  },
  { value: 'Consumer Discretionary',label: 'Consumer Discretionary',  enabled: true  },
  { value: 'Industrials',           label: 'Industrials',             enabled: true  },
  { value: 'Energy',                label: 'Energy',                  enabled: false },
  { value: 'Materials',             label: 'Materials',               enabled: false },
  { value: 'Real Estate',           label: 'Real Estate',             enabled: false },
  { value: 'Communication Services',label: 'Communication Services',  enabled: false },
  { value: 'Consumer Staples',      label: 'Consumer Staples',        enabled: false },
]

function SectorDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = SECTORS.find(s => s.value === value) ?? SECTORS[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-[2px] border text-[13px] font-medium hover:bg-gray-50 transition-colors"
        style={{ borderColor: '#000000', color: 'var(--text-secondary)', paddingLeft: 28, paddingRight: 28, paddingTop: 12, paddingBottom: 12 }}>
        {current.label} <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-[4px] shadow-lg border py-1 z-30 min-w-[200px]"
             style={{ borderColor: 'var(--border)' }}>
          {SECTORS.map(s => (
            <button
              key={s.value}
              disabled={!s.enabled}
              onClick={() => { if (s.enabled) { onChange(s.value); setOpen(false) } }}
              className="w-full text-left px-3 py-2 text-[12px] transition-colors flex items-center justify-between"
              style={
                !s.enabled
                  ? { color: '#C7C7C7', cursor: 'default' }
                  : value === s.value
                    ? { background: '#F5F5F5', color: 'var(--accent)', fontWeight: 600 }
                    : { color: 'var(--text-primary)' }
              }
              onMouseEnter={e => { if (s.enabled && value !== s.value) e.currentTarget.style.background = '#F9FAFB' }}
              onMouseLeave={e => { if (s.enabled && value !== s.value) e.currentTarget.style.background = 'transparent' }}>
              {s.label}
              {!s.enabled && <span className="text-[10px] font-medium" style={{ color: '#C7C7C7' }}>Soon</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export function ShortlistPage() {
  const navigate = useNavigate()
  const [market,    setMarket]    = useState<Market | 'ALL'>('ALL')
  const [strategy,  setStrategy]  = useState<Strategy>('ALL')
  const [sector,    setSector]    = useState('ALL')
  const [qualSortCol, setQualSortCol] = useState<string | null>(null)
  const [qualSortDir, setQualSortDir] = useState<SortDir>(null)
  const [failSortCol, setFailSortCol] = useState<string | null>(null)
  const [failSortDir, setFailSortDir] = useState<SortDir>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { user } = useAuth()

  const { rows: rawRows, loading, error, toggleWatch, refresh } = useCompanies({ market, strategy: 'ALL' })

  const rows = useMemo(() =>
    sector === 'ALL' ? rawRows : rawRows.filter(r => r.sector === sector),
    [rawRows, sector],
  )
  const { defs, settings, dashboardCols, applySettings } = useCriteria()

  const didCheckInitialScoring = useRef(false)
  const pollAndRefresh = useCallback(async () => {
    try {
      const { recalculating } = await api.criteria.status()
      if (!recalculating) return
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 500))
        try { const { recalculating: still } = await api.criteria.status(); if (!still) break } catch { break }
      }
      refresh()
    } catch {}
  }, [refresh])
  useEffect(() => {
    if (!settings || didCheckInitialScoring.current) return
    didCheckInitialScoring.current = true
    void pollAndRefresh()
  }, [settings, pollAndRefresh])

  const handleExport = useCallback(async () => {
    if (!settings || !defs.length || !user) return
    setExporting(true)
    try {
      const { exportShortlistExcel } = await import('@/lib/exportExcel')
      await exportShortlistExcel({
        rows,
        defs,
        settings,
        userId: user.id,
        pageLabel: 'Shortlist',
        filters: { market, strategy, sector },
        filename: `alphascreen-shortlist-${new Date().toISOString().slice(0, 10)}.xlsx`,
      })
    } catch (e) { console.error(e) }
    finally { setExporting(false) }
  }, [settings, defs, user, rows, market, strategy, sector])

  const matchesStrategy = useCallback((r: ShortlistRow) => {
    if (strategy === 'ALL') return true
    if (strategy === 'Growth') return !r.labels.includes('Value')
    if (strategy === 'Value')  return !r.labels.includes('Growth')
    return true
  }, [strategy])

  const qualifying = useMemo(
    () => rows.filter(r => (r.growth_passed || r.value_passed) && matchesStrategy(r)),
    [rows, matchesStrategy],
  )
  const failing = useMemo(
    () => rows.filter(r => !r.growth_passed && !r.value_passed && matchesStrategy(r)),
    [rows, matchesStrategy],
  )
  const watchlisted = useMemo(() => rows.filter(r => r.is_watched), [rows])

  function makeSort(
    sortCol: string | null, setSortCol: (c: string | null) => void,
    sortDir: SortDir, setSortDir: (d: SortDir) => void,
  ) {
    return {
      sortCol,
      onSort: (col: string) => {
        if (sortCol === col) {
          if (sortDir === 'asc')  setSortDir('desc')
          else                    { setSortCol(null); setSortDir(null) }
        } else {
          setSortCol(col); setSortDir('asc')
        }
      },
      sortRows: (input: ShortlistRow[]) => {
        if (!sortCol || !sortDir) return input
        const cfg = COLUMN_MAP[sortCol]
        if (!cfg) return input
        return [...input].sort((a, b) => {
          const av = a[cfg.field] as number | null
          const bv = b[cfg.field] as number | null
          if (av == null && bv == null) return 0
          if (av == null) return 1
          if (bv == null) return -1
          return sortDir === 'asc' ? av - bv : bv - av
        })
      },
    }
  }

  const qualSort = makeSort(qualSortCol, setQualSortCol, qualSortDir, setQualSortDir)
  const failSort = makeSort(failSortCol, setFailSortCol, failSortDir, setFailSortDir)

  const baseTableProps = {
    dashboardCols,
    onRowClick: (t: string) => navigate(`/company/${t}`),
    onToggleWatch: toggleWatch,
  }

  const MARKETS: (Market | 'ALL')[]  = ['ALL','US','EU','DE','CN']
  const STRATEGIES: Strategy[]        = ['ALL','Growth','Value']

  return (
    <div className="px-4 sm:px-8 pt-4 sm:pt-6 pb-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-[28px] font-bold" style={{ color: 'var(--text-primary)' }}>Shortlist</h1>

        {/* Sector dropdown — desktop only */}
        <div className="hidden sm:block ml-10">
          <SectorDropdown value={sector} onChange={setSector} />
        </div>

        <div className="flex-1" />

        {/* Download .xlsx — desktop only in header */}
        {!loading && rows.length > 0 && (
          <button onClick={handleExport} disabled={exporting}
            className="hidden sm:inline-flex items-center gap-2 text-[13px] font-medium hover:opacity-70 transition-opacity rounded-[2px] border disabled:opacity-40"
            style={{ color: 'var(--text-secondary)', borderColor: '#000000', paddingLeft: 20, paddingRight: 20, paddingTop: 12, paddingBottom: 12 }}>
            {exporting
              ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <Download size={14} />}
            {exporting ? 'Exporting…' : 'Download .xlsx'}
          </button>
        )}

        {/* Screening Criteria — desktop only in header; on mobile it lives beside Export */}
        <button onClick={() => setModalOpen(true)}
                className="hidden sm:inline-flex text-[13px] font-medium hover:opacity-70 transition-opacity rounded-[2px] border sm:px-7 sm:py-3"
                style={{ color: 'var(--text-secondary)', borderColor: '#000000' }}>
          Screening Criteria
        </button>
      </div>

      {/* Loading shimmer */}
      {loading && (
        <div>
          <div className="flex gap-4 mb-6">
            {[1,2,3].map(k => <div key={k} className="shimmer flex-1 h-[100px] rounded-none" />)}
          </div>
          <div className="flex items-center gap-2 mb-6">
            {[1,2,3,4,5,6,7,8].map(k => <div key={k} className="shimmer h-8 w-14 rounded-full" />)}
          </div>
          <div className="shimmer h-5 w-32 mb-3" />
          <div className="border rounded-none" style={{ borderColor: 'var(--border)' }}>
            <div className="shimmer h-10 w-full" />
            {[1,2,3,4,5,6].map(k => (
              <div key={k} className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <div className="shimmer w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="shimmer h-3.5 w-40" />
                  <div className="shimmer h-2.5 w-20" />
                </div>
                <div className="shimmer h-3.5 w-16" />
                <div className="shimmer h-3.5 w-16" />
                <div className="shimmer h-3.5 w-16" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      {!loading && (
        <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 flex-wrap">
          <StatCard label="Qualifying"  count={qualifying.length}  subtitle="above threshold"   topColor="#22C55E" />
          <StatCard label="Failing"     count={failing.length}     subtitle="below threshold"   topColor="#EF4444" />
          {/* Watchlisted — hidden on mobile */}
          <StatCard label="Watchlisted" count={watchlisted.length} subtitle="starred companies" topColor="#F97316" className="hidden sm:block" />
        </div>
      )}

      {/* Filters — hidden on mobile */}
      {!loading && (
        <div className="hidden sm:flex items-center gap-1 flex-wrap mb-6">
          <span className="text-[12px] font-medium mr-1" style={{ color: 'var(--text-muted)' }}>Market</span>
          {MARKETS.map(m => <Chip key={m} label={m} active={market === m} onClick={() => setMarket(m)} />)}
          <span className="ml-4 text-[12px] font-medium mr-1" style={{ color: 'var(--text-muted)' }}>Strategy</span>
          {STRATEGIES.map(s => <Chip key={s} label={s} active={strategy === s} onClick={() => setStrategy(s)} />)}
        </div>
      )}

      {/* Mobile button row — Export + Screening Criteria side by side */}
      {!loading && (
        <div className="sm:hidden grid grid-cols-2 gap-2 mb-6">
          {rows.length > 0 && (
            <button onClick={handleExport} disabled={exporting}
              className="w-full justify-center inline-flex items-center gap-1.5 text-[12px] font-medium hover:opacity-70 transition-opacity rounded-[2px] border disabled:opacity-40 px-3 py-2"
              style={{ color: 'var(--text-secondary)', borderColor: '#000000' }}>
              {exporting
                ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <Download size={12} />}
              {exporting ? 'Exporting…' : 'Export .xlsx'}
            </button>
          )}
          <button onClick={() => setModalOpen(true)}
            className="w-full justify-center inline-flex text-[12px] font-medium hover:opacity-70 transition-opacity rounded-[2px] border px-3 py-2"
            style={{ color: 'var(--text-secondary)', borderColor: '#000000' }}>
            Screening Criteria
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border px-5 py-4 text-[13px]"
             style={{ borderColor: '#FCA5A5', background: '#FEF2F2', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <SectionHeader type="qualifying" count={qualifying.length} />
          {/* No overflow-hidden on wrapper — it traps sticky positioning context */}
          <div className="rounded-none border mb-1" style={{ borderColor: 'var(--border)' }}>
            <CompanyTable rows={qualSort.sortRows(qualifying)} {...baseTableProps} sortCol={qualSort.sortCol} onSort={qualSort.onSort} />
          </div>

          <SectionHeader type="failing" count={failing.length} />
          <div className="rounded-none border" style={{ borderColor: 'var(--border)' }}>
            <CompanyTable rows={failSort.sortRows(failing)} {...baseTableProps} sortCol={failSort.sortCol} onSort={failSort.onSort} />
          </div>
        </>
      )}

      {settings && (
        <ScreeningModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          defs={defs}
          settings={settings}
          dashboardCols={dashboardCols}
          onApply={async (s, cols) => { await applySettings(s, cols); refresh() }}
        />
      )}
    </div>
  )
}
