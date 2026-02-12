'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { useState } from 'react'
import {
  Phone, Target, TrendingUp, DollarSign, Users, Clock,
  Calendar, CheckCircle, XCircle, Award, Zap, MessageSquare
} from 'lucide-react'
import Link from 'next/link'

// Mock rep data
const MOCK_REP_DATA = {
  rep: {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah@bright.com',
    role: 'REP',
    avatar: null
  },
  stats: {
    today: {
      calls: 24,
      closes: 2,
      revenue: 598,
      contacted: 18
    },
    thisWeek: {
      calls: 87,
      closes: 8,
      revenue: 2392,
      contacted: 65
    },
    thisMonth: {
      calls: 342,
      closes: 28,
      revenue: 8372,
      contacted: 245,
      conversionRate: 11.4
    },
    allTime: {
      closes: 156,
      revenue: 46644,
      avgDealSize: 299,
      avgTimeToClose: 7.2
    }
  },
  leaderboard: {
    position: 2,
    total: 5,
    topRep: 'Andrew Tesauro',
    topRevenue: 9240
  },
  earnings: {
    thisMonth: 4186,
    commission: 0.50, // 50%
    pending: 1196,
    paid: 2990,
    nextPayout: new Date('2026-03-01')
  },
  activeLeads: [
    {
      id: 1,
      name: 'John Smith',
      company: 'ABC Roofing',
      phone: '5551234567',
      status: 'HOT_LEAD',
      priority: 'HOT',
      lastContact: new Date(Date.now() - 2 * 60 * 60 * 1000),
      nextAction: 'Follow up on preview feedback',
      value: 299
    },
    {
      id: 3,
      name: 'Sarah Davis',
      company: 'Pro Painting',
      phone: '5554567890',
      status: 'BUILDING',
      priority: 'HIGH',
      lastContact: new Date(Date.now() - 4 * 60 * 60 * 1000),
      nextAction: 'Send QA link',
      value: 299
    },
    {
      id: 7,
      name: 'Robert Taylor',
      company: 'Supreme Electrical',
      phone: '5558889999',
      status: 'QUALIFIED',
      priority: 'NORMAL',
      lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      nextAction: 'Schedule discovery call',
      value: 299
    }
  ],
  todaysTasks: [
    {
      id: 1,
      type: 'call',
      title: 'Follow up with John Smith',
      time: '10:00 AM',
      leadId: 1,
      priority: 'high'
    },
    {
      id: 2,
      type: 'meeting',
      title: 'Discovery call - Robert Taylor',
      time: '2:00 PM',
      leadId: 7,
      priority: 'high'
    },
    {
      id: 3,
      type: 'follow_up',
      title: 'Send QA link to Sarah Davis',
      time: '4:00 PM',
      leadId: 3,
      priority: 'normal'
    }
  ]
}

