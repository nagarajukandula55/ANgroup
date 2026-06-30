'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Root page — immediately redirect to /admin.
 * Middleware handles auth: unauthenticated users are sent to /login first.
 */
export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    </div>
  )
}
