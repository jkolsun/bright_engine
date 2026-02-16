'use client'

import { useEffect } from 'react'

export default function PreviewTracker({ previewId }: { previewId: string }) {
  useEffect(() => {
    let startTime = Date.now()
    let maxScrollDepth = 0

    // Track page view
    fetch('/api/preview/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        previewId,
        event: 'page_view',
      })
    })

    // Track scroll depth
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
      if (docHeight <= 0) return
      const depth = Math.min(100, Math.round((scrollTop / docHeight) * 100))
      if (depth > maxScrollDepth) maxScrollDepth = depth
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // Track time on page and scroll depth when leaving
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

      if (maxScrollDepth > 0) {
        navigator.sendBeacon(
          '/api/preview/track',
          JSON.stringify({
            previewId,
            event: 'scroll_depth',
            metadata: { depth: maxScrollDepth },
          })
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [previewId])

  return null
}
