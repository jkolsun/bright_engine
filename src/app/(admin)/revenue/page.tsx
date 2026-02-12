import { prisma } from '@/lib/db'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, DollarSign, Users, Calendar } from 'lucide-react'

export default async function RevenuePage() {
  // Calculate MRR
  const activeClients = await prisma.client.findMany({
    where: { hostingStatus: 'ACTIVE' },
    select: { monthlyRevenue: true }
  })

  const totalMRR = activeClients.reduce((sum, client) => sum + client.monthlyRevenue, 0)
  const hostingMRR = activeClients.length * 39
  const upsellsMRR = totalMRR - hostingMRR

  // Get this month's revenue
  const firstDayOfMonth = new Date()
  firstDayOfMonth.setDate(1)
  firstDayOfMonth.setHours(0, 0, 0, 0)

  const monthRevenue = await prisma.revenue.aggregate({
    where: {
      createdAt: { gte: firstDayOfMonth },
      status: 'PAID'
    },
    _sum: { amount: true }
  })

  // Get revenue by type for this month
  const revenueByType = await prisma.revenue.groupBy({
    by: ['type'],
    where: {
      createdAt: { gte: firstDayOfMonth },
      status: 'PAID'
    },
    _sum: { amount: true },
    _count: true
  })

  // Calculate churn
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const cancelledLastMonth = await prisma.client.count({
    where: {
      hostingStatus: 'CANCELLED',
      updatedAt: { gte: thirtyDaysAgo }
    }
  })

  const totalActiveStart = activeClients.length + cancelledLastMonth
  const churnRate = totalActiveStart > 0 ? (cancelledLastMonth / totalActiveStart) * 100 : 0

  // Get recent transactions
  const recentTransactions = await prisma.revenue.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      client: {
        select: {
          companyName: true
        }
      }
    }
  })

  // Projections
  const projectedAnnualRevenue = totalMRR * 12
  const avgRevenuePerClient = totalMRR / activeClients.length

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Revenue</h1>
        <p className="text-gray-500 mt-1">Financial performance and metrics</p>
      </div>

      {/* MRR Overview */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-blue-100 text-sm font-medium">Monthly Recurring Revenue</p>
            <h2 className="text-4xl font-bold mt-2">{formatCurrency(totalMRR)}</h2>
            <p className="text-blue-100 text-sm mt-2">
              +{((totalMRR / (hostingMRR || 1) - 1) * 100).toFixed(0)}% from base hosting
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm font-medium">Hosting MRR</p>
            <p className="text-2xl font-bold mt-2">{formatCurrency(hostingMRR)}</p>
            <p className="text-blue-100 text-sm mt-2">{activeClients.length} active clients</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm font-medium">Upsells MRR</p>
            <p className="text-2xl font-bold mt-2">{formatCurrency(upsellsMRR)}</p>
            <p className="text-blue-100 text-sm mt-2">
              {((upsellsMRR / totalMRR) * 100).toFixed(0)}% of total
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm font-medium">Projected Annual</p>
            <p className="text-2xl font-bold mt-2">{formatCurrency(projectedAnnualRevenue)}</p>
            <p className="text-blue-100 text-sm mt-2">
              {formatCurrency(avgRevenuePerClient)}/client avg
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<DollarSign className="text-green-600" size={20} />}
          title="This Month"
          value={formatCurrency(monthRevenue._sum.amount || 0)}
          subtitle="Total collected"
        />
        <MetricCard
          icon={<Users className="text-blue-600" size={20} />}
          title="Active Clients"
          value={activeClients.length}
          subtitle={`${formatCurrency(hostingMRR)} hosting MRR`}
        />
        <MetricCard
          icon={<TrendingUp className="text-purple-600" size={20} />}
          title="Churn Rate"
          value={`${churnRate.toFixed(1)}%`}
          subtitle="Last 30 days"
        />
        <MetricCard
          icon={<Calendar className="text-orange-600" size={20} />}
          title="Avg Revenue"
          value={formatCurrency(avgRevenuePerClient)}
          subtitle="Per client/month"
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Type (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueByType.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-500">{item._count} transactions</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(item._sum.amount || 0)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricRow
              label="Average Client Value (LTV)"
              value={formatCurrency(avgRevenuePerClient * 12)}
              subtitle="12-month estimate"
            />
            <MetricRow
              label="Upsell Attach Rate"
              value={`${((upsellsMRR / totalMRR) * 100).toFixed(0)}%`}
              subtitle="Clients with upsells"
            />
            <MetricRow
              label="Monthly Churn"
              value={`${churnRate.toFixed(1)}%`}
              subtitle={`${cancelledLastMonth} cancellations`}
            />
            <MetricRow
              label="Net MRR Growth"
              value={formatCurrency((totalMRR - hostingMRR) / activeClients.length)}
              subtitle="Per client above base"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-sm text-gray-500 border-b">
                <tr>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Client</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Product</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 text-sm text-gray-600">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-sm font-medium text-gray-900">
                      {transaction.client.companyName}
                    </td>
                    <td className="py-3 text-sm text-gray-600">
                      {transaction.type.replace('_', ' ')}
                    </td>
                    <td className="py-3 text-sm text-gray-600">
                      {transaction.product || '-'}
                    </td>
                    <td className="py-3 text-sm font-semibold text-right text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="py-3 text-right">
                      <StatusBadge status={transaction.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  icon,
  title,
  value,
  subtitle
}: {
  icon: React.ReactNode
  title: string
  value: string | number
  subtitle: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricRow({
  label,
  value,
  subtitle
}: {
  label: string
  value: string
  subtitle: string
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    PAID: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    FAILED: 'bg-red-100 text-red-800',
    REFUNDED: 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}
