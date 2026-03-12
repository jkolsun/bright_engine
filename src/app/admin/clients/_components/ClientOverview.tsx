'use client'

import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

// ─── Props ───
interface ClientOverviewProps {
  stats: {
    total: number
    active: number
    atRisk: number
    onboarding: number
    failedPayment: number
    totalMRR: number
    deactivated: number
    cancelled: number
  }
  overviewStats: any
  statusFilter: string
  setStatusFilter: (v: string) => void
}

export default function ClientOverview({
  stats,
  overviewStats,
  statusFilter,
  setStatusFilter,
}: ClientOverviewProps) {
  return (
    <>
      {/* Admin Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard label="Active" value={stats.active} variant="success" onClick={() => setStatusFilter('ACTIVE')} active={statusFilter === 'ACTIVE'} />
        <StatCard label="MRR" value={formatCurrency(stats.totalMRR)} variant="primary" onClick={() => setStatusFilter('all')} active={statusFilter === 'all'} />
        <StatCard label="Avg LTV" value={formatCurrency(overviewStats.stats?.avgLtv || 0)} variant="default" />
        <StatCard label="Churn" value={`${overviewStats.stats?.churnRate || 0}%`} variant={overviewStats.stats?.churnRate > 5 ? 'danger' : 'default'} />
        <StatCard label="New This Month" value={overviewStats.stats?.newThisMonth || 0} variant="success" />
        <StatCard label="Net" value={`${(overviewStats.stats?.netNew || 0) >= 0 ? '+' : ''}${overviewStats.stats?.netNew || 0}`} variant={(overviewStats.stats?.netNew || 0) >= 0 ? 'success' : 'danger'} />
        {stats.onboarding > 0 && <StatCard label="Onboarding" value={stats.onboarding} variant="primary" onClick={() => setStatusFilter('ONBOARDING')} active={statusFilter === 'ONBOARDING'} />}
      </div>

      {/* Needs Attention Alerts */}
      {(overviewStats.alerts?.pastDuePayments > 0 || overviewStats.alerts?.pendingEdits > 0 || overviewStats.alerts?.upsellFollowups > 0 || overviewStats.alerts?.escalatedMessages > 0) && (
        <Card className="p-4 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Needs Attention
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {overviewStats.alerts?.pastDuePayments > 0 && (
              <button className="flex items-center gap-2 text-red-700 dark:text-red-400 text-left" onClick={() => setStatusFilter('FAILED_PAYMENT')}>
                🔴 {overviewStats.alerts.pastDuePayments} past-due payments
              </button>
            )}
            {overviewStats.alerts?.pendingEdits > 0 && (
              <a href="/admin/pipeline?tab=builds" className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-left hover:underline">
                🟡 {overviewStats.alerts.pendingEdits} pending edits ({overviewStats.alerts.readyForReview || 0} ready for review)
              </a>
            )}
            {overviewStats.alerts?.upsellFollowups > 0 && (
              <button className="flex items-center gap-2 text-green-700 dark:text-green-400 text-left">
                🟢 {overviewStats.alerts.upsellFollowups} upsell replies to follow up
              </button>
            )}
            {overviewStats.alerts?.escalatedMessages > 0 && (
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                🟠 {overviewStats.alerts.escalatedMessages} escalated conversations
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════
export function StatCard({ label, value, variant = 'default', onClick, active }: {
  label: string; value: string | number; variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning'; onClick?: () => void; active?: boolean
}) {
  const colors = {
    default: 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700',
    primary: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800',
    success: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800',
    danger: 'bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 border-red-200 dark:border-red-800',
    warning: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800',
  }
  return (
    <Card className={`p-4 cursor-pointer transition-all ${colors[variant]} ${active ? 'ring-2 ring-blue-500' : ''}`} onClick={onClick}>
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </Card>
  )
}
