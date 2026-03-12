'use client'

import { useState, useEffect, useCallback } from 'react'
import SiteEditorPanel from '@/components/site-editor/SiteEditorPanel'
import SiteBuildView from '../_components/SiteBuildView'
import ClientEditsView from '../_components/ClientEditsView'
import WorkerPipelineView from '../_components/WorkerPipelineView'

type ViewTab = 'site' | 'edits' | 'worker'

export default function BuildsTab() {
  const [viewTab, setViewTab] = useState<ViewTab>('site')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editorLead, setEditorLead] = useState<any | null>(null)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/build-queue')
      if (res.ok) setData(await res.json())
    } catch (err) {
      console.error('Failed to load build queue:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [loadData])

  const counts = data?.counts || {}
  const leads = data?.leads || []
  const editBadgeCount = data?.editBadgeCount || 0

  return (
    <>
      {/* View tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-slate-700 -mb-px">
        <button
          onClick={() => setViewTab('site')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            viewTab === 'site'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Site Builds
        </button>
        <button
          onClick={() => setViewTab('edits')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            viewTab === 'edits'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Client Edits
          {editBadgeCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {editBadgeCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewTab('worker')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            viewTab === 'worker'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Worker Pipeline
        </button>
      </div>

      <div className="mt-6">
        {viewTab === 'worker' ? (
          <WorkerPipelineView />
        ) : viewTab === 'edits' ? (
          <ClientEditsView
            onOpenEditor={setEditorLead}
            onRefreshBuildData={loadData}
          />
        ) : (
          <SiteBuildView
            leads={leads}
            counts={counts}
            loading={loading}
            onRefresh={loadData}
            onOpenEditor={setEditorLead}
          />
        )}
      </div>

      {/* Site Editor Overlay */}
      {editorLead && (
        <SiteEditorPanel
          leadId={editorLead.id}
          companyName={editorLead.companyName}
          buildStep={editorLead.buildStep || 'QA_REVIEW'}
          previewId={editorLead.previewId || null}
          editInstruction={editorLead.editInstruction || undefined}
          onClose={() => { setEditorLead(null); loadData() }}
          onRefresh={loadData}
        />
      )}
    </>
  )
}
