'use client'
import { useDialer } from './DialerProvider'
import { Phone, SkipForward } from 'lucide-react'

export function AutoDialBanner() {
  const { autoDialBanner, autoDialState, handleSwapToNewCall } = useDialer()

  if (!autoDialBanner) return null

  // Dialing mode — subtle, non-intrusive
  if (autoDialBanner.type === 'dialing') {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2">
        <Phone className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
        <span className="text-xs text-blue-700 font-medium">
          Dialing next: {autoDialBanner.leadName}...
        </span>
      </div>
    )
  }

  // Chaining mode — brief skip indicator
  if (autoDialBanner.type === 'chaining') {
    return (
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
        <SkipForward className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs text-gray-600 font-medium">
          Skipped {autoDialBanner.leadName} (no answer) — dialing next...
        </span>
      </div>
    )
  }

  // Connected mode — prominent, clickable
  if (autoDialBanner.type === 'connected') {
    const isUrgent = autoDialState === 'CONNECTED_PENDING_SWAP'
    return (
      <button
        onClick={handleSwapToNewCall}
        className={`w-full border-b px-4 py-2.5 flex items-center gap-2 transition-colors ${
          isUrgent
            ? 'bg-green-100 border-green-300 animate-pulse'
            : 'bg-green-50 border-green-200'
        } hover:bg-green-200`}
      >
        <Phone className="w-4 h-4 text-green-600" />
        <span className="text-sm text-green-800 font-semibold">
          CONNECTED: {autoDialBanner.leadName}
        </span>
        <span className="text-xs text-green-600 ml-auto">
          Click to switch over
        </span>
      </button>
    )
  }

  return null
}
