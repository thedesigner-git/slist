import { useState, useEffect } from 'react'
import { loadGA, getConsent, setConsent } from '@/lib/analytics'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = getConsent()
    if (!consent) {
      setVisible(true)
    } else if (consent === 'accepted') {
      loadGA()
    }
  }, [])

  const handleAccept = () => {
    setConsent('accepted')
    loadGA()
    setVisible(false)
  }

  const handleDecline = () => {
    setConsent('declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white flex flex-wrap items-center gap-3 px-4 sm:px-8 py-3.5"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      {/* Text */}
      <p className="flex-1 min-w-[220px] text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        We use Google Analytics to count visits and understand how people use this site.
        No personal data is collected.{' '}
        <a
          href="/impressum"
          className="underline underline-offset-2 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
        >
          Privacy &amp; Impressum
        </a>
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleDecline}
          className="text-[12px] font-medium px-4 py-2 rounded-[2px] border hover:opacity-60 transition-opacity"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          className="text-[12px] font-medium px-4 py-2 rounded-[2px] border hover:opacity-70 transition-opacity"
          style={{ borderColor: '#000000', color: 'var(--text-secondary)' }}
        >
          Accept analytics
        </button>
      </div>
    </div>
  )
}
