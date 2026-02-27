'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  X, Save, RotateCcw, Monitor, Smartphone, Tablet,
  Loader2, Check, AlertCircle,
  Eye, EyeOff, Code,
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
  editInstruction?: string
  onClose: () => void
  onRefresh: () => void
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile'
type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error'

const deviceWidths: Record<DeviceMode, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

// ─── Component ──────────────────────────────────────────
export default function SiteEditorPanel({
  leadId, companyName, buildStep, previewId, editInstruction, onClose, onRefresh,
}: SiteEditorPanelProps) {
  // HTML state
  const [html, setHtml] = useState('')
  const [originalHtml, setOriginalHtml] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [snapshotError, setSnapshotError] = useState<string | null>(null)

  // Save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [siteVersion, setSiteVersion] = useState<number>(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  // Panel visibility
  const [showEditor, setShowEditor] = useState(true)
  const [showPreview, setShowPreview] = useState(true)

  // Preview state
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [refreshKey, setRefreshKey] = useState(0)
  const [debouncedHtml, setDebouncedHtml] = useState('')

  const htmlRef = useRef(html)
  const [needsRebuild, setNeedsRebuild] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [approving, setApproving] = useState(false)
  const [currentBuildStep, setCurrentBuildStep] = useState(buildStep)

  // ─── Load HTML on mount (on-demand from API) ──────────
  useEffect(() => {
    loadEditorHtml()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounce preview updates
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHtml(html), 300)
    return () => clearTimeout(timer)
  }, [html])

  // Keep htmlRef in sync
  useEffect(() => { htmlRef.current = html }, [html])

  // Lock body scroll while panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Warn before browser close if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveStatus])

  // Escape key to close (with unsaved check)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (saveStatus === 'unsaved') {
          if (!confirm('You have unsaved changes. Close anyway?')) return
        }
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose, saveStatus])

  // ─── Load HTML (fresh from DB, then snapshot if needed) ─
  const loadEditorHtml = async () => {
    setIsLoading(true)
    setSnapshotError(null)
    setNeedsRebuild(false)

    try {
      // Step 1: Try to load existing siteHtml from DB
      const loadRes = await fetch(`/api/site-editor/${leadId}/save`)
      if (loadRes.ok) {
        const loadData = await loadRes.json()
        if (loadData.html) {
          // Already have HTML — load it directly
          setHtml(loadData.html)
          setOriginalHtml(loadData.html)
          setDebouncedHtml(loadData.html)
          if (typeof loadData.version === 'number') setSiteVersion(loadData.version)
          setIsLoading(false)
          return
        }
      }

      // Step 2: No existing HTML — generate snapshot
      await generateSnapshot()
    } catch {
      setSnapshotError('Network error loading editor data')
      setIsLoading(false)
    }
  }

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
        body: JSON.stringify({ html: htmlToSave, expectedVersion: siteVersion }),
      })
      if (res.ok) {
        const data = await res.json()
        if (typeof data.version === 'number') setSiteVersion(data.version)
        setSaveStatus('saved')
        onRefresh()
      } else if (res.status === 409) {
        setSaveStatus('error')
        alert('Version conflict — someone else saved while you were editing. Please close and re-open the editor.')
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }, [leadId, onRefresh, siteVersion])

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

  // ─── Approve (advance build step without leaving editor) ─
  const canApprove = ['QA_REVIEW', 'EDITING'].includes(currentBuildStep)
  const handleApprove = useCallback(async () => {
    // Save first if needed
    if (saveStatus === 'unsaved') {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      await saveHtml(htmlRef.current)
    }
    setApproving(true)
    try {
      const res = await fetch(`/api/build-queue/${leadId}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (res.ok) {
        setCurrentBuildStep('QA_APPROVED')
        onRefresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Approve failed')
      }
    } catch {
      alert('Network error approving')
    } finally {
      setApproving(false)
    }
  }, [leadId, saveStatus, saveHtml, onRefresh])

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
    <div className="fixed inset-0 z-50 bg-[#1e1e1e] flex flex-col site-editor-root">
      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#333333] border-b border-gray-700 flex-shrink-0">
        {/* Left: Close + Company */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (saveStatus === 'unsaved') {
                // Flush pending save before closing — use ref for latest HTML
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
                saveHtml(htmlRef.current)
              }
              onClose()
            }}
            className="p-1.5 rounded hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
            title="Close Editor (Esc)"
          >
            <X size={18} />
          </button>
          <div className="h-5 w-px bg-gray-600" />
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight">{companyName}</h1>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              {currentBuildStep.replace(/_/g, ' ')}
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
          {canApprove && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
            >
              <Check size={14} />
              {approving ? 'Approving...' : 'Approve'}
            </button>
          )}
        </div>
      </div>

      {/* ── Edit Instruction Banner ───────────────────── */}
      {editInstruction && (
        <div className="px-4 py-2.5 bg-blue-600/15 border-b border-blue-500/30 flex items-center gap-2 flex-shrink-0">
          <span className="text-blue-400 text-xs font-medium uppercase tracking-wider">Client Request:</span>
          <span className="text-blue-200 text-sm">&quot;{editInstruction}&quot;</span>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Monaco Editor ──────────────────────────── */}
        {showEditor && (
          <div className="flex-1 min-w-0 h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-gray-400">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-3" />
                  <p>Loading site editor...</p>
                  <p className="text-sm text-gray-500 mt-1">Fetching HTML for editing</p>
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

      </div>
    </div>
  )
}
