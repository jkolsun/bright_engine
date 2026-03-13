'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

export type MessagesSSEEventType =
  | 'NEW_MESSAGE'
  | 'LEAD_UPDATE'
  | 'PREVIEW_CLICK'
  | 'HOT_LEAD'
  | 'CONNECTED'

export function useMessagesSSE(enabled: boolean = true) {
  const [connected, setConnected] = useState(false)
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

    const es = new EventSource('/api/messages-v2/sse')
    eventSourceRef.current = es

    const eventTypes: MessagesSSEEventType[] = [
      'NEW_MESSAGE', 'LEAD_UPDATE', 'PREVIEW_CLICK', 'HOT_LEAD', 'CONNECTED',
    ]

    eventTypes.forEach(type => {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)

          if (type === 'CONNECTED') {
            setConnected(true)
          }

          // Notify listeners
          const handlers = listenersRef.current.get(type) || []
          handlers.forEach(h => h(data))
        } catch { /* ignore parse errors */ }
      })
    })

    es.onerror = () => {
      setConnected(false)
      // EventSource auto-reconnects with exponential backoff
    }

    return () => {
      es.close()
      eventSourceRef.current = null
      setConnected(false)
    }
  }, [enabled])

  return { connected, on }
}
