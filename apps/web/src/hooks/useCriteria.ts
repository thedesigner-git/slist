import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { DEFAULT_DASHBOARD_COLS } from '@/lib/criteriaMap'
import type { CriterionDef, CriteriaSettings } from '@/lib/types'

const DASH_COLS_KEY = 'alphascreen_dashboard_cols'

function loadDashboardCols(): string[] {
  try {
    const raw = localStorage.getItem(DASH_COLS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_DASHBOARD_COLS
}

// Module-level cache — survives component remounts within the same page session.
// Cleared only on full page reload (module re-execution).
let _defs:         CriterionDef[]   | null = null
let _settings:     CriteriaSettings | null = null
let _dashboardCols: string[]        | null = null

export function useCriteria() {
  const [defs,          setDefs]          = useState<CriterionDef[]>(_defs ?? [])
  const [settings,      setSettings]      = useState<CriteriaSettings | null>(_settings)
  const [dashboardCols, setDashboardCols] = useState<string[]>(_dashboardCols ?? loadDashboardCols())
  const [loading,       setLoading]       = useState(!_settings)

  useEffect(() => {
    if (_settings) return   // already fetched this session — skip
    Promise.all([api.criteria.definitions(), api.criteria.settings()])
      .then(([d, s]) => {
        _defs          = d
        _settings      = s
        _dashboardCols = loadDashboardCols()
        setDefs(d)
        setSettings(s)
        setDashboardCols(_dashboardCols)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const applySettings = useCallback(
    async (newSettings: CriteriaSettings, cols: string[]) => {
      await api.criteria.update(newSettings)
      // Update module cache immediately so any remounting component gets the new state
      _settings      = newSettings
      _dashboardCols = cols
      setSettings(newSettings)
      setDashboardCols(cols)
      try { localStorage.setItem(DASH_COLS_KEY, JSON.stringify(cols)) } catch {}
      // Scoring is now synchronous on the backend — status always returns false immediately.
      // One short poll is enough to confirm.
      for (let i = 0; i < 2; i++) {
        await new Promise(r => setTimeout(r, 300))
        try {
          const { recalculating } = await api.criteria.status()
          if (!recalculating) break
        } catch { break }
      }
    },
    [],
  )

  return { defs, settings, dashboardCols, loading, applySettings }
}
