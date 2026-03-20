import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignInButton } from '@/components/auth/SignInButton'

export default async function LoginPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-800 p-10 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">InvestIQ</h1>
          <p className="mt-2 text-sm text-zinc-400">Investment research, simplified.</p>
        </div>
        <SignInButton />
      </div>
    </main>
  )
}
