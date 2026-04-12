import { useState, useEffect, useRef, Component, type ReactNode, type ErrorInfo } from 'react'
import { RotateCcw, LayoutDashboard } from 'lucide-react'
import { Toggle } from '@/components/ui/Toggle'
import type { CriterionDef, CriteriaSettings } from '@/lib/types'
import { COLUMN_MAP, CRITERION_DESCRIPTIONS } from '@/lib/criteriaMap'

class ModalErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[ScreeningModal crash]', err, info)
    this.setState({ error: `${err.message}\n${err.stack}` })
  }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.72)' }}>
          <div className="bg-white rounded p-6 max-w-lg w-full mx-4">
            <div className="text-red-600 font-bold mb-2">Modal crashed — open DevTools (F12) for full trace</div>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">{this.state.error}</pre>
            <button className="mt-4 px-4 py-2 bg-black text-white rounded text-sm"
              onClick={() => this.setState({ error: null })}>Dismiss</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Info tooltip ─────────────────────────────────────────────────────────────
// Hover on desktop, click-to-toggle on mobile (tap outside to close)
function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  return (
    <div ref={ref} className="relative group inline-flex shrink-0">
      <button
        type="button"
        className="inline-flex items-center justify-center w-[15px] h-[15px] rounded-full border border-[#ccc] text-[9px] font-bold text-[#aaa] hover:border-[#888] hover:text-[#555] transition-colors"
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        aria-label="More information"
      >
        ?
      </button>
      <div
        className={`absolute left-0 top-full mt-1.5 z-50 w-60 p-3 rounded-lg text-white text-[11px] leading-relaxed pointer-events-none transition-opacity duration-150 ${open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        style={{ background: '#1a1a1a', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
        role="tooltip"
      >
        <div
          className="absolute bottom-full left-4 w-0 h-0"
          style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '5px solid #1a1a1a' }}
        />
        {text}
      </div>
    </div>
  )
}

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_DASH     = 7
const GROWTH_COLOR = '#5A9D5C'
const VALUE_COLOR  = '#8D7332'

// ── Types ────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
  defs: CriterionDef[]
  settings: CriteriaSettings
  dashboardCols: string[]
  onApply: (settings: CriteriaSettings, cols: string[]) => Promise<void>
}

type Tab = 'growth' | 'value' | 'dashboard'

// ── Main Modal ───────────────────────────────────────────────────────────────
function ScreeningModalInner({ open, onClose, defs, settings, dashboardCols, onApply }: Props) {
  const [tab, setTab]         = useState<Tab>('growth')
  const [draft, setDraft]     = useState<CriteriaSettings>(settings)
  const [localCols, setLocalCols] = useState<string[]>(dashboardCols)
  const [saving, setSaving]   = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  // Sync from props only when the modal opens — NOT on every settings change.
  useEffect(() => {
    if (open) {
      setDraft(settings)
      setLocalCols(dashboardCols)
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const growthDefs = defs.filter(d => d.preset === 'growth')
  const valueDefs  = defs.filter(d => d.preset === 'value')

  const enabledGrowth = growthDefs.filter(d => draft.criteria?.[d.id]?.enabled).length
  const enabledValue  = valueDefs.filter(d  => draft.criteria?.[d.id]?.enabled).length

  function setCriterion(id: string, patch: { enabled?: boolean; threshold?: number | null }) {
    setDraft(prev => {
      const next: CriteriaSettings = {
        ...prev,
        criteria: { ...prev.criteria, [id]: { ...prev.criteria[id], ...patch } },
      }
      // When toggling, clamp passThreshold DOWN if enabled count drops — never auto-increase
      if (patch.enabled !== undefined) {
        const newEnabledGrowth = growthDefs.filter(d => next.criteria?.[d.id]?.enabled).length
        const newEnabledValue  = valueDefs.filter(d  => next.criteria?.[d.id]?.enabled).length
        const gCap = Math.max(1, newEnabledGrowth)
        const vCap = Math.max(1, newEnabledValue)
        if ((next.growth_pass_threshold ?? 4) > gCap) next.growth_pass_threshold = gCap
        if ((next.value_pass_threshold  ?? 3) > vCap) next.value_pass_threshold  = vCap
      }
      return next
    })
  }

  function setPassThreshold(group: 'growth' | 'value', delta: number) {
    setDraft(prev => {
      if (group === 'growth') {
        const cap  = Math.max(1, enabledGrowth)
        const next = Math.max(1, Math.min(cap, (prev.growth_pass_threshold ?? 4) + delta))
        return { ...prev, growth_pass_threshold: next }
      }
      const cap  = Math.max(1, enabledValue)
      const next = Math.max(1, Math.min(cap, (prev.value_pass_threshold ?? 3) + delta))
      return { ...prev, value_pass_threshold: next }
    })
  }

  function handleReset() {
    const resetCriteria: CriteriaSettings['criteria'] = {}
    defs.forEach(d => {
      resetCriteria[d.id] = { enabled: d.default_enabled, threshold: d.default_threshold }
    })
    setDraft({ criteria: resetCriteria, growth_pass_threshold: 4, value_pass_threshold: 3 })
    setLocalCols(dashboardCols)
  }

  async function handleApply() {
    setSaving(true)
    setApplyError(null)
    try {
      await onApply(draft, localCols)
      onClose()
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setDraft(settings)
    setLocalCols(dashboardCols)
    onClose()
  }

  const TABS = [
    { id: 'growth'    as Tab, label: 'Growth',    count: `${enabledGrowth}/${growthDefs.length}` },
    { id: 'value'     as Tab, label: 'Value',     count: `${enabledValue}/${valueDefs.length}`   },
    { id: 'dashboard' as Tab, label: 'Dashboard', count: `${localCols.length}/${MAX_DASH}`       },
  ]

  const currentDefs   = tab === 'growth' ? growthDefs : valueDefs
  const passThreshold = tab === 'growth'
    ? (draft.growth_pass_threshold ?? 4)
    : (draft.value_pass_threshold  ?? 3)
  const enabledInTab  = tab === 'growth' ? enabledGrowth : enabledValue
  const tabColor      = tab === 'growth' ? GROWTH_COLOR : VALUE_COLOR

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={handleClose}
    >
      <div
        className="relative flex flex-col bg-white w-[calc(100vw-32px)] sm:w-[576px] max-h-[90dvh] sm:max-h-none sm:h-[680px]"
        style={{ borderRadius: 4, boxShadow: '0 32px 64px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 sm:px-8 pt-6 sm:pt-8 pb-4">
          <div>
            <h2 className="text-[22px] font-black text-black leading-tight">Screening Criteria</h2>
            <p className="hidden sm:block text-[11px] mt-1" style={{ color: '#999' }}>
              Toggle on/off · adjust thresholds · configure columns
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e5e5e5] text-[11px] font-medium text-[#555] hover:bg-gray-50 transition-colors"
            >
              <RotateCcw size={11} />
              Reset
            </button>
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#e5e5e5] text-[14px] text-[#555] hover:text-black hover:bg-gray-50 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-5 sm:px-8 pb-2 sm:pb-4 border-t border-[#e5e5e5] pt-4">
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-colors"
                style={active
                  ? { background: 'black', color: 'white', fontWeight: 600 }
                  : { border: '1px solid #e5e5e5', color: '#999', background: 'transparent' }
                }
              >
                {t.label}
                <span className="text-[9px] opacity-80">{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* Pass Threshold (Growth / Value only) */}
        {tab !== 'dashboard' && (
          <div className="mx-5 sm:mx-8 my-2 sm:my-3 flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: '#f7f7f7' }}>
            <div>
              <div className="text-[13px] font-bold text-black">Pass Threshold</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#999' }}>
                Qualify with at least{' '}
                <span style={{ color: tabColor, fontWeight: 700 }}>{passThreshold}</span>
                {' '}of {enabledInTab} enabled criteria
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setPassThreshold(tab as 'growth' | 'value', -1)}
                className="w-[24px] h-[24px] sm:w-[30px] sm:h-[30px] rounded-[6px] border border-black flex items-center justify-center text-[13px] sm:text-[14px] font-medium text-black hover:bg-gray-100 transition-colors"
              >
                −
              </button>
              <span className="text-[16px] sm:text-[20px] font-black text-black w-4 sm:w-5 text-center">{passThreshold}</span>
              <button
                onClick={() => setPassThreshold(tab as 'growth' | 'value', +1)}
                className="w-[24px] h-[24px] sm:w-[30px] sm:h-[30px] rounded-[6px] border border-black flex items-center justify-center text-[13px] sm:text-[14px] font-medium text-black hover:bg-gray-100 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Scrollable criteria list or dashboard */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 px-5 sm:px-8 mt-0">
          {tab !== 'dashboard' ? (
            <div>
              {currentDefs.map((def, i) => {
                const s      = draft.criteria?.[def.id] ?? { enabled: def.default_enabled, threshold: def.default_threshold }
                const isLast = i === currentDefs.length - 1
                return (
                  <div
                    key={def.id}
                    className="flex items-center justify-between py-3"
                    style={{
                      borderTop:    '0.5px solid #e5e5e5',
                      borderBottom: isLast ? '0.5px solid #e5e5e5' : undefined,
                    }}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-black">{def.label}</span>
                        {CRITERION_DESCRIPTIONS[def.id] && (
                          <InfoTooltip text={CRITERION_DESCRIPTIONS[def.id]} />
                        )}
                      </div>
                      {!def.is_boolean ? (
                        <div className="flex items-center gap-6 mt-2">
                          <span className="text-[11px] text-[#999] whitespace-nowrap">
                            {def.direction} threshold:
                          </span>
                          <div className="flex items-center gap-1">
                            <div
                              className="flex items-center justify-center h-6 w-14 rounded border border-[#e5e5e5] overflow-hidden"
                              style={{ background: '#f7f7f7' }}
                            >
                              <input
                                type="number"
                                value={
                                  s.threshold == null
                                    ? ''
                                    : def.suffix === '%'
                                      ? parseFloat((s.threshold * 100).toFixed(4))
                                      : s.threshold
                                }
                                onChange={e => {
                                  const raw = parseFloat(e.target.value)
                                  if (isNaN(raw)) { setCriterion(def.id, { threshold: null }); return }
                                  setCriterion(def.id, { threshold: def.suffix === '%' ? raw / 100 : raw })
                                }}
                                onClick={e => e.stopPropagation()}
                                className="w-full h-full text-center text-[12px] font-medium text-black bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>
                            {def.suffix && (
                              <span className="text-[11px] text-[#999]">{def.suffix}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#999] mt-1.5">Pass/fail — no numeric threshold</div>
                      )}
                    </div>
                    <Toggle value={s.enabled} onChange={v => setCriterion(def.id, { enabled: v })} />
                  </div>
                )
              })}
            </div>
          ) : (
            <DashboardTab
              defs={defs}
              selected={localCols}
              onChange={setLocalCols}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-8 pb-5 sm:pb-6 shrink-0">
          {applyError && (
            <div className="mb-3 px-3 py-2 rounded text-[11px] text-red-700 bg-red-50 border border-red-200">
              {applyError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={saving}
              className="flex-1 h-11 rounded-[2px] text-[13px] font-semibold text-[#555] hover:bg-gray-200 transition-colors disabled:opacity-50"
              style={{ background: '#f7f7f7' }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={saving}
              className="flex-1 h-11 rounded-[2px] flex items-center justify-center gap-2 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-70"
              style={{ background: 'black' }}
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Applying…
                </>
              ) : '✓\u00A0\u00A0Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ScreeningModal(props: Props) {
  return <ModalErrorBoundary><ScreeningModalInner {...props} /></ModalErrorBoundary>
}

// ── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({
  defs, selected, onChange,
}: {
  defs: CriterionDef[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const growthDefs = defs.filter(d => d.preset === 'growth')
  const valueDefs  = defs.filter(d => d.preset === 'value')
  const maxReached = selected.length >= MAX_DASH

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id))
    } else {
      if (maxReached) return
      onChange([...selected, id])
    }
  }

  function renderGroup(groupDefs: CriterionDef[], groupLabel: string, color: string) {
    return (
      <div className="mb-5">
        <div className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-3">
          {groupLabel} Criteria
        </div>
        <div className="flex flex-wrap gap-2">
          {groupDefs.map(def => {
            const isSelected = selected.includes(def.id)
            const isDisabled = !isSelected && maxReached
            const orderNum   = isSelected ? selected.indexOf(def.id) + 1 : null
            const shortLabel = COLUMN_MAP[def.id]?.label ?? def.label
            return (
              <button
                key={def.id}
                onClick={() => toggle(def.id)}
                disabled={isDisabled}
                className="px-3 py-1.5 rounded-lg text-[12px] border transition-all"
                style={{
                  background:  isSelected ? `${color}18` : '#f7f7f7',
                  color:       isSelected ? color : isDisabled ? '#ccc' : '#555',
                  borderColor: isSelected ? `${color}50` : '#e5e5e5',
                  fontWeight:  isSelected ? 600 : 400,
                  cursor:      isDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {shortLabel}{orderNum !== null ? ` (${orderNum})` : ''}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="pt-4">
      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 rounded-lg border border-[#e5e5e5] bg-[#f7f7f7] mb-4">
        <LayoutDashboard size={13} className="text-[#999] mt-0.5 shrink-0" />
        <div>
          <div className="text-[12px] font-semibold text-black mb-0.5">Dashboard column visibility only</div>
          <div className="text-[11px] leading-relaxed" style={{ color: '#999' }}>
            Controls which metric columns appear in the shortlist table. Does not affect which companies qualify.
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-[#999]">Columns selected</span>
          <span
            className="text-[11px] font-mono font-semibold"
            style={{ color: maxReached ? '#ef4444' : '#555' }}
          >
            {selected.length} / {MAX_DASH}
          </span>
        </div>
        <div className="h-[3px] rounded-full overflow-hidden bg-[#e5e5e5]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width:      `${(selected.length / MAX_DASH) * 100}%`,
              background: maxReached ? '#ef4444' : '#555',
            }}
          />
        </div>
        <div className="text-[11px] text-[#ef4444] mt-1" style={{ minHeight: 16 }}>
          {maxReached ? 'Maximum reached — deselect a column to add another' : ''}
        </div>
      </div>

      {renderGroup(growthDefs, 'Growth', GROWTH_COLOR)}
      {renderGroup(valueDefs,  'Value',  VALUE_COLOR)}
    </div>
  )
}
