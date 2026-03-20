'use client'

import { useEffect, useState } from 'react'
import { fetchShortlist, fetchRecalcStatus, toggleWatch } from '@/lib/api'
import { ScoreBadge } from '@/components/score-badge'
import { LabelBadges } from '@/components/label-badges'
import { WatchButton } from '@/components/watch-button'

interface ShortlistCompany {
  company_id: number
  ticker: string
  name: string
  market: string
  sector: string
  score: number
  criteria_passed: number
  criteria_total: number
  growth_passed: boolean
  value_passed: boolean
  is_watch: boolean
  is_shortlisted: boolean
}

interface ShortlistTableProps {
  recalculating: boolean
  onRecalcDone: () => void
}

export function ShortlistTable({ recalculating, onRecalcDone }: ShortlistTableProps) {
  const [companies, setCompanies] = useState<ShortlistCompany[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShortlist()
      .then((data: ShortlistCompany[]) => setCompanies(data))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!recalculating) return

    const interval = setInterval(async () => {
      try {
        const status = await fetchRecalcStatus()
        if (!status.recalculating) {
          clearInterval(interval)
          const data = await fetchShortlist()
          setCompanies(data)
          onRecalcDone()
        }
      } catch {
        // continue polling
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [recalculating, onRecalcDone])

  async function handleWatchToggle(companyId: number, newState: boolean) {
    // Optimistic update
    setCompanies((prev) =>
      prev.map((c) =>
        c.company_id === companyId ? { ...c, is_watch: newState } : c
      )
    )
    try {
      await toggleWatch(companyId)
      // Refetch to sync server state
      const data = await fetchShortlist()
      setCompanies(data)
    } catch {
      // Revert optimistic update on failure
      setCompanies((prev) =>
        prev.map((c) =>
          c.company_id === companyId ? { ...c, is_watch: !newState } : c
        )
      )
    }
  }

  return (
    <div>
      {recalculating && (
        <div className="mb-4">
          <div className="h-0.5 w-full bg-zinc-800 overflow-hidden mb-1">
            <div
              className="h-full bg-violet-500"
              style={{ animation: 'progress 2s ease-in-out infinite' }}
            />
          </div>
          <p className="text-xs text-zinc-400">Updating shortlist...</p>
        </div>
      )}

      {loading && !recalculating && (
        <div className="text-center py-16">
          <p className="text-sm text-zinc-400">Loading shortlist...</p>
        </div>
      )}

      {!loading && companies.length === 0 && !recalculating && (
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-white">No companies match your criteria</p>
          <p className="text-sm text-zinc-400 mt-2">
            Try lowering your thresholds or enabling both presets. Agent data updates daily.
          </p>
        </div>
      )}

      {companies.map((company) => (
        <div
          key={company.company_id}
          className="bg-zinc-800 rounded-xl p-4 mb-2 flex items-center justify-between"
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-white">{company.name}</span>
            <span className="text-xs text-zinc-400">
              {company.ticker} &middot; {company.market}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LabelBadges
              growthPassed={company.growth_passed}
              valuePassed={company.value_passed}
            />
            <ScoreBadge
              score={company.score}
              criteriaPassed={company.criteria_passed}
              criteriaTotal={company.criteria_total}
              isShortlisted={company.is_shortlisted}
            />
            <WatchButton
              companyId={company.company_id}
              isWatch={company.is_watch}
              scoreBelowThreshold={!company.growth_passed && !company.value_passed}
              onToggle={handleWatchToggle}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
