import type {
  ShortlistRow, CompanyDetail, PricePoint,
  CriterionDef, CriteriaSettings, AgentRun,
} from './types'
import { supabase } from './supabase'

const BASE = import.meta.env.VITE_API_BASE_URL as string

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

// ── Companies ────────────────────────────────────────────────────────────────
export const api = {
  companies: {
    list: (params?: { market?: string; strategy?: string }) => {
      const qs = new URLSearchParams()
      if (params?.market && params.market !== 'ALL') qs.set('market', params.market)
      if (params?.strategy && params.strategy !== 'ALL') qs.set('strategy', params.strategy)
      const q = qs.toString()
      return req<ShortlistRow[]>(`/api/companies${q ? `?${q}` : ''}`)
    },
    detail: (ticker: string) =>
      req<CompanyDetail>(`/api/companies/${ticker}`),
    priceHistory: (ticker: string, period = '1y', interval = '1d') =>
      req<PricePoint[]>(`/api/companies/${ticker}/price-history?period=${period}&interval=${interval}`),
    watch: (ticker: string)   => req<void>(`/api/companies/${ticker}/watch`,   { method: 'POST' }),
    unwatch: (ticker: string) => req<void>(`/api/companies/${ticker}/unwatch`, { method: 'POST' }),
  },

  // ── Criteria ───────────────────────────────────────────────────────────────
  criteria: {
    definitions: () => req<CriterionDef[]>('/api/criteria/definitions'),
    settings:    () => req<CriteriaSettings>('/api/criteria/settings'),
    update: (body: Partial<CriteriaSettings>) =>
      req<CriteriaSettings>('/api/criteria/settings', { method: 'PUT', body: JSON.stringify(body) }),
    status: () => req<{ recalculating: boolean }>('/api/criteria/status'),
  },

  // ── Agent ──────────────────────────────────────────────────────────────────
  agent: {
    runAll:    () => req<AgentRun>('/api/agent/run',          { method: 'POST' }),
    runOne:    (ticker: string) => req<AgentRun>(`/api/agent/run/${ticker}`, { method: 'POST' }),
    lastRun:   () => req<AgentRun | null>('/api/agent/last-run'),
  },
}
