'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'

/**
 * SessionGuard — mounted once in the root layout, applies to every page.
 *
 * 1. Inactivity auto-logout: if the user does not click, type, scroll, move
 *    the mouse, or touch the screen for INACTIVITY_LIMIT_MS, the session is
 *    logged out automatically and the user is redirected to /login with a
 *    reason so the login page can explain why they landed there.
 * 2. Always-available logout: a small floating logout button rendered on
 *    every authenticated page, so a working "sign out" control exists even
 *    on pages that don't render the main Sidebar (e.g. some top-level
 *    report/detail pages that predate the shared navigation).
 *
 * Both behaviours are skipped on pre-auth / public routes (login, register,
 * the public vendor-application form, the public storefront, and public
 * token-shared invoice links) since there is no session to guard there.
 */

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000 // 1 hour

const EXCLUDED_PREFIXES = [
  '/login',
  '/register',
  '/vendor-apply',
  '/products',
  '/invoice/view',
]

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const

function isExcluded(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export default function SessionGuard() {
  const pathname = usePathname() || '/'
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const excluded = isExcluded(pathname)

  const logout = useCallback(
    async (reason?: string) => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch {
        /* proceed to redirect regardless */
      }
      try {
        localStorage.removeItem('an_token')
        localStorage.removeItem('an_user')
      } catch {
        /* ignore */
      }
      const suffix = reason ? `?reason=${reason}` : ''
      window.location.href = `/login${suffix}`
    },
    []
  )

  useEffect(() => {
    if (excluded) return

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        logout('inactivity')
      }, INACTIVITY_LIMIT_MS)
    }

    resetTimer()
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, resetTimer, { passive: true })
    )

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer))
    }
  }, [excluded, logout])

  if (excluded) return null

  return (
    <button
      onClick={() => logout()}
      title="Sign out"
      className="fixed bottom-4 right-4 z-[60] flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-md hover:bg-gray-50 hover:text-gray-900 transition-all"
    >
      <LogOut size={13} />
      Logout
    </button>
  )
}
