'use client'

export const dynamic = 'force-dynamic'
import { formatCurrency } from '@/lib/utils'
import { 
  TrendingUp, 
  Users, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Eye,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [hotLeads, setHotLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const [statsRes, notifRes, leadsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/notifications?limit=5'),
        fetch('/api/leads?status=HOT_LEAD&limit=5')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
      if (notifRes.ok) {
        const notifData = await notifRes.json()
        setNotifications(notifData.notifications || [])
      }
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json()
        setHotLeads(leadsData.leads || [])
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock size={48} className="text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const defaultStats = {
    totalLeads: 0,
    hotLeads: 0,
    totalClients: 0,
    activeClients: 0,
    todayRevenue: 0,
    mrr: 0,
    previewViews: 0,
    previewClicks: 0
  }

  const data = stats || defaultStats

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your automation platform</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users size={24} className="text-blue-600" />}
          label="Total Leads"
          value={data.totalLeads}
          change="+12% this week"
          href="/admin/leads"
        />
        <MetricCard
          icon={<Zap size={24} className="text-red-600" />}
          label="Hot Leads"
          value={data.hotLeads}
          change="Needs attention"
          href="/admin/leads?status=HOT_LEAD"
          alert
        />
        <MetricCard
          icon={<CheckCircle size={24} className="text-green-600" />}
          label="Active Clients"
          value={data.activeClients}
          change={`${data.totalClients} total`}
          href="/admin/clients"
        />
        <MetricCard
          icon={<DollarSign size={24} className="text-purple-600" />}
          label="MRR"
          value={formatCurrency(data.mrr)}
          change={`+${formatCurrency(data.todayRevenue)} today`}
          href="/admin/revenue"
        />
      </div>

      {/* Preview Engagement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Preview Engagement</h3>
            <Eye size={20} className="text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Views</span>
                <span className="font-semibold">{data.previewViews}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">CTA Clicks</span>
                <span className="font-semibold">{data.previewClicks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            <Link href="/admin/leads">
              <Button variant="outline" className="w-full justify-start">
                <Users size={18} className="mr-2" />
                View All Leads
              </Button>
            </Link>
            <Link href="/admin/import">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp size={18} className="mr-2" />
                Import CSV
              </Button>
            </Link>
            <Link href="/admin/messages">
              <Button variant="outline" className="w-full justify-start">
                <AlertCircle size={18} className="mr-2" />
                Messages Center
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Hot Leads */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">🔥 Hot Leads</h3>
          <Link href="/admin/leads?status=HOT_LEAD">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        {hotLeads.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hot leads right now</p>
        ) : (
          <div className="space-y-3">
            {hotLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">
                    {lead.firstName} {lead.lastName} - {lead.companyName}
                  </div>
                  <div className="text-sm text-gray-600">{lead.phone}</div>
                </div>
                <Link href={`/admin/leads/${lead.id}`}>
                  <Button size="sm">View</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notifications */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent notifications</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div key={notif.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{notif.title}</div>
                  <div className="text-sm text-gray-600">{notif.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(notif.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function MetricCard({ 
  icon, 
  label, 
  value, 
  change, 
  href, 
  alert 
}: { 
  icon: React.ReactNode
  label: string
  value: string | number
  change?: string
  href?: string
  alert?: boolean
}) {
  const content = (
    <Card className={`p-6 ${alert ? 'border-red-300 bg-red-50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-600">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {change && (
        <div className={`text-sm mt-2 ${alert ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          {change}
        </div>
      )}
    </Card>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
