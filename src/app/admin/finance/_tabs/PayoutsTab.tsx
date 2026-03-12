'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  Wallet,
  Clock,
  CheckCircle,
  DollarSign,
  Download,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  X,
  Loader2,
  ArrowDownRight,
} from 'lucide-react'

interface CommissionItem {
  id: string
  clientName: string
  type: string
  dealAmount: number | null
  commissionRate: number | null
  commissionAmount: number
  status: string
  isPayable: boolean
  payableDate: string
  isClawback: boolean
  createdAt: string
  notes: string | null
}

interface RepGroup {
  repId: string
  repName: string
  repEmail: string
  commissionRate: number
  payableTotal: number
  pendingTotal: number
  clawbackTotal: number
  netPayable: number
  commissions: CommissionItem[]
}

interface Totals {
  totalPayable: number
  totalPending: number
  totalClawbacks: number
  netPayable: number
  paidThisMonth: number
  paidAllTime: number
}

interface BatchItem {
  batchId: string | null
  wiseTransferId: string | null
  paidAt: string
  repName: string
  repEmail: string
  repId: string
  totalPaid: number
  commissions: {
    id: string
    clientName: string
    type: string
    amount: number
    dealAmount: number | null
    commissionRate: number | null
    createdAt: string
    paidAt: string
  }[]
}

