import { useEffect, useState } from 'react'
import { Lock, Mail, User, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100'

const getAuthRedirectUrl = () => {
  const configuredUrl = import.meta.env.VITE_APP_URL
  if (configuredUrl) return configuredUrl.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://devman-liart.vercel.app'
}

export default function AuthGate() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!window.location.hash.includes('error=')) return

    const params = new URLSearchParams(window.location.hash.slice(1))
    const description = params.get('error_description')
    const code = params.get('error_code')
    setError(
      code === 'otp_expired'
        ? 'That confirmation link has expired. Enter your email below and resend the confirmation email.'
        : description?.replace(/\+/g, ' ') || 'The sign-in link could not be used.'
    )
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])

  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
            data: { name: name.trim() || email.trim().split('@')[0] },
          },
        })
        if (signUpError) throw signUpError
        if (!data.session) setMessage('Account created. Check your email to confirm it, then sign in.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) throw signInError
      }
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  const resendConfirmation = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then resend the confirmation link.')
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: getAuthRedirectUrl() },
      })
      if (resendError) throw resendError
      setMessage('Confirmation email sent. Use the newest email link, not the old one.')
    } catch (err) {
      setError(err.message || 'Could not resend the confirmation email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-forest-600 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="px-7 py-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-forest-600 text-white flex items-center justify-center font-bold">A</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Archispace</h1>
              <p className="text-sm text-gray-500">Development Manager</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="px-7 py-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{mode === 'signup' ? 'Create team account' : 'Sign in'}</h2>
            <p className="text-xs text-gray-500 mt-1">Internal Archispace project control workspace.</p>
          </div>

          {mode === 'signup' && (
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1.5 block">Name</span>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className={`${inputCls} pl-9`} value={name} onChange={e => setName(e.target.value)} placeholder="Tim Haldezos" />
              </div>
            </label>
          )}

          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1.5 block">Email</span>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className={`${inputCls} pl-9`} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1.5 block">Password</span>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className={`${inputCls} pl-9`} type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            </div>
          </label>

          {error && <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {message && <div className="rounded-lg border border-forest-100 bg-forest-50 px-3 py-2 text-sm text-forest-700">{message}</div>}

          <button disabled={busy || !email.trim() || password.length < 6} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50">
            {busy && <Loader2 size={15} className="animate-spin" />}
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>

          <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setMessage('') }} className="w-full text-center text-sm text-ocean-600 hover:underline">
            {mode === 'signup' ? 'Already have an account? Sign in' : 'Need access? Create a team account'}
          </button>

          <button type="button" onClick={resendConfirmation} disabled={busy} className="w-full text-center text-sm text-gray-500 hover:text-ocean-600 disabled:opacity-50">
            Resend confirmation email
          </button>
        </form>
      </div>
    </div>
  )
}
