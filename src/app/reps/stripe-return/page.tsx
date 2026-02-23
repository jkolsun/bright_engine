'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

function StripeReturnContent() {
  const params = useSearchParams()
  const router = useRouter()
  const refresh = params.get('refresh')
  const [checking, setChecking] = useState(false)
  const [connected, setConnected] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // NEW-L18: Poll /api/auth/me every 5s to detect Stripe connect status change
  useEffect(() => {
    if (refresh) return // Don't poll on refresh/expired page

    const checkStatus = async () => {
      try {
        setChecking(true)
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.stripeConnectStatus === 'active' || data.stripeAccountId) {
            setConnected(true)
            if (pollRef.current) clearInterval(pollRef.current)
            // Auto-redirect after a brief delay
            setTimeout(() => router.push('/reps'), 2000)
          }
        }
      } catch {
        // Ignore — keep polling
      } finally {
        setChecking(false)
      }
    }

    checkStatus()
    pollRef.current = setInterval(checkStatus, 5000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [refresh, router])

  if (refresh) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">&#x23F3;</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Stripe session expired</h1>
          <p className="text-gray-600">Go back to the setup wizard and click &quot;Connect with Stripe&quot; again.</p>
          <Link href="/reps" className="inline-block mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
            Return to Setup
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Stripe Connected!</h1>
        {connected ? (
          <p className="text-green-600 font-medium">Connection verified — redirecting to dashboard...</p>
        ) : (
          <>
            <p className="text-gray-600">You can close this tab and go back to your setup wizard.</p>
            <p className="text-sm text-gray-400 mt-4 flex items-center justify-center gap-2">
              {checking && (
                <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Verifying connection...
            </p>
          </>
        )}
        <Link href="/reps" className="inline-block mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}

export default function StripeReturnPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading...</p></div>}>
      <StripeReturnContent />
    </Suspense>
  )
}
