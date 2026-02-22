'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { SSEEvent, LiveFeedItem } from '@/types/dialer'

export function useDialerSSE(enabled: boolean = true) {
  const [connected, setConnected] = useState(false)
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([])
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const listenersRef = useRef<Map<string, ((data: any) => void)[]>>(new Map())

  const on = useCallback((eventType: string, handler: (data: any) => void) => {
    const handlers = listenersRef.current.get(eventType) || []
    handlers.push(handler)
    listenersRef.current.set(eventType, handlers)
    return () => {
      const hs = listenersRef.current.get(eventType) || []
      listenersRef.current.set(eventType, hs.filter(h => h !== handler))
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const es = new EventSource('/api/dialer/events')
    eventSourceRef.current = es

    const eventTypes = [
      'CALL_STATUS', 'PREVIEW_SENT', 'PREVIEW_OPENED', 'CTA_CLICKED',
      'RECOMMENDATION_UPDATE', 'QUEUE_UPDATE', 'INBOUND_CALL',
      'SESSION_UPDATE', 'VM_DROP_COMPLETE', 'DISPOSITION_LOGGED',
    ]

    eventTypes.forEach(type => {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          const event: SSEEvent = { type: type as any, data, timestamp: new Date().toISOString() }
          setLastEvent(event)

          // Add to live feed for relevant types
          if (['PREVIEW_OPENED', 'CTA_CLICKED', 'PREVIEW_SENT', 'CALL_STATUS'].includes(type)) {
            setLiveFeed(prev => [{ id: `${Date.now()}`, type: type as any, data, timestamp: new Date().toISOString() }, ...prev].slice(0, 50))
          }

          // Notify listeners
          const handlers = listenersRef.current.get(type) || []
          handlers.forEach(h => h(data))
        } catch {}
      })
    })

    es.addEventListener('SESSION_UPDATE', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        if (data.connected) setConnected(true)
      } catch {}
    })

    es.onerror = () => {
      setConnected(false)
      // EventSource auto-reconnects
    }

    return () => {
      es.close()
      eventSourceRef.current = null
      setConnected(false)
    }
  }, [enabled])

  return { connected, liveFeed, lastEvent, on, setLiveFeed }
}
