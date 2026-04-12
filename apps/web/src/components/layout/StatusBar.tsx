import { useAgentStatus } from '@/hooks/useAgentStatus'

export function StatusBar() {
  const { isActive, lastRunText, nextRunText, companiesCount } = useAgentStatus()

  const statusText = isActive ? 'Agent Active' : 'Agent Idle'
  const dotColor   = isActive ? '#22C55E' : '#9CA3AF'

  const meta = [
    lastRunText  && `Last run: ${lastRunText}`,
    nextRunText  && `Next in: ${nextRunText}`,
    companiesCount !== null && `${companiesCount} companies screened`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center gap-4 px-6 h-10 border-b shrink-0"
         style={{ borderColor: 'var(--border)', background: 'var(--bg-page)' }}>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {statusText}
        </span>
      </div>
      {meta && (
        <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{meta}</span>
      )}
    </div>
  )
}
