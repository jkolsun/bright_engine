'use client'

import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, TrendingUp, Calendar, Award } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadEarnings() }, [])

  const loadEarnings = async () => {
    try {
      setLoading(true)
      const meRes = await fetch('/api/auth/me')
      if (!meRes.ok) { setError('Not authenticated'); return }
      const meData = await meRes.json()

      const commRes = await fetch(`/api/commissions?userId=${meData.user.id}`)
      if (!commRes.ok) { setEarnings({ thisMonth: 0, pending: 0, paid: 0, total: 0 }); return }

      const commData = await commRes.json()
      const commissions = commData.commissions || []
      const now = new Date()

      setEarnings({
        thisMonth: commissions
          .filter((c: any) => { const d = new Date(c.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
          .reduce((sum: number, c: any) => sum + (c.amount || 0), 0),
        pending: commissions.filter((c: any) => c.status === 'PENDING').reduce((sum: number, c: any) => sum + (c.amount || 0), 0),
        paid: commissions.filter((c: any) => c.status === 'PAID').reduce((sum: number, c: any) => sum + (c.amount || 0), 0),
        total: commissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0),
      })
    } catch (error) {
      console.error('Failed to load earnings:', error)
      setError('Failed to load earnings data')
    } finally { setLoading(false) }
  }

  if (loading) return <div className="p-8"><h1 className="text-3xl font-bold text-gray-900">Earnings</h1><p className="text-gray-500 mt-1">Loading...</p></div>
  if (error || !earnings) return <div className="p-8"><h1 className="text-3xl font-bold text-gray-900">Earnings</h1><Card className="p-6 mt-6"><p className="text-gray-600">{error || 'No commission data yet.'}</p></Card></div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
        <p className="text-gray-500 mt-1">Track your commissions and payouts</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-gray-600">This Month</span><DollarSign size={20} className="text-blue-500" /></div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.thisMonth)}</div>
          <div className="text-xs text-gray-500 mt-1">Current month earnings</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-gray-600">Pending</span><Calendar size={20} className="text-amber-500" /></div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.pending)}</div>
          <div className="text-xs text-gray-500 mt-1">Awaiting payment</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-gray-600">Paid</span><Award size={20} className="text-green-500" /></div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.paid)}</div>
          <div className="text-xs text-gray-500 mt-1">In your account</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-gray-600">Total</span><TrendingUp size={20} className="text-purple-500" /></div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.total)}</div>
          <div className="text-xs text-gray-500 mt-1">All-time earnings</div>
        </Card>
      </div>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Payouts</h3>
        <div className="text-center text-gray-500 py-12">{earnings.paid === 0 ? 'No payouts yet' : 'Payout history will appear here'}</div>
      </Card>
    </div>
  )
}
