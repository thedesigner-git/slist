import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-zinc-900 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl font-semibold text-white">
          Welcome, {user?.email}
        </h1>
        <p className="mt-2 text-zinc-400">Dashboard coming in Phase 4.</p>
      </div>
    </main>
  )
}
