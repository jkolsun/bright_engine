'use client'

import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, DollarSign, Users, Calendar } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function RevenuePage() {
  const [stats, setStats] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRevenue()
  }, [])

  const loadRevenue = async () => {
    try {
      const [statsRes, transRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/revenue?limit=20')
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
      if (transRes.ok) {
        const data = await transRes.json()
        setTransactions(data.revenue || [])
      }
    } catch (error) {
      console.error('Failed to load revenue:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading revenue...</div>
  }

  const mrr = stats?.mrr || 0
  const arr = mrr * 12
  const activeClients = stats?.activeClients || 0

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Revenue</h1>
        <p className="text-gray-500 mt-1">Financial overview and projections</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">MRR</span>
            <DollarSign size={20} className="text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(mrr)}</div>
          <div className="text-sm text-green-600 mt-2">Monthly Recurring</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">ARR</span>
            <TrendingUp size={20} className="text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(arr)}</div>
          <div className="text-sm text-gray-500 mt-2">Annual Run Rate</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active Clients</span>
            <Users size={20} className="text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{activeClients}</div>
          <div className="text-sm text-gray-500 mt-2">Paying customers</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Avg Rev/Client</span>
            <Calendar size={20} className="text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {activeClients > 0 ? formatCurrency(Math.round(mrr / activeClients)) : '$0'}
          </div>
          <div className="text-sm text-gray-500 mt-2">Per month</div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Client</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Type</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Product</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Amount</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="p-4 text-sm text-gray-700">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-900">
                      {tx.client?.companyName || 'N/A'}
                    </td>
                    <td className="p-4 text-sm text-gray-700">{tx.type.replace(/_/g, ' ')}</td>
                    <td className="p-4 text-sm text-gray-700">{tx.product || '-'}</td>
                    <td className="p-4 text-sm font-semibold text-right text-gray-900">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        tx.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
