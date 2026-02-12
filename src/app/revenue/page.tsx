import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, DollarSign, Users, Target, Calendar, CreditCard } from 'lucide-react'

// Comprehensive revenue mock data
const MOCK_DATA = {
  mrr: 5544,
  arr: 66528,
  activeClients: 42,
  churnRate: 2.4,
  growth: 12.5,
  
  monthlyBreakdown: [
    { month: 'Aug', revenue: 4200, clients: 35 },
    { month: 'Sep', revenue: 4580, clients: 37 },
    { month: 'Oct', revenue: 4860, clients: 38 },
    { month: 'Nov', revenue: 5120, clients: 40 },
    { month: 'Dec', revenue: 5340, clients: 41 },
    { month: 'Jan', revenue: 5520, clients: 42 },
    { month: 'Feb', revenue: 5544, clients: 42 },
  ],
  
  recentTransactions: [
    {
      id: 1,
      client: { companyName: 'ABC Roofing' },
      amount: 138,
      description: 'Monthly Hosting + SEO',
      status: 'PAID',
      type: 'recurring',
      createdAt: new Date('2026-02-01'),
      stripeInvoiceId: 'in_1234567890'
    },
    {
      id: 2,
      client: { companyName: 'Elite Plumbing' },
      amount: 299,
      description: 'Setup Fee',
      status: 'PAID',
      type: 'one-time',
      createdAt: new Date('2026-02-10'),
      stripeInvoiceId: 'in_0987654321'
    },
    {
      id: 3,
      client: { companyName: 'Pro Painting' },
      amount: 138,
      description: 'Monthly Hosting + SEO',
      status: 'PAID',
      type: 'recurring',
      createdAt: new Date('2026-02-10'),
      stripeInvoiceId: 'in_1122334455'
    },
    {
      id: 4,
      client: { companyName: 'Quick HVAC' },
      amount: 39,
      description: 'Monthly Hosting',
      status: 'FAILED',
      type: 'recurring',
      createdAt: new Date('2026-02-05'),
      stripeInvoiceId: 'in_5544332211'
    },
    {
      id: 5,
      client: { companyName: 'Peak Landscaping' },
      amount: 237,
      description: 'Monthly Hosting + Premium Package',
      status: 'PAID',
      type: 'recurring',
      createdAt: new Date('2026-02-01'),
      stripeInvoiceId: 'in_9988776655'
    }
  ],
  
  breakdown: {
    hosting: 1638,     // 42 clients × $39
    seo: 990,          // 10 clients × $99
    maintenance: 990,  // 10 clients × $99
    premium: 1926      // Custom packages
  },
  
  projections: {
    current: 5544,
    month3: 6480,
    month6: 7920,
    month12: 12960,
    conservative: 11520,
    aggressive: 15840
  },
  
  metrics: {
    avgDealSize: 299,
    avgTimeToClose: 8,
    conversionRate: 23.5,
    ltv: 3588,
    cac: 120
  }
}

