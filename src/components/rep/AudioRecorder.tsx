'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Play, Pause, RotateCcw, Check } from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, durationSec: number) => void
  maxDurationSec?: number  // auto-stop recording at this duration (default 30)
  minDurationSec?: number  // block if shorter than this (default 3)
}

type RecorderState = 'idle' | 'recording' | 'recorded'

// ============================================
// FORMAT DETECTION
// ============================================

function detectMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  if (MediaRecorder.isTypeSupported('audio/ogg')) return 'audio/ogg'
  return ''
}

// ============================================
// HELPERS
// ============================================

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// ============================================
// COMPONENT
// ============================================

export default function AudioRecorder({
  onRecordingComplete,
  maxDurationSec = 30,
  minDurationSec = 3,
}: AudioRecorderProps) {
  // --- State ---
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [recordedDuration, setRecordedDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [tooShort, setTooShort] = useState(false)

  // --- Refs ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const mimeTypeRef = useRef<string>('')
  const unmountedRef = useRef(false)

  // --- Cleanup on unmount ---
  useEffect(() => {
    mimeTypeRef.current = detectMimeType()
    unmountedRef.current = false

    return () => {
      unmountedRef.current = true
      cleanupAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cleanupAll = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Cancel animation frame
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }

    // Stop media recorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null

    // Stop all tracks on stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      try { audioContextRef.current.close() } catch { /* ignore */ }
      audioContextRef.current = null
    }
    analyserRef.current = null

    // Revoke blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  // --- Waveform drawing ---
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (unmountedRef.current) return
      animFrameRef.current = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = '#f3f4f6' // gray-100
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barCount = 48
      const barWidth = (canvas.width / barCount) * 0.7
      const gap = (canvas.width / barCount) * 0.3
      const step = Math.floor(bufferLength / barCount)

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] ?? 0
        const barHeight = Math.max(2, (value / 255) * canvas.height * 0.85)
        const x = i * (barWidth + gap)
        const y = (canvas.height - barHeight) / 2

        // Alternate between two teal shades
        ctx.fillStyle = i % 2 === 0 ? '#0d9488' : '#14b8a6'
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 1)
        ctx.fill()
      }
    }

    draw()
  }, [])

  // --- Start recording ---
  const startRecording = useCallback(async () => {
    setError(null)
    setTooShort(false)

    // Feature detection
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support audio recording. Please use a modern browser.')
      return
    }

    if (typeof MediaRecorder === 'undefined') {
      setError('MediaRecorder is not available in this browser.')
      return
    }

    // Revoke previous blob URL if any
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (unmountedRef.current) {
        stream.getTracks().forEach(t => t.stop())
        return
      }

      streamRef.current = stream

      // Set up MediaRecorder
      const mimeType = mimeTypeRef.current
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        if (unmountedRef.current) return

        const finalMime = mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: finalMime })
        blobRef.current = blob
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)

        // Calculate duration from elapsed timer
        const duration = (Date.now() - startTimeRef.current) / 1000
        setRecordedDuration(duration)

        // Check minimum duration
        if (duration < minDurationSec) {
          setTooShort(true)
        }

        setState('recorded')

        // Cleanup recording resources
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        if (audioContextRef.current) {
          try { audioContextRef.current.close() } catch { /* ignore */ }
          audioContextRef.current = null
        }
        analyserRef.current = null
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current)
          animFrameRef.current = null
        }
      }

      // Set up AudioContext for waveform
      const audioCtx = new AudioContext()
      audioContextRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Start recording
      recorder.start()
      startTimeRef.current = Date.now()
      setElapsed(0)
      setState('recording')

      // Start timer
      timerRef.current = setInterval(() => {
        if (unmountedRef.current) return
        const secs = (Date.now() - startTimeRef.current) / 1000
        setElapsed(secs)

        // Auto-stop at max duration
        if (secs >= maxDurationSec) {
          stopRecording()
        }
      }, 100)

      // Start drawing waveform
      drawWaveform()
    } catch (err: unknown) {
      if (unmountedRef.current) return
      const message = err instanceof Error ? err.message : 'Could not access microphone.'
      if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
        setError('Microphone access denied. Please allow microphone permission and try again.')
      } else {
        setError(`Microphone error: ${message}`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobUrl, maxDurationSec, minDurationSec, drawWaveform])

  // --- Stop recording ---
  const stopRecording = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Cancel animation frame
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }

    // Stop recorder (triggers onstop callback)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
    }
  }, [])

  // --- Playback controls ---
  const togglePlayback = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  // Handle audio ended
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onEnded = () => setIsPlaying(false)
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [blobUrl])

  // --- Re-record ---
  const reRecord = useCallback(() => {
    // Revoke old blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
    }
    blobRef.current = null
    setRecordedDuration(0)
    setElapsed(0)
    setIsPlaying(false)
    setTooShort(false)
    setError(null)
    setState('idle')
  }, [blobUrl])

  // --- Confirm recording ---
  const confirmRecording = useCallback(() => {
    if (!blobRef.current || tooShort) return
    onRecordingComplete(blobRef.current, recordedDuration)
  }, [onRecordingComplete, recordedDuration, tooShort])

  // --- Render ---
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Error message */}
      {error && (
        <div className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ---- IDLE STATE ---- */}
      {state === 'idle' && !error && (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700"
        >
          <Mic className="h-4 w-4" />
          Start Recording
        </button>
      )}

      {/* ---- RECORDING STATE ---- */}
      {state === 'recording' && (
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Recording indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-medium text-red-600">Recording</span>
          </div>

          {/* Waveform canvas */}
          <canvas
            ref={canvasRef}
            width={300}
            height={60}
            className="rounded-lg bg-gray-100"
          />

          {/* Timer */}
          <div className="font-mono text-lg text-gray-700">
            {formatTime(elapsed)}
            <span className="text-xs text-gray-400 ml-2">/ {formatTime(maxDurationSec)}</span>
          </div>

          {/* Stop button */}
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            <Square className="h-4 w-4" />
            Stop Recording
          </button>
        </div>
      )}

      {/* ---- RECORDED STATE ---- */}
      {state === 'recorded' && blobUrl && (
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Hidden audio element for playback */}
          <audio ref={audioRef} src={blobUrl} preload="metadata" />

          {/* Playback controls */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-white transition-colors hover:bg-teal-700"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </button>
            <span className="font-mono text-sm text-gray-600">
              {formatTime(recordedDuration)}
            </span>
          </div>

          {/* Too short warning */}
          {tooShort && (
            <p className="text-sm text-red-600 font-medium">
              Recording too short. Please record at least {minDurationSec} seconds.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={reRecord}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              Re-record
            </button>
            <button
              type="button"
              onClick={confirmRecording}
              disabled={tooShort}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              Use This Recording
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
