'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  X, Save, RotateCcw, Monitor, Smartphone, Tablet,
  Loader2, Check, AlertCircle,
  Sparkles, Send, Bot, Eye, EyeOff, MessageSquare, Code,
} from 'lucide-react'

// Dynamic import Monaco — it cannot run server-side
const MonacoEditor = dynamic(() => import('./MonacoEditorPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-gray-400 text-sm">
      Loading editor...
    </div>
  ),
})

// ─── Types ──────────────────────────────────────────────
interface SiteEditorPanelProps {
  leadId: string
  companyName: string
  buildStep: string
  previewId: string | null
  siteHtml: string | null
  onClose: () => void
  onRefresh: () => void
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile'
type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error'

const deviceWidths: Record<DeviceMode, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

const SUGGESTED_EDITS = [
  'Make the hero section full-width',
  'Move testimonials above services',
  'Change the color scheme to blue',
  'Add more spacing between sections',
  'Make the CTA buttons larger',
  'Remove the FAQ section',
]

// ─── Component ──────────────────────────────────────────
export default function SiteEditorPanel({
  leadId, companyName, buildStep, previewId, siteHtml, onClose, onRefresh,
}: SiteEditorPanelProps) {
  // HTML state
  const [html, setHtml] = useState(siteHtml || '')
  const [originalHtml, setOriginalHtml] = useState(siteHtml || '')
  const [isLoading, setIsLoading] = useState(!siteHtml)
  const [snapshotError, setSnapshotError] = useState<string | null>(null)

  // Save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  // Panel visibility
  const [showEditor, setShowEditor] = useState(true)
  const [showPreview, setShowPreview] = useState(true)
  const [showChat, setShowChat] = useState(true)

  // Preview state
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [refreshKey, setRefreshKey] = useState(0)
  const [debouncedHtml, setDebouncedHtml] = useState(siteHtml || '')

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Generate snapshot on first open if no siteHtml
  useEffect(() => {
    if (!siteHtml) {
      generateSnapshot()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounce preview updates
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHtml(html), 300)
    return () => clearTimeout(timer)
  }, [html])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Lock body scroll while panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Escape key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const [needsRebuild, setNeedsRebuild] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)

