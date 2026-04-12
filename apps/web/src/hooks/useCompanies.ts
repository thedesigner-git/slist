import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { ShortlistRow, Market } from '@/lib/types'

export type Strategy = 'ALL' | 'Growth' | 'Value'

interface Filters {
  market: Market | 'ALL'
  strategy: Strategy
}

export function useCompanies(filters: Filters) {
  const [rows, setRows]       = useState<ShortlistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.companies.list({ market: filters.market, strategy: filters.strategy })
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load companies')
    } finally {
      setLoading(false)
    }
  }, [filters.market, filters.strategy])

  useEffect(() => { void fetch() }, [fetch])

  const toggleWatch = async (ticker: string, currentlyWatched: boolean) => {
    // Optimistic update
    setRows(prev => prev.map(r => r.ticker === ticker ? { ...r, is_watched: !currentlyWatched } : r))
    try {
      if (currentlyWatched) await api.companies.unwatch(ticker)
      else await api.companies.watch(ticker)
    } catch {
      // Revert on error
      setRows(prev => prev.map(r => r.ticker === ticker ? { ...r, is_watched: currentlyWatched } : r))
    }
  }

  return { rows, loading, error, refresh: fetch, toggleWatch }
}
