'use client'

import { useEffect } from 'react'

export default function PreviewTracker({ previewId }: { previewId: string }) {
  useEffect(() => {
    const startTime = Date.now()
    let maxScrollDepth = 0

    // Fire page_view once per session (sessionStorage dedup prevents refresh double-counts)
    const sessionKey = `pv_${previewId}`
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, '1')
      fetch('/api/preview/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewId,
          event: 'page_view',
        })
      })
    }

    // Track scroll depth
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
      if (docHeight <= 0) return
      const depth = Math.min(100, Math.round((scrollTop / docHeight) * 100))
      if (depth > maxScrollDepth) maxScrollDepth = depth
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // On exit: send a single page_exit beacon with duration + scroll depth
    // This UPDATES the existing page_view event instead of creating new ones
    const handleBeforeUnload = () => {
      const timeOnPage = Math.floor((Date.now() - startTime) / 1000)

      if (timeOnPage > 3 || maxScrollDepth > 0) {
        navigator.sendBeacon(
          '/api/preview/track',
          JSON.stringify({
            previewId,
            event: 'page_exit',
            duration: timeOnPage,
            metadata: { scrollDepth: maxScrollDepth },
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
