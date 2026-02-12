import { formatCurrency } from '@/lib/utils'
import { 
  TrendingUp, 
  Users, 
  DollarSign,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Eye,
  MousePointer
} from 'lucide-react'
import Link from 'next/link'

// Rich mock data showing full system capabilities
const MOCK_DATA = {
  totalLeads: 156,
  hotLeads: 12,
  qualifiedToday: 8,
  closedToday: 3,
  totalClients: 45,
  activeClients: 42,
  todayRevenue: 897,
  hostingMRR: 42 * 39,
  upsellsMRR: 450,
  avgResponseTime: '4.2 min',
  conversionRate: '23.5%',
  previewViews: 342,
  previewClicks: 89,
  notifications: [
    {
      id: 1,
      type: 'HOT_LEAD',
      title: '🔥 Hot Lead Alert',
      message: 'John Smith (ABC Roofing) opened preview 3 times in 10 minutes',
      leadId: 1,
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      priority: 'HIGH'
    },
    {
      id: 2,
      type: 'PAYMENT_RECEIVED',
      title: '💰 Payment Received',
      message: '$299 setup fee from Elite Plumbing - Mike Johnson',
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
      priority: 'NORMAL'
    },
    {
      id: 3,
      type: 'NEW_LEAD',
      title: '✨ New Lead',
      message: 'Sarah Davis (Pro Painting) submitted info - Dallas, TX',
      leadId: 3,
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      priority: 'NORMAL'
    },
    {
      id: 4,
      type: 'REVIEW_READY',
      title: '👀 Site Ready for Review',
      message: 'Quick HVAC website completed QA - awaiting client approval',
      leadId: 4,
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
      priority: 'NORMAL'
    },
    {
      id: 5,
      type: 'HOT_LEAD',
      title: '🔥 Hot Lead Alert',
      message: 'Lisa Brown (Clean Team) replied "YES" to follow-up SMS',
      leadId: 5,
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      priority: 'HIGH'
    }
  ],
  pipeline: [
    { name: 'New', count: 23, color: 'bg-gray-400', stage: 'NEW' },
    { name: 'Hot Lead', count: 12, color: 'bg-red-500', stage: 'HOT_LEAD' },
    { name: 'Qualified', count: 18, color: 'bg-blue-500', stage: 'QUALIFIED' },
    { name: 'Building', count: 9, color: 'bg-yellow-500', stage: 'BUILDING' },
    { name: 'Review', count: 5, color: 'bg-purple-500', stage: 'CLIENT_REVIEW' },
    { name: 'Paid', count: 89, color: 'bg-green-500', stage: 'PAID' },
  ],
  recentActivity: [
    {
      id: 1,
      type: 'preview_view',
      message: 'John Smith viewed preview (3rd time)',
      time: new Date(Date.now() - 2 * 60 * 1000),
      leadId: 1
    },
    {
      id: 2,
      type: 'sms_sent',
      message: 'Hot lead follow-up sent to Lisa Brown',
      time: new Date(Date.now() - 8 * 60 * 1000),
      leadId: 5
    },
    {
      id: 3,
      type: 'status_change',
      message: 'Sarah Davis moved to BUILDING stage',
      time: new Date(Date.now() - 12 * 60 * 1000),
      leadId: 3
    },
    {
      id: 4,
      type: 'payment',
      message: 'Payment received: $299 from Mike Johnson',
      time: new Date(Date.now() - 15 * 60 * 1000),
      leadId: 2
    },
    {
      id: 5,
      type: 'preview_click',
      message: 'Tom Wilson clicked "Schedule Call" button',
      time: new Date(Date.now() - 20 * 60 * 1000),
      leadId: 4
    }
  ],
  topPerformers: [
    { rep: 'Sarah Johnson', closes: 12, revenue: 8340, conversionRate: 28 },
    { rep: 'Andrew Tesauro', closes: 9, revenue: 6210, conversionRate: 24 },
    { rep: 'Jared Kolsun', closes: 8, revenue: 5890, conversionRate: 22 }
  ]
}

