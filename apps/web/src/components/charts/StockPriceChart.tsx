import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { api } from '@/lib/api'
import type { PricePoint } from '@/lib/types'
import { Spinner } from '@/components/ui'

type Range = '1M' | '6M' | '1Y' | '5Y'
const RANGE_PERIOD: Record<Range, string> = { '1M': '1mo', '6M': '6mo', '1Y': '1y', '5Y': '5y' }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: {value:number}[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 bg-[#1c1c1e] border border-[#27272a] shadow-xl">
      <div className="text-[10px] text-[#52525b] mb-0.5">{label}</div>
      <div className="text-sm font-bold font-mono text-[#e4e4e7]">${payload[0].value.toFixed(2)}</div>
    </div>
  )
}

interface Props { ticker: string }

export function StockPriceChart({ ticker }: Props) {
  const [range, setRange]   = useState<Range>('1Y')
  const [data, setData]     = useState<(PricePoint & { label: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(false)

  useEffect(() => {
    setLoading(true); setError(false)
    api.companies.priceHistory(ticker, RANGE_PERIOD[range])
      .then(pts => {
        setData(pts.map(p => ({
          ...p,
          label: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        })))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [ticker, range])

  const prices    = data.map(d => d.close)
  const first     = prices[0] ?? 0
  const last      = prices[prices.length - 1] ?? 0
  const isPos     = last >= first
  const pct       = first ? (((last - first) / first) * 100).toFixed(2) : '0.00'
  const lineColor = isPos ? '#22c55e' : '#ef4444'
  const minP = Math.min(...prices); const maxP = Math.max(...prices)
  const pad  = (maxP - minP) * 0.12

  const RANGES: Range[] = ['5Y', '1Y', '6M', '1M']

  return (
    <div className="rounded-none border border-[#e4e4e7] bg-white p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-sm font-semibold text-[#111827] mb-1">Stock Price</div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-[#111827]">${last.toFixed(2)}</span>
            <span className="text-sm font-mono font-semibold" style={{ color: lineColor }}>
              {isPos ? '+' : ''}{pct}%
            </span>
            <span className="text-xs text-[#9ca3af]">vs {range} ago</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 p-1 rounded-md border border-[#e4e4e7] bg-[#f9fafb]">
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={['px-2.5 py-1 rounded text-xs transition-colors duration-150',
                r === range ? 'bg-white text-[#111827] font-semibold shadow-sm' : 'text-[#6b7280] hover:text-[#111827]',
              ].join(' ')}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center"><Spinner /></div>
      ) : error ? (
        <div className="h-48 flex items-center justify-center text-sm text-[#9ca3af]">Price data unavailable</div>
      ) : (
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[minP - pad, maxP + pad]} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={first} stroke="#e4e4e7" strokeDasharray="3 3" strokeWidth={1} />
              <Line type="monotone" dataKey="close" stroke={lineColor} strokeWidth={1.8} dot={false} activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && !error && (
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#e4e4e7]">
          {[
            { label: 'Current',       value: `$${last.toFixed(2)}`,             color: '#111827' },
            { label: `${range} High`, value: `$${Math.max(...prices).toFixed(2)}`, color: '#22c55e' },
            { label: `${range} Low`,  value: `$${Math.min(...prices).toFixed(2)}`, color: '#ef4444' },
            { label: 'Return',        value: `${isPos ? '+' : ''}${pct}%`,      color: lineColor },
          ].map(s => (
            <div key={s.label}>
              <div className="text-[10px] text-[#9ca3af] mb-0.5">{s.label}</div>
              <div className="text-sm font-mono font-semibold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
