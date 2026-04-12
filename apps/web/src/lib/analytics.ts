declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

const GA_ID = import.meta.env.VITE_GA4_ID as string | undefined

export function loadGA() {
  if (!GA_ID || document.getElementById('ga-script')) return

  const script = document.createElement('script')
  script.id = 'ga-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = function (...args: unknown[]) { window.dataLayer.push(args) }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure',
  })
}

export function trackPageView(path: string) {
  if (typeof window.gtag !== 'function' || !GA_ID) return
  window.gtag('config', GA_ID, { page_path: path })
}

export function getConsent(): 'accepted' | 'declined' | null {
  return localStorage.getItem('cookie_consent') as 'accepted' | 'declined' | null
}

export function setConsent(value: 'accepted' | 'declined') {
  localStorage.setItem('cookie_consent', value)
}