export default function AdminDashboard() {
  const {
    totalLeads,
    hotLeads,
    qualifiedToday,
    closedToday,
    totalClients,
    activeClients,
    todayRevenue,
    hostingMRR,
    upsellsMRR,
    avgResponseTime,
    conversionRate,
    previewViews,
    previewClicks,
    notifications,
    pipeline,
    recentActivity,
    topPerformers
  } = MOCK_DATA

  const totalMRR = hostingMRR + upsellsMRR

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time system overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-700">System Active</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Leads Today"
          value={qualifiedToday}
          icon={<Users className="text-blue-600" />}
          trend="+12%"
          subtitle="vs yesterday"
        />
        <StatCard
          title="Closed Today"
          value={closedToday}
          icon={<CheckCircle className="text-green-600" />}
          trend="+8%"
          subtitle="$897 revenue"
        />
        <StatCard
          title="Hot Leads"
          value={hotLeads}
          icon={<TrendingUp className="text-red-600" />}
          highlight
          subtitle="Need attention"
        />
        <StatCard
          title="Conversion Rate"
          value={conversionRate}
          icon={<Zap className="text-purple-600" />}
          trend="+2.3%"
          subtitle="Above target"
        />
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Preview Views"
          value={previewViews}
          icon={<Eye size={18} className="text-blue-600" />}
          change="+23"
        />
        <MetricCard
          label="Preview Clicks"
          value={previewClicks}
          icon={<MousePointer size={18} className="text-green-600" />}
          change="+12"
        />
        <MetricCard
          label="Avg Response Time"
          value={avgResponseTime}
          icon={<Clock size={18} className="text-orange-600" />}
          change="-0.8 min"
        />
        <MetricCard
          label="Active Clients"
          value={activeClients}
          icon={<Users size={18} className="text-purple-600" />}
          change="+2"
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
            <p className="text-blue-100 text-sm mt-2">Growth Rate</p>
            <p className="text-lg font-semibold text-green-300">+12.5%</p>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline</h3>
          <div className="space-y-3">
            {pipeline.map((stage) => (
              <PipelineStage key={stage.name} {...stage} />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Total Pipeline</span>
              <span className="font-bold text-gray-900">{pipeline.reduce((sum, s) => sum + s.count, 0)}</span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
              {notifications.filter(n => n.priority === 'HIGH').length}
            </span>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {notifications.map((notif) => (
              <NotificationItem key={notif.id} notification={notif} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {recentActivity.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers (This Month)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPerformers.map((performer, idx) => (
            <div key={idx} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                  idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-600'
                }`}>
                  {idx + 1}
                </div>
                <span className="font-semibold text-gray-900">{performer.rep}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Closes</span>
                  <span className="font-semibold text-gray-900">{performer.closes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue</span>
                  <span className="font-semibold text-green-600">{formatCurrency(performer.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Conv. Rate</span>
                  <span className="font-semibold text-blue-600">{performer.conversionRate}%</span>
                </div>
              </div>
            </div>
          ))}
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
  subtitle,
  highlight = false
}: { 
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  subtitle?: string
  highlight?: boolean
}) {
  return (
    <div className={`bg-white rounded-lg border p-6 ${highlight ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'}`}>
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
    </div>
  )
}

function MetricCard({ label, value, icon, change }: any) {
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {change && (
        <p className="text-xs text-green-600 mt-1">{change} today</p>
      )}
    </div>
  )
}

function PipelineStage({ name, count, color, stage }: any) {
  return (
    <Link href={`/leads?status=${stage}`} className="block hover:bg-gray-50 p-2 rounded transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <span className="text-sm font-medium text-gray-700">{name}</span>
        </div>
        <span className="text-sm font-semibold text-gray-900">{count}</span>
      </div>
    </Link>
  )
}

function NotificationItem({ notification }: any) {
  const getIcon = () => {
    switch (notification.type) {
      case 'HOT_LEAD':
        return <TrendingUp size={16} className="text-red-600" />
      case 'PAYMENT_RECEIVED':
        return <DollarSign size={16} className="text-green-600" />
      case 'NEW_LEAD':
        return <Users size={16} className="text-blue-600" />
      case 'REVIEW_READY':
        return <CheckCircle size={16} className="text-purple-600" />
      default:
        return <Mail size={16} className="text-gray-600" />
    }
  }

  const timeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    return `${hours}h ago`
  }

  return (
    <Link 
      href={notification.leadId ? `/leads/${notification.leadId}` : '#'}
      className="block"
    >
      <div className={`flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
        notification.priority === 'HIGH' ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
      }`}>
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
          <p className="text-sm text-gray-600 truncate">{notification.message}</p>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {timeAgo(notification.createdAt)}
        </span>
      </div>
    </Link>
  )
}

function ActivityItem({ activity }: any) {
  const timeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    return `${hours}h ago`
  }

  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
      <div className="flex-1">
        <p className="text-gray-700">{activity.message}</p>
        <p className="text-xs text-gray-500 mt-1">{timeAgo(activity.time)}</p>
      </div>
    </div>
  )
}
