import type { Label } from '@/lib/types'

interface BadgeProps { type: Label }

const styles: Record<Label, string> = {
  Growth: 'bg-[rgba(34,197,94,0.12)]  text-[#22c55e]  border-[rgba(34,197,94,0.2)]',
  Value:  'bg-[rgba(245,158,11,0.12)] text-[#f59e0b]  border-[rgba(245,158,11,0.2)]',
  Watch:  'bg-[rgba(99,102,241,0.12)] text-[#a5b4fc]  border-[rgba(99,102,241,0.2)]',
}

export function Badge({ type }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md border ${styles[type]}`}>
      {type}
    </span>
  )
}

interface ScoreBadgeProps { score: number }
export function ScoreBadge({ score }: ScoreBadgeProps) {
  const color = score >= 70 ? 'text-[#22c55e]' : score >= 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
  return <span className={`font-semibold text-sm tabular-nums ${color}`}>{score.toFixed(0)}%</span>
}

interface MarketFlagProps { market: string }
const flags: Record<string, string> = { US: '🇺🇸', EU: '🇪🇺', DE: '🇩🇪', CN: '🇨🇳' }
export function MarketFlag({ market }: MarketFlagProps) {
  return <span title={market}>{flags[market] ?? market}</span>
}
