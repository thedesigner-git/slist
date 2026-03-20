'use client'

interface ScoreBadgeProps {
  score: number
  criteriaPassed: number
  criteriaTotal: number
  isShortlisted: boolean
  threshold?: number
}

export function ScoreBadge({
  criteriaPassed,
  criteriaTotal,
  isShortlisted,
  threshold = 70,
}: ScoreBadgeProps) {
  const titleText = isShortlisted
    ? `${criteriaPassed} of ${criteriaTotal} active criteria passed`
    : `${criteriaPassed} of ${criteriaTotal} active criteria passed — below ${threshold}% threshold`

  return (
    <span
      className={
        isShortlisted
          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-normal uppercase px-3 py-1 rounded-full'
          : 'bg-zinc-700 text-zinc-400 text-xs font-normal uppercase px-3 py-1 rounded-full'
      }
      title={titleText}
    >
      {criteriaPassed}/{criteriaTotal}
    </span>
  )
}
