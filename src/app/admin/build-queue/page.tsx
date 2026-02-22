'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Hammer, Eye, Pencil, CheckCircle, Send, Rocket, Globe,
  Loader2, XCircle, Clock, ExternalLink, ChevronDown, ChevronUp, Code, RefreshCw,
  AlertTriangle, CheckCircle2, X, Edit3, MessageSquare,
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

type ViewTab = 'site' | 'edits' | 'worker'
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

function formatTimeSince(dateStr: string | null) {
  if (!dateStr) return ''
  const hours = Math.round((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60) * 10) / 10
  if (hours < 1) return `${Math.round(hours * 60)}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

// ============================================
// Edit Panel Component (inline AI edit for build queue cards)
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
  const [publishing, setPublishing] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)

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

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await fetch(`/api/build-queue/${lead.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) onRefresh()
    } catch (err) {
      console.error('Publish failed:', err)
    } finally {
      setPublishing(false)
    }
  }

  const handleRebuild = async (confirmOverwrite = false) => {
    setRebuilding(true)
    try {
      const res = await fetch(`/api/build-queue/${lead.id}/rebuild`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmOverwrite }),
      })
      const data = await res.json()

      if (res.status === 409 && data.hasEdits) {
        if (confirm(`WARNING: This site has been manually edited in the Site Editor (${Math.round(data.htmlSize / 1024)}KB of HTML). Rebuilding will PERMANENTLY ERASE all manual edits.\n\nAre you sure you want to rebuild from scratch?`)) {
          setRebuilding(false)
          return handleRebuild(true)
        }
        setRebuilding(false)
        return
      }

      if (res.ok) {
        setTimeout(onRefresh, 2000)
      }
    } catch (err) {
      console.error('Rebuild failed:', err)
    } finally {
      setRebuilding(false)
    }
  }

  const previewUrl = lead.previewUrl || (lead.previewId ? `/preview/${lead.previewId}` : null)
  const showApprove = ['QA_REVIEW', 'EDITING'].includes(step)
  const showEdit = ['QA_REVIEW', 'EDITING'].includes(step)
  const showLaunch = step === 'CLIENT_APPROVED'
  const showPublish = step === 'CLIENT_APPROVED'
  const showRebuild = ['QA_REVIEW', 'EDITING'].includes(step) && (lead.buildReadinessScore || 0) < 70

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
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
          {showRebuild && (
            <button
              onClick={() => handleRebuild()}
              disabled={rebuilding}
              className="px-3 py-1.5 text-sm text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50 disabled:opacity-50 flex items-center gap-1.5"
            >
              {rebuilding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Rebuild
            </button>
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
          {showPublish && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {publishing ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              Publish
            </button>
          )}
        </div>
      </div>

      {expanded === 'edit' && <EditPanel leadId={lead.id} onDone={onRefresh} />}
      {expanded === 'launch' && <LaunchPanel leadId={lead.id} onDone={onRefresh} />}
    </Card>
  )
}

// ============================================
// Client Edits Queue View
// ============================================

function ClientEditsView({ onOpenEditor, onRefreshBuildData }: {
  onOpenEditor: (lead: any) => void
  onRefreshBuildData: () => void
}) {
  const [editRequests, setEditRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())

  const fetchEditRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/edit-requests')
      if (res.ok) {
        const data = await res.json()
        setEditRequests(data.editRequests || [])
      }
    } catch (error) {
      console.error('Failed to fetch edit requests:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEditRequests() }, [fetchEditRequests])
  useEffect(() => {
    const interval = setInterval(fetchEditRequests, 10000)
    return () => clearInterval(interval)
  }, [fetchEditRequests])

  // Helper: resolve the lead ID from all possible sources
  const getLeadId = (req: any): string | null =>
    req.leadId || req.lead?.id || req.client?.leadId || null

  // Helper: build preview URL
  const getPreviewUrl = (req: any): string | null => {
    if (req.lead?.previewUrl) return req.lead.previewUrl
    if (req.lead?.previewId) return `/preview/${req.lead.previewId}`
    const leadId = getLeadId(req)
    if (leadId) return `/preview/${leadId}`
    return null
  }

  // Categorize edits by their actual flow state
  const unprocessed = editRequests.filter((r: any) => r.status === 'new' && r.editFlowState === 'pending')
  const aiProcessing = editRequests.filter((r: any) => r.status === 'ai_processing' || r.editFlowState === 'ai_editing')
  const awaitingApproval = editRequests.filter((r: any) =>
    r.status === 'ready_for_review' && (r.editFlowState === 'awaiting_approval' || (r.editFlowState === 'escalated' && r.postEditHtml))
  )
  const needsManualEdit = editRequests.filter((r: any) =>
    r.status === 'ready_for_review' && r.editFlowState === 'escalated' && !r.postEditHtml
  )
  const failed = editRequests.filter((r: any) => r.editFlowState === 'failed' && r.status !== 'rejected')
  const completed = editRequests.filter((r: any) => r.status === 'approved' || r.status === 'live' || r.status === 'rejected')
  const autoApplied = completed.filter((r: any) => r.approvedBy === 'ai_auto')
  const manuallyCompleted = completed.filter((r: any) => r.approvedBy !== 'ai_auto')

  const actionableCount = awaitingApproval.length + needsManualEdit.length + failed.length + unprocessed.length
  const completedWithTime = completed.filter((r: any) => r.approvedAt && r.createdAt)
  const avgTurnaround = completedWithTime.length > 0
    ? Math.round(completedWithTime.reduce((sum: number, r: any) => sum + (new Date(r.approvedAt).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60), 0) / completedWithTime.length * 10) / 10
    : 0

  const handleEditAction = async (id: string, action: string) => {
    try {
      await fetch(`/api/edit-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      })
      fetchEditRequests()
      onRefreshBuildData()
    } catch (error) {
      console.error('Error updating edit request:', error)
    }
  }

  const handleBatchApprove = async (ids: string[]) => {
    await Promise.all(ids.map(id => handleEditAction(id, 'approved')))
  }

  const handleProcess = async (id: string, complexity?: string) => {
    setProcessingIds(prev => new Set(prev).add(id))
    try {
      await fetch(`/api/edit-requests/${id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complexity ? { complexity } : {}),
      })
      fetchEditRequests()
      onRefreshBuildData()
    } catch (error) {
      console.error('Error processing edit:', error)
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  const handleBatchProcess = async (ids: string[]) => {
    await Promise.all(ids.map(id => handleProcess(id)))
  }

  const handleComplete = async (id: string) => {
    setCompletingIds(prev => new Set(prev).add(id))
    try {
      await fetch(`/api/edit-requests/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      fetchEditRequests()
      onRefreshBuildData()
    } catch (error) {
      console.error('Error completing edit:', error)
    } finally {
      setCompletingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  const openEditorForRequest = (req: any) => {
    const leadId = getLeadId(req)
    if (!leadId) {
      alert(`Cannot open editor: No lead linked to this edit request for ${req.client?.companyName || 'Unknown'}. The edit request may need a lead association.`)
      return
    }
    onOpenEditor({
      id: leadId,
      companyName: req.client?.companyName || 'Unknown',
      buildStep: req.lead?.buildStep || 'EDITING',
      previewId: req.lead?.previewId || null,
      editInstruction: req.requestText,
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary stats bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <MessageSquare size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{actionableCount}</p>
              <p className="text-xs text-gray-500">Need Attention</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Loader2 size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{aiProcessing.length}</p>
              <p className="text-xs text-gray-500">AI Processing</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{completed.length}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Clock size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{avgTurnaround > 0 ? `${avgTurnaround}h` : '--'}</p>
              <p className="text-xs text-gray-500">Avg Turnaround</p>
            </div>
          </div>
        </Card>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-gray-500">Loading edit requests...</Card>
      ) : editRequests.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-green-400" />
          <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
          <p className="text-gray-500 text-sm">No pending edit requests from clients.</p>
        </Card>
      ) : (
        <>
          {/* Unprocessed: New edits that need to be kicked off */}
          {unprocessed.length > 0 && (
            <Card className="p-5 border-blue-200 bg-blue-50/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                  <Clock size={16} /> New Requests ({unprocessed.length})
                </h3>
                <button
                  onClick={() => handleBatchProcess(unprocessed.map((r: any) => r.id))}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Process All
                </button>
              </div>
              <div className="space-y-3">
                {unprocessed.map((req: any) => {
                  const leadId = getLeadId(req)
                  const previewUrl = getPreviewUrl(req)
                  return (
                    <div key={req.id} className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{req.client?.companyName}</div>
                          <div className="text-sm text-gray-600 mt-1">&quot;{req.requestText}&quot;</div>
                          {req.aiInterpretation && (
                            <div className="text-xs text-blue-600 mt-1">AI interpretation: {req.aiInterpretation}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {formatTimeSince(req.createdAt)} via {req.requestChannel}
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 capitalize">{req.complexityTier}</Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {leadId && (
                          <button
                            onClick={() => openEditorForRequest(req)}
                            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1.5 font-medium"
                          >
                            <Code size={14} /> Open in Editor
                          </button>
                        )}
                        {previewUrl && (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                          >
                            <ExternalLink size={14} /> View Site
                          </a>
                        )}
                        <button
                          onClick={() => handleProcess(req.id)}
                          disabled={processingIds.has(req.id)}
                          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {processingIds.has(req.id) ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                          {processingIds.has(req.id) ? 'Processing...' : 'Let AI Try'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* AI Processing */}
          {aiProcessing.length > 0 && (
            <Card className="p-5 bg-yellow-50/50 border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> AI Processing ({aiProcessing.length})
              </h3>
              <div className="space-y-2">
                {aiProcessing.map((req: any) => (
                  <div key={req.id} className="bg-white rounded-lg p-3 text-sm flex items-center justify-between border border-yellow-100">
                    <div>
                      <span className="font-medium text-gray-900">{req.client?.companyName}</span>
                      <span className="text-gray-500 ml-2">&mdash; {req.requestText}</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">AI Working...</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Awaiting Approval: AI applied, needs admin sign-off */}
          {awaitingApproval.length > 0 && (
            <Card className="p-5 border-indigo-200 bg-indigo-50/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-indigo-800 flex items-center gap-2">
                  <Eye size={16} /> Awaiting Approval ({awaitingApproval.length})
                </h3>
                {awaitingApproval.length > 1 && (
                  <button
                    onClick={() => handleBatchApprove(awaitingApproval.map((r: any) => r.id))}
                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    Approve All
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {awaitingApproval.map((req: any) => {
                  const leadId = getLeadId(req)
                  const previewUrl = getPreviewUrl(req)
                  return (
                    <div key={req.id} className="bg-white border border-indigo-100 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{req.client?.companyName}</div>
                          <div className="text-sm text-gray-600 mt-1">Request: &quot;{req.requestText}&quot;</div>
                          {req.editSummary && (
                            <div className="text-sm text-green-700 mt-1 bg-green-50 rounded px-2 py-1 inline-block">
                              AI applied: {req.editSummary.replace('[AI attempt] ', '')}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {formatTimeSince(req.createdAt)} via {req.requestChannel}
                          </div>
                        </div>
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 capitalize">{req.complexityTier}</Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleEditAction(req.id, 'approved')}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5 font-medium"
                        >
                          <CheckCircle size={14} /> Approve & Push
                        </button>
                        {previewUrl && (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                          >
                            <ExternalLink size={14} /> View Site
                          </a>
                        )}
                        {leadId && (
                          <button
                            onClick={() => openEditorForRequest(req)}
                            className="px-3 py-1.5 text-sm text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 flex items-center gap-1.5"
                          >
                            <Code size={14} /> Edit More
                          </button>
                        )}
                        <button
                          onClick={() => handleEditAction(req.id, 'rejected')}
                          className="px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Manual Edit Required: Complex edits */}
          {needsManualEdit.length > 0 && (
            <Card className="p-5 border-amber-200 bg-amber-50/30">
              <h3 className="font-semibold text-amber-800 mb-4 flex items-center gap-2">
                <AlertTriangle size={16} /> Manual Edit Required ({needsManualEdit.length})
              </h3>
              <div className="space-y-3">
                {needsManualEdit.map((req: any) => {
                  const leadId = getLeadId(req)
                  const previewUrl = getPreviewUrl(req)
                  return (
                    <div key={req.id} className="bg-white border border-amber-100 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{req.client?.companyName}</div>
                          <div className="text-sm text-gray-600 mt-1">&quot;{req.requestText}&quot;</div>
                          {req.aiInterpretation && (
                            <div className="text-xs text-blue-600 mt-1">AI interpretation: {req.aiInterpretation}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {formatTimeSince(req.createdAt)} via {req.requestChannel}
                          </div>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">Complex</Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {leadId && (
                          <button
                            onClick={() => openEditorForRequest(req)}
                            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1.5 font-medium"
                          >
                            <Code size={14} /> Open in Editor
                          </button>
                        )}
                        {previewUrl && (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                          >
                            <ExternalLink size={14} /> View Site
                          </a>
                        )}
                        <button
                          onClick={() => handleComplete(req.id)}
                          disabled={completingIds.has(req.id)}
                          className="px-3 py-1.5 text-sm text-green-600 border border-green-300 rounded-lg hover:bg-green-50 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <CheckCircle size={14} /> {completingIds.has(req.id) ? 'Completing...' : 'Mark Complete'}
                        </button>
                        <button
                          onClick={() => handleProcess(req.id, 'medium')}
                          disabled={processingIds.has(req.id)}
                          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {processingIds.has(req.id) ? 'Processing...' : 'Let AI Try'}
                        </button>
                        <button
                          onClick={() => handleEditAction(req.id, 'rejected')}
                          className="px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                        >
                          <X size={14} /> Dismiss
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Failed: AI edit failed */}
          {failed.length > 0 && (
            <Card className="p-5 border-red-200 bg-red-50/30">
              <h3 className="font-semibold text-red-800 mb-4 flex items-center gap-2">
                <XCircle size={16} /> Failed &mdash; Needs Attention ({failed.length})
              </h3>
              <div className="space-y-3">
                {failed.map((req: any) => {
                  const leadId = getLeadId(req)
                  const previewUrl = getPreviewUrl(req)
                  return (
                    <div key={req.id} className="bg-white border border-red-100 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{req.client?.companyName}</div>
                          <div className="text-sm text-gray-600 mt-1">&quot;{req.requestText}&quot;</div>
                          <div className="text-xs text-red-600 mt-1">AI edit failed &mdash; manual edit needed</div>
                        </div>
                        <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {leadId && (
                          <button
                            onClick={() => openEditorForRequest(req)}
                            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1.5 font-medium"
                          >
                            <Code size={14} /> Open in Editor
                          </button>
                        )}
                        {previewUrl && (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                          >
                            <ExternalLink size={14} /> View Site
                          </a>
                        )}
                        <button
                          onClick={() => handleComplete(req.id)}
                          disabled={completingIds.has(req.id)}
                          className="px-3 py-1.5 text-sm text-green-600 border border-green-300 rounded-lg hover:bg-green-50 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <CheckCircle size={14} /> {completingIds.has(req.id) ? 'Completing...' : 'Mark Complete'}
                        </button>
                        <button
                          onClick={() => handleProcess(req.id)}
                          disabled={processingIds.has(req.id)}
                          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {processingIds.has(req.id) ? 'Retrying...' : 'Retry AI'}
                        </button>
                        <button
                          onClick={() => handleEditAction(req.id, 'rejected')}
                          className="px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                        >
                          <X size={14} /> Dismiss
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" /> Completed ({completed.length})
              </h3>
              <div className="space-y-2 text-sm">
                {autoApplied.length > 0 && (
                  <div className="text-xs text-gray-400 mb-2">{autoApplied.length} auto-applied by AI</div>
                )}
                {manuallyCompleted.slice(0, 10).map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="font-medium text-gray-700">{req.client?.companyName}</span>
                      <span className="text-gray-500 ml-2">&mdash; &quot;{req.requestText}&quot;</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {req.approvedBy === 'ai_auto' ? 'Auto' : req.approvedBy || 'System'}
                      {req.approvedAt && ` · ${new Date(req.approvedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                ))}
                {autoApplied.slice(0, 5).map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between py-2 opacity-60">
                    <div>
                      <Badge className="text-xs mr-2 bg-gray-100 text-gray-600">Auto</Badge>
                      <span className="font-medium text-gray-700">{req.client?.companyName}</span>
                      <span className="text-gray-500 ml-2">&mdash; {req.editSummary || req.requestText}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {req.approvedAt && new Date(req.approvedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
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
  const editBadgeCount = data?.editBadgeCount || 0

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
          <p className="text-gray-600 mt-1">Site builds, client edits, and deployments</p>

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
              onClick={() => setViewTab('edits')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                viewTab === 'edits'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
        ) : viewTab === 'edits' ? (
          <ClientEditsView
            onOpenEditor={setEditorLead}
            onRefreshBuildData={loadData}
          />
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
    </div>
  )
}
