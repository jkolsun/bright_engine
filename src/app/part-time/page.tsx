'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import {
  Phone,
  Target,
  DollarSign,
  Users,
  CheckCircle,
  MessageSquare,
  Copy,
  Edit3,
  Save,
  Eye,
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
} from 'lucide-react'
import Link from 'next/link'

export default function PartTimeDashboard() {
  const [repData, setRepData] = useState<any>(null)
  const [assignedLeads, setAssignedLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Edit lead state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [editLeadId, setEditLeadId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Dialer dashboard state
  const [todayStats, setTodayStats] = useState({ dials: 0, conversations: 0, previewLinksSent: 0, previewsOpened: 0, paymentLinksSent: 0, closes: 0 })
  const [weekStats, setWeekStats] = useState({ dials: 0, conversations: 0, previewsSent: 0, previewsOpened: 0, paymentLinksSent: 0, closes: 0, commissionEarned: 0 })
  const [monthStats, setMonthStats] = useState({ dials: 0, conversations: 0, closes: 0, commissionEarned: 0 })
  const [allTimeStats, setAllTimeStats] = useState({ commissionEarned: 0 })
  const [queueSummary, setQueueSummary] = useState<any>(null)
  const [callbacks, setCallbacks] = useState<any>({ overdue: [], today: [], upcoming: [] })
  const [coachingTip, setCoachingTip] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [dailyTarget, setDailyTarget] = useState({ dials: 40, conversations: 8, closes: 1 })
  const [commissionRate, setCommissionRate] = useState(75)
  const [productPrice, setProductPrice] = useState(188)

  useEffect(() => {
    loadRepData()

    refreshIntervalRef.current = setInterval(() => {
      loadRepData()
    }, 60000)

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [])

  const loadRepData = async () => {
    try {
      const meRes = await fetch('/api/auth/me')
      if (!meRes.ok) { setLoading(false); return }

      const meData = await meRes.json()
      const currentUser = meData.user
      setRepData(currentUser)

      const [leadsRes, activityRes, weekRes, monthRes, allTimeRes, queueRes, callbackRes, leaderboardRes, configRes] = await Promise.all([
        fetch(`/api/leads?assignedTo=${currentUser.id}&limit=200`),
        fetch('/api/activity'),
        fetch('/api/dialer/stats?period=week'),
        fetch('/api/dialer/stats?period=month'),
        fetch('/api/dialer/stats?period=all'),
        fetch('/api/dialer/queue'),
        fetch('/api/dialer/callback'),
        fetch('/api/users?role=REP'),
        fetch('/api/rep-config'),
      ])

      if (leadsRes.ok) { const data = await leadsRes.json(); setAssignedLeads(data.leads || []) }
      if (activityRes.ok) { const data = await activityRes.json(); setTodayStats(data.stats) }
      if (weekRes.ok) { const data = await weekRes.json(); setWeekStats(data.stats); setCoachingTip(data.coachingTip) }
      if (monthRes.ok) { const data = await monthRes.json(); setMonthStats(data.stats) }
      if (allTimeRes.ok) { const data = await allTimeRes.json(); setAllTimeStats(data.stats) }
      if (queueRes.ok) { const data = await queueRes.json(); setQueueSummary(data.summary) }
      if (callbackRes.ok) { const data = await callbackRes.json(); setCallbacks(data) }
      // Load admin-configured targets for this rep
      let repCommRate = 75
      if (configRes.ok) {
        const config = await configRes.json()
        if (config.targets) {
          setDailyTarget({
            dials: config.targets.dials || 40,
            conversations: config.targets.conversations || 8,
            closes: config.targets.closes || 1,
          })
        }
        repCommRate = config.commissionRate || 75
        setCommissionRate(repCommRate)
        if (config.productPrice) setProductPrice(config.productPrice)
      }
      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json()
        const reps = (data.users || [])
          .map((rep: any) => ({
            rep,
            closes: rep.totalCloses || 0,
            revenue: (rep.totalCloses || 0) * (rep.commissionRate ?? repCommRate),
          }))
          .sort((a: any, b: any) => b.revenue - a.revenue)
          .slice(0, 5)
        setLeaderboard(reps)
      }
    } catch (error) {
      console.error('Failed to load rep data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPreview = async (leadId: string, previewUrl: string) => {
    await navigator.clipboard.writeText(previewUrl)
    setCopiedId(leadId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleTextPreview = (lead: any) => {
    if (!lead.phone || !lead.previewUrl) return
    const message = encodeURIComponent(
      `Hey ${lead.firstName}, here's the preview of your new website for ${lead.companyName}: ${lead.previewUrl}`
    )
    window.open(`sms:${lead.phone}?body=${message}`)
  }

  const openEditDialog = (lead: any) => {
    setEditLeadId(lead.id)
    setEditForm({
      firstName: lead.firstName || '', lastName: lead.lastName || '',
      companyName: lead.companyName || '', phone: lead.phone || '',
      email: lead.email || '', city: lead.city || '', state: lead.state || '',
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editLeadId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${editLeadId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        setAssignedLeads(prev => prev.map(l => l.id === editLeadId ? { ...l, ...editForm } : l))
        setEditDialogOpen(false)
      }
    } catch (e) { console.error('Failed to save:', e) }
    finally { setSaving(false) }
  }

  if (loading || !repData) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <p className="text-gray-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const hotLeads = assignedLeads.filter(l => l.status === 'HOT_LEAD')
  const qualifiedLeads = assignedLeads.filter(l => l.status === 'QUALIFIED')
  const dialableLeads = assignedLeads.filter(l => ['NEW', 'HOT_LEAD', 'QUALIFIED'].includes(l.status))
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const progressPercent = Math.min(100, Math.round((todayStats.dials / dailyTarget.dials) * 100))

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {repData.name?.split(' ')[0] || repData.name}</h1>
          <p className="text-gray-500 mt-1 text-sm">{todayDate}</p>
        </div>
        <Link href="/part-time/dialer">
          <Button className="gap-2 rounded-xl gradient-primary text-white shadow-teal hover:opacity-90 transition-all animate-glow-teal">
            <Phone size={18} /> Start Calling ({queueSummary?.total || dialableLeads.length})
          </Button>
        </Link>
      </div>

      {/* Today's Progress */}
      <Card className="p-6 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Today&apos;s Progress</h2>
          <span className="text-sm font-semibold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">{progressPercent}% of target</span>
        </div>
        <div className="grid grid-cols-5 gap-6 mb-5">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">{todayStats.dials}</span>
              <span className="text-sm text-gray-400 font-medium">/ {dailyTarget.dials}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Calls</p>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">{todayStats.conversations}</span>
              <span className="text-sm text-gray-400 font-medium">/ {dailyTarget.conversations}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Conversations</p>
          </div>
          <div>
            <span className="text-4xl font-bold text-purple-600">{todayStats.previewLinksSent}</span>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Previews Sent</p>
          </div>
          <div>
            <span className="text-4xl font-bold text-emerald-600">{todayStats.previewsOpened}</span>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Previews Opened</p>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">{todayStats.closes}</span>
              <span className="text-sm text-gray-400 font-medium">/ {dailyTarget.closes}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Closes</p>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="gradient-primary-vibrant h-3 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} iconBg="bg-teal-50" iconColor="text-teal-600" label="Assigned Leads" value={assignedLeads.length} />
        <StatCard icon={<Target size={20} />} iconBg="bg-red-50" iconColor="text-red-500" label="Hot Leads" value={hotLeads.length} />
        <StatCard icon={<CheckCircle size={20} />} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Qualified" value={qualifiedLeads.length} />
        <StatCard icon={<DollarSign size={20} />} iconBg="bg-amber-50" iconColor="text-amber-600" label="Pipeline Value" value={formatCurrency((qualifiedLeads.length + hotLeads.length) * productPrice)} />
      </div>

      {/* Queue + Callbacks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue Summary */}
        <Card className="p-6 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Queue</h2>
          <div className="space-y-2.5">
            {(queueSummary?.overdueCallbacks || 0) > 0 && (
              <QueueRow icon={<AlertCircle size={16} />} color="text-red-500" bg="bg-red-50"
                label="Overdue callbacks" count={queueSummary.overdueCallbacks} />
            )}
            {(queueSummary?.previewEngagedNoPayment || 0) > 0 && (
              <QueueRow icon={<Eye size={16} />} color="text-purple-500" bg="bg-purple-50"
                label="Preview engaged (no payment)" count={queueSummary.previewEngagedNoPayment} />
            )}
            {(queueSummary?.hotLeads || 0) > 0 && (
              <QueueRow icon={<Flame size={16} />} color="text-orange-500" bg="bg-orange-50"
                label="Hot leads (engaged last 2 hrs)" count={queueSummary.hotLeads} />
            )}
            {(queueSummary?.warmLeads || 0) > 0 && (
              <QueueRow icon={<TrendingUp size={16} />} color="text-amber-500" bg="bg-amber-50"
                label="Warm leads (email opened)" count={queueSummary.warmLeads} />
            )}
            {(queueSummary?.scheduledCallbacks || 0) > 0 && (
              <QueueRow icon={<CalendarClock size={16} />} color="text-emerald-500" bg="bg-emerald-50"
                label="Scheduled callbacks (today)" count={queueSummary.scheduledCallbacks} />
            )}
            {(queueSummary?.freshLeads || 0) > 0 && (
              <QueueRow icon={<UserPlus size={16} />} color="text-gray-500" bg="bg-gray-50"
                label="Fresh leads" count={queueSummary.freshLeads} />
            )}
            {(queueSummary?.retries || 0) > 0 && (
              <QueueRow icon={<RotateCcw size={16} />} color="text-teal-500" bg="bg-teal-50"
                label="Retries" count={queueSummary.retries} />
            )}
            {(queueSummary?.reEngage || 0) > 0 && (
              <QueueRow icon={<Clock size={16} />} color="text-indigo-500" bg="bg-indigo-50"
                label="Re-engage" count={queueSummary.reEngage} />
            )}
            {!queueSummary && <p className="text-sm text-gray-400 text-center py-4">Loading queue...</p>}
            {queueSummary && (
              <div className="pt-3 mt-1 border-t border-gray-100 flex items-center justify-between">
                <span className="font-bold text-gray-700 text-sm">Total in queue</span>
                <span className="text-xl font-bold text-gray-900">{queueSummary.total}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Callbacks */}
        <Card className="p-6 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Callbacks</h2>
          <div className="space-y-3">
            {callbacks.overdue.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2">Overdue</p>
                {callbacks.overdue.slice(0, 3).map((cb: any) => (
                  <CallbackRow key={cb.id} call={cb} overdue />
                ))}
                {callbacks.overdue.length > 3 && (
                  <p className="text-xs text-red-500 mt-1.5">+{callbacks.overdue.length - 3} more overdue</p>
                )}
              </div>
            )}
            {callbacks.today.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Today</p>
                {callbacks.today.slice(0, 3).map((cb: any) => (
                  <CallbackRow key={cb.id} call={cb} />
                ))}
              </div>
            )}
            {callbacks.upcoming.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Upcoming</p>
                <p className="text-sm text-gray-600">{callbacks.upcoming.length} callbacks this week</p>
              </div>
            )}
            {callbacks.overdue.length === 0 && callbacks.today.length === 0 && callbacks.upcoming.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No callbacks scheduled</p>
            )}
            {callbacks.overdue.length > 0 && (
              <Link href="/part-time/dialer?startWith=callbacks">
                <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 mt-2 rounded-xl">
                  Start with overdue callbacks <ChevronRight size={16} className="ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Conversion Funnel */}
      {weekStats.dials > 0 && (
        <Card className="p-6 rounded-2xl border-0 shadow-medium bg-gradient-to-r from-purple-50 via-teal-50 to-emerald-50">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">This Week&apos;s Funnel</h2>
          <div className="flex items-center gap-2">
            {[
              { label: 'Calls', value: weekStats.dials, color: 'text-gray-900' },
              { label: 'Previews Sent', value: weekStats.previewsSent, pct: weekStats.dials > 0 ? Math.round((weekStats.previewsSent / weekStats.dials) * 100) : 0, color: 'text-purple-700' },
              { label: 'Opened', value: weekStats.previewsOpened, pct: weekStats.previewsSent > 0 ? Math.round((weekStats.previewsOpened / weekStats.previewsSent) * 100) : 0, color: 'text-teal-700' },
              { label: 'Pay Link Sent', value: weekStats.paymentLinksSent, pct: weekStats.previewsOpened > 0 ? Math.round((weekStats.paymentLinksSent / weekStats.previewsOpened) * 100) : 0, color: 'text-amber-700' },
              { label: 'Paid', value: weekStats.closes, pct: weekStats.paymentLinksSent > 0 ? Math.round((weekStats.closes / weekStats.paymentLinksSent) * 100) : 0, color: 'text-emerald-700' },
            ].map((step, idx, arr) => (
              <div key={step.label} className="flex items-center gap-2 flex-1">
                <div className="text-center flex-1">
                  <div className={`text-2xl font-bold ${step.color}`}>{step.value}</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{step.label}</div>
                  {step.pct !== undefined && (
                    <div className="text-[10px] font-semibold text-gray-400 mt-0.5">{step.pct}%</div>
                  )}
                </div>
                {idx < arr.length - 1 && (
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Assigned Leads Table */}
      <Card className="rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Your Assigned Leads
              <span className="ml-2 text-sm font-semibold text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full">{assignedLeads.length}</span>
            </h3>
          </div>
        </div>

        {assignedLeads.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700">No leads assigned yet</p>
            <p className="text-sm mt-1 text-gray-500">Check back soon — leads are assigned by admin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Industry</th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 text-sm">{lead.firstName} {lead.lastName}</div>
                      {lead.email && <div className="text-xs text-gray-500 mt-0.5">{lead.email}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{lead.companyName}</td>
                    <td className="px-6 py-4">
                      <a href={`tel:${lead.phone}`} className="text-teal-600 hover:text-teal-700 font-mono text-sm font-medium">
                        {lead.phone}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {lead.city}{lead.city && lead.state ? ', ' : ''}{lead.state}
                    </td>
                    <td className="px-6 py-4">
                      {lead.industry && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                          {lead.industry.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        lead.status === 'HOT_LEAD' ? 'destructive' :
                        lead.status === 'QUALIFIED' ? 'default' : 'secondary'
                      }>{lead.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {lead.previewUrl && (
                          <>
                            <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg"
                              onClick={() => handleTextPreview(lead)} title="Text preview to prospect">
                              <MessageSquare size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="hover:bg-teal-50 rounded-lg"
                              onClick={() => handleCopyPreview(lead.id, lead.previewUrl)} title="Copy preview link">
                              {copiedId === lead.id ? <CheckCircle size={14} className="text-emerald-600" /> : <Copy size={14} className="text-gray-500" />}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg"
                              onClick={() => window.open(lead.previewUrl, '_blank')} title="View preview">
                              <Eye size={14} />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" className="hover:bg-gray-100 rounded-lg"
                          onClick={() => openEditDialog(lead)} title="Edit lead info">
                          <Edit3 size={14} className="text-gray-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Stats + Leaderboard + Coaching */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">This Week</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatBlock label="Calls" value={weekStats.dials} />
            <StatBlock label="Conversations" value={weekStats.conversations} />
            <StatBlock label="Closes" value={weekStats.closes} />
            <StatBlock label="Commission" value={formatCurrency(weekStats.commissionEarned)} />
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Earnings</h2>
          <div className="space-y-3.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">This week</span>
              <span className="font-bold text-gray-900">{formatCurrency(weekStats.commissionEarned)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">This month</span>
              <span className="font-bold text-gray-900">{formatCurrency(monthStats.commissionEarned)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-700">All time</span>
              <span className="text-xl font-bold text-emerald-600">{formatCurrency(allTimeStats.commissionEarned)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Leaderboard</h2>
          <div className="space-y-1.5">
            {leaderboard.length > 0 ? leaderboard.map((item: any, idx: number) => {
              const icons = [Trophy, Medal, Award]
              const colors = ['text-yellow-500', 'text-gray-400', 'text-amber-600']
              const Icon = icons[idx] || Award
              const isMe = item.rep.id === repData.id
              return (
                <div key={item.rep.id} className={`flex items-center gap-2.5 py-2 px-3 rounded-xl transition-colors ${isMe ? 'bg-teal-50 border border-teal-200' : 'hover:bg-gray-50'}`}>
                  {idx < 3 ? <Icon size={16} className={colors[idx]} /> : <span className="w-4 text-center text-xs text-gray-400 font-bold">{idx + 1}</span>}
                  <span className={`flex-1 text-sm ${isMe ? 'font-bold text-teal-700' : 'text-gray-700 font-medium'}`}>
                    {item.rep.name}{isMe ? ' (You)' : ''}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(item.revenue)}</span>
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
        <Card className="p-6 rounded-2xl border-0 shadow-medium bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-teal">
              <MessageSquare size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-teal-900">Coaching from ClawdBot</h3>
              <p className="text-sm text-teal-800 mt-1 leading-relaxed">{coachingTip}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Links */}
      <Card className="p-6 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/part-time/dialer">
            <Button variant="outline" className="w-full rounded-xl border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all h-12">
              <Phone size={18} className="mr-2 text-teal-600" /> Dialer
            </Button>
          </Link>
          <Link href="/part-time/earnings">
            <Button variant="outline" className="w-full rounded-xl border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all h-12">
              <DollarSign size={18} className="mr-2 text-teal-600" /> Earnings
            </Button>
          </Link>
          <Link href="/part-time/tasks">
            <Button variant="outline" className="w-full rounded-xl border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all h-12">
              <Target size={18} className="mr-2 text-teal-600" /> Tasks
            </Button>
          </Link>
        </div>
      </Card>

      {/* Edit Lead Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader><DialogTitle>Edit Lead Info</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">First Name</label>
                <Input className="rounded-xl" value={editForm.firstName || ''} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Name</label>
                <Input className="rounded-xl" value={editForm.lastName || ''} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</label>
              <Input className="rounded-xl" value={editForm.companyName || ''} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</label>
              <Input className="rounded-xl" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</label>
              <Input className="rounded-xl" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">City</label>
                <Input className="rounded-xl" value={editForm.city || ''} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">State</label>
                <Input className="rounded-xl" value={editForm.state || ''} maxLength={2} onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="rounded-xl gradient-primary text-white border-0">
              <Save size={16} className="mr-1" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ icon, iconBg, iconColor, label, value }: { icon: React.ReactNode, iconBg: string, iconColor: string, label: string, value: string | number }) {
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm card-hover">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </Card>
  )
}

function QueueRow({ icon, color, bg, label, count }: { icon: React.ReactNode, color: string, bg: string, label: string, count: number }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50/80 transition-colors">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
          <span className={color}>{icon}</span>
        </div>
        <span className="text-sm text-gray-700 font-medium">{label}</span>
      </div>
      <span className={`text-sm font-bold ${color}`}>{count}</span>
    </div>
  )
}

function CallbackRow({ call, overdue }: { call: any, overdue?: boolean }) {
  const lead = call.lead || {}
  const time = call.notes?.startsWith('[ALL_DAY]')
    ? 'All Day'
    : call.scheduledAt ? new Date(call.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className={`flex items-center gap-2 py-2 px-3 rounded-xl text-sm mb-1 ${overdue ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'}`}>
      <span className={`font-semibold ${overdue ? 'text-red-700' : 'text-emerald-700'}`}>
        {lead.firstName} {lead.lastName}
      </span>
      <span className="text-gray-400">-</span>
      <span className="text-gray-600 truncate flex-1">{lead.companyName}</span>
      <span className={`text-xs font-medium ${overdue ? 'text-red-500' : 'text-emerald-600'}`}>{time}</span>
    </div>
  )
}

function StatBlock({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}
