import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type Tab = 'signin' | 'signup'

const INPUT = "w-full px-3.5 py-3 text-sm bg-[#1c1c1e] border border-[#27272a] rounded-xl text-[#e4e4e7] placeholder-[rgba(228,228,231,0.4)] focus:outline-none focus:border-[#6366f1] transition"

export function SignInPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]           = useState<Tab>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null)
    if (tab === 'signin') {
      const { error: err } = await signIn(email, password)
      if (err) { setError(err.message); setLoading(false) }
      else navigate('/')
    } else {
      if (password.length < 8) { setError('Min. 8 characters'); setLoading(false); return }
      const { error: err } = await signUp(email, password)
      if (err) { setError(err.message); setLoading(false) }
      else navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[80px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center top, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 8px 24px rgba(99,102,241,0.25)' }}>
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <div className="text-center">
            <p className="text-white text-[22px] font-bold tracking-tight">Alphascreen</p>
            <p className="text-[#52525b] text-xs mt-1">Investment Screening Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#111113] border border-[#1a1a1c] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[#1a1a1c]">
            {(['signin', 'signup'] as Tab[]).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(null) }}
                className={[
                  'flex-1 py-3.5 text-sm text-center transition-colors border-b-2',
                  tab === t
                    ? 'border-[#6366f1] text-[#e4e4e7] font-semibold'
                    : 'border-transparent text-[#52525b] hover:text-[#71717a]',
                ].join(' ')}>
                {t === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={e => void handleSubmit(e)} className="p-6 flex flex-col gap-5">
            {tab === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#71717a]">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Marie Dupont" className={INPUT} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#71717a]">Email address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@fund.io" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[#71717a]">Password</label>
                {tab === 'signin' && (
                  <button type="button" className="text-xs text-[#818cf8] hover:underline">Forgot password?</button>
                )}
              </div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? 'Min. 8 characters' : '••••••••'}
                  className={INPUT + ' pr-10'} />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#71717a]">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-[#ef4444] bg-red-950/50 border border-red-900/50 px-3 py-2 rounded-lg">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white bg-[#6366f1] hover:bg-[#4f51d8] rounded-[20px] transition-colors disabled:opacity-50">
              {loading
                ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>

            {tab === 'signup' && (
              <p className="text-[10px] text-[#3f3f46] text-center">
                By creating an account you agree to our{' '}
                <span className="text-[#818cf8]">Terms of Service</span> and{' '}
                <span className="text-[#818cf8]">Privacy Policy</span>
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-[#27272a] text-[11px] mt-6">
          Alphascreen · Investment Intelligence Platform · v2.1
        </p>
      </div>
    </div>
  )
}
