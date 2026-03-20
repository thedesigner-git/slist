'use client'

import { useState } from 'react'
import { CriteriaDrawer } from '@/components/criteria-drawer'
import { ShortlistTable } from '@/components/shortlist-table'

export default function DashboardPage() {
  const [recalculating, setRecalculating] = useState(false)

  return (
    <main className="min-h-screen bg-zinc-900 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Shortlist
          </h1>
          <CriteriaDrawer onRecalcStart={() => setRecalculating(true)} />
        </div>
        <ShortlistTable
          recalculating={recalculating}
          onRecalcDone={() => setRecalculating(false)}
        />
      </div>
    </main>
  )
}
