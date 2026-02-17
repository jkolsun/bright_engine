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
import { useState, useEffect } from 'react'
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
  Zap,
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

export default function RepsPage() {
  const [repData, setRepData] = useState<any>(null)
  const [assignedLeads, setAssignedLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Edit lead state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [editLeadId, setEditLeadId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Dialer dashboard state
  const [todayStats, setTodayStats] = useState({ dials: 0, conversations: 0, previewLinksSent: 0, closes: 0 })
  const [weekStats, setWeekStats] = useState({ dials: 0, conversations: 0, previewsSent: 0, closes: 0, commissionEarned: 0 })
  const [monthStats, setMonthStats] = useState({ dials: 0, conversations: 0, closes: 0, commissionEarned: 0 })
  const [allTimeStats, setAllTimeStats] = useState({ commissionEarned: 0 })
  const [queueSummary, setQueueSummary] = useState<any>(null)
  const [callbacks, setCallbacks] = useState<any>({ overdue: [], today: [], upcoming: [] })
  const [coachingTip, setCoachingTip] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])

  useEffect(() => {
    loadRepData()
  }, [])

  const loadRepData = async () => {
    try {
      const meRes = await fetch('/api/auth/me')

      if (!meRes.ok) {
        console.error('Not authenticated')
        setLoading(false)
        return
      }

      const meData = await meRes.json()
      const currentUser = meData.user
      setRepData(currentUser)

      // Load leads and dialer data in parallel
      const [leadsRes, activityRes, weekRes, monthRes, allTimeRes, queueRes, callbackRes, leaderboardRes] = await Promise.all([
        fetch(`/api/leads?assignedTo=${currentUser.id}&limit=200`),
        fetch('/api/activity'),
        fetch('/api/dialer/stats?period=week'),
        fetch('/api/dialer/stats?period=month'),
        fetch('/api/dialer/stats?period=all'),
        fetch('/api/dialer/queue'),
        fetch('/api/dialer/callback'),
        fetch('/api/users?role=REP'),
      ])

      if (leadsRes.ok) {
        const data = await leadsRes.json()
        setAssignedLeads(data.leads || [])
      }
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
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      companyName: lead.companyName || '',
      phone: lead.phone || '',
      email: lead.email || '',
      city: lead.city || '',
      state: lead.state || '',
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editLeadId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${editLeadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        setAssignedLeads(prev =>
          prev.map(l => l.id === editLeadId ? { ...l, ...editForm } : l)
        )
        setEditDialogOpen(false)
      }
    } catch (e) { console.error('Failed to save:', e) }
    finally { setSaving(false) }
  }

  if (loading || !repData) {
    return <div className="p-8 text-center text-gray-500">Loading your dashboard...</div>
  }

  const hotLeads = assignedLeads.filter(l => l.status === 'HOT_LEAD')
  const qualifiedLeads = assignedLeads.filter(l => l.status === 'QUALIFIED')
  const dialableLeads = assignedLeads.filter(l => ['NEW', 'HOT_LEAD', 'QUALIFIED'].includes(l.status))
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const dailyTarget = { dials: 200, conversations: 40, closes: 3 }
  const progressPercent = Math.min(100, Math.round((todayStats.dials / dailyTarget.dials) * 100))

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {repData.name?.split(' ')[0] || repData.name}</h1>
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
              <Zap size={18} /> Power Dial ({queueSummary?.total || dialableLeads.length})
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

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Assigned Leads</span>
            <Users size={20} className="text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{assignedLeads.length}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Hot Leads</span>
            <Target size={20} className="text-red-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{hotLeads.length}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Qualified</span>
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{qualifiedLeads.length}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Potential Revenue</span>
            <DollarSign size={20} className="text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(assignedLeads.length * 149)}
          </div>
        </Card>
      </div>

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

      {/* Assigned Leads Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Your Assigned Leads ({assignedLeads.length})
          </h3>
        </div>

        {assignedLeads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No leads assigned yet</p>
            <p className="text-sm mt-1">Check back soon — leads are assigned by admin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Company</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Phone</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Location</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Industry</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assignedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                      {lead.email && <div className="text-sm text-gray-500">{lead.email}</div>}
                    </td>
                    <td className="p-4 text-gray-700">{lead.companyName}</td>
                    <td className="p-4">
                      <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline font-mono text-sm">
                        {lead.phone}
                      </a>
                    </td>
                    <td className="p-4 text-gray-700 text-sm">
                      {lead.city}{lead.city && lead.state ? ', ' : ''}{lead.state}
                    </td>
                    <td className="p-4">
                      {lead.industry && (
                        <Badge variant="outline" className="text-xs">
                          {lead.industry.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={
                        lead.status === 'HOT_LEAD' ? 'destructive' :
                        lead.status === 'QUALIFIED' ? 'default' :
                        'secondary'
                      }>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {lead.previewUrl && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600"
                              onClick={() => handleTextPreview(lead)}
                              title="Text preview to prospect"
                            >
                              <MessageSquare size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyPreview(lead.id, lead.previewUrl)}
                              title="Copy preview link"
                            >
                              {copiedId === lead.id ? (
                                <CheckCircle size={14} className="text-green-600" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-purple-600"
                              onClick={() => window.open(lead.previewUrl, '_blank')}
                              title="View preview"
                            >
                              <Eye size={14} />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(lead)}
                          title="Edit lead info"
                        >
                          <Edit3 size={14} />
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

      {/* Quick Links */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/reps/dialer">
            <Button variant="outline" className="w-full">
              <Phone size={18} className="mr-2" />
              Dialer
            </Button>
          </Link>
          <Link href="/reps/earnings">
            <Button variant="outline" className="w-full">
              <DollarSign size={18} className="mr-2" />
              Earnings
            </Button>
          </Link>
          <Link href="/reps/tasks">
            <Button variant="outline" className="w-full">
              <Target size={18} className="mr-2" />
              Tasks
            </Button>
          </Link>
        </div>
      </Card>

      {/* Edit Lead Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Lead Info</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">First Name</label>
                <Input
                  value={editForm.firstName || ''}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Last Name</label>
                <Input
                  value={editForm.lastName || ''}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Company</label>
              <Input
                value={editForm.companyName || ''}
                onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">City</label>
                <Input
                  value={editForm.city || ''}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">State</label>
                <Input
                  value={editForm.state || ''}
                  maxLength={2}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              <Save size={16} className="mr-1" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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