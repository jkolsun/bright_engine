'use client'

import { useEffect } from 'react'

export default function PreviewTracker({ previewId }: { previewId: string }) {
  useEffect(() => {
    let startTime = Date.now()

    // Track page view
    fetch('/api/preview/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        previewId,
        event: 'page_view',
      })
    })

    // Track time on page when leaving
    const handleBeforeUnload = () => {
      const timeOnPage = Math.floor((Date.now() - startTime) / 1000)
      
      if (timeOnPage > 5) {
        navigator.sendBeacon(
          '/api/preview/track',
          JSON.stringify({
            previewId,
            event: 'time_on_page',
            duration: timeOnPage,
          })
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [previewId])

  return null
}
