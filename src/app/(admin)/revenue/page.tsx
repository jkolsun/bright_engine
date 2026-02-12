import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, DollarSign, Users, Target } from 'lucide-react'

// Mock revenue data
const MOCK_DATA = {
  mrr: 2088,
  arr: 25056,
  activeClients: 42,
  churnRate: 2.4,
  recentTransactions: [
    {
      id: 1,
      client: { companyName: 'ABC Roofing' },
      amount: 299,
      description: 'Setup Fee',
      status: 'PAID',
      createdAt: new Date('2026-02-12')
    },
    {
      id: 2,
      client: { companyName: 'Elite Plumbing' },
      amount: 39,
      description: 'Monthly Hosting',
      status: 'PAID',
      createdAt: new Date('2026-02-10')
    },
    {
      id: 3,
      client: { companyName: 'Pro Painting' },
      amount: 138,
      description: 'Monthly Hosting + SEO',
      status: 'PAID',
      createdAt: new Date('2026-02-08')
    },
    {
      id: 4,
      client: { companyName: 'Quick HVAC' },
      amount: 39,
      description: 'Monthly Hosting',
      status: 'FAILED',
      createdAt: new Date('2026-02-05')
    }
  ],
  breakdown: {
    hosting: 1638,
    seo: 450,
    maintenance: 0,
    other: 0
  }
}

export default async function RevenuePage() {
  const {
    mrr,
    arr,
    activeClients,
    churnRate,
    recentTransactions,
    breakdown
  } = MOCK_DATA

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Revenue</h1>
        <p className="text-gray-500 mt-1">Financial overview and metrics</p>
      </div>

      {/* UI Preview Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>UI Preview Mode</strong> - Showing sample data. Connect to database for real metrics.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(mrr)}
          icon={<DollarSign className="text-green-600" />}
          trend="+12.5%"
        />
        <MetricCard
          title="Annual Run Rate"
          value={formatCurrency(arr)}
          icon={<TrendingUp className="text-blue-600" />}
          trend="+12.5%"
        />
        <MetricCard
          title="Active Clients"
          value={activeClients}
          icon={<Users className="text-purple-600" />}
          trend="+3"
        />
        <MetricCard
          title="Churn Rate"
          value={`${churnRate}%`}
          icon={<Target className="text-orange-600" />}
          trend="Low"
        />
      </div>

      {/* MRR Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <BreakdownItem label="Hosting" value={breakdown.hosting} total={mrr} />
          <BreakdownItem label="SEO" value={breakdown.seo} total={mrr} />
          <BreakdownItem label="Maintenance" value={breakdown.maintenance} total={mrr} />
          <BreakdownItem label="Other" value={breakdown.other} total={mrr} />
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.client.companyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={transaction.status === 'PAID' ? 'success' : 'destructive'}>
                      {transaction.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
  trend
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className="text-sm text-green-600 mt-1">{trend}</p>
          )}
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          {icon}
        </div>
      </div>
    </Card>
  )
}

function BreakdownItem({
  label,
  value,
  total
}: {
  label: string
  value: number
  total: number
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{formatCurrency(value)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{percentage}% of total</span>
    </div>
  )
}
