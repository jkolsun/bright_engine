'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { useState, useEffect } from 'react'
import {
  Zap,
  MessageSquare,
  TrendingUp,
  Clock,
  AlertCircle,
  Flame,
  RotateCcw,
  CalendarClock,
  UserPlus,
  Trophy,
  Medal,
  Award,
  ChevronRight,
  PhoneCall,
} from 'lucide-react'
import Link from 'next/link'

export default function RepDashboardPage() {
  const [repData, setRepData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [todayStats, setTodayStats] = useState({ dials: 0, conversations: 0, previewLinksSent: 0, closes: 0 })
  const [weekStats, setWeekStats] = useState({ dials: 0, conversations: 0, previewsSent: 0, closes: 0, commissionEarned: 0 })
  const [monthStats, setMonthStats] = useState({ dials: 0, conversations: 0, closes: 0, commissionEarned: 0 })
  const [allTimeStats, setAllTimeStats] = useState({ commissionEarned: 0 })
  const [queueSummary, setQueueSummary] = useState<any>(null)
  const [callbacks, setCallbacks] = useState<any>({ overdue: [], today: [], upcoming: [] })
  const [coachingTip, setCoachingTip] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    try {
      const meRes = await fetch('/api/auth/me')
      if (!meRes.ok) { setLoading(false); return }
      const meData = await meRes.json()
      setRepData(meData.user)

      // Load all data in parallel
      const [activityRes, weekRes, monthRes, allTimeRes, queueRes, callbackRes, leaderboardRes] = await Promise.all([
        fetch('/api/activity'),
        fetch('/api/dialer/stats?period=week'),
        fetch('/api/dialer/stats?period=month'),
        fetch('/api/dialer/stats?period=all'),
        fetch('/api/dialer/queue'),
        fetch('/api/dialer/callback'),
        fetch('/api/users?role=REP'),
      ])

      if (activityRes.ok) {
        const data = await activityRes.json()
        setTodayStats(data.stats)
      }
      if (weekRes.ok) {
        const data = await weekRes.json()
        setWeekStats(data.stats)
        setCoachingTip(data.coachingTip)
      }
      if (monthRes.ok) {
        const data = await monthRes.json()
        setMonthStats(data.stats)
      }
      if (allTimeRes.ok) {
        const data = await allTimeRes.json()
        setAllTimeStats(data.stats)
      }
      if (queueRes.ok) {
        const data = await queueRes.json()
        setQueueSummary(data.summary)
      }
      if (callbackRes.ok) {
        const data = await callbackRes.json()
        setCallbacks(data)
      }
      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json()
        const reps = (data.users || [])
          .map((rep: any) => ({ rep, closes: rep.totalCloses || 0, revenue: (rep.totalCloses || 0) * 75 }))
          .sort((a: any, b: any) => b.revenue - a.revenue)
          .slice(0, 5)
        setLeaderboard(reps)
      }
    } catch (e) {
      console.error('Dashboard load error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !repData) {
    return <div className="p-8 text-center text-gray-500">Loading your dashboard...</div>
  }

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const dailyTarget = { dials: 200, conversations: 40, closes: 3 }
  const progressPercent = Math.min(100, Math.round((todayStats.dials / dailyTarget.dials) * 100))

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {repData.name?.split(' ')[0]}</h1>
          <p className="text-gray-500 mt-1">{todayDate}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/reps/dialer?mode=single">
            <Button variant="outline" className="gap-2">
              <PhoneCall size={18} /> Single Dial
            </Button>
          </Link>
          <Link href="/reps/dialer?mode=power">
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white gap-2 shadow-lg">
              <Zap size={18} /> Power Dial ({queueSummary?.total || 0})
            </Button>
          </Link>
        </div>
      </div>

      {/* Today's Progress */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Today</h2>
          <span className="text-sm text-gray-500">{progressPercent}% of target</span>
        </div>
        <div className="grid grid-cols-3 gap-6 mb-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{todayStats.dials}</span>
              <span className="text-sm text-gray-400">/ {dailyTarget.dials}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Dials</p>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{todayStats.conversations}</span>
              <span className="text-sm text-gray-400">/ {dailyTarget.conversations}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Conversations</p>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{todayStats.closes}</span>
              <span className="text-sm text-gray-400">/ {dailyTarget.closes}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Closes</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* Queue + Callbacks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue Summary */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Queue</h2>
          <div className="space-y-2.5">
            {(queueSummary?.overdueCallbacks || 0) > 0 && (
              <QueueRow icon={<AlertCircle size={16} />} color="text-red-500" bg="bg-red-50"
                label="Overdue callbacks" count={queueSummary.overdueCallbacks} />
            )}
            {(queueSummary?.hotLeads || 0) > 0 && (
              <QueueRow icon={<Flame size={16} />} color="text-orange-500" bg="bg-orange-50"
                label="Hot leads (engaged last 2 hrs)" count={queueSummary.hotLeads} />
            )}
            {(queueSummary?.warmLeads || 0) > 0 && (
              <QueueRow icon={<TrendingUp size={16} />} color="text-yellow-500" bg="bg-yellow-50"
                label="Warm leads (email opened)" count={queueSummary.warmLeads} />
            )}
            {(queueSummary?.scheduledCallbacks || 0) > 0 && (
              <QueueRow icon={<CalendarClock size={16} />} color="text-green-500" bg="bg-green-50"
                label="Scheduled callbacks (today)" count={queueSummary.scheduledCallbacks} />
            )}
            {(queueSummary?.freshLeads || 0) > 0 && (
              <QueueRow icon={<UserPlus size={16} />} color="text-gray-500" bg="bg-gray-50"
                label="Fresh leads" count={queueSummary.freshLeads} />
            )}
            {(queueSummary?.retries || 0) > 0 && (
              <QueueRow icon={<RotateCcw size={16} />} color="text-blue-500" bg="bg-blue-50"
                label="Retries" count={queueSummary.retries} />
            )}
            {(queueSummary?.reEngage || 0) > 0 && (
              <QueueRow icon={<Clock size={16} />} color="text-indigo-500" bg="bg-indigo-50"
                label="Re-engage" count={queueSummary.reEngage} />
            )}
            {!queueSummary && (
              <p className="text-sm text-gray-400 text-center py-4">Loading queue...</p>
            )}
            {queueSummary && (
              <div className="pt-2 border-t flex items-center justify-between">
                <span className="font-semibold text-gray-700">Total in queue</span>
                <span className="font-bold text-lg text-gray-900">{queueSummary.total}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Callbacks */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Callbacks</h2>
          <div className="space-y-3">
            {callbacks.overdue.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase mb-1.5">Overdue</p>
                {callbacks.overdue.slice(0, 3).map((cb: any) => (
                  <CallbackRow key={cb.id} call={cb} overdue />
                ))}
                {callbacks.overdue.length > 3 && (
                  <p className="text-xs text-red-500 mt-1">+{callbacks.overdue.length - 3} more overdue</p>
                )}
              </div>
            )}
            {callbacks.today.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase mb-1.5">Today</p>
                {callbacks.today.slice(0, 3).map((cb: any) => (
                  <CallbackRow key={cb.id} call={cb} />
                ))}
              </div>
            )}
            {callbacks.upcoming.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Upcoming</p>
                <p className="text-sm text-gray-600">{callbacks.upcoming.length} callbacks this week</p>
              </div>
            )}
            {callbacks.overdue.length === 0 && callbacks.today.length === 0 && callbacks.upcoming.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No callbacks scheduled</p>
            )}
            {callbacks.overdue.length > 0 && (
              <Link href="/reps/dialer?startWith=callbacks">
                <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 mt-2">
                  Start with overdue callbacks <ChevronRight size={16} className="ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Stats + Leaderboard + Coaching */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* This Week */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">This Week</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatBlock label="Dials" value={weekStats.dials} />
            <StatBlock label="Conversations" value={weekStats.conversations} />
            <StatBlock label="Closes" value={weekStats.closes} />
            <StatBlock label="Commission" value={formatCurrency(weekStats.commissionEarned)} />
          </div>
        </Card>

        {/* Earnings */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Earnings</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">This week</span>
              <span className="font-semibold text-gray-900">{formatCurrency(weekStats.commissionEarned)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">This month</span>
              <span className="font-semibold text-gray-900">{formatCurrency(monthStats.commissionEarned)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium text-gray-700">All time</span>
              <span className="font-bold text-lg text-green-600">{formatCurrency(allTimeStats.commissionEarned)}</span>
            </div>
          </div>
        </Card>

        {/* Leaderboard */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Leaderboard</h2>
          <div className="space-y-2">
            {leaderboard.length > 0 ? leaderboard.map((item: any, idx: number) => {
              const icons = [Trophy, Medal, Award]
              const colors = ['text-yellow-500', 'text-gray-400', 'text-amber-600']
              const Icon = icons[idx] || Award
              const isMe = item.rep.id === repData.id

              return (
                <div key={item.rep.id} className={`flex items-center gap-2 py-1.5 px-2 rounded ${isMe ? 'bg-blue-50' : ''}`}>
                  {idx < 3 ? <Icon size={16} className={colors[idx]} /> : <span className="w-4 text-center text-xs text-gray-400">{idx + 1}</span>}
                  <span className={`flex-1 text-sm ${isMe ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
                    {item.rep.name}{isMe ? ' (You)' : ''}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(item.revenue)}</span>
                </div>
              )
            }) : (
              <p className="text-sm text-gray-400 py-4 text-center">No rankings yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Coaching Tip */}
      {coachingTip && (
        <Card className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={16} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-indigo-900">Coaching from ClawdBot</h3>
              <p className="text-sm text-indigo-700 mt-1">{coachingTip}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function QueueRow({ icon, color, bg, label, count }: { icon: React.ReactNode, color: string, bg: string, label: string, count: number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <Badge variant="outline" className={`${bg} ${color} border-0 font-semibold`}>{count}</Badge>
    </div>
  )
}

function CallbackRow({ call, overdue }: { call: any, overdue?: boolean }) {
  const lead = call.lead || {}
  const time = call.callbackDate ? new Date(call.callbackDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm ${overdue ? 'bg-red-50' : 'bg-green-50'}`}>
      <span className={`font-medium ${overdue ? 'text-red-700' : 'text-green-700'}`}>
        {lead.firstName} {lead.lastName}
      </span>
      <span className="text-gray-500">-</span>
      <span className="text-gray-600 truncate flex-1">{lead.companyName}</span>
      <span className={`text-xs ${overdue ? 'text-red-500' : 'text-green-600'}`}>{time}</span>
    </div>
  )
}

function StatBlock({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}