  // ─── Snapshot ─────────────────────────────────────────
  const generateSnapshot = async () => {
    setIsLoading(true)
    setSnapshotError(null)
    setNeedsRebuild(false)
    try {
      const res = await fetch(`/api/site-editor/${leadId}/snapshot`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.html) {
        setHtml(data.html)
        setOriginalHtml(data.html)
        setDebouncedHtml(data.html)
      } else {
        setSnapshotError(data.error || 'Failed to generate snapshot')
        if (data.needsRebuild) setNeedsRebuild(true)
      }
    } catch {
      setSnapshotError('Network error generating snapshot')
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Rebuild Pipeline ──────────────────────────────────
  const triggerRebuild = async () => {
    setRebuilding(true)
    try {
      const res = await fetch(`/api/build-queue/${leadId}/rebuild`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSnapshotError(`Rebuild started: ${data.message || 'Pipeline running...'}. Close and re-open the editor in ~30 seconds.`)
        setNeedsRebuild(false)
      } else {
        setSnapshotError(data.error || 'Rebuild failed')
      }
    } catch {
      setSnapshotError('Network error triggering rebuild')
    } finally {
      setRebuilding(false)
    }
  }

  // ─── Save ─────────────────────────────────────────────
  const saveHtml = useCallback(async (htmlToSave: string) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/site-editor/${leadId}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlToSave }),
      })
      setSaveStatus(res.ok ? 'saved' : 'error')
      if (res.ok) onRefresh()
    } catch {
      setSaveStatus('error')
    }
  }, [leadId, onRefresh])

  // Monaco onChange — update state + debounced auto-save
  const handleHtmlChange = useCallback((newHtml: string) => {
    setHtml(newHtml)
    setSaveStatus('unsaved')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveHtml(newHtml), 3000)
  }, [saveHtml])

  const handleManualSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveHtml(html)
  }, [html, saveHtml])

  const handleReset = useCallback(() => {
    if (confirm('Reset to original HTML? Your changes will be lost.')) {
      setHtml(originalHtml)
      setDebouncedHtml(originalHtml)
      setSaveStatus('unsaved')
    }
  }, [originalHtml])

  // ─── AI Chat ──────────────────────────────────────────
  const handleChatSubmit = async (text?: string) => {
    const instruction = text || chatInput.trim()
    if (!instruction || isProcessing) return

    setChatInput('')
    setMessages(prev => [...prev, { role: 'user', content: instruction }])
    setIsProcessing(true)

    try {
      const res = await fetch(`/api/site-editor/${leadId}/ai-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, instruction }),
      })
      const data = await res.json()
      if (res.ok && data.html) {
        setHtml(data.html)
        setSaveStatus('unsaved')
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(() => saveHtml(data.html), 1500)
        setMessages(prev => [...prev, { role: 'assistant', content: `Done. ${data.summary || 'Changes applied'}` }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error || 'AI edit failed'}` }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Network error' }])
    } finally {
      setIsProcessing(false)
    }
  }

  // ─── Status UI ────────────────────────────────────────
  const statusUI: Record<SaveStatus, { icon: React.ReactNode; text: string; cls: string }> = {
    saved: { icon: <Check size={12} />, text: 'Saved', cls: 'text-green-400' },
    unsaved: { icon: <AlertCircle size={12} />, text: 'Unsaved', cls: 'text-amber-400' },
    saving: { icon: <Loader2 size={12} className="animate-spin" />, text: 'Saving...', cls: 'text-blue-400' },
    error: { icon: <AlertCircle size={12} />, text: 'Save failed', cls: 'text-red-400' },
  }
  const status = statusUI[saveStatus]

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-[#1e1e1e] flex flex-col">
      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#333333] border-b border-gray-700 flex-shrink-0">
        {/* Left: Close + Company */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
            title="Close Editor (Esc)"
          >
            <X size={18} />
          </button>
          <div className="h-5 w-px bg-gray-600" />
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight">{companyName}</h1>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              {buildStep.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Center: Save status */}
        <div className={`flex items-center gap-1.5 text-xs ${status.cls}`}>
          {status.icon}
          <span>{status.text}</span>
        </div>

        {/* Right: Panel toggles + Device modes + Save */}
        <div className="flex items-center gap-2">
          {/* Panel toggles */}
          <button
            onClick={() => setShowEditor(e => !e)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded transition-colors ${
              showEditor ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-600'
            }`}
            title="Toggle Code Editor"
          >
            <Code size={14} />
            Code
          </button>
          <button
            onClick={() => setShowPreview(p => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded transition-colors ${
              showPreview ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-600'
            }`}
            title="Toggle Preview"
          >
            {showPreview ? <Eye size={14} /> : <EyeOff size={14} />}
            Preview
          </button>
          <button
            onClick={() => setShowChat(c => !c)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded transition-colors ${
              showChat ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-600'
            }`}
            title="Toggle AI Chat"
          >
            <MessageSquare size={14} />
            AI
          </button>

          <div className="h-5 w-px bg-gray-600 mx-1" />

          {/* Device mode (only shown when preview is on) */}
          {showPreview && ([
            { mode: 'desktop' as DeviceMode, icon: Monitor, label: 'Desktop' },
            { mode: 'tablet' as DeviceMode, icon: Tablet, label: 'Tablet' },
            { mode: 'mobile' as DeviceMode, icon: Smartphone, label: 'Mobile' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setDeviceMode(mode)}
              className={`p-1.5 rounded transition-colors ${
                deviceMode === mode ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title={label}
            >
              <Icon size={14} />
            </button>
          ))}

          {showPreview && <div className="h-5 w-px bg-gray-600 mx-1" />}

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
            title="Reset to Original"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            onClick={handleManualSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Monaco Editor ──────────────────────────── */}
        {showEditor && (
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-gray-400">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-3" />
                  <p>Generating HTML snapshot...</p>
                  <p className="text-sm text-gray-500 mt-1">Rendering template to editable HTML</p>
                </div>
              </div>
            ) : snapshotError ? (
              <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-amber-400">
                <div className="text-center max-w-md">
                  <p className="text-lg mb-2">{needsRebuild ? 'Site Not Ready' : 'Snapshot Error'}</p>
                  <p className="text-sm text-gray-400 mb-4">{snapshotError}</p>
                  <div className="flex items-center justify-center gap-3">
                    {needsRebuild && (
                      <button
                        onClick={triggerRebuild}
                        disabled={rebuilding}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50 transition-colors"
                      >
                        {rebuilding ? 'Starting...' : 'Rebuild Site'}
                      </button>
                    )}
                    <button
                      onClick={generateSnapshot}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <MonacoEditor value={html} onChange={handleHtmlChange} />
            )}
          </div>
        )}

        {/* ── Live Preview ───────────────────────────── */}
        {showPreview && (
          <div className={`${showEditor ? 'w-[45%] min-w-[400px]' : 'flex-1'} border-l border-gray-700 flex items-start justify-center overflow-auto bg-gray-800 p-2`}>
            {isLoading ? (
              <div className="flex items-center justify-center w-full h-full text-gray-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : (
              <iframe
                key={refreshKey}
                srcDoc={debouncedHtml}
                className="bg-white shadow-2xl transition-all duration-200"
                style={{
                  width: deviceWidths[deviceMode],
                  maxWidth: '100%',
                  height: '100%',
                  border: 'none',
                }}
                sandbox="allow-scripts allow-same-origin"
                title="Site Preview"
              />
            )}
          </div>
        )}

        {/* ── AI Chat Panel ──────────────────────────── */}
        {showChat && (
          <div className="w-[340px] min-w-[300px] border-l border-gray-700 flex flex-col bg-[#252526]">
            {/* Chat header */}
            <div className="px-3 py-2 border-b border-gray-700 flex items-center gap-2 flex-shrink-0">
              <Sparkles size={14} className="text-blue-400" />
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">AI Editor</span>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <Bot size={28} className="text-gray-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-1">AI Site Editor</p>
                  <p className="text-xs text-gray-500 mb-4">
                    Describe changes in plain English.
                  </p>
                  <div className="space-y-2">
                    {SUGGESTED_EDITS.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleChatSubmit(suggestion)}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={12} className="text-blue-400" />
                    </div>
                  )}
                  <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <Loader2 size={12} className="text-blue-400 animate-spin" />
                  </div>
                  <div className="bg-gray-700 px-3 py-2 rounded-lg text-xs text-gray-400">
                    Editing site...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="p-3 border-t border-gray-700 flex-shrink-0">
              <div className="flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleChatSubmit()
                    }
                  }}
                  placeholder="Describe a change..."
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-500"
                  rows={2}
                  disabled={isProcessing}
                />
                <button
                  onClick={() => handleChatSubmit()}
                  disabled={!chatInput.trim() || isProcessing}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed self-end transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
