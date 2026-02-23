'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import EditorToolbar from './EditorToolbar'
import PreviewPanel from './PreviewPanel'
import AIChatPanel from './AIChatPanel'
import ImageManager from './ImageManager'

// Dynamic import Monaco — it cannot run server-side
const MonacoEditorPanel = dynamic(() => import('./MonacoEditorPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-gray-400 text-sm">
      Loading editor...
    </div>
  ),
})

interface SiteEditorClientProps {
  leadId: string
  companyName: string
  buildStep: string
  previewId: string
}

export default function SiteEditorClient(props: SiteEditorClientProps) {
  const [html, setHtml] = useState('')
  const [originalHtml, setOriginalHtml] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving' | 'error'>('saved')
  const [showPreview, setShowPreview] = useState(true)
  const [showChat, setShowChat] = useState(true)
  const [showImages, setShowImages] = useState(false)
  const [snapshotError, setSnapshotError] = useState<string | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [siteVersion, setSiteVersion] = useState(0)

  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const htmlRef = useRef(html)
  const editHistoryRef = useRef<Array<{ instruction: string; summary: string }>>([])

  // Keep ref in sync with state for use in closures
  useEffect(() => { htmlRef.current = html }, [html])

  // Load HTML on mount (on-demand from API)
  useEffect(() => {
    loadEditorHtml()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [saveStatus])

  // Keyboard shortcut: Ctrl/Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveHtml(htmlRef.current)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadEditorHtml = async () => {
    setIsLoading(true)
    setSnapshotError(null)

    try {
      // Step 1: Try to load existing siteHtml from DB
      const loadRes = await fetch(`/api/site-editor/${props.leadId}/save`)
      if (loadRes.ok) {
        const loadData = await loadRes.json()
        if (loadData.html) {
          setHtml(loadData.html)
          setOriginalHtml(loadData.html)
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

  const generateSnapshot = async () => {
    setIsLoading(true)
    setSnapshotError(null)
    try {
      const res = await fetch(`/api/site-editor/${props.leadId}/snapshot`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.html) {
        setHtml(data.html)
        setOriginalHtml(data.html)
      } else {
        setSnapshotError(data.error || 'Failed to generate snapshot')
      }
    } catch {
      setSnapshotError('Network error generating snapshot')
    } finally {
      setIsLoading(false)
    }
  }

  const saveHtml = useCallback(async (htmlToSave: string) => {
    if (!htmlToSave || htmlToSave.length < 100) {
      console.warn('[Save] Refusing to save empty/tiny HTML')
      return
    }
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/site-editor/${props.leadId}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlToSave, expectedVersion: siteVersion }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSaveStatus('saved')
        setLastSavedAt(new Date().toLocaleTimeString())
        if (typeof data.version === 'number') setSiteVersion(data.version)
        console.log(`[Save] Confirmed: ${data.size} chars saved at ${data.savedAt} (v${data.version})`)
      } else if (res.status === 409) {
        setSaveStatus('error')
        alert('Version conflict — someone else saved while you were editing. Please reload the page to get the latest version.')
        console.error('[Save] Version conflict:', data)
      } else {
        setSaveStatus('error')
        console.error('[Save] Failed:', data.error)
        // Auto-retry once after 3 seconds
        setTimeout(() => {
          if (htmlRef.current === htmlToSave) {
            console.log('[Save] Auto-retrying...')
            setSaveStatus('saving')
            fetch(`/api/site-editor/${props.leadId}/save`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ html: htmlToSave }),
            }).then(r => r.json()).then(d => {
              if (d.success) {
                setSaveStatus('saved')
                setLastSavedAt(new Date().toLocaleTimeString())
                if (typeof d.version === 'number') setSiteVersion(d.version)
              }
            }).catch(err => console.warn('[SiteEditor] Auto-save failed:', err))
          }
        }, 3000)
      }
    } catch {
      setSaveStatus('error')
    }
  }, [props.leadId, siteVersion])

  // Debounced auto-save (3 second delay)
  const handleHtmlChange = useCallback((newHtml: string) => {
    setHtml(newHtml)
    setSaveStatus('unsaved')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveHtml(newHtml), 3000)
  }, [saveHtml])

  const handleManualSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    // Use ref to always get the latest HTML — avoids stale closure after AI edit or image swap
    saveHtml(htmlRef.current)
  }, [saveHtml])

  const handleAIEdit = useCallback(async (instruction: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/site-editor/${props.leadId}/ai-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlRef.current,
          instruction,
          previousEdits: editHistoryRef.current,
        }),
      })
      const data = await res.json()
      if (res.ok && data.html) {
        setHtml(data.html)
        setSaveStatus('unsaved')
        // Track this edit in conversation history
        editHistoryRef.current = [
          ...editHistoryRef.current,
          { instruction, summary: data.summary || 'Changes applied' },
        ].slice(-10) // Keep last 10
        // Auto-save after AI edit
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(() => saveHtml(data.html), 1500)
        return { success: true, message: data.summary || 'Changes applied' }
      }
      return { success: false, message: data.error || 'AI edit failed' }
    } catch {
      return { success: false, message: 'Network error — check your connection and try again' }
    }
  }, [props.leadId, saveHtml])

  // Image manager changes — treated like manual edits
  const handleImageChange = useCallback((newHtml: string) => {
    setHtml(newHtml)
    setSaveStatus('unsaved')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveHtml(newHtml), 1500)
  }, [saveHtml])

  const handleRegenerate = useCallback(async () => {
    if (!confirm('Regenerate from template? This will replace the current HTML with a fresh snapshot. A backup of your current version will be saved.')) return
    setIsRegenerating(true)
    try {
      // Save a backup of the current HTML before regenerating
      if (htmlRef.current && htmlRef.current.length > 100) {
        await fetch(`/api/site-editor/${props.leadId}/save-version`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: htmlRef.current, source: 'pre_regenerate' }),
        })
      }
      // Force regenerate (snapshot route handles generating fresh HTML)
      const res = await fetch(`/api/site-editor/${props.leadId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      const data = await res.json()
      if (res.ok && data.html) {
        setHtml(data.html)
        setOriginalHtml(data.html)
        setSaveStatus('unsaved')
        // Auto-save the new snapshot
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(() => saveHtml(data.html), 1000)
      } else {
        alert(data.error || 'Failed to regenerate snapshot')
      }
    } catch {
      alert('Network error regenerating snapshot')
    } finally {
      setIsRegenerating(false)
    }
  }, [props.leadId, saveHtml])

  const handleReset = useCallback(() => {
    if (confirm('Reset to original HTML? Your changes will be lost.')) {
      setHtml(originalHtml)
      setSaveStatus('unsaved')
    }
  }, [originalHtml])

  return (
    <div className="flex flex-col h-screen site-editor-root">
      <EditorToolbar
        companyName={props.companyName}
        buildStep={props.buildStep}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        onSave={handleManualSave}
        onReset={handleReset}
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
        onTogglePreview={() => setShowPreview(p => !p)}
        onToggleChat={() => setShowChat(c => !c)}
        onToggleImages={() => { setShowImages(i => !i); if (showChat) setShowChat(false) }}
        showPreview={showPreview}
        showChat={showChat}
        showImages={showImages}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Monaco Editor — always visible */}
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
            <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-red-400">
              <div className="text-center max-w-md">
                <p className="text-lg mb-2">Error Loading Editor</p>
                <p className="text-sm text-gray-500 mb-4">{snapshotError}</p>
                <button
                  onClick={generateSnapshot}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <MonacoEditorPanel value={html} onChange={handleHtmlChange} />
          )}
        </div>

        {/* Live Preview — toggleable */}
        {showPreview && (
          <div className="w-[45%] min-w-[400px] border-l border-gray-700">
            <PreviewPanel html={html} />
          </div>
        )}

        {/* Image Manager — toggleable (replaces chat when active) */}
        {showImages && (
          <div className="w-[320px] min-w-[280px] border-l border-gray-700">
            <ImageManager html={html} onHtmlChange={handleImageChange} />
          </div>
        )}

        {/* AI Chat — toggleable */}
        {showChat && !showImages && (
          <div className="w-[320px] min-w-[280px] border-l border-gray-700">
            <AIChatPanel onSubmit={handleAIEdit} companyName={props.companyName} />
          </div>
        )}
      </div>
    </div>
  )
}
