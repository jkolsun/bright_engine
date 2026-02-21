'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import EditorToolbar from './EditorToolbar'
import PreviewPanel from './PreviewPanel'
import AIChatPanel from './AIChatPanel'

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
  const [snapshotError, setSnapshotError] = useState<string | null>(null)

  const saveTimeoutRef = useRef<NodeJS.Timeout>()

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
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/site-editor/${props.leadId}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlToSave }),
      })
      setSaveStatus(res.ok ? 'saved' : 'error')
    } catch {
      setSaveStatus('error')
    }
  }, [props.leadId])

  // Debounced auto-save (3 second delay)
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

  const handleAIEdit = useCallback(async (instruction: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/site-editor/${props.leadId}/ai-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, instruction }),
      })
      const data = await res.json()
      if (res.ok && data.html) {
        setHtml(data.html)
        setSaveStatus('unsaved')
        // Trigger auto-save
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(() => saveHtml(data.html), 1500)
        return { success: true, message: data.summary || 'Changes applied' }
      }
      return { success: false, message: data.error || 'AI edit failed' }
    } catch {
      return { success: false, message: 'Network error' }
    }
  }, [html, props.leadId, saveHtml])

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
        onSave={handleManualSave}
        onReset={handleReset}
        onTogglePreview={() => setShowPreview(p => !p)}
        onToggleChat={() => setShowChat(c => !c)}
        showPreview={showPreview}
        showChat={showChat}
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

        {/* AI Chat — toggleable */}
        {showChat && (
          <div className="w-[320px] min-w-[280px] border-l border-gray-700">
            <AIChatPanel onSubmit={handleAIEdit} companyName={props.companyName} />
          </div>
        )}
      </div>
    </div>
  )
}