export default function RevenuePage() {
  const {
    mrr,
    arr,
    activeClients,
    churnRate,
    growth,
    recentTransactions,
    breakdown,
    projections,
    metrics,
    monthlyBreakdown
  } = MOCK_DATA

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Revenue</h1>
        <p className="text-gray-500 mt-1">Financial overview and growth projections</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(mrr)}
          icon={<DollarSign className="text-green-600" />}
          trend={`+${growth}%`}
          subtitle="vs last month"
        />
        <MetricCard
          title="Annual Run Rate"
          value={formatCurrency(arr)}
          icon={<TrendingUp className="text-blue-600" />}
          trend={`+${growth}%`}
          subtitle="projected"
        />
        <MetricCard
          title="Active Clients"
          value={activeClients}
          icon={<Users className="text-purple-600" />}
          trend="+2"
          subtitle="this month"
        />
        <MetricCard
          title="Churn Rate"
          value={`${churnRate}%`}
          icon={<Target className="text-orange-600" />}
          trend="Low"
          subtitle="industry avg: 5%"
        />
      </div>

      {/* MRR Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <BreakdownItem label="Hosting" value={breakdown.hosting} total={mrr} color="bg-blue-600" />
          <BreakdownItem label="SEO Packages" value={breakdown.seo} total={mrr} color="bg-green-600" />
          <BreakdownItem label="Maintenance" value={breakdown.maintenance} total={mrr} color="bg-purple-600" />
          <BreakdownItem label="Premium" value={breakdown.premium} total={mrr} color="bg-orange-600" />
        </div>
      </Card>

      {/* Growth Chart (Simplified) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">MRR Growth (Last 7 Months)</h3>
        <div className="flex items-end justify-between gap-4 h-64">
          {monthlyBreakdown.map((month, idx) => {
            const maxRevenue = Math.max(...monthlyBreakdown.map(m => m.revenue))
            const height = (month.revenue / maxRevenue) * 100
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg hover:from-blue-700 hover:to-blue-500 transition-all cursor-pointer group"
                    style={{ height: `${height * 2}px` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {formatCurrency(month.revenue)}
                        <div className="text-gray-400">{month.clients} clients</div>
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600">{month.month}</span>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projections */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Projections</h3>
          <div className="space-y-4">
            <ProjectionRow 
              label="Current MRR" 
              value={projections.current} 
              isBase 
            />
            <ProjectionRow 
              label="3 Months (May 2026)" 
              value={projections.month3}
              growth={((projections.month3 - projections.current) / projections.current * 100).toFixed(1)}
            />
            <ProjectionRow 
              label="6 Months (Aug 2026)" 
              value={projections.month6}
              growth={((projections.month6 - projections.current) / projections.current * 100).toFixed(1)}
            />
            <ProjectionRow 
              label="12 Months (Feb 2027)" 
              value={projections.month12}
              growth={((projections.month12 - projections.current) / projections.current * 100).toFixed(1)}
              highlight
            />
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Scenario Planning</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Conservative (15% growth)</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(projections.conservative)}/mo</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Aggressive (30% growth)</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(projections.aggressive)}/mo</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Key Metrics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <MetricRow 
              label="Avg Deal Size" 
              value={formatCurrency(metrics.avgDealSize)}
              description="Initial setup + first month"
            />
            <MetricRow 
              label="Avg Time to Close" 
              value={`${metrics.avgTimeToClose} days`}
              description="From first contact to payment"
            />
            <MetricRow 
              label="Conversion Rate" 
              value={`${metrics.conversionRate}%`}
              description="Qualified leads to paid clients"
            />
            <MetricRow 
              label="Customer Lifetime Value" 
              value={formatCurrency(metrics.ltv)}
              description="Avg value over 12 months"
            />
            <MetricRow 
              label="Customer Acquisition Cost" 
              value={formatCurrency(metrics.cac)}
              description="Marketing + sales costs"
            />
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">LTV:CAC Ratio</span>
                <span className="text-2xl font-bold text-green-600">
                  {(metrics.ltv / metrics.cac).toFixed(1)}:1
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Excellent (target: 3:1)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <Badge variant="outline">Last 30 days</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.client.companyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={transaction.type === 'recurring' ? 'default' : 'outline'}>
                      {transaction.type}
                    </Badge>
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
                    <a href="#" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <CreditCard size={14} />
                      View
                    </a>
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
  trend,
  subtitle
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  subtitle?: string
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          <div className="flex items-center gap-2 mt-2">
            {trend && (
              <span className="text-sm font-semibold text-green-600">{trend}</span>
            )}
            {subtitle && (
              <span className="text-sm text-gray-500">{subtitle}</span>
            )}
          </div>
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
  total,
  color
}: {
  label: string
  value: number
  total: number
  color: string
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
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{percentage}% of total</span>
      </div>
    </div>
  )
}

function ProjectionRow({
  label,
  value,
  growth,
  isBase = false,
  highlight = false
}: {
  label: string
  value: number
  growth?: string
  isBase?: boolean
  highlight?: boolean
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${
      highlight ? 'bg-green-50 border border-green-200' : 
      isBase ? 'bg-gray-100' : 'bg-gray-50'
    }`}>
      <div>
        <span className={`text-sm font-medium ${highlight ? 'text-green-900' : 'text-gray-700'}`}>
          {label}
        </span>
        {growth && (
          <span className="ml-2 text-xs font-semibold text-green-600">+{growth}%</span>
        )}
      </div>
      <span className={`font-bold ${highlight ? 'text-xl text-green-900' : 'text-gray-900'}`}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function MetricRow({
  label,
  value,
  description
}: {
  label: string
  value: string
  description: string
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-lg font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  )
}
