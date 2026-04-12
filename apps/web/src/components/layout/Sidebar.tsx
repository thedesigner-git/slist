import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const NAV = [
  { to: '/',           label: 'Shortlist' },
  { to: '/watchlist',  label: 'Watchlist' },
  { to: '/impressum',  label: 'Impressum' },
]

function SidebarContent({ onDismiss }: { onDismiss?: () => void }) {

  return (
    <div className="flex flex-col h-full w-[200px]"
         style={{ background: 'var(--bg-sidebar)' }}>

      {/* Logo row */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0">
        <div className="flex items-center gap-2.5">
          {/* App icon */}
          <div className="w-7 h-7 flex items-center justify-center shrink-0">
            <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
              <rect x="0" y="0" width="24" height="4" rx="2" fill="#FCD34D"/>
              <rect x="3" y="7" width="18" height="4" rx="2" fill="#F59E0B"/>
              <rect x="7" y="14" width="10" height="4" rx="2" fill="#D97706"/>
            </svg>
          </div>
          <div>
            <div className="text-[13px] leading-none tracking-widest uppercase"
                 style={{ color: 'var(--text-on-dark)', fontWeight: 300 }}>
              SLIST
            </div>
          </div>
        </div>
        {/* Dismiss (mobile: close drawer; desktop: collapse) */}
        {onDismiss && (
          <button onClick={onDismiss} className="p-1"
                  style={{ color: 'var(--text-on-dark-muted)' }}>
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 pt-4 flex-1">
        {NAV.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }: { isActive: boolean }) => (
              <div className="relative h-11 flex items-center px-3 text-[14px] font-medium transition-colors duration-150 cursor-pointer"
                   style={{ color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.45)' }}>
                {isActive && (
                  <span className="absolute left-0 top-0 w-[4px] h-full"
                        style={{ background: 'var(--accent)' }} />
                )}
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Swipe from left edge → open mobile drawer only (no hamburger button)
  useEffect(() => {
    let startX = 0
    let startY = 0

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX
      const dy = Math.abs(e.changedTouches[0].clientY - startY)
      // Must start within 30px of left edge, move right 60+px, mostly horizontal — mobile only
      if (startX < 30 && dx > 60 && dy < 100 && window.innerWidth < 1024) setOpen(true)
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return (
    <>
      {/* Mobile drawer — always mounted so CSS transition works on close */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
        <div className={`absolute left-0 top-0 h-full transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent onDismiss={() => setOpen(false)} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex h-screen sticky top-0 shrink-0 transition-all duration-300 overflow-hidden ${desktopCollapsed ? 'w-0' : 'w-[200px]'}`}>
        <SidebarContent onDismiss={() => setDesktopCollapsed(true)} />
      </aside>

      {/* Desktop re-open tab — only when collapsed and at top of page */}
      {desktopCollapsed && !scrolled && (
        <button
          onClick={() => setDesktopCollapsed(false)}
          className="hidden lg:flex fixed left-0 z-40 items-center justify-center w-4 h-7 rounded-r opacity-40 hover:opacity-80 transition-opacity"
          style={{ background: '#e5e7eb', top: '28px' }}
          aria-label="Open sidebar">
          <ChevronRight size={10} style={{ color: '#9ca3af' }} />
        </button>
      )}
    </>
  )
}