export default function PayoutsTab() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [reps, setReps] = useState<RepGroup[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [batches, setBatches] = useState<BatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedReps, setExpandedReps] = useState<Set<string>>(new Set())
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())

  // Mark paid modal
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRepName, setModalRepName] = useState('')
  const [modalRepId, setModalRepId] = useState('')
  const [modalCommissions, setModalCommissions] = useState<CommissionItem[]>([])
  const [wiseTransferId, setWiseTransferId] = useState('')
  const [markingPaid, setMarkingPaid] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadData()
  }, [tab])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/payouts?view=${tab}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()

      if (tab === 'pending') {
        setReps(data.reps || [])
        setTotals(data.totals || null)
      } else {
        setBatches(data.batches || [])
      }
    } catch (err) {
      console.error('Failed to load payouts:', err)
      showToast('Failed to load payouts data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const toggleRep = (repId: string) => {
    setExpandedReps(prev => {
      const next = new Set(prev)
      if (next.has(repId)) next.delete(repId)
      else next.add(repId)
      return next
    })
  }

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev)
      if (next.has(batchId)) next.delete(batchId)
      else next.add(batchId)
      return next
    })
  }

  const openMarkPaidModal = (rep: RepGroup, commissions?: CommissionItem[]) => {
    const items = commissions || rep.commissions.filter(c => c.isPayable || c.isClawback)
    setModalRepName(rep.repName)
    setModalRepId(rep.repId)
    setModalCommissions(items)
    setWiseTransferId('')
    setMarkingPaid(false)
    setModalOpen(true)
  }

  const handleMarkPaid = async () => {
    if (!wiseTransferId.trim()) return
    setMarkingPaid(true)
    try {
      const res = await fetch('/api/admin/payouts/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionIds: modalCommissions.map(c => c.id),
          wiseTransferId: wiseTransferId.trim(),
          repId: modalRepId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Failed to mark as paid', 'error')
        setMarkingPaid(false)
        return
      }
      showToast(`Paid ${formatCurrency(data.totalPaid)} to ${data.repName}`, 'success')
      setModalOpen(false)
      loadData()
    } catch {
      showToast('Network error — please try again', 'error')
      setMarkingPaid(false)
    }
  }

  const handleExport = () => {
    window.open(`/api/admin/payouts/export?view=${tab}`, '_blank')
  }

  const getDealType = (type: string) => {
    if (type === 'SITE_BUILD') return 'Site Build'
    if (type === 'MONTHLY_RESIDUAL') return 'Monthly Hosting'
    if (type === 'MONTHLY_RETAINER') return 'Monthly Retainer'
    if (type === 'BONUS') return 'Bonus'
    return type
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const modalNetTotal = modalCommissions.reduce((sum, c) => sum + c.commissionAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Weekly rep commission payouts via Wise</p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      {totals && tab === 'pending' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={<Wallet size={20} />}
            iconBg="bg-emerald-50 dark:bg-emerald-950/30"
            iconColor="text-emerald-600"
            label="Ready to Pay"
            value={formatCurrency(totals.netPayable)}
            subline={totals.totalClawbacks < 0 ? `Includes ${formatCurrency(Math.abs(totals.totalClawbacks))} in clawbacks` : undefined}
            sublineColor="text-red-500 dark:text-red-400"
          />
          <SummaryCard
            icon={<Clock size={20} />}
            iconBg="bg-amber-50 dark:bg-amber-950/30"
            iconColor="text-amber-600"
            label="Pending (< 7 days)"
            value={formatCurrency(totals.totalPending)}
          />
          <SummaryCard
            icon={<CheckCircle size={20} />}
            iconBg="bg-blue-50 dark:bg-blue-950/30"
            iconColor="text-blue-600"
            label="Paid This Month"
            value={formatCurrency(totals.paidThisMonth)}
          />
          <SummaryCard
            icon={<DollarSign size={20} />}
            iconBg="bg-gray-50 dark:bg-slate-800/50"
            iconColor="text-gray-600 dark:text-gray-400"
            label="Paid All-Time"
            value={formatCurrency(totals.paidAllTime)}
          />
        </div>
      )}

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('pending')}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
            tab === 'pending' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Ready to Pay
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
            tab === 'history' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Payout History
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-gray-400 dark:text-gray-500" />
        </div>
      )}

      {/* Pending Tab */}
      {!loading && tab === 'pending' && (
        <>
          {reps.length === 0 ? (
            <Card className="p-12 rounded-2xl border-0 shadow-medium bg-white/80 dark:bg-slate-900/80 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <Wallet size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">No commissions yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Payouts will appear here when reps close deals.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {reps.map(rep => {
                const repKey = rep.repId || `pt_${rep.repName}`
                return (
                  <RepCard
                    key={repKey}
                    rep={rep}
                    expanded={expandedReps.has(repKey)}
                    onToggle={() => toggleRep(repKey)}
                    onMarkAllPaid={() => openMarkPaidModal(rep)}
                    onMarkSinglePaid={(c) => openMarkPaidModal(rep, [c])}
                    getDealType={getDealType}
                    formatDate={formatDate}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {!loading && tab === 'history' && (
        <>
          {batches.length === 0 ? (
            <Card className="p-12 rounded-2xl border-0 shadow-medium bg-white/80 dark:bg-slate-900/80 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">No payout history yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Past payouts will appear here after you mark commissions as paid.</p>
            </Card>
          ) : (
            <Card className="rounded-2xl border-0 shadow-medium bg-white/80 dark:bg-slate-900/80 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8" />
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payout Date</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rep</th>
                    <th className="text-right px-5 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Paid</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Wise Transfer ID</th>
                    <th className="text-center px-5 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"># Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {batches.map((batch, i) => {
                    const batchKey = batch.batchId || `batch-${i}`
                    const isExpanded = expandedBatches.has(batchKey)
                    return (
                      <BatchRow
                        key={batchKey}
                        batch={batch}
                        batchKey={batchKey}
                        isExpanded={isExpanded}
                        onToggle={() => toggleBatch(batchKey)}
                        getDealType={getDealType}
                        formatDate={formatDate}
                      />
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* Mark Paid Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !markingPaid && setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Confirm Payout — {modalRepName}</h3>
              <button onClick={() => !markingPaid && setModalOpen(false)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Line items */}
              <div className="max-h-64 overflow-auto space-y-2">
                {modalCommissions.map(c => (
                  <div key={c.id} className={`flex items-center justify-between text-sm py-1.5 ${c.isClawback ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{c.clientName}</span>
                      <span className="text-gray-400 dark:text-gray-500 ml-2">{formatDate(c.createdAt)}</span>
                    </div>
                    <span className="font-semibold ml-4 whitespace-nowrap">
                      {c.isClawback ? '-' : ''}{formatCurrency(Math.abs(c.commissionAmount))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Net total */}
              <div className="border-t dark:border-slate-700 pt-3 flex items-center justify-between">
                <span className="font-bold text-gray-900 dark:text-gray-100">Net Total</span>
                <span className={`text-xl font-bold ${modalNetTotal >= 0 ? 'text-emerald-600' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(modalNetTotal)}
                </span>
              </div>

              {/* Wise Transfer ID */}
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                  Wise Transfer ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={wiseTransferId}
                  onChange={e => setWiseTransferId(e.target.value)}
                  placeholder="e.g., WISE-123456789"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm bg-gray-50/50 dark:bg-slate-800/50 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={markingPaid}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkPaid}
                  disabled={markingPaid || !wiseTransferId.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {markingPaid ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  {markingPaid ? 'Processing...' : 'Confirm Payout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className={`rounded-xl shadow-lg px-5 py-3 flex items-center gap-3 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────

function SummaryCard({ icon, iconBg, iconColor, label, value, subline, sublineColor }: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: string
  subline?: string
  sublineColor?: string
}) {
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-medium bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      {subline && <p className={`text-[11px] font-medium mt-1 ${sublineColor || 'text-gray-500 dark:text-gray-400'}`}>{subline}</p>}
    </Card>
  )
}

function RepCard({ rep, expanded, onToggle, onMarkAllPaid, onMarkSinglePaid, getDealType, formatDate }: {
  rep: RepGroup
  expanded: boolean
  onToggle: () => void
  onMarkAllPaid: () => void
  onMarkSinglePaid: (c: CommissionItem) => void
  getDealType: (t: string) => string
  formatDate: (d: string) => string
}) {
  const hasPayable = rep.netPayable > 0
  const payableComms = rep.commissions.filter(c => c.isPayable && !c.isClawback)
  const pendingComms = rep.commissions.filter(c => !c.isPayable && !c.isClawback)
  const clawbacks = rep.commissions.filter(c => c.isClawback)

  return (
    <Card className="rounded-2xl border-0 shadow-medium bg-white/80 dark:bg-slate-900/80 overflow-hidden">
      {/* Card Header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-shrink-0">
          {expanded ? <ChevronDown size={18} className="text-gray-400 dark:text-gray-500" /> : <ChevronRight size={18} className="text-gray-400 dark:text-gray-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 dark:text-gray-100">{rep.repName}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{rep.repEmail}</span>
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-[10px] border-blue-200 dark:border-blue-800">
              {Math.round(rep.commissionRate * 100)}%
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-6 flex-shrink-0">
          {rep.pendingTotal > 0 && (
            <div className="text-right">
              <p className="text-xs text-amber-600 font-medium">Pending</p>
              <p className="text-sm font-semibold text-amber-600">{formatCurrency(rep.pendingTotal)}</p>
            </div>
          )}
          {rep.clawbackTotal < 0 && (
            <div className="text-right">
              <p className="text-xs text-red-500 dark:text-red-400 font-medium">Clawbacks</p>
              <p className="text-sm font-semibold text-red-500 dark:text-red-400">{formatCurrency(rep.clawbackTotal)}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs text-emerald-600 font-medium">Net Payable</p>
            <p className={`text-lg font-bold ${rep.netPayable > 0 ? 'text-emerald-600' : rep.netPayable < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {formatCurrency(rep.netPayable)}
            </p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onMarkAllPaid() }}
            disabled={!hasPayable}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
          >
            Mark All Paid
          </button>
        </div>
      </div>

      {/* Card Body */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-5 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-right px-5 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deal Amount</th>
                <th className="text-right px-5 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rate</th>
                <th className="text-right px-5 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Commission</th>
                <th className="text-left px-5 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
              {/* Payable rows */}
              {payableComms.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-2.5 text-gray-600 dark:text-gray-400">{formatDate(c.createdAt)}</td>
                  <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-gray-100">{c.clientName}</td>
                  <td className="px-5 py-2.5 text-gray-600 dark:text-gray-400">{getDealType(c.type)}</td>
                  <td className="px-5 py-2.5 text-right text-gray-600 dark:text-gray-400">{c.dealAmount ? formatCurrency(c.dealAmount) : '—'}</td>
                  <td className="px-5 py-2.5 text-right text-gray-600 dark:text-gray-400">{c.commissionRate ? `${Math.round(c.commissionRate * 100)}%` : '—'}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(c.commissionAmount)}</td>
                  <td className="px-5 py-2.5">
                    <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] border-emerald-200 dark:border-emerald-800">
                      <CheckCircle size={10} className="mr-1" /> Payable
                    </Badge>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => onMarkSinglePaid(c)}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400 hover:underline"
                    >
                      Mark Paid
                    </button>
                  </td>
                </tr>
              ))}
              {/* Pending rows (< 7 days) */}
              {pendingComms.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-2.5 text-gray-400 dark:text-gray-500">{formatDate(c.createdAt)}</td>
                  <td className="px-5 py-2.5 font-medium text-gray-400 dark:text-gray-500">{c.clientName}</td>
                  <td className="px-5 py-2.5 text-gray-400 dark:text-gray-500">{getDealType(c.type)}</td>
                  <td className="px-5 py-2.5 text-right text-gray-400 dark:text-gray-500">{c.dealAmount ? formatCurrency(c.dealAmount) : '—'}</td>
                  <td className="px-5 py-2.5 text-right text-gray-400 dark:text-gray-500">{c.commissionRate ? `${Math.round(c.commissionRate * 100)}%` : '—'}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-gray-400 dark:text-gray-500">{formatCurrency(c.commissionAmount)}</td>
                  <td className="px-5 py-2.5">
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 text-[10px] border-amber-200 dark:border-amber-800">
                      <Clock size={10} className="mr-1" /> Payable {new Date(c.payableDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Badge>
                  </td>
                  <td className="px-5 py-2.5" />
                </tr>
              ))}
              {/* Clawback rows */}
              {clawbacks.map(c => {
                let reason = ''
                try {
                  const meta = JSON.parse(c.notes || '{}')
                  reason = meta.reason || 'Client refund'
                } catch { reason = 'Client refund' }
                return (
                  <tr key={c.id} className="hover:bg-red-50/30 dark:hover:bg-red-950/20 bg-red-50/20 dark:bg-red-950/10">
                    <td className="px-5 py-2.5 text-red-500 dark:text-red-400">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-2.5 font-medium text-red-600 dark:text-red-400">{c.clientName}</td>
                    <td className="px-5 py-2.5 text-red-500 dark:text-red-400">{getDealType(c.type)}</td>
                    <td className="px-5 py-2.5 text-right text-red-500 dark:text-red-400">—</td>
                    <td className="px-5 py-2.5 text-right text-red-500 dark:text-red-400">—</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-red-600 dark:text-red-400">-{formatCurrency(Math.abs(c.commissionAmount))}</td>
                    <td className="px-5 py-2.5">
                      <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[10px] border-red-200 dark:border-red-800" title={reason}>
                        <ArrowDownRight size={10} className="mr-1" /> Clawback
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5" />
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rep.netPayable < 0 && (
            <div className="px-5 py-3 bg-red-50 dark:bg-red-950/30 border-t border-red-100 dark:border-red-900/40 flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle size={16} />
              Rep has {formatCurrency(Math.abs(rep.netPayable))} in outstanding clawbacks exceeding earnings. Mark All Paid is disabled.
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function BatchRow({ batch, batchKey, isExpanded, onToggle, getDealType, formatDate }: {
  batch: BatchItem
  batchKey: string
  isExpanded: boolean
  onToggle: () => void
  getDealType: (t: string) => string
  formatDate: (d: string) => string
}) {
  return (
    <>
      <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={onToggle}>
        <td className="px-5 py-3">
          {isExpanded ? <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" /> : <ChevronRight size={14} className="text-gray-400 dark:text-gray-500" />}
        </td>
        <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{batch.paidAt ? formatDate(batch.paidAt) : '—'}</td>
        <td className="px-5 py-3">
          <span className="font-medium text-gray-900 dark:text-gray-100">{batch.repName}</span>
          <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">{batch.repEmail}</span>
        </td>
        <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(batch.totalPaid)}</td>
        <td className="px-5 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{batch.wiseTransferId || '—'}</td>
        <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400">{batch.commissions.length}</td>
      </tr>
      {isExpanded && batch.commissions.map(c => (
        <tr key={c.id} className="bg-gray-50/50 dark:bg-slate-800/50">
          <td className="px-5 py-2" />
          <td className="px-5 py-2 text-xs text-gray-500 dark:text-gray-400">{formatDate(c.createdAt)}</td>
          <td className="px-5 py-2 text-xs text-gray-700 dark:text-gray-300">{c.clientName}</td>
          <td className="px-5 py-2 text-right text-xs text-gray-700 dark:text-gray-300">{formatCurrency(c.amount)}</td>
          <td className="px-5 py-2 text-xs text-gray-500 dark:text-gray-400">{getDealType(c.type)}</td>
          <td className="px-5 py-2" />
        </tr>
      ))}
    </>
  )
}
