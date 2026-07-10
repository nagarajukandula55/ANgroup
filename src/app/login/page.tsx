'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Clock, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inactivityNotice, setInactivityNotice] = useState(false)

  useEffect(() => {
    if (searchParams?.get('reason') === 'inactivity') setInactivityNotice(true)
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.identifier,
          username: form.identifier,
          password: form.password,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.message || 'Login failed')
        return
      }

      // Store token in localStorage for client-side access
      localStorage.setItem('an_token', data.token)
      localStorage.setItem('an_user', JSON.stringify(data.user))

      // Was always '/admin' regardless of role -- a vendor login (User.role
      // === 'VENDOR') has no business being dropped onto the internal admin
      // shell; their actual portal (product wizard, orders, staff, payouts)
      // lives under /vendor. Every other role keeps landing on /admin.
      const landingPage = data.user?.role === 'VENDOR' ? '/vendor' : '/admin'

      // Hard redirect so the browser commits the httpOnly cookie before the next request.
      // router.push() triggers an RSC fetch that races with cookie propagation → 307 loop.
      window.location.href = landingPage
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-100/40 blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-blue-100/30 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-8 md:p-10">
          {/* Logo / Brand — this login is a shared identity provider across
              every AN Group app/device, so it brands itself as the SSO
              gateway rather than any one product's name. */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                Single Sign-On
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-gray-900 tracking-tight">Sign in</h1>
            <p className="mt-2 text-sm text-gray-500">
              One account, every AN Group app and device.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email / Username */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Email</label>
              <input
                type="text"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                placeholder="raj@angroup.com"
                required
                autoFocus
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-200 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-500">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-200 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Inactivity notice */}
            {inactivityNotice && !error && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <Clock size={15} className="flex-shrink-0" />
                You were signed out after 1 hour of inactivity. Please sign in again.
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Secured by AN Group Single Sign-On
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-violet-600 hover:text-violet-700 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
