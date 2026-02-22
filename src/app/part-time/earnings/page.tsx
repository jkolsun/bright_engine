'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, TrendingUp, Award, Clock, CheckCircle, AlertCircle, XCircle, Target } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Commission {
  id: string
  amount: number
  status: string
  type: string
  notes: string | null
  createdAt: string
  paidAt: string | null
  rep: { id: string; name: string; email: string }
  client: { id: string; companyName: string }
  dealAmount?: number
  commissionRate?: number
}

interface EarningsData {
  totalEarned: number
  thisMonth: number
  pending: { amount: number; count: number }
  paidTotal: number
  commissions: Commission[]
  activeLeads: number
  paymentLinksSent: number
  dealsThisMonth: number
}

export default function EarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')

  useEffect(() => {
    loadEarnings()
  }, [])

  const loadEarnings = async () => {
    try {
      setLoading(true)
      setError(null)

      const meRes = await fetch('/api/auth/me')
      if (!meRes.ok) { setError('Not authenticated'); return }
      const meData = await meRes.json()
      const userId = meData.user.id

      const commRes = await fetch(`/api/commissions?repId=${userId}&limit=200`)
      if (!commRes.ok) {
        setData({
          totalEarned: 0, thisMonth: 0,
          pending: { amount: 0, count: 0 }, paidTotal: 0,
          commissions: [], activeLeads: 0, paymentLinksSent: 0, dealsThisMonth: 0,
        })
        return
      }

      const commData = await commRes.json()
      const commissions: Commission[] = (commData.commissions || []).map((c: Commission) => {
        if (c.notes) {
          try {
            const meta = JSON.parse(c.notes)
            c.dealAmount = meta.dealAmount
            c.commissionRate = meta.commissionRate
          } catch { /* notes is plain text, ignore */ }
        }
        return c
      })

      // Fetch pipeline data
      let activeLeads = 0
      let paymentLinksSent = 0
      try {
        const pipelineRes = await fetch(`/api/dialer/leads?repId=${userId}&limit=500`)
        if (pipelineRes.ok) {
          const pipelineData = await pipelineRes.json()
          const leads = pipelineData.leads || []
          activeLeads = leads.filter((l: any) => l.status !== 'PAID' && l.status !== 'CLOSED_LOST' && l.status !== 'DO_NOT_CONTACT').length
          paymentLinksSent = leads.filter((l: any) =>
            l.events?.some((e: any) => e.eventType === 'PAYMENT_LINK_SENT' || e.eventType === 'PAYMENT_LINK_SENT_REP') &&
            l.status !== 'PAID'
          ).length
        }
      } catch { /* pipeline data is supplemental */ }

      const now = new Date()

      // Total Earned = everything except REJECTED
      const totalEarned = commissions
        .filter(c => c.status !== 'REJECTED')
        .reduce((sum, c) => sum + (c.amount || 0), 0)

      // This month (all non-REJECTED)
      const thisMonth = commissions
        .filter(c => {
          const d = new Date(c.createdAt)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() &&
            c.status !== 'REJECTED'
        })
        .reduce((sum, c) => sum + (c.amount || 0), 0)

      // Paid total
      const paidTotal = commissions
        .filter(c => c.status === 'PAID')
        .reduce((sum, c) => sum + (c.amount || 0), 0)

      const pendingComms = commissions.filter(c => c.status === 'PENDING')
      const pending = {
        amount: pendingComms.reduce((sum, c) => sum + (c.amount || 0), 0),
        count: pendingComms.length,
      }

      const dealsThisMonth = commissions.filter(c => {
        const d = new Date(c.createdAt)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length

      setData({
        totalEarned, thisMonth, pending, paidTotal, commissions,
        activeLeads, paymentLinksSent, dealsThisMonth,
      })
    } catch (err) {
      console.error('Failed to load earnings:', err)
      setError('Failed to load earnings data')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredCommissions = () => {
    if (!data) return []
    let filtered = data.commissions

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter.toUpperCase())
    }

    if (dateFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter(c => {
        const d = new Date(c.createdAt)
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return d >= weekAgo
        }
        if (dateFilter === 'month') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }
        if (dateFilter === 'lastMonth') {
          const last = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear()
        }
        return true
      })
    }

    return filtered
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { icon: <Clock size={12} />, label: 'Pending', className: 'bg-amber-100 text-amber-700', reason: 'Awaiting Friday payout' }
      case 'APPROVED':
        return { icon: <CheckCircle size={12} />, label: 'Approved', className: 'bg-green-100 text-green-700', reason: 'Ready for payout' }
      case 'PAID':
        return { icon: <DollarSign size={12} />, label: 'Paid', className: 'bg-emerald-100 text-emerald-700', reason: 'Sent via Wise' }
      case 'REJECTED':
        return { icon: <XCircle size={12} />, label: 'Refunded', className: 'bg-red-100 text-red-700', reason: 'Client refunded' }
      default:
        return { icon: <AlertCircle size={12} />, label: status, className: 'bg-gray-100 text-gray-700', reason: '' }
    }
  }

  const getDealType = (comm: Commission) => {
    if (comm.type === 'SITE_BUILD') return 'Site Build'
    if (comm.type === 'MONTHLY_RESIDUAL') return 'Monthly Hosting'
    if (comm.type === 'BONUS') return 'Bonus'
    return comm.notes || comm.type
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <DollarSign size={22} className="text-white" />
          </div>
          <p className="text-gray-500 font-medium">Loading your commission data...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-[family-name:var(--font-space-grotesk),_'Space_Grotesk',_sans-serif]">Earnings</h1>
          <p className="text-gray-500 mt-1 text-sm">Track your commissions and payouts</p>
        </div>
        <Card className="p-8 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <DollarSign size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">
            {error || 'No commission data available yet. Complete your first sale to see earnings here.'}
          </p>
        </Card>
      </div>
    )
  }

  const filtered = getFilteredCommissions()

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-[family-name:var(--font-space-grotesk),_'Space_Grotesk',_sans-serif]">Earnings</h1>
        <p className="text-gray-500 mt-1 text-sm">Track your commissions and payouts</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <EarningsCard
          icon={<TrendingUp size={20} />}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          label="This Month"
          value={formatCurrency(data.thisMonth)}
          subtitle="Current month"
        />
        <EarningsCard
          icon={<Clock size={20} />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="Pending"
          value={formatCurrency(data.pending.amount)}
          subtitle="Awaiting payout"
        />
        <EarningsCard
          icon={<CheckCircle size={20} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Paid"
          value={formatCurrency(data.paidTotal)}
          subtitle="Sent via Wise"
        />
        <EarningsCard
          icon={<DollarSign size={20} />}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          label="Total"
          value={formatCurrency(data.totalEarned)}
          subtitle="All-time earnings"
        />
      </div>

      {/* My Deals Summary */}
      {(data.activeLeads > 0 || data.paymentLinksSent > 0 || data.dealsThisMonth > 0) && (
        <Card className="p-5 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">My Pipeline</h3>
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <span className="text-gray-600">
              You&apos;re assigned to <span className="font-bold text-gray-900">{data.activeLeads}</span> active lead{data.activeLeads !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">
              <span className="font-bold text-amber-600">{data.paymentLinksSent}</span> payment link{data.paymentLinksSent !== 1 ? 's' : ''} sent (awaiting payment)
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">
              <span className="font-bold text-emerald-600">{data.dealsThisMonth}</span> deal{data.dealsThisMonth !== 1 ? 's' : ''} closed this month
            </span>
          </div>
        </Card>
      )}

      {/* Deal-by-Deal Breakdown */}
      <Card className="rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Commission History</h3>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">Deal-by-deal breakdown</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border rounded-xl px-2.5 py-1.5 bg-white focus:ring-teal-500 focus:ring-2 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs border rounded-xl px-2.5 py-1.5 bg-white focus:ring-teal-500 focus:ring-2 focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="lastMonth">Last Month</option>
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <DollarSign size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="font-medium text-gray-600">No commissions found</p>
            <p className="text-sm text-gray-400 mt-1">
              {statusFilter !== 'all' || dateFilter !== 'all' ? 'Try changing your filters' : 'Complete sales to start earning'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Deal Amount</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Your Rate</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Your Commission</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((comm) => {
                  const status = getStatusBadge(comm.status)
                  return (
                    <tr key={comm.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-gray-600">
                        {new Date(comm.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {comm.client?.companyName || 'Unknown'}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {getDealType(comm)}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600">
                        {comm.dealAmount ? formatCurrency(comm.dealAmount) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600">
                        {comm.commissionRate ? `${Math.round(comm.commissionRate * 100)}%` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(comm.amount)}
                      </td>
                      <td className="px-5 py-3">
                        <div>
                          <Badge variant="outline" className={`${status.className} text-[10px] gap-1`}>
                            {status.icon} {status.label}
                          </Badge>
                          <p className="text-[10px] text-gray-400 mt-0.5">{status.reason}</p>
                          {comm.status === 'PAID' && comm.paidAt && (
                            <p className="text-[10px] text-gray-400">Released {new Date(comm.paidAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payout History */}
      <Card className="rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm overflow-hidden">
        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-900">Payout History</h3>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">Transfers to your bank account</p>
        </div>
        <div className="text-center text-gray-500 py-12 border-t border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <Award size={24} className="text-gray-300" />
          </div>
          <p className="font-medium text-gray-600">
            {data.commissions.some(c => c.status === 'PAID') ? 'Payout history will appear here' : 'No payouts yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">Set up your payout account in Settings to receive payouts</p>
        </div>
      </Card>
    </div>
  )
}

function EarningsCard({ icon, iconBg, iconColor, label, value, subtitle }: {
  icon: React.ReactNode, iconBg: string, iconColor: string, label: string, value: string, subtitle: string
}) {
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm card-hover">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-1">{subtitle}</div>
    </Card>
  )
}
