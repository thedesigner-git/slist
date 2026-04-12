import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Sidebar }   from '@/components/layout/Sidebar'
import { CookieBanner }      from '@/components/CookieBanner'
import { ShortlistPage }     from '@/pages/ShortlistPage'
import { WatchlistPage }     from '@/pages/WatchlistPage'
import { CompanyDetailPage } from '@/pages/CompanyDetailPage'
import { ImpressumPage }     from '@/pages/ImpressumPage'
import { trackPageView }     from '@/lib/analytics'

function RouteTracker() {
  const location = useLocation()
  useEffect(() => { trackPageView(location.pathname) }, [location.pathname])
  return null
}

function AppLayout() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteTracker />
      <CookieBanner />
      <Routes>
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route element={<AppLayout />}>
          <Route path="/"                element={<ShortlistPage />} />
          <Route path="/watchlist"       element={<WatchlistPage />} />
          <Route path="/company/:ticker" element={<CompanyDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