export default function RepsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'dialer'>('dashboard')
  const { rep, stats, leaderboard, earnings, activeLeads, todaysTasks } = MOCK_REP_DATA

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rep Portal</h1>
          <p className="text-gray-500 mt-1">Welcome back, {rep.name}!</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success" className="text-sm">
            Rank #{leaderboard.position} of {leaderboard.total}
          </Badge>
          <Button onClick={() => setActiveTab('dialer')}>
            <Phone size={16} className="mr-2" />
            Open Dialer
          </Button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          {/* Today's Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Calls Today"
              value={stats.today.calls}
              icon={<Phone className="text-blue-600" />}
              trend={`${stats.thisWeek.calls} this week`}
            />
            <StatCard
              label="Closes Today"
              value={stats.today.closes}
              icon={<CheckCircle className="text-green-600" />}
              trend={`${stats.thisMonth.closes} this month`}
            />
            <StatCard
              label="Revenue Today"
              value={formatCurrency(stats.today.revenue)}
              icon={<DollarSign className="text-purple-600" />}
              trend={formatCurrency(stats.thisMonth.revenue) + ' MTD'}
            />
            <StatCard
              label="Contacted"
              value={stats.today.contacted}
              icon={<MessageSquare className="text-orange-600" />}
              trend={`${stats.thisWeek.contacted} this week`}
            />
          </div>

          {/* Earnings Card */}
          <Card className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">This Month's Earnings</p>
                <h2 className="text-4xl font-bold mt-2">{formatCurrency(earnings.thisMonth)}</h2>
                <div className="flex gap-6 mt-4 text-sm">
                  <div>
                    <p className="text-green-100">Paid</p>
                    <p className="font-semibold">{formatCurrency(earnings.paid)}</p>
                  </div>
                  <div>
                    <p className="text-green-100">Pending</p>
                    <p className="font-semibold">{formatCurrency(earnings.pending)}</p>
                  </div>
                  <div>
                    <p className="text-green-100">Commission Rate</p>
                    <p className="font-semibold">{earnings.commission * 100}%</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-100 text-sm">Next Payout</p>
                <p className="text-2xl font-bold mt-1">
                  {earnings.nextPayout.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-green-100 text-sm mt-2">On track for</p>
                <p className="text-lg font-semibold text-green-200">
                  {formatCurrency(stats.thisMonth.revenue * earnings.commission)} MTD
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Leads */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Your Active Leads ({activeLeads.length})
                  </h3>
                  <Link href="/leads">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {activeLeads.map(lead => (
                    <div key={lead.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{lead.name}</span>
                            <Badge variant={lead.priority === 'HOT' ? 'destructive' : 'default'} className="text-xs">
                              {lead.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{lead.company} • {lead.phone}</p>
                          <p className="text-sm text-blue-600 mt-2">→ {lead.nextAction}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Last contact: {formatTimeAgo(lead.lastContact)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" onClick={() => window.open(`tel:${lead.phone}`)}>
                            <Phone size={14} className="mr-1" />
                            Call
                          </Button>
                          <Link href={`/leads/${lead.id}`}>
                            <Button size="sm" variant="outline" className="w-full">
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Performance Metrics */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <MetricBox
                    label="Conversion Rate"
                    value={`${stats.thisMonth.conversionRate}%`}
                    subtitle="This month"
                    color="green"
                  />
                  <MetricBox
                    label="Avg Deal Size"
                    value={formatCurrency(stats.allTime.avgDealSize)}
                    subtitle="All time"
                    color="blue"
                  />
                  <MetricBox
                    label="Avg Time to Close"
                    value={`${stats.allTime.avgTimeToClose} days`}
                    subtitle="All time"
                    color="purple"
                  />
                  <MetricBox
                    label="Total Closes"
                    value={stats.allTime.closes}
                    subtitle={formatCurrency(stats.allTime.revenue) + ' revenue'}
                    color="orange"
                  />
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Today's Tasks */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={20} className="text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Today's Tasks</h3>
                </div>
                <div className="space-y-3">
                  {todaysTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border ${
                        task.priority === 'high'
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {task.type === 'call' && <Phone size={16} className="text-blue-600" />}
                          {task.type === 'meeting' && <Calendar size={16} className="text-blue-600" />}
                          {task.type === 'follow_up' && <MessageSquare size={16} className="text-blue-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{task.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{task.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Leaderboard */}
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                <div className="flex items-center gap-2 mb-4">
                  <Award size={20} className="text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Leaderboard</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{leaderboard.topRep}</p>
                        <p className="text-xs text-gray-600">Top performer</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900">{formatCurrency(leaderboard.topRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">
                        {leaderboard.position}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{rep.name} (You)</p>
                        <p className="text-xs text-gray-600">Keep pushing!</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900">{formatCurrency(stats.thisMonth.revenue)}</span>
                  </div>
                  <p className="text-xs text-gray-600 text-center mt-3">
                    {formatCurrency(leaderboard.topRevenue - stats.thisMonth.revenue)} to #1
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : (
        /* Dialer Interface */
        <DialerInterface onClose={() => setActiveTab('dashboard')} leads={activeLeads} />
      )}
    </div>
  )
}

function DialerInterface({ onClose, leads }: any) {
  const [selectedLead, setSelectedLead] = useState(leads[0])
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected'>('idle')

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dialer</h2>
        <Button variant="outline" onClick={onClose}>Close Dialer</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Queue */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Call Queue</h3>
          <div className="space-y-2">
            {leads.map((lead: any) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedLead.id === lead.id
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <p className="font-semibold text-gray-900">{lead.name}</p>
                <p className="text-sm text-gray-600">{lead.company}</p>
                <p className="text-xs text-gray-500 mt-1">{lead.phone}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Active Call */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-8">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-white">
                  {selectedLead.name.split(' ').map((n: string) => n[0]).join('')}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{selectedLead.name}</h3>
              <p className="text-gray-600">{selectedLead.company}</p>
              <p className="text-lg text-gray-700 mt-2">{selectedLead.phone}</p>
            </div>

            {callStatus === 'idle' && (
              <div className="space-y-4">
                <Button
                  size="lg"
                  className="w-full text-lg py-6"
                  onClick={() => {
                    setCallStatus('calling')
                    window.open(`tel:${selectedLead.phone}`)
                    setTimeout(() => setCallStatus('connected'), 2000)
                  }}
                >
                  <Phone size={24} className="mr-3" />
                  Call Now
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => {}}>
                    <MessageSquare size={16} className="mr-2" />
                    Send SMS
                  </Button>
                  <Link href={`/leads/${selectedLead.id}`}>
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {callStatus === 'calling' && (
              <div className="text-center">
                <div className="inline-block animate-pulse">
                  <Phone size={48} className="text-blue-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-4">Calling...</p>
              </div>
            )}

            {callStatus === 'connected' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-block animate-pulse">
                    <div className="w-4 h-4 bg-green-500 rounded-full" />
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mt-2">Connected</p>
                  <p className="text-sm text-gray-600">00:32</p>
                </div>
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full"
                  onClick={() => setCallStatus('idle')}
                >
                  End Call
                </Button>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm">Qualified</Button>
                  <Button variant="outline" size="sm">Not Interested</Button>
                  <Button variant="outline" size="sm">Callback</Button>
                </div>
              </div>
            )}

            {/* Quick Notes */}
            <div className="mt-6 pt-6 border-t border-gray-300">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Quick Info</h4>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <strong>Status:</strong> {selectedLead.status.replace('_', ' ')}
                </p>
                <p className="text-gray-600">
                  <strong>Next Action:</strong> {selectedLead.nextAction}
                </p>
                <p className="text-gray-600">
                  <strong>Value:</strong> {formatCurrency(selectedLead.value)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function StatCard({ label, value, icon, trend }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <div className="p-2 bg-gray-50 rounded-lg">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {trend && <p className="text-xs text-gray-500 mt-1">{trend}</p>}
    </Card>
  )
}

function MetricBox({ label, value, subtitle, color }: any) {
  const colors = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200'
  }

  return (
    <div className={`p-4 rounded-lg border ${colors[color as keyof typeof colors]}`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}
