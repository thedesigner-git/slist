import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Toggle } from '@/components/ui/Toggle'

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest mb-3 mt-8 first:mt-0"
         style={{ color: 'var(--text-muted)' }}>
      {label}
    </div>
  )
}

function SettingsRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b last:border-0"
         style={{ borderColor: 'var(--border-light)' }}>
      <div className="flex-1 min-w-0 mr-6">
        <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {description && (
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function ValueText({ value }: { value: string }) {
  return <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{value}</span>
}

function SelectField({ value, options, onChange }: {
  value: string; options: string[]; onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-8 px-3 rounded-[2px] border text-[12px] font-medium cursor-pointer appearance-none bg-white pr-7"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function OutlineBtn({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <button className="h-8 px-3.5 rounded-lg border text-[12px] font-medium transition-colors hover:bg-gray-50"
            style={danger
              ? { borderColor: '#FECACA', color: '#EF4444' }
              : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
      {label}
    </button>
  )
}

export function SettingsPage() {
  const { user } = useAuth()

  const [notifs, setNotifs] = useState({
    emailDigest: true,
    agentAlerts: true,
    earningsAlerts: false,
    breakingNews: false,
  })
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [defaultStrategy, setDefaultStrategy] = useState('Growth')
  const [defaultMarket, setDefaultMarket] = useState('US')
  const [refreshInterval, setRefreshInterval] = useState('Every 24 hours')
  const [tableDensity, setTableDensity] = useState('Comfortable')
  const [language, setLanguage] = useState('English')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')

  return (
    <div className="px-6 py-6 sm:px-8 max-w-[720px]">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <button className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent)' }}>
          Save Changes
        </button>
      </div>

      {/* PROFILE */}
      <SectionLabel label="Profile" />
      <div className="rounded-xl border px-5" style={{ borderColor: 'var(--border)' }}>
        <SettingsRow label="Full Name" description="Account display name">
          <ValueText value={(user?.user_metadata?.full_name as string | undefined) ?? '—'} />
        </SettingsRow>
        <SettingsRow label="Email" description="For notifications and reports">
          <ValueText value={user?.email ?? '—'} />
        </SettingsRow>
        <SettingsRow label="Job Title" description="Your role at your organisation">
          <ValueText value="Fund Analyst" />
        </SettingsRow>
      </div>

      {/* SCREENING DEFAULTS */}
      <SectionLabel label="Screening Defaults" />
      <div className="rounded-xl border px-5" style={{ borderColor: 'var(--border)' }}>
        <SettingsRow label="Default Strategy" description="Which strategy filter to activate on startup">
          <SelectField value={defaultStrategy} onChange={setDefaultStrategy} options={['All', 'Growth', 'Value']} />
        </SettingsRow>
        <SettingsRow label="Default Market" description="Which market filter to show by default">
          <SelectField value={defaultMarket} onChange={setDefaultMarket} options={['All', 'US', 'EU', 'DE', 'CN']} />
        </SettingsRow>
        <SettingsRow label="Auto-refresh Data" description="Automatically refresh screening data periodically">
          <Toggle value={autoRefresh} onChange={setAutoRefresh} />
        </SettingsRow>
        <SettingsRow label="Refresh Interval" description="How often the agent re-screens companies">
          <SelectField value={refreshInterval} onChange={setRefreshInterval} options={['Every 6 hours', 'Every 12 hours', 'Every 24 hours', 'Every 48 hours']} />
        </SettingsRow>
      </div>

      {/* NOTIFICATIONS */}
      <SectionLabel label="Notifications" />
      <div className="rounded-xl border px-5" style={{ borderColor: 'var(--border)' }}>
        <SettingsRow label="Email Digest" description="Receive a weekly summary of your watchlist">
          <Toggle value={notifs.emailDigest} onChange={v => setNotifs(p => ({ ...p, emailDigest: v }))} />
        </SettingsRow>
        <SettingsRow label="Agent Run Alerts" description="Notify when the agent completes a screening run">
          <Toggle value={notifs.agentAlerts} onChange={v => setNotifs(p => ({ ...p, agentAlerts: v }))} />
        </SettingsRow>
        <SettingsRow label="Earnings Alerts" description="Get notified when a watchlisted company reports">
          <Toggle value={notifs.earningsAlerts} onChange={v => setNotifs(p => ({ ...p, earningsAlerts: v }))} />
        </SettingsRow>
        <SettingsRow label="Breaking News" description="Alerts for major news on watchlisted companies">
          <Toggle value={notifs.breakingNews} onChange={v => setNotifs(p => ({ ...p, breakingNews: v }))} />
        </SettingsRow>
      </div>

      {/* SECURITY */}
      <SectionLabel label="Security" />
      <div className="rounded-xl border px-5" style={{ borderColor: 'var(--border)' }}>
        <SettingsRow label="Password" description="Last changed 3 months ago">
          <OutlineBtn label="Change password" />
        </SettingsRow>
        <SettingsRow label="Two-Factor Authentication" description="Add an extra layer of security">
          <OutlineBtn label="Enable 2FA" />
        </SettingsRow>
        <SettingsRow label="Active Sessions" description="Devices currently signed in">
          <ValueText value="1 session" />
        </SettingsRow>
      </div>

      {/* APPEARANCE */}
      <SectionLabel label="Appearance" />
      <div className="rounded-xl border px-5" style={{ borderColor: 'var(--border)' }}>
        <SettingsRow label="Table Density" description="Controls the spacing between rows in the shortlist">
          <SelectField value={tableDensity} onChange={setTableDensity} options={['Compact', 'Comfortable', 'Spacious']} />
        </SettingsRow>
        <SettingsRow label="Language" description="Interface language">
          <SelectField value={language} onChange={setLanguage} options={['English', 'Français', 'Deutsch']} />
        </SettingsRow>
        <SettingsRow label="Date Format" description="How dates are displayed throughout the app">
          <SelectField value={dateFormat} onChange={setDateFormat} options={['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']} />
        </SettingsRow>
      </div>

      {/* DATA & EXPORT */}
      <SectionLabel label="Data & Export" />
      <div className="rounded-xl border px-5" style={{ borderColor: 'var(--border)' }}>
        <SettingsRow label="Export Shortlist" description="Download your shortlist as a CSV file">
          <OutlineBtn label="Export CSV" />
        </SettingsRow>
        <SettingsRow label="Data Sources" description="Connected market data providers">
          <ValueText value="2 sources active" />
        </SettingsRow>
        <SettingsRow label="API Access" description="Generate API keys for programmatic access">
          <OutlineBtn label="Manage Keys" />
        </SettingsRow>
      </div>

      {/* DANGER ZONE */}
      <SectionLabel label="Danger Zone" />
      <div className="rounded-xl border px-5" style={{ borderColor: '#FECACA' }}>
        <SettingsRow label="Clear All Notes" description="Permanently delete all research notes across all companies">
          <OutlineBtn label="Clear notes" danger />
        </SettingsRow>
        <SettingsRow label="Reset Screening Criteria" description="Restore all criteria to factory defaults">
          <OutlineBtn label="Reset all" danger />
        </SettingsRow>
        <SettingsRow label="Delete Account" description="Permanently delete your account and all associated data">
          <OutlineBtn label="Delete account" danger />
        </SettingsRow>
      </div>

      <div className="h-12" />
    </div>
  )
}
