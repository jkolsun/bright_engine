import { prisma } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Mail,
  Phone,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export default async function AdminDashboard() {
  // Fetch today's stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    totalLeads,
    hotLeads,
    qualifiedToday,
    closedToday,
    totalClients,
    activeClients,
    todayRevenue,
    notifications
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { priority: 'HOT' } }),
    prisma.lead.count({ 
      where: { 
        status: 'QUALIFIED',
        updatedAt: { gte: today }
      }
    }),
    prisma.lead.count({
      where: {
        status: 'PAID',
        updatedAt: { gte: today }
      }
    }),
    prisma.client.count(),
    prisma.client.count({ where: { hostingStatus: 'ACTIVE' } }),
    prisma.revenue.aggregate({
      where: {
        createdAt: { gte: today },
        status: 'PAID'
      },
      _sum: { amount: true }
    }),
    prisma.notification.findMany({
      where: { read: false },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ])

  // Calculate MRR
  const hostingMRR = activeClients * 39
  const upsellsMRR = await calculateUpsellsMRR()
  const totalMRR = hostingMRR + upsellsMRR

  // Get pipeline stats
  const pipeline = await getPipelineStats()

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, Andrew</p>
      </div>

      {/* Today's Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Leads Today"
          value={qualifiedToday}
          icon={<Users className="text-blue-600" />}
          trend="+12%"
        />
        <StatCard
          title="Closed Today"
          value={closedToday}
          icon={<CheckCircle className="text-green-600" />}
          trend="+8%"
        />
        <StatCard
          title="Revenue Today"
          value={formatCurrency(todayRevenue._sum.amount || 0)}
          icon={<DollarSign className="text-purple-600" />}
          trend="+15%"
        />
        <StatCard
          title="Hot Leads"
          value={hotLeads}
          icon={<TrendingUp className="text-red-600" />}
          highlight
        />
      </div>

      {/* MRR Ticker */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Monthly Recurring Revenue</p>
            <h2 className="text-4xl font-bold mt-2">{formatCurrency(totalMRR)}</h2>
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <p className="text-blue-100">Hosting</p>
                <p className="font-semibold">{formatCurrency(hostingMRR)}</p>
              </div>
              <div>
                <p className="text-blue-100">Upsells</p>
                <p className="font-semibold">{formatCurrency(upsellsMRR)}</p>
              </div>
              <div>
                <p className="text-blue-100">Clients</p>
                <p className="font-semibold">{activeClients}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">Projected Annual</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalMRR * 12)}</p>
          </div>
        </div>
      </div>

      {/* Pipeline & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline</h3>
          <div className="space-y-3">
            {pipeline.map((stage) => (
              <PipelineStage key={stage.name} {...stage} />
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500">No new notifications</p>
            ) : (
              notifications.map((notif) => (
                <NotificationItem key={notif.id} notification={notif} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  icon, 
  trend,
  highlight = false
}: { 
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  highlight?: boolean
}) {
  return (
    <div className={`bg-white rounded-lg border p-6 ${highlight ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'}`}>
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
    </div>
  )
}

function PipelineStage({ name, count, color }: { name: string, count: number, color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-sm font-medium text-gray-700">{name}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">{count}</span>
    </div>
  )
}

function NotificationItem({ notification }: { notification: any }) {
  const getIcon = () => {
    switch (notification.type) {
      case 'HOT_LEAD':
        return <TrendingUp size={16} className="text-red-600" />
      case 'PAYMENT_RECEIVED':
        return <DollarSign size={16} className="text-green-600" />
      case 'PAYMENT_FAILED':
        return <AlertCircle size={16} className="text-red-600" />
      default:
        return <Mail size={16} className="text-blue-600" />
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      {getIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
        <p className="text-sm text-gray-600 truncate">{notification.message}</p>
      </div>
      <span className="text-xs text-gray-500">
        {new Date(notification.createdAt).toLocaleTimeString()}
      </span>
    </div>
  )
}

async function getPipelineStats() {
  const stages = [
    { name: 'New', status: 'NEW', color: 'bg-gray-400' },
    { name: 'Hot Lead', status: 'HOT_LEAD', color: 'bg-red-500' },
    { name: 'Qualified', status: 'QUALIFIED', color: 'bg-blue-500' },
    { name: 'Building', status: 'BUILDING', color: 'bg-yellow-500' },
    { name: 'Review', status: 'CLIENT_REVIEW', color: 'bg-purple-500' },
    { name: 'Paid', status: 'PAID', color: 'bg-green-500' },
  ]

  const counts = await Promise.all(
    stages.map(async (stage) => ({
      ...stage,
      count: await prisma.lead.count({ where: { status: stage.status as any } })
    }))
  )

  return counts
}

async function calculateUpsellsMRR() {
  const clients = await prisma.client.findMany({
    where: { hostingStatus: 'ACTIVE' },
    select: { upsells: true }
  })

  let total = 0
  clients.forEach((client) => {
    if (client.upsells && Array.isArray(client.upsells)) {
      client.upsells.forEach((upsell: any) => {
        total += upsell.price || 0
      })
    }
  })

  return total
}
