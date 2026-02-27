'use client'

import { useState } from 'react'
import { ExternalLink, Check, Loader2, ChevronDown, ChevronUp, Send } from 'lucide-react'

interface SiteCardProps {
  lead: {
    id: string
    companyName: string
    industry?: string | null
    city?: string | null
    state?: string | null
    buildStep?: string | null
    buildReadinessScore?: number | null
    previewId?: string | null
    previewUrl?: string | null
  }
  onApproved?: () => void
}

interface EditCardProps {
  editRequest: {
    id: string
    requestText: string
    complexityTier?: string | null
    status: string
    editFlowState?: string | null
    editSummary?: string | null
    createdAt: string
    client?: {
      companyName?: string | null
      leadId?: string | null
    } | null
    lead?: {
      id: string
      previewId?: string | null
    } | null
  }
  onApproved?: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function stepLabel(step: string | null | undefined): string {
  const labels: Record<string, string> = {
    QA_REVIEW: 'QA Review',
    EDITING: 'Editing',
    QA_APPROVED: 'QA Approved',
    CLIENT_REVIEW: 'Client Review',
    CLIENT_APPROVED: 'Client Approved',
    LAUNCHING: 'Launching',
    LIVE: 'Live',
  }
  return labels[step || ''] || step || 'Unknown'
}

function stepColor(step: string | null | undefined): string {
  switch (step) {
    case 'QA_REVIEW': return 'bg-yellow-500/20 text-yellow-400'
    case 'EDITING': return 'bg-blue-500/20 text-blue-400'
    case 'QA_APPROVED': return 'bg-green-500/20 text-green-400'
    case 'CLIENT_REVIEW': return 'bg-purple-500/20 text-purple-400'
    case 'CLIENT_APPROVED': return 'bg-emerald-500/20 text-emerald-400'
    case 'LAUNCHING': return 'bg-orange-500/20 text-orange-400'
    case 'LIVE': return 'bg-green-600/20 text-green-300'
    default: return 'bg-slate-500/20 text-slate-400'
  }
}

export function MobileSiteCard({ lead, onApproved }: SiteCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editText, setEditText] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editResult, setEditResult] = useState<string | null>(null)
  const [approveLoading, setApproveLoading] = useState(false)
  const [approved, setApproved] = useState(false)

  const previewHref = lead.previewUrl || (lead.previewId ? `/preview/${lead.previewId}` : null)

  async function handleAiEdit() {
    if (!editText.trim()) return
    setEditLoading(true)
    setEditResult(null)
    try {
      // 1. Load current HTML
      const loadRes = await fetch(`/api/site-editor/${lead.id}/save`)
      if (!loadRes.ok) throw new Error('Failed to load site HTML')
      const loadData = await loadRes.json()
      if (!loadData.html) throw new Error('Site has no HTML yet — run snapshot first')

      // 2. Apply AI edit
      const editRes = await fetch(`/api/site-editor/${lead.id}/ai-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: loadData.html, instruction: editText }),
      })
      if (!editRes.ok) {
        const err = await editRes.json().catch(() => ({}))
        throw new Error(err.error || `AI edit failed (${editRes.status})`)
      }
      const editData = await editRes.json()

      // 3. Save the result
      const saveRes = await fetch(`/api/site-editor/${lead.id}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: editData.html, expectedVersion: loadData.version }),
      })
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save edited HTML')
      }

      setEditResult(editData.summary || 'Edit applied successfully')
      setEditText('')
    } catch (err: any) {
      setEditResult(`Error: ${err.message}`)
    } finally {
      setEditLoading(false)
    }
  }

  async function handleApprove() {
    setApproveLoading(true)
    try {
      const res = await fetch(`/api/build-queue/${lead.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Approve failed')
      setApproved(true)
      onApproved?.()
    } catch {
      setEditResult('Failed to approve')
    } finally {
      setApproveLoading(false)
    }
  }

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base truncate">{lead.companyName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stepColor(lead.buildStep)}`}>
              {stepLabel(lead.buildStep)}
            </span>
            {lead.buildReadinessScore != null && (
              <span className="text-xs text-slate-400">Score: {lead.buildReadinessScore}</span>
            )}
          </div>
          {lead.city && (
            <p className="text-xs text-slate-500 mt-0.5">{lead.city}{lead.state ? `, ${lead.state}` : ''}</p>
          )}
        </div>
        {expanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50 pt-3">
          {/* Action buttons */}
          <div className="flex gap-2">
            {previewHref && (
              <a
                href={previewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-colors"
              >
                <ExternalLink size={16} />
                Preview
              </a>
            )}
            {!approved && lead.buildStep && ['QA_REVIEW', 'EDITING'].includes(lead.buildStep) && (
              <button
                onClick={handleApprove}
                disabled={approveLoading}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:opacity-60 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-colors"
              >
                {approveLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Approve
              </button>
            )}
            {approved && (
              <div className="flex-1 flex items-center justify-center gap-1.5 bg-green-900/50 text-green-400 text-sm font-medium py-2.5 px-3 rounded-lg">
                <Check size={16} />
                Approved
              </div>
            )}
          </div>

          {/* AI Edit input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !editLoading && handleAiEdit()}
                placeholder="Describe a change..."
                disabled={editLoading}
                className="flex-1 bg-slate-900 border border-slate-600 text-white text-sm rounded-lg px-3 py-2.5 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                onClick={handleAiEdit}
                disabled={editLoading || !editText.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white p-2.5 rounded-lg transition-colors"
              >
                {editLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            {editLoading && (
              <p className="text-xs text-blue-400 animate-pulse">AI is editing... this takes 10-30s</p>
            )}
            {editResult && (
              <p className={`text-xs ${editResult.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {editResult}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function MobileEditCard({ editRequest, onApproved }: EditCardProps) {
  const [approveLoading, setApproveLoading] = useState(false)
  const [approved, setApproved] = useState(false)
  const [rejectLoading, setRejectLoading] = useState(false)
  const [rejected, setRejected] = useState(false)

  const previewId = editRequest.lead?.previewId
  const previewHref = previewId ? `/preview/${previewId}` : null
  const companyName = editRequest.client?.companyName || 'Unknown Client'

  async function handleApprove() {
    setApproveLoading(true)
    try {
      const res = await fetch(`/api/edit-requests/${editRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      if (!res.ok) throw new Error('Failed to approve')
      setApproved(true)
      onApproved?.()
    } catch (err) {
      console.error('Approve edit failed:', err)
    } finally {
      setApproveLoading(false)
    }
  }

  async function handleReject() {
    setRejectLoading(true)
    try {
      const res = await fetch(`/api/edit-requests/${editRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      setRejected(true)
    } catch (err) {
      console.error('Reject edit failed:', err)
    } finally {
      setRejectLoading(false)
    }
  }

  if (rejected) return null

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4 space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-white font-semibold text-base">{companyName}</p>
          <span className="text-xs text-slate-500">{timeAgo(editRequest.createdAt)}</span>
        </div>
        <p className="text-sm text-slate-300 mt-1 leading-relaxed">
          &ldquo;{editRequest.requestText}&rdquo;
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            editRequest.complexityTier === 'simple' ? 'bg-green-500/20 text-green-400' :
            editRequest.complexityTier === 'complex' ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {editRequest.complexityTier || 'medium'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            editRequest.status === 'ready_for_review' ? 'bg-blue-500/20 text-blue-400' :
            editRequest.status === 'new' ? 'bg-yellow-500/20 text-yellow-400' :
            editRequest.status === 'approved' ? 'bg-green-500/20 text-green-400' :
            'bg-slate-500/20 text-slate-400'
          }`}>
            {editRequest.status === 'ready_for_review' ? 'AI Done' :
             editRequest.status === 'new' ? 'New' :
             editRequest.status}
          </span>
        </div>
        {editRequest.editSummary && (
          <p className="text-xs text-slate-400 mt-2 italic">AI: {editRequest.editSummary}</p>
        )}
      </div>

      <div className="flex gap-2">
        {previewHref && (
          <a
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Preview
          </a>
        )}
        {!approved && ['new', 'ready_for_review', 'ai_processing'].includes(editRequest.status) && (
          <>
            <button
              onClick={handleReject}
              disabled={rejectLoading}
              className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-red-600/80 disabled:opacity-50 text-slate-300 hover:text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={approveLoading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:opacity-60 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-colors"
            >
              {approveLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Approve
            </button>
          </>
        )}
        {approved && (
          <div className="flex-1 flex items-center justify-center gap-1.5 bg-green-900/50 text-green-400 text-sm font-medium py-2.5 px-3 rounded-lg">
            <Check size={16} />
            Approved & Pushed
          </div>
        )}
      </div>
    </div>
  )
}
