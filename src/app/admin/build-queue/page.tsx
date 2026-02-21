'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Hammer, Eye, Pencil, CheckCircle, Send, Rocket, Globe,
  Loader2, XCircle, Clock, Zap, ExternalLink, ChevronDown, ChevronUp, Code,
} from 'lucide-react'
import SiteEditorPanel from '@/components/site-editor/SiteEditorPanel'

// ============================================
// Site Build Pipeline Steps
// ============================================

const SITE_STEPS = ['QA_REVIEW', 'EDITING', 'QA_APPROVED', 'CLIENT_REVIEW', 'CLIENT_APPROVED', 'LAUNCHING', 'LIVE'] as const

const SITE_STEP_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  QA_REVIEW: { label: 'QA Review', icon: Eye, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  EDITING: { label: 'Editing', icon: Pencil, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  QA_APPROVED: { label: 'Awaiting Andrew', icon: Send, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  CLIENT_REVIEW: { label: 'Client Review', icon: Eye, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  CLIENT_APPROVED: { label: 'Client Approved', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  LAUNCHING: { label: 'Launching', icon: Rocket, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  LIVE: { label: 'Live', icon: Globe, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
}

// Worker pipeline steps (secondary tab)
const WORKER_STEPS = ['ENRICHMENT', 'PREVIEW', 'PERSONALIZATION', 'SCRIPTS', 'DISTRIBUTION'] as const
const WORKER_CONFIG: Record<string, { label: string; short: string; color: string }> = {
  ENRICHMENT: { label: 'Enrichment', short: 'E', color: 'bg-blue-500' },
  PREVIEW: { label: 'Preview', short: 'P', color: 'bg-purple-500' },
  PERSONALIZATION: { label: 'Personalization', short: 'A', color: 'bg-amber-500' },
  SCRIPTS: { label: 'Scripts', short: 'S', color: 'bg-teal-500' },
  DISTRIBUTION: { label: 'Distribution', short: 'D', color: 'bg-green-500' },
}

type ViewTab = 'site' | 'worker'
type FilterTab = 'ALL' | 'QA_REVIEW' | 'EDITING' | 'QA_APPROVED' | 'CLIENT_REVIEW' | 'LAUNCHING'

function formatTimeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ============================================
// Edit Panel Component
// ============================================

function EditPanel({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const [instructions, setInstructions] = useState('')
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<{ summary: string[]; error?: string } | null>(null)

  const applyEdit = async () => {
    if (!instructions.trim()) return
    setApplying(true)
    setResult(null)
    try {
      const res = await fetch(`/api/build-queue/${leadId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ summary: data.summary })
        setInstructions('')
        onDone()
      } else {
        setResult({ summary: [], error: data.error || 'Failed to apply edit' })
      }
    } catch {
      setResult({ summary: [], error: 'Network error' })
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder='Type edit instructions in plain English... e.g. "Change the headline to Dallas Roofing You Can Trust"'
        className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        rows={3}
        disabled={applying}
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={applyEdit}
          disabled={applying || !instructions.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {applying ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
          {applying ? 'Applying...' : 'Apply Edits'}
        </button>
      </div>
      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {result.error ? (
            <p>{result.error}</p>
          ) : (
            <ul className="space-y-1">
              {result.summary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// Launch Panel Component
// ============================================

function LaunchPanel({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const [domain, setDomain] = useState('')
  const [launching, setLaunching] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string; instructions?: string } | null>(null)

  const launchSite = async () => {
    if (!domain.trim()) return
    setLaunching(true)
    setResult(null)
    try {
      const res = await fetch(`/api/build-queue/${leadId}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, instructions: data.instructions })
        onDone()
      } else {
        setResult({ error: data.error || 'Failed to launch' })
      }
    } catch {
      setResult({ error: 'Network error' })
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <label className="block text-sm font-medium text-gray-700 mb-1">Client Domain</label>
      <input
        type="text"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="www.johnsonroofing.com"
        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={launching}
      />
      <button
        onClick={launchSite}
        disabled={launching || !domain.trim()}
        className="mt-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {launching ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
        {launching ? 'Launching...' : 'Launch Site'}
      </button>
      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {result.error || result.instructions}
        </div>
      )}
    </div>
  )
}

// ============================================
// Site Build Card Component
// ============================================

function SiteBuildCard({ lead, onRefresh, onOpenEditor }: { lead: any; onRefresh: () => void; onOpenEditor: (lead: any) => void }) {
  const [expanded, setExpanded] = useState<'edit' | 'launch' | null>(null)
  const [approving, setApproving] = useState(false)

  const step = lead.buildStep || 'QA_REVIEW'
  const config = SITE_STEP_CONFIG[step] || SITE_STEP_CONFIG.QA_REVIEW
  const StepIcon = config.icon

  const handleApprove = async () => {
    setApproving(true)
    try {
      const res = await fetch(`/api/build-queue/${lead.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: lead.buildNotes }),
      })
      if (res.ok) onRefresh()
    } catch (err) {
      console.error('Approve failed:', err)
    } finally {
      setApproving(false)
    }
  }

  const previewUrl = lead.previewUrl || (lead.previewId ? `/preview/${lead.previewId}` : null)
  const showApprove = ['QA_REVIEW', 'EDITING'].includes(step)
  const showEdit = ['QA_REVIEW', 'EDITING'].includes(step)
  const showLaunch = step === 'CLIENT_APPROVED'

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Logo or placeholder */}
          <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
            {lead.logo ? (
              <img src={lead.logo} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <StepIcon size={20} className={config.color} />
            )}
          </div>
          <div>
            <Link href={`/admin/leads/${lead.id}`} className="font-semibold text-gray-900 hover:text-blue-600">
              {lead.companyName}
            </Link>
            <p className="text-sm text-gray-500">
              {lead.firstName} {lead.lastName || ''} &middot; {(lead.industry || 'General').replace(/_/g, ' ')}
              {lead.city && ` &middot; ${lead.city}${lead.state ? `, ${lead.state}` : ''}`}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <Badge className={`${config.bgColor} ${config.color} text-xs`}>
                {config.label}
              </Badge>
              {lead.buildReadinessScore != null && (
                <span className={`text-xs font-medium ${lead.buildReadinessScore >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                  {lead.buildReadinessScore}/100 ready
                </span>
              )}
              <span className="text-xs text-gray-400">
                {formatTimeAgo(lead.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
            >
              <ExternalLink size={14} />
              Preview
            </a>
          )}
          {['QA_REVIEW', 'EDITING', 'QA_APPROVED'].includes(step) && (
            <button
              onClick={() => onOpenEditor(lead)}
              className="px-3 py-1.5 text-sm text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 flex items-center gap-1.5"
            >
              <Code size={14} />
              Site Editor
            </button>
          )}
          {showEdit && (
            <button
              onClick={() => setExpanded(expanded === 'edit' ? null : 'edit')}
              className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 flex items-center gap-1.5"
            >
              <Pencil size={14} />
              Edit
              {expanded === 'edit' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {showApprove && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Approve
            </button>
          )}
          {showLaunch && (
            <button
              onClick={() => setExpanded(expanded === 'launch' ? null : 'launch')}
              className="px-3 py-1.5 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <Rocket size={14} />
              Launch
              {expanded === 'launch' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable panels */}
      {expanded === 'edit' && <EditPanel leadId={lead.id} onDone={onRefresh} />}
      {expanded === 'launch' && <LaunchPanel leadId={lead.id} onDone={onRefresh} />}
    </Card>
  )
}

// ============================================
// Worker Pipeline View (original)
// ============================================

function WorkerPipelineView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/build-queue?view=worker')
      if (res.ok) setData(await res.json())
    } catch (err) {
      console.error('Failed to load worker pipeline:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const interval = setInterval(loadData, 3000)
    return () => clearInterval(interval)
  }, [loadData])

  if (loading) return <Card className="p-8 text-center text-gray-500">Loading worker pipeline...</Card>

  const summary = data?.summary || { inProgress: 0, failed: 0, completedToday: 0, avgBuildTimeMs: 0 }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Loader2 size={18} className="text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{summary.inProgress}</p>
              <p className="text-xs text-gray-500">In Progress</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{summary.failed}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{summary.completedToday}</p>
              <p className="text-xs text-gray-500">Completed Today</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{formatDuration(summary.avgBuildTimeMs)}</p>
              <p className="text-xs text-gray-500">Avg Build Time</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pipeline legend */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
        <span className="font-medium text-gray-700">Pipeline:</span>
        {WORKER_STEPS.map((step, idx) => (
          <span key={step} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-full ${WORKER_CONFIG[step].color}`} />
            {WORKER_CONFIG[step].label}
            {idx < WORKER_STEPS.length - 1 && <span className="text-gray-300 ml-2">&rarr;</span>}
          </span>
        ))}
      </div>

      {/* Active builds */}
      {data?.activeBuilds?.length > 0 ? (
        <div className="space-y-2 mb-6">
          {data.activeBuilds.map((build: any) => (
            <Card key={build.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <Link href={`/admin/leads/${build.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {build.firstName} {build.lastName || ''}
                    </Link>
                    <p className="text-sm text-gray-500">{build.companyName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-blue-100 text-blue-700">
                    {WORKER_CONFIG[build.buildStep]?.label || build.buildStep}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-gray-500 mb-6">No active worker builds</Card>
      )}

      {/* Failed builds */}
      {data?.failedBuilds?.length > 0 && (
        <>
          <h3 className="text-base font-semibold text-red-700 mb-2">Failed Builds</h3>
          <div className="space-y-2">
            {data.failedBuilds.map((build: any) => (
              <Card key={build.id} className="p-4 border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Link href={`/admin/leads/${build.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {build.firstName} {build.lastName || ''}
                    </Link>
                    <p className="text-sm text-gray-500">{build.companyName}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-red-100 text-red-700">
                      Failed at {WORKER_CONFIG[build.buildStep]?.label || build.buildStep}
                    </Badge>
                    <p className="text-xs text-red-500 mt-1 max-w-xs truncate">{build.buildError}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================
// Main Build Queue Page
// ============================================

export default function BuildQueuePage() {
  const [viewTab, setViewTab] = useState<ViewTab>('site')
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL')
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

  // Filter leads by tab
  const filteredLeads = filterTab === 'ALL'
    ? leads
    : leads.filter((l: any) => l.buildStep === filterTab)

  const filterTabs: Array<{ key: FilterTab; label: string; count?: number }> = [
    { key: 'QA_REVIEW', label: 'QA Review', count: counts.QA_REVIEW },
    { key: 'EDITING', label: 'Editing', count: counts.EDITING },
    { key: 'QA_APPROVED', label: 'Awaiting Andrew', count: counts.QA_APPROVED },
    { key: 'CLIENT_REVIEW', label: 'Client Review', count: counts.CLIENT_REVIEW },
    { key: 'LAUNCHING', label: 'Launching', count: counts.LAUNCHING },
    { key: 'ALL', label: 'All', count: leads.length },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Hammer size={28} className="text-amber-500" />
            Build Queue
          </h1>
          <p className="text-gray-600 mt-1">Site builds from QA to launch</p>

          {/* View tabs */}
          <div className="flex items-center gap-1 mt-4 border-b border-gray-200 -mb-px">
            <button
              onClick={() => setViewTab('site')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                viewTab === 'site'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Site Builds
            </button>
            <button
              onClick={() => setViewTab('worker')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                viewTab === 'worker'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Worker Pipeline
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {viewTab === 'worker' ? (
          <WorkerPipelineView />
        ) : (
          <>
            {/* Filter tabs */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors flex items-center gap-1.5 ${
                    filterTab === tab.key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                  {tab.count != null && tab.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      filterTab === tab.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Site Build Cards */}
            {loading ? (
              <Card className="p-8 text-center text-gray-500">Loading build queue...</Card>
            ) : filteredLeads.length > 0 ? (
              <div className="space-y-3">
                {filteredLeads.map((lead: any) => (
                  <SiteBuildCard key={lead.id} lead={lead} onRefresh={loadData} onOpenEditor={setEditorLead} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Hammer size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No sites in this stage</p>
                <p className="text-sm text-gray-400 mt-1">Sites will appear here as leads complete qualification</p>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Site Editor Overlay — stays in the UI */}
      {editorLead && (
        <SiteEditorPanel
          leadId={editorLead.id}
          companyName={editorLead.companyName}
          buildStep={editorLead.buildStep || 'QA_REVIEW'}
          previewId={editorLead.previewId || null}
          siteHtml={editorLead.siteHtml || null}
          onClose={() => setEditorLead(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  )
}
