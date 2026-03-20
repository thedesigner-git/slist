import { createClient } from '@/lib/supabase/client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function authFetch(path: string, options: RequestInit = {}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchSettings() {
  return authFetch('/api/criteria/settings')
}

export async function updateSettings(settings: Record<string, unknown>) {
  return authFetch('/api/criteria/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}

export async function toggleWatch(companyId: number) {
  return authFetch(`/api/criteria/watch/${companyId}`, { method: 'PATCH' })
}

export async function fetchShortlist() {
  return authFetch('/api/criteria/shortlist')
}

export async function fetchAllScores() {
  return authFetch('/api/criteria/scores')
}

export async function fetchRecalcStatus() {
  return authFetch('/api/criteria/status')
}
