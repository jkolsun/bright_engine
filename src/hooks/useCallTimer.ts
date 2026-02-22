'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

export function useCallTimer() {
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const start = useCallback(() => {
    setSeconds(0)
    setIsRunning(true)
  }, [])

  const stop = useCallback(() => {
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const reset = useCallback(() => {
    setSeconds(0)
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning])

  const formatted = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

  return { seconds, formatted, isRunning, start, stop, reset }
}
