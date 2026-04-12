import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { AgentRun } from '@/lib/types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

function timeUntil(iso: string, intervalH = 24): string {
  const remaining = new Date(iso).getTime() + intervalH * 3_600_000 - Date.now()
  if (remaining <= 0) return 'now'
  const h = Math.floor(remaining / 3_600_000)
  const m = Math.floor((remaining % 3_600_000) / 60_000)
  return h > 0 ? `${h}h` : `${m}m`
}

export function useAgentStatus() {
  const [run, setRun] = useState<AgentRun | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      api.agent.lastRun().then(r => setRun(r)).catch(() => {})
    load().finally(() => setLoading(false))
    const iv = setInterval(load, 60_000)
    return () => clearInterval(iv)
  }, [])

  const completedAt = run?.completed_at ?? null
  const isActive = completedAt
    ? Date.now() - new Date(completedAt).getTime() < 25 * 3_600_000
    : false

  return {
    run,
    loading,
    isActive,
    lastRunText:     completedAt ? timeAgo(completedAt) : null,
    nextRunText:     completedAt ? timeUntil(completedAt) : null,
    companiesCount:  run?.companies_processed ?? null,
  }
}
