'use client'

interface LabelBadgesProps {
  growthPassed: boolean
  valuePassed: boolean
}

export function LabelBadges({ growthPassed, valuePassed }: LabelBadgesProps) {
  if (!growthPassed && !valuePassed) return null

  return (
    <div className="flex items-center gap-1">
      {growthPassed && (
        <span className="bg-emerald-500/15 text-emerald-400 text-xs font-normal uppercase px-2 py-1 rounded-full">
          GROWTH
        </span>
      )}
      {valuePassed && (
        <span className="bg-amber-500/15 text-amber-400 text-xs font-normal uppercase px-2 py-1 rounded-full">
          VALUE
        </span>
      )}
    </div>
  )
}
