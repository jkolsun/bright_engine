'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function StripeReturnContent() {
  const params = useSearchParams()
  const refresh = params.get('refresh')

  if (refresh) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">&#x23F3;</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Stripe session expired</h1>
          <p className="text-gray-600">Go back to the setup wizard and click &quot;Connect with Stripe&quot; again.</p>
          <Link href="/part-time" className="inline-block mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
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
        <p className="text-gray-600">You can close this tab and go back to your setup wizard.</p>
        <p className="text-sm text-gray-400 mt-4">The wizard will automatically detect your connection.</p>
        <Link href="/part-time" className="inline-block mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
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
