'use client'

import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, TrendingUp, Calendar, Award } from 'lucide-react'
import { useState, useEffect } from 'react'

interface CommissionData {
  thisMonth: number
  pending: number
  paid: number
  total: number
}

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<CommissionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEarnings()
  }, [])

  const loadEarnings = async () => {
    try {
      setLoading(true)
      setError(null)

      const meRes = await fetch('/api/auth/me')
      if (!meRes.ok) {
        setError('Not authenticated')
        return
      }

      const meData = await meRes.json()
      const userId = meData.user.id

      const commRes = await fetch(`/api/commissions?userId=${userId}`)
      if (!commRes.ok) {
        setEarnings({
          thisMonth: 0,
          pending: 0,
          paid: 0,
          total: 0,
        })
        return
      }

      const commData = await commRes.json()
      const commissions = commData.commissions || []

      const now = new Date()
      const thisMonth = commissions
        .filter((c: any) => {
          const commDate = new Date(c.createdAt)
          return (
            commDate.getMonth() === now.getMonth() &&
            commDate.getFullYear() === now.getFullYear()
          )
        })
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0)

      const pending = commissions
        .filter((c: any) => c.status === 'PENDING')
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0)

      const paid = commissions
        .filter((c: any) => c.status === 'PAID')
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0)

      const total = commissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)

      setEarnings({
        thisMonth,
        pending,
        paid,
        total,
      })
    } catch (error) {
      console.error('Failed to load earnings:', error)
      setError('Failed to load earnings data')
    } finally {
      setLoading(false)
    }
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

  if (error || !earnings) {
    return (
      <div className="p-8 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
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

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
        <p className="text-gray-500 mt-1 text-sm">Track your commissions and payouts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <EarningsCard
          icon={<DollarSign size={20} />}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          label="This Month"
          value={formatCurrency(earnings.thisMonth)}
          subtitle="Current month earnings"
        />
        <EarningsCard
          icon={<Calendar size={20} />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="Pending"
          value={formatCurrency(earnings.pending)}
          subtitle="Awaiting payment"
        />
        <EarningsCard
          icon={<Award size={20} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Paid"
          value={formatCurrency(earnings.paid)}
          subtitle="In your account"
        />
        <EarningsCard
          icon={<TrendingUp size={20} />}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          label="Total"
          value={formatCurrency(earnings.total)}
          subtitle="All-time earnings"
        />
      </div>

      <Card className="rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Recent Payouts</h3>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Transaction history</p>
        </div>
        <div className="text-center text-gray-500 py-16 border-t border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <DollarSign size={24} className="text-gray-300" />
          </div>
          <p className="font-medium text-gray-600">
            {earnings.paid === 0 ? 'No payouts yet' : 'Payout history will appear here'}
          </p>
          <p className="text-sm text-gray-400 mt-1">Complete sales to start earning commissions</p>
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
