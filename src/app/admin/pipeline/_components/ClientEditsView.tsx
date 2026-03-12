'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect, useCallback } from 'react'
import {
  Eye, CheckCircle, Loader2, XCircle, Clock, ExternalLink, Code, RefreshCw,
  AlertTriangle, CheckCircle2, X, MessageSquare,
} from 'lucide-react'
import { formatTimeSince } from '../_lib/constants'

interface ClientEditsViewProps {
  onOpenEditor: (lead: any) => void
  onRefreshBuildData: () => void
}

export default function ClientEditsView({ onOpenEditor, onRefreshBuildData }: ClientEditsViewProps) {
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
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <MessageSquare size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{actionableCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Need Attention</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Loader2 size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{aiProcessing.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">AI Processing</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{completed.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Clock size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{avgTurnaround > 0 ? `${avgTurnaround}h` : '--'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Turnaround</p>
            </div>
          </div>
        </Card>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-gray-500 dark:text-gray-400">Loading edit requests...</Card>
      ) : editRequests.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-green-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">All caught up!</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No pending edit requests from clients.</p>
        </Card>
      ) : (
        <>
          {/* Unprocessed: New edits that need to be kicked off */}
          {unprocessed.length > 0 && (
            <Card className="p-5 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
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
                    <div key={req.id} className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{req.client?.companyName}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">&quot;{req.requestText}&quot;</div>
                          {req.aiInterpretation && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">AI interpretation: {req.aiInterpretation}</div>
                          )}
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
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
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                          >
                            <ExternalLink size={14} /> View Site
                          </a>
                        )}
                        <button
                          onClick={() => handleProcess(req.id)}
                          disabled={processingIds.has(req.id)}
                          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50 flex items-center gap-1.5"
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
            <Card className="p-5 bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-4 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> AI Processing ({aiProcessing.length})
              </h3>
              <div className="space-y-2">
                {aiProcessing.map((req: any) => (
                  <div key={req.id} className="bg-white dark:bg-slate-900 rounded-lg p-3 text-sm flex items-center justify-between border border-yellow-100 dark:border-yellow-900">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{req.client?.companyName}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">&mdash; {req.requestText}</span>
                    </div>
                    <Badge className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700">AI Working...</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Awaiting Approval: AI applied, needs admin sign-off */}
          {awaitingApproval.length > 0 && (
            <Card className="p-5 border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                  <Eye size={16} /> Awaiting Approval ({awaitingApproval.length})
                </h3>
                {awaitingApproval.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Approve and push all ${awaitingApproval.length} pending edits?`)) {
                        handleBatchApprove(awaitingApproval.map((r: any) => r.id))
                      }
                    }}
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
                    <div key={req.id} className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{req.client?.companyName}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Request: &quot;{req.requestText}&quot;</div>
                          {req.editSummary && (
                            <div className="text-sm text-green-700 dark:text-green-400 mt-1 bg-green-50 dark:bg-green-950/30 rounded px-2 py-1 inline-block">
                              AI applied: {req.editSummary.replace('[AI attempt] ', '')}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatTimeSince(req.createdAt)} via {req.requestChannel}
                          </div>
                        </div>
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 capitalize">{req.complexityTier}</Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            if (confirm(`Approve and push edit for ${req.client?.companyName}?\n\nAI applied: "${(req.editSummary || '').replace('[AI attempt] ', '')}"\n\nThis will push the changes to the build queue.`)) {
                              handleEditAction(req.id, 'approved')
                            }
                          }}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5 font-medium"
                        >
                          <CheckCircle size={14} /> Approve & Push
                        </button>
                        {previewUrl && (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                          >
                            <ExternalLink size={14} /> View Site
                          </a>
                        )}
                        {leadId && (
                          <button
                            onClick={() => openEditorForRequest(req)}
                            className="px-3 py-1.5 text-sm text-purple-600 border border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 flex items-center gap-1.5"
                          >
                            <Code size={14} /> Edit More
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Reject edit request for ${req.client?.companyName}?\n\nRequest: "${req.requestText}"\n\nThis cannot be undone.`)) {
                              handleEditAction(req.id, 'rejected')
                            }
                          }}
                          className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
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
            <Card className="p-5 border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20">
              <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-4 flex items-center gap-2">
                <AlertTriangle size={16} /> Manual Edit Required ({needsManualEdit.length})
              </h3>
              <div className="space-y-3">
                {needsManualEdit.map((req: any) => {
                  const leadId = getLeadId(req)
                  const previewUrl = getPreviewUrl(req)
                  return (
                    <div key={req.id} className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{req.client?.companyName}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">&quot;{req.requestText}&quot;</div>
                          {req.aiInterpretation && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">AI interpretation: {req.aiInterpretation}</div>
                          )}
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
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
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
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
                          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {processingIds.has(req.id) ? 'Processing...' : 'Let AI Try'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Dismiss edit request for ${req.client?.companyName}?\n\nRequest: "${req.requestText}"`)) {
                              handleEditAction(req.id, 'rejected')
                            }
                          }}
                          className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
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
            <Card className="p-5 border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20">
              <h3 className="font-semibold text-red-800 dark:text-red-300 mb-4 flex items-center gap-2">
                <XCircle size={16} /> Failed &mdash; Needs Attention ({failed.length})
              </h3>
              <div className="space-y-3">
                {failed.map((req: any) => {
                  const leadId = getLeadId(req)
                  const previewUrl = getPreviewUrl(req)
                  return (
                    <div key={req.id} className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{req.client?.companyName}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">&quot;{req.requestText}&quot;</div>
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">AI edit failed &mdash; manual edit needed</div>
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
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
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
                          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {processingIds.has(req.id) ? 'Retrying...' : 'Retry AI'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Dismiss failed edit for ${req.client?.companyName}?\n\nRequest: "${req.requestText}"`)) {
                              handleEditAction(req.id, 'rejected')
                            }
                          }}
                          className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
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
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" /> Completed ({completed.length})
              </h3>
              <div className="space-y-2 text-sm">
                {autoApplied.length > 0 && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">{autoApplied.length} auto-applied by AI</div>
                )}
                {manuallyCompleted.slice(0, 10).map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-800 last:border-0">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{req.client?.companyName}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">&mdash; &quot;{req.requestText}&quot;</span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {req.approvedBy === 'ai_auto' ? 'Auto' : req.approvedBy || 'System'}
                      {req.approvedAt && ` · ${new Date(req.approvedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                ))}
                {autoApplied.slice(0, 5).map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between py-2 opacity-60">
                    <div>
                      <Badge className="text-xs mr-2 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">Auto</Badge>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{req.client?.companyName}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">&mdash; {req.editSummary || req.requestText}</span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
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
