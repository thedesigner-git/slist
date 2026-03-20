'use client'

import { useEffect, useState } from 'react'
import { SlidersHorizontal, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { fetchSettings, updateSettings } from '@/lib/api'

interface CriteriaSettings {
  growth_enabled: boolean
  value_enabled: boolean
  growth_revenue_growth_yoy: number
  growth_revenue_growth_yoy_enabled: boolean
  growth_eps_growth_yoy: number
  growth_eps_growth_yoy_enabled: boolean
  growth_roe: number
  growth_roe_enabled: boolean
  growth_fcf_margin: number
  growth_fcf_margin_enabled: boolean
  value_pe_ratio: number
  value_pe_ratio_enabled: boolean
  value_pb_ratio: number
  value_pb_ratio_enabled: boolean
  value_fcf_margin: number
  value_fcf_margin_enabled: boolean
  value_debt_equity: number
  value_debt_equity_enabled: boolean
  shortlist_threshold: number
}

const DEFAULT_SETTINGS: CriteriaSettings = {
  growth_enabled: true,
  value_enabled: true,
  growth_revenue_growth_yoy: 0.15,
  growth_revenue_growth_yoy_enabled: true,
  growth_eps_growth_yoy: 0.10,
  growth_eps_growth_yoy_enabled: true,
  growth_roe: 0.15,
  growth_roe_enabled: true,
  growth_fcf_margin: 0.0,
  growth_fcf_margin_enabled: true,
  value_pe_ratio: 20,
  value_pe_ratio_enabled: true,
  value_pb_ratio: 2,
  value_pb_ratio_enabled: true,
  value_fcf_margin: 0.0,
  value_fcf_margin_enabled: true,
  value_debt_equity: 1.0,
  value_debt_equity_enabled: true,
  shortlist_threshold: 0.70,
}

interface InputState {
  growth_revenue_growth_yoy: string
  growth_eps_growth_yoy: string
  growth_roe: string
  growth_fcf_margin: string
  value_pe_ratio: string
  value_pb_ratio: string
  value_fcf_margin: string
  value_debt_equity: string
  shortlist_threshold: string
}

interface ValidationErrors {
  growth_revenue_growth_yoy?: string
  growth_eps_growth_yoy?: string
  growth_roe?: string
  growth_fcf_margin?: string
  value_pe_ratio?: string
  value_pb_ratio?: string
  value_fcf_margin?: string
  value_debt_equity?: string
  shortlist_threshold?: string
}

interface CriteriaDrawerProps {
  onRecalcStart: () => void
}

export function CriteriaDrawer({ onRecalcStart }: CriteriaDrawerProps) {
  const [settings, setSettings] = useState<CriteriaSettings>(DEFAULT_SETTINGS)
  const [inputs, setInputs] = useState<InputState>({
    growth_revenue_growth_yoy: '15',
    growth_eps_growth_yoy: '10',
    growth_roe: '15',
    growth_fcf_margin: '0',
    value_pe_ratio: '20',
    value_pb_ratio: '2',
    value_fcf_margin: '0',
    value_debt_equity: '1',
    shortlist_threshold: '70',
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    fetchSettings()
      .then((data: CriteriaSettings) => {
        setSettings(data)
        setInputs({
          growth_revenue_growth_yoy: String(Math.round(data.growth_revenue_growth_yoy * 100)),
          growth_eps_growth_yoy: String(Math.round(data.growth_eps_growth_yoy * 100)),
          growth_roe: String(Math.round(data.growth_roe * 100)),
          growth_fcf_margin: String(Math.round(data.growth_fcf_margin * 100)),
          value_pe_ratio: String(data.value_pe_ratio),
          value_pb_ratio: String(data.value_pb_ratio),
          value_fcf_margin: String(Math.round(data.value_fcf_margin * 100)),
          value_debt_equity: String(data.value_debt_equity),
          shortlist_threshold: String(Math.round(data.shortlist_threshold * 100)),
        })
      })
      .catch(() => {
        // Use defaults if fetch fails
      })
  }, [])

  function updateInput(field: keyof InputState, value: string) {
    setInputs((prev) => ({ ...prev, [field]: value }))
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate(): boolean {
    const newErrors: ValidationErrors = {}
    const fields: (keyof InputState)[] = [
      'growth_revenue_growth_yoy',
      'growth_eps_growth_yoy',
      'growth_roe',
      'growth_fcf_margin',
      'value_pe_ratio',
      'value_pb_ratio',
      'value_fcf_margin',
      'value_debt_equity',
      'shortlist_threshold',
    ]
    for (const field of fields) {
      const val = parseFloat(inputs[field])
      if (isNaN(val) || val < 0) {
        newErrors[field] = 'Must be a positive number'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleApply() {
    if (!validate()) return
    setIsApplying(true)
    try {
      const payload = {
        growth_enabled: settings.growth_enabled,
        value_enabled: settings.value_enabled,
        growth_revenue_growth_yoy: parseFloat(inputs.growth_revenue_growth_yoy) / 100,
        growth_revenue_growth_yoy_enabled: settings.growth_revenue_growth_yoy_enabled,
        growth_eps_growth_yoy: parseFloat(inputs.growth_eps_growth_yoy) / 100,
        growth_eps_growth_yoy_enabled: settings.growth_eps_growth_yoy_enabled,
        growth_roe: parseFloat(inputs.growth_roe) / 100,
        growth_roe_enabled: settings.growth_roe_enabled,
        growth_fcf_margin: parseFloat(inputs.growth_fcf_margin) / 100,
        growth_fcf_margin_enabled: settings.growth_fcf_margin_enabled,
        value_pe_ratio: parseFloat(inputs.value_pe_ratio),
        value_pe_ratio_enabled: settings.value_pe_ratio_enabled,
        value_pb_ratio: parseFloat(inputs.value_pb_ratio),
        value_pb_ratio_enabled: settings.value_pb_ratio_enabled,
        value_fcf_margin: parseFloat(inputs.value_fcf_margin) / 100,
        value_fcf_margin_enabled: settings.value_fcf_margin_enabled,
        value_debt_equity: parseFloat(inputs.value_debt_equity),
        value_debt_equity_enabled: settings.value_debt_equity_enabled,
        shortlist_threshold: parseFloat(inputs.shortlist_threshold) / 100,
      }
      await updateSettings(payload)
      onRecalcStart()
    } finally {
      setIsApplying(false)
    }
  }

  const growthCriteria = [
    {
      key: 'growth_revenue_growth_yoy' as keyof InputState,
      enabledKey: 'growth_revenue_growth_yoy_enabled' as keyof CriteriaSettings,
      label: 'Revenue Growth YoY',
      unit: '%',
    },
    {
      key: 'growth_eps_growth_yoy' as keyof InputState,
      enabledKey: 'growth_eps_growth_yoy_enabled' as keyof CriteriaSettings,
      label: 'EPS Growth YoY',
      unit: '%',
    },
    {
      key: 'growth_roe' as keyof InputState,
      enabledKey: 'growth_roe_enabled' as keyof CriteriaSettings,
      label: 'ROE',
      unit: '%',
    },
    {
      key: 'growth_fcf_margin' as keyof InputState,
      enabledKey: 'growth_fcf_margin_enabled' as keyof CriteriaSettings,
      label: 'FCF Margin',
      unit: '%',
    },
  ]

  const valueCriteria = [
    {
      key: 'value_pe_ratio' as keyof InputState,
      enabledKey: 'value_pe_ratio_enabled' as keyof CriteriaSettings,
      label: 'P/E Ratio',
      unit: 'x',
    },
    {
      key: 'value_pb_ratio' as keyof InputState,
      enabledKey: 'value_pb_ratio_enabled' as keyof CriteriaSettings,
      label: 'P/B Ratio',
      unit: 'x',
    },
    {
      key: 'value_fcf_margin' as keyof InputState,
      enabledKey: 'value_fcf_margin_enabled' as keyof CriteriaSettings,
      label: 'FCF Margin',
      unit: '%',
    },
    {
      key: 'value_debt_equity' as keyof InputState,
      enabledKey: 'value_debt_equity_enabled' as keyof CriteriaSettings,
      label: 'Debt/Equity',
      unit: 'x',
    },
  ]

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button className="inline-flex items-center gap-2 border border-zinc-700 text-white bg-transparent hover:bg-zinc-800 rounded-lg px-3 py-2 text-sm font-medium transition-colors" />
        }
      >
        <SlidersHorizontal className="h-4 w-4" />
        Screening Criteria
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[380px] bg-zinc-800 border-zinc-700 flex flex-col p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-xl font-semibold text-white">
            Screening Criteria
          </SheetTitle>
          <SheetDescription className="text-sm text-zinc-400">
            Thresholds apply to trailing twelve months (TTM). Missing data counts as failed.
          </SheetDescription>
        </SheetHeader>

        <div className="overflow-y-auto px-6 flex-1 flex flex-col gap-12 pb-4">
          {/* Growth section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-zinc-400">GROWTH</span>
              <Switch
                checked={settings.growth_enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, growth_enabled: checked }))
                }
                aria-label="Toggle Growth preset"
              />
            </div>
            <div
              className={`flex flex-col gap-4 transition-opacity duration-150 ${
                settings.growth_enabled ? '' : 'opacity-40 pointer-events-none'
              }`}
            >
              {growthCriteria.map(({ key, enabledKey, label, unit }) => (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white flex-1">{label}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={inputs[key]}
                        onChange={(e) => updateInput(key, e.target.value)}
                        aria-label={`${label} threshold`}
                        className={`w-16 bg-zinc-900 border rounded px-2 py-1 text-sm text-white ${
                          errors[key] ? 'border-red-600' : 'border-zinc-600'
                        }`}
                      />
                      <span className="text-xs text-zinc-400">{unit}</span>
                    </div>
                    <Switch
                      checked={settings[enabledKey] as boolean}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, [enabledKey]: checked }))
                      }
                      aria-label={`Toggle ${label} criterion`}
                    />
                  </div>
                  {errors[key] && (
                    <p className="text-xs text-red-500">{errors[key]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Value section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-zinc-400">VALUE</span>
              <Switch
                checked={settings.value_enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, value_enabled: checked }))
                }
                aria-label="Toggle Value preset"
              />
            </div>
            <div
              className={`flex flex-col gap-4 transition-opacity duration-150 ${
                settings.value_enabled ? '' : 'opacity-40 pointer-events-none'
              }`}
            >
              {valueCriteria.map(({ key, enabledKey, label, unit }) => (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white flex-1">{label}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={inputs[key]}
                        onChange={(e) => updateInput(key, e.target.value)}
                        aria-label={`${label} threshold`}
                        className={`w-16 bg-zinc-900 border rounded px-2 py-1 text-sm text-white ${
                          errors[key] ? 'border-red-600' : 'border-zinc-600'
                        }`}
                      />
                      <span className="text-xs text-zinc-400">{unit}</span>
                    </div>
                    <Switch
                      checked={settings[enabledKey] as boolean}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, [enabledKey]: checked }))
                      }
                      aria-label={`Toggle ${label} criterion`}
                    />
                  </div>
                  {errors[key] && (
                    <p className="text-xs text-red-500">{errors[key]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Shortlist threshold */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-400">Shortlist Threshold</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  value={inputs.shortlist_threshold}
                  onChange={(e) => updateInput('shortlist_threshold', e.target.value)}
                  aria-label="Shortlist threshold percentage"
                  className={`w-16 bg-zinc-900 border rounded px-2 py-1 text-sm text-white ${
                    errors.shortlist_threshold ? 'border-red-600' : 'border-zinc-600'
                  }`}
                />
                <span className="text-xs text-zinc-400">%</span>
              </div>
            </div>
            {errors.shortlist_threshold && (
              <p className="text-xs text-red-500">{errors.shortlist_threshold}</p>
            )}
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t border-zinc-700 flex flex-col gap-2">
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-sm rounded-lg px-4 py-2 transition-colors flex items-center justify-center"
          >
            {isApplying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              'Apply Changes'
            )}
          </button>
          <p className="text-xs text-zinc-500 text-center">
            Shortlist recalculates in the background.
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
