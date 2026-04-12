import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ArrowDownRight, Star, Download } from 'lucide-react'
import { useCompanies } from '@/hooks/useCompanies'
import { useCriteria } from '@/hooks/useCriteria'
import { useAuth } from '@/hooks/useAuth'
import { COLUMN_MAP } from '@/lib/criteriaMap'
import type { ShortlistRow, Label, RowTag } from '@/lib/types'

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
          style={{ color: s.color, borderColor: s.border }}>{tag}</span>
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

  const n        = raw as number
  const positive = n >= 0
  const color    = positive ? 'var(--signal-up)' : 'var(--signal-down)'
  const Icon     = positive ? ArrowUpRight : ArrowDownRight
  const formatted =
    cfg.format === 'pct'   ? `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%` :
    cfg.format === 'times' ? `${n.toFixed(1)}×` :
    n.toFixed(2)

  return (
    <td className="px-2 py-4 text-right">
      <span className="inline-flex items-center justify-end gap-0.5 text-[13px] font-medium tabular-nums" style={{ color }}>
        <Icon size={11} strokeWidth={2.5} />
        {formatted}
      </span>
    </td>
  )
}

function SectionHeader({ type, count }: { type: 'qualifying' | 'failing'; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-6 sm:mt-8">
      {type === 'qualifying' ? (
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#22C55E' }}>
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#EF4444' }}>
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

function CompanyTable({ rows, dashboardCols, onRowClick, onToggleWatch }: {
  rows: ShortlistRow[]
  dashboardCols: string[]
  onRowClick: (ticker: string) => void
  onToggleWatch: (ticker: string, watched: boolean) => void
}) {
  if (rows.length === 0)
    return <p className="text-[13px] py-8 px-5" style={{ color: 'var(--text-muted)' }}>None.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-separate border-spacing-0 [table-layout:fixed]">
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
            {/* Star col — 0-width on mobile */}
            <th className="w-0 overflow-hidden p-0 sm:w-[44px] sm:px-3 sm:py-3"
                style={{ background: 'var(--bg-surface)' }} />
            {/* # col — 0-width on mobile */}
            <th className="w-0 overflow-hidden p-0 sm:w-8 sm:px-2 sm:py-3 text-left text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}></th>
            {/* Company col — sticky, pulled 1px left to cover wrapper border gap */}
            <th className="pr-0 pl-2 sm:pl-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide
                           sticky left-[-1px] z-[20] sm:static sm:z-auto
                           w-[192px] sm:w-[260px]"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)' }}>Company</th>
            <th className="px-2 py-3 w-[90px] text-left text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}>Strategy</th>
            {dashboardCols.map(id => (
              <th key={id} className="px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}>
                {COLUMN_MAP[id]?.label ?? id}
              </th>
            ))}
            <th className="w-8 px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.ticker} onClick={() => onRowClick(row.ticker)}
                className="cursor-pointer"
                style={{ borderBottom: '1px solid var(--border-light)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

              {/* Star — 0-width on mobile */}
              <td className="w-0 overflow-hidden p-0 sm:w-auto sm:px-3 sm:py-4"
                  onClick={e => { e.stopPropagation(); onToggleWatch(row.ticker, row.is_watched) }}>
                <Star size={13} strokeWidth={1.5}
                      style={row.is_watched ? { fill: '#F97316', color: '#F97316' } : { color: 'var(--text-faint)' }} />
              </td>

              {/* Rank — 0-width on mobile */}
              <td className="w-0 overflow-hidden p-0 sm:w-auto sm:px-2 sm:py-4">
                <span className="text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </td>

              {/* Company — sticky left-0 on mobile, star embedded for mobile */}
              <td className="pr-0 pl-2 sm:pl-3 py-4
                             sticky left-[-1px] z-[10] bg-white
                             sm:static sm:z-auto sm:bg-transparent
                             w-[192px] sm:w-[260px]">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  {/* Inline star — mobile only */}
                  <div className="sm:hidden shrink-0 p-0.5"
                       onClick={e => { e.stopPropagation(); onToggleWatch(row.ticker, row.is_watched) }}>
                    <Star size={12} strokeWidth={1.5}
                          style={row.is_watched ? { fill: '#F97316', color: '#F97316' } : { color: 'var(--text-faint)' }} />
                  </div>
                  {/* Avatar */}
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0"
                       style={{ background: avatarBg(row.ticker) }}>
                    <span className="text-white text-[10px] sm:text-[11px] font-bold">{row.ticker.slice(0, 2)}</span>
                  </div>
                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-nowrap overflow-hidden">
                      <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{row.name}</span>
                      {row.tag && <TagBadge tag={row.tag} />}
                    </div>
                    {/* Ticker abbreviation — hidden on mobile */}
                    <span className="text-[11px] hidden sm:block" style={{ color: 'var(--text-muted)' }}>{row.ticker}</span>
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

              {dashboardCols.map(id => <MetricCell key={id} row={row} criterionId={id} />)}

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

// ── page ──────────────────────────────────────────────────────────────────────

export function WatchlistPage() {
  const navigate  = useNavigate()
  const { rows, loading, error, toggleWatch } = useCompanies({ market: 'ALL', strategy: 'ALL' })
  const { dashboardCols, defs, settings } = useCriteria()
  const { user } = useAuth()
  const [exporting, setExporting] = useState(false)

  const watched    = useMemo(() => rows.filter(r => r.is_watched), [rows])
  const qualifying = useMemo(
    () => watched.filter(r => r.growth_passed || r.value_passed), [watched])
  const failing    = useMemo(
    () => watched.filter(r => !r.growth_passed && !r.value_passed), [watched])

  const tableProps = {
    dashboardCols,
    onRowClick:    (t: string) => navigate(`/company/${t}`),
    onToggleWatch: toggleWatch,
  }

  const handleExport = useCallback(async () => {
    if (!settings || !defs.length) return
    setExporting(true)
    try {
      const { exportShortlistExcel } = await import('@/lib/exportExcel')
      await exportShortlistExcel({
        rows: watched,
        defs,
        settings,
        userId: user?.id ?? 'dev-user',
        pageLabel: 'Watchlist',
        filters: { market: 'ALL', strategy: 'ALL', sector: 'ALL' },
        filename: `slist-watchlist-${new Date().toISOString().slice(0, 10)}.xlsx`,
      })
    } catch (e) { console.error(e) }
    finally { setExporting(false) }
  }, [settings, defs, user, watched])

  return (
    <div className="px-4 sm:px-8 pt-4 sm:pt-6 pb-6">

      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-[28px] font-bold" style={{ color: 'var(--text-primary)' }}>Watchlist</h1>
        <div className="flex-1" />
        {!loading && watched.length > 0 && (
          <>
            {/* Mobile export — compact, same line as title */}
            <button onClick={handleExport} disabled={exporting}
              className="sm:hidden inline-flex items-center gap-1.5 text-[12px] font-medium hover:opacity-70 transition-opacity rounded-[2px] border disabled:opacity-40 px-3 py-2"
              style={{ color: 'var(--text-secondary)', borderColor: '#000000' }}>
              {exporting
                ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <Download size={12} />}
              {exporting ? 'Exporting…' : 'Export .xlsx'}
            </button>
            {/* Desktop export */}
            <button onClick={handleExport} disabled={exporting}
              className="hidden sm:inline-flex items-center gap-2 text-[13px] font-medium hover:opacity-70 transition-opacity rounded-[2px] border disabled:opacity-40"
              style={{ color: 'var(--text-secondary)', borderColor: '#000000', paddingLeft: 20, paddingRight: 20, paddingTop: 12, paddingBottom: 12 }}>
              {exporting
                ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <Download size={14} />}
              {exporting ? 'Exporting…' : 'Download .xlsx'}
            </button>
          </>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
               style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
        </div>
      )}

      {error && (
        <div className="rounded-xl border px-5 py-4 text-[13px]"
             style={{ borderColor: '#FCA5A5', background: '#FEF2F2', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      {!loading && !error && watched.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Star size={32} strokeWidth={1} style={{ color: 'var(--text-faint)' }} />
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            No watchlisted companies. Star a company from the Shortlist to add it here.
          </p>
        </div>
      )}

      {!loading && !error && watched.length > 0 && (
        <>
          <SectionHeader type="qualifying" count={qualifying.length} />
          <div className="rounded-none border mb-1" style={{ borderColor: 'var(--border)' }}>
            <CompanyTable rows={qualifying} {...tableProps} />
          </div>

          <SectionHeader type="failing" count={failing.length} />
          <div className="rounded-none border" style={{ borderColor: 'var(--border)' }}>
            <CompanyTable rows={failing} {...tableProps} />
          </div>
        </>
      )}
    </div>
  )
}
