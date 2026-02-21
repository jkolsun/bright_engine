'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ShieldCheck, ShieldX, Clock, AlertTriangle, CheckCircle, XCircle,
  DollarSign, Globe, MessageSquare, Eye, Trash2, Users, Bot, CreditCard,
  ArrowLeft, RefreshCw, ExternalLink, Filter
} from 'lucide-react'

const GATE_CONFIG: Record<string, { label: string; icon: any; color: string; badgeColor: string }> = {
  PAYMENT_LINK: { label: 'Payment Link', icon: DollarSign, color: 'bg-green-100 text-green-700', badgeColor: 'bg-green-500 text-white' },
  SITE_PUBLISH: { label: 'Site Publish', icon: Globe, color: 'bg-blue-100 text-blue-700', badgeColor: 'bg-blue-500 text-white' },
  REFUND: { label: 'Refund', icon: CreditCard, color: 'bg-red-100 text-red-700', badgeColor: 'bg-red-500 text-white' },
  SEND_MESSAGE: { label: 'Send Message', icon: MessageSquare, color: 'bg-purple-100 text-purple-700', badgeColor: 'bg-purple-500 text-white' },
  SEND_PREVIEW: { label: 'Site Approval', icon: Eye, color: 'bg-blue-100 text-blue-700', badgeColor: 'bg-blue-500 text-white' },
  STATUS_CHANGE: { label: 'Status Change', icon: RefreshCw, color: 'bg-teal-100 text-teal-700', badgeColor: 'bg-teal-500 text-white' },
  DELETE_LEAD: { label: 'Delete Lead', icon: Trash2, color: 'bg-red-100 text-red-700', badgeColor: 'bg-red-500 text-white' },
  BULK_ACTION: { label: 'Bulk Action', icon: Users, color: 'bg-orange-100 text-orange-700', badgeColor: 'bg-orange-500 text-white' },
  AI_RESPONSE: { label: 'AI Response', icon: Bot, color: 'bg-indigo-100 text-indigo-700', badgeColor: 'bg-indigo-500 text-white' },
  SUBSCRIPTION_CANCEL: { label: 'Cancel Sub', icon: XCircle, color: 'bg-red-100 text-red-700', badgeColor: 'bg-red-500 text-white' },
  HIGH_VALUE_SEND: { label: 'High Value', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700', badgeColor: 'bg-yellow-500 text-white' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  URGENT: { label: 'Urgent', color: 'bg-red-500 text-white' },
  HIGH: { label: 'High', color: 'bg-orange-500 text-white' },
  NORMAL: { label: 'Normal', color: 'bg-gray-200 text-gray-700' },
  LOW: { label: 'Low', color: 'bg-gray-100 text-gray-500' },
}

type FilterStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'all'

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('PENDING')
  const [gateFilter, setGateFilter] = useState<string>('all')
  const [pendingCount, setPendingCount] = useState(0)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [denialReason, setDenialReason] = useState('')
  const [editedPaymentUrls, setEditedPaymentUrls] = useState<Record<string, string>>({})

  const loadApprovals = async () => {
    try {
      const gateParam = gateFilter !== 'all' ? `&gate=${gateFilter}` : ''
      const res = await fetch(`/api/admin/approvals?status=${filter}&limit=100${gateParam}`)
      if (res.ok) {
        const data = await res.json()
        setApprovals(data.approvals || [])
        setPendingCount(data.pendingCount || 0)
      }
    } catch (err) {
      console.error('Failed to load approvals:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApprovals()
  }, [filter, gateFilter])

  // Poll every 5 seconds for new items
  useEffect(() => {
    const interval = setInterval(loadApprovals, 5000)
    return () => clearInterval(interval)
  }, [filter, gateFilter])

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      const body: Record<string, unknown> = { action: 'approve' }
      // If admin edited the payment URL, pass it along
      if (editedPaymentUrls[id] !== undefined) {
        body.paymentUrl = editedPaymentUrls[id]
      }
      const res = await fetch(`/api/admin/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setApprovals(prev => prev.filter(a => a.id !== id))
        setPendingCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to approve:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDenyClick = (id: string) => {
    setDenyingId(id)
    setDenialReason('')
  }

  const handleDenyConfirm = async () => {
    if (!denyingId) return
    setProcessingId(denyingId)
    try {
      const res = await fetch(`/api/admin/approvals/${denyingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deny', denialReason: denialReason.trim() || undefined }),
      })
      if (res.ok) {
        setApprovals(prev => prev.filter(a => a.id !== denyingId))
        setPendingCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to deny:', err)
    } finally {
      setProcessingId(null)
      setDenyingId(null)
      setDenialReason('')
    }
  }

  const timeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60))
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const getPreviewUrl = (approval: any) => {
    return approval.metadata?.previewUrl
      || approval.lead?.previewUrl
      || (approval.lead?.previewId ? `/preview/${approval.lead.previewId}` : null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="p-6">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <ShieldCheck size={28} className="text-blue-600" />
                Approvals
                {pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-sm font-bold px-2.5 py-1 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-600 mt-1">Review and approve high-risk actions before they execute</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex gap-2">
              {(['PENDING', 'APPROVED', 'DENIED', 'all'] as FilterStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  {s === 'PENDING' && pendingCount > 0 && (
                    <span className="ml-2 bg-white/20 text-white px-1.5 py-0.5 rounded text-xs">{pendingCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-2 ml-4 border-l border-gray-200 pl-4">
              <Filter size={14} className="text-gray-400" />
              <select
                value={gateFilter}
                onChange={e => setGateFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700"
              >
                <option value="all">All Types</option>
                <option value="SEND_PREVIEW">Site Approvals</option>
                <option value="PAYMENT_LINK">Payment Links</option>
                <option value="SEND_MESSAGE">Messages</option>
                <option value="SITE_PUBLISH">Site Publish</option>
                <option value="REFUND">Refunds</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {loading && (
          <Card className="p-8 text-center text-gray-500">Loading approvals...</Card>
        )}

        {!loading && approvals.length === 0 && (
          <Card className="p-12 text-center">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">All clear</h3>
            <p className="text-gray-500 mt-1">
              {filter === 'PENDING' ? 'No pending approvals' : `No ${filter.toLowerCase()} approvals`}
            </p>
          </Card>
        )}

        {/* Denial reason modal */}
        {denyingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Deny Approval</h3>
              <p className="text-sm text-gray-600 mb-4">Provide a reason for denial so the team knows what to fix.</p>
              <textarea
                value={denialReason}
                onChange={e => setDenialReason(e.target.value)}
                placeholder="Reason for denial (optional but recommended)..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDenyingId(null); setDenialReason('') }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDenyConfirm}
                  disabled={processingId === denyingId}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <ShieldX size={16} className="mr-1" />
                  Deny
                </Button>
              </div>
            </div>
          </div>
        )}

        {approvals.map(approval => {
          const gateConf = GATE_CONFIG[approval.gate] || { label: approval.gate, icon: ShieldCheck, color: 'bg-gray-100 text-gray-700', badgeColor: 'bg-gray-500 text-white' }
          const prioConf = PRIORITY_CONFIG[approval.priority] || PRIORITY_CONFIG.NORMAL
          const GateIcon = gateConf.icon
          const isPending = approval.status === 'PENDING'
          const previewUrl = getPreviewUrl(approval)
          const paymentUrl = approval.metadata?.paymentUrl
          const meta = approval.metadata as Record<string, unknown> | null

          return (
            <Card key={approval.id} className={`p-6 ${isPending && approval.priority === 'URGENT' ? 'border-red-300 border-2' : ''}`}>
              <div className="flex items-start gap-4">
                {/* Gate icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${gateConf.color}`}>
                  <GateIcon size={24} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Type badge + title */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${gateConf.badgeColor}`}>
                      {gateConf.label}
                    </span>
                    {approval.priority !== 'NORMAL' && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${prioConf.color}`}>
                        {prioConf.label}
                      </span>
                    )}
                    <h3 className="font-semibold text-gray-900">{approval.title}</h3>
                  </div>

                  {/* Lead/company info */}
                  {approval.lead && (
                    <div className="mt-1 text-sm text-gray-700">
                      <span className="font-medium">{approval.lead.firstName} {approval.lead.lastName || ''}</span>
                      {approval.lead.companyName && (
                        <span className="text-gray-500"> — {approval.lead.companyName}</span>
                      )}
                    </div>
                  )}

                  <p className="text-sm text-gray-600 mt-1">{approval.description}</p>

                  {/* Preview button for site approvals */}
                  {(approval.gate === 'SEND_PREVIEW' || approval.gate === 'SITE_PUBLISH') && previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      <Eye size={14} />
                      Preview Site
                      <ExternalLink size={12} />
                    </a>
                  )}

                  {/* Stripe link visible + editable for payment approvals */}
                  {approval.gate === 'PAYMENT_LINK' && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs font-medium text-green-700 mb-1.5">Stripe Payment Link:</p>
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editedPaymentUrls[approval.id] ?? paymentUrl ?? ''}
                            onChange={e => setEditedPaymentUrls(prev => ({ ...prev, [approval.id]: e.target.value }))}
                            placeholder="https://buy.stripe.com/..."
                            className="flex-1 text-sm font-mono px-2 py-1.5 border border-green-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                          {(editedPaymentUrls[approval.id] ?? paymentUrl) && (
                            <a
                              href={editedPaymentUrls[approval.id] ?? paymentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 p-1.5 text-green-700 hover:text-green-900 hover:bg-green-100 rounded"
                              title="Open link"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      ) : paymentUrl ? (
                        <a
                          href={paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-green-800 underline break-all hover:text-green-900"
                        >
                          {paymentUrl}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500 italic">No link configured</span>
                      )}
                    </div>
                  )}

                  {/* Draft content preview */}
                  {approval.draftContent && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-1">Message to send:</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{approval.draftContent}</p>
                    </div>
                  )}

                  {/* Conversation context — last 3-5 messages */}
                  {approval.recentMessages && approval.recentMessages.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs font-medium text-slate-500 mb-2">Recent conversation:</p>
                      <div className="space-y-1.5">
                        {approval.recentMessages.map((msg: any) => (
                          <div key={msg.id} className="flex gap-2 text-sm">
                            <span className={`font-medium flex-shrink-0 ${
                              msg.direction === 'INBOUND' ? 'text-blue-600' : 'text-gray-600'
                            }`}>
                              {msg.direction === 'INBOUND' ? 'Client:' : 'Team:'}
                            </span>
                            <span className="text-gray-700 truncate">{msg.content}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Denial reason (if denied) */}
                  {approval.status === 'DENIED' && meta?.denialReason && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs font-medium text-red-600 mb-1">Denial reason:</p>
                      <p className="text-sm text-red-800">{meta.denialReason as string}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {timeSince(approval.createdAt)}
                    </span>
                    <span>Requested by: {approval.requestedBy}</span>
                    {approval.resolvedBy && (
                      <span>{approval.status === 'APPROVED' ? 'Approved' : 'Denied'} by {approval.resolvedBy}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isPending && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      onClick={() => handleDenyClick(approval.id)}
                      variant="outline"
                      size="sm"
                      disabled={processingId === approval.id}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <ShieldX size={16} className="mr-1" />
                      Deny
                    </Button>
                    <Button
                      onClick={() => handleApprove(approval.id)}
                      size="sm"
                      disabled={processingId === approval.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <ShieldCheck size={16} className="mr-1" />
                      Approve
                    </Button>
                  </div>
                )}

                {/* Resolved status */}
                {!isPending && (
                  <div className="flex-shrink-0">
                    {approval.status === 'APPROVED' ? (
                      <Badge className="bg-green-100 text-green-700">Approved</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">Denied</Badge>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
