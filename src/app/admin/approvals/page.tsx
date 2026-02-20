'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ShieldCheck, ShieldX, Clock, AlertTriangle, CheckCircle, XCircle,
  DollarSign, Globe, MessageSquare, Eye, Trash2, Users, Bot, CreditCard,
  ArrowLeft, RefreshCw
} from 'lucide-react'

const GATE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  PAYMENT_LINK: { label: 'Payment Link', icon: DollarSign, color: 'bg-green-100 text-green-700' },
  SITE_PUBLISH: { label: 'Site Publish', icon: Globe, color: 'bg-blue-100 text-blue-700' },
  REFUND: { label: 'Refund', icon: CreditCard, color: 'bg-red-100 text-red-700' },
  SEND_MESSAGE: { label: 'Send Message', icon: MessageSquare, color: 'bg-purple-100 text-purple-700' },
  SEND_PREVIEW: { label: 'Send Preview', icon: Eye, color: 'bg-amber-100 text-amber-700' },
  STATUS_CHANGE: { label: 'Status Change', icon: RefreshCw, color: 'bg-teal-100 text-teal-700' },
  DELETE_LEAD: { label: 'Delete Lead', icon: Trash2, color: 'bg-red-100 text-red-700' },
  BULK_ACTION: { label: 'Bulk Action', icon: Users, color: 'bg-orange-100 text-orange-700' },
  AI_RESPONSE: { label: 'AI Response', icon: Bot, color: 'bg-indigo-100 text-indigo-700' },
  SUBSCRIPTION_CANCEL: { label: 'Cancel Sub', icon: XCircle, color: 'bg-red-100 text-red-700' },
  HIGH_VALUE_SEND: { label: 'High Value', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700' },
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
  const [pendingCount, setPendingCount] = useState(0)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const loadApprovals = async () => {
    try {
      const res = await fetch(`/api/admin/approvals?status=${filter}&limit=100`)
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
  }, [filter])

  // Poll every 5 seconds for new items
  useEffect(() => {
    const interval = setInterval(loadApprovals, 5000)
    return () => clearInterval(interval)
  }, [filter])

  const handleAction = async (id: string, action: 'approve' | 'deny') => {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/admin/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setApprovals(prev => prev.filter(a => a.id !== id))
        setPendingCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to process approval:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const timeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60))
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
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
          <div className="flex gap-2 mt-4">
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

        {approvals.map(approval => {
          const gateConf = GATE_CONFIG[approval.gate] || { label: approval.gate, icon: ShieldCheck, color: 'bg-gray-100 text-gray-700' }
          const prioConf = PRIORITY_CONFIG[approval.priority] || PRIORITY_CONFIG.NORMAL
          const GateIcon = gateConf.icon
          const isPending = approval.status === 'PENDING'

          return (
            <Card key={approval.id} className={`p-6 ${isPending && approval.priority === 'URGENT' ? 'border-red-300 border-2' : ''}`}>
              <div className="flex items-start gap-4">
                {/* Gate icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${gateConf.color}`}>
                  <GateIcon size={24} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{approval.title}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${gateConf.color}`}>
                      {gateConf.label}
                    </span>
                    {approval.priority !== 'NORMAL' && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${prioConf.color}`}>
                        {prioConf.label}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mt-1">{approval.description}</p>

                  {/* Draft content preview */}
                  {approval.draftContent && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-1">Draft Content:</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{approval.draftContent}</p>
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
                      onClick={() => handleAction(approval.id, 'deny')}
                      variant="outline"
                      size="sm"
                      disabled={processingId === approval.id}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <ShieldX size={16} className="mr-1" />
                      Deny
                    </Button>
                    <Button
                      onClick={() => handleAction(approval.id, 'approve')}
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
