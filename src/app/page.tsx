'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Root page — resolves the same role/vendor-aware landing page the login
 * form redirects to (see /api/auth/landing), instead of a hardcoded
 * '/admin'. Middleware handles auth: unauthenticated users are sent to
 * /login first, so by the time this runs the user is already
 * authenticated via cookie -- this just covers the case where they never
 * actually submitted the login form this session (bookmark, new tab,
 * reopening the app), which the hardcoded redirect got permanently wrong
 * for any vendor-team member (Engineer/CCO/etc.) the moment the login
 * form's own redirect logic learned about vendor access and this page
 * didn't.
 */
export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/landing')
      .then((r) => r.json())
      .then((d) => {
        const path = d.success && d.landingPath ? d.landingPath : '/admin'
        // landingPath can be an external URL (shopnative.in) -- router.replace
        // only handles internal paths, so an external target needs a real
        // navigation instead.
        if (path.startsWith('http')) window.location.href = path
        else router.replace(path)
      })
      .catch(() => router.replace('/admin'))
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    </div>
  )
}
