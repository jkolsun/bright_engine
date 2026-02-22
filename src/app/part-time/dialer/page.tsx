'use client'

import { Suspense, Component, ReactNode } from 'react'
import DialerLayout from '@/components/dialer/DialerLayout'

class DialerErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[Dialer] Caught error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Dialer Error</h2>
            <p className="text-gray-500 text-sm mb-6">Something went wrong loading the dialer.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-6 py-2.5 gradient-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 shadow-teal"
              >
                Try Again
              </button>
              <a href="/part-time" className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50">
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function PartTimeDialerPage() {
  return (
    <DialerErrorBoundary>
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading dialer...</div>}>
        <DialerLayout />
      </Suspense>
    </DialerErrorBoundary>
  )
}
