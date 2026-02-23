'use client'
import { useDialer } from './DialerProvider'
import { Phone, SkipForward } from 'lucide-react'

export function AutoDialBanner() {
  const { autoDialBanner, bannerUrgent, handleSwapToNewCall } = useDialer()

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

  // Connected mode — prominent, clickable. Escalates after grace period.
  if (autoDialBanner.type === 'connected') {
    return (
      <button
        onClick={handleSwapToNewCall}
        className={`w-full border-b px-4 py-2.5 flex items-center gap-2 transition-colors ${
          bannerUrgent
            ? 'bg-amber-100 border-amber-400 animate-pulse'
            : 'bg-green-50 border-green-200'
        } hover:bg-green-200`}
      >
        <Phone className={`w-4 h-4 ${bannerUrgent ? 'text-amber-600' : 'text-green-600'}`} />
        <span className={`text-sm font-semibold ${bannerUrgent ? 'text-amber-900' : 'text-green-800'}`}>
          {bannerUrgent ? 'WAITING: ' : 'CONNECTED: '}{autoDialBanner.leadName}
        </span>
        <span className={`text-xs ml-auto ${bannerUrgent ? 'text-amber-700 font-semibold' : 'text-green-600'}`}>
          {bannerUrgent ? 'Switch now — caller waiting!' : 'Click to switch over'}
        </span>
      </button>
    )
  }

  return null
}
