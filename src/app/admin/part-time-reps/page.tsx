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
  Users,
  UserPlus,
  Phone,
  MessageSquare,
  Target,
  DollarSign,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle,
  Copy,
  RefreshCw,
  KeyRound,
} from 'lucide-react'

const DAILY_TARGET = 40 // Part-time daily call target

interface RepWithStats {
  id: string
  name: string
  email: string
  phone: string
  status: string
  todayDials: number
  todayConversations: number
  todayCloses: number
  todayPreviewsSent: number
  lastActivityAt: string | null
  weekCommission: number
  monthCommission: number
  assignedLeads: number
  paceStatus: 'on_track' | 'behind' | 'idle' | 'no_data'
  projectedDials: number
}

export default function PartTimeRepsPage() {
  const [reps, setReps] = useState<RepWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newRep, setNewRep] = useState({ name: '', email: '', phone: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<any>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetResult, setResetResult] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  useEffect(() => { loadData() }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      // Fetch part-time reps
      const repsRes = await fetch('/api/users?role=REP&portalType=PART_TIME')
      if (!repsRes.ok) { setLoading(false); return }
      const repsData = await repsRes.json()
      const partTimeReps = repsData.users || []

      // For each rep, fetch today's activity and calculate pace
      const enrichedReps = await Promise.all(partTimeReps.map(async (rep: any) => {
        let todayDials = 0, todayConversations = 0, todayCloses = 0, todayPreviewsSent = 0
        let lastActivityAt: string | null = null
        let weekCommission = 0, monthCommission = 0, assignedLeads = 0

        // Get today's stats
        try {
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          // Get rep activity for today
          const actRes = await fetch(`/api/dialer/stats?period=today&repId=${rep.id}`)
          if (actRes.ok) {
            const actData = await actRes.json()
            const stats = actData.stats || {}
            todayDials = stats.dials || 0
            todayConversations = stats.conversations || 0
            todayCloses = stats.closes || 0
            todayPreviewsSent = stats.previewsSent || 0
          }

          // Get last activity timestamp
          const lastActRes = await fetch(`/api/activity?repId=${rep.id}&limit=1`)
          if (lastActRes.ok) {
            const lastActData = await lastActRes.json()
            if (lastActData.activities?.length > 0) {
              lastActivityAt = lastActData.activities[0].createdAt
            }
          }

          // Get commissions
          const weekRes = await fetch(`/api/dialer/stats?period=week&repId=${rep.id}`)
          if (weekRes.ok) {
            const data = await weekRes.json()
            weekCommission = data.stats?.commissionEarned || 0
          }
          const monthRes = await fetch(`/api/dialer/stats?period=month&repId=${rep.id}`)
          if (monthRes.ok) {
            const data = await monthRes.json()
            monthCommission = data.stats?.commissionEarned || 0
          }

          // Count assigned leads
          const leadsRes = await fetch(`/api/leads?assignedTo=${rep.id}`)
          if (leadsRes.ok) {
            const data = await leadsRes.json()
            assignedLeads = data.total || data.leads?.length || 0
          }
        } catch { /* ignore individual rep fetch errors */ }

        // Calculate pace
        const now = new Date()
        const dayStart = new Date(now)
        dayStart.setHours(9, 0, 0, 0) // Assume 9 AM start
        const dayEnd = new Date(now)
        dayEnd.setHours(17, 0, 0, 0) // Assume 5 PM end

        let paceStatus: RepWithStats['paceStatus'] = 'no_data'
        let projectedDials = 0

        if (todayDials > 0) {
          const hoursElapsed = Math.max(0.5, (now.getTime() - dayStart.getTime()) / (1000 * 60 * 60))
          const hoursRemaining = Math.max(0, (dayEnd.getTime() - now.getTime()) / (1000 * 60 * 60))
          const dialRate = todayDials / hoursElapsed
          projectedDials = Math.round(todayDials + dialRate * hoursRemaining)

          // Check idle (30+ min since last activity)
          if (lastActivityAt) {
            const minsSinceActivity = (now.getTime() - new Date(lastActivityAt).getTime()) / (1000 * 60)
            if (minsSinceActivity > 30) {
              paceStatus = 'idle'
            } else if (projectedDials >= DAILY_TARGET * 0.8) {
              paceStatus = 'on_track'
            } else {
              paceStatus = 'behind'
            }
          } else {
            paceStatus = projectedDials >= DAILY_TARGET * 0.8 ? 'on_track' : 'behind'
          }
        }

        return {
          id: rep.id,
          name: rep.name,
          email: rep.email,
          phone: rep.phone || '',
          status: rep.status,
          todayDials,
          todayConversations,
          todayCloses,
          todayPreviewsSent,
          lastActivityAt,
          weekCommission,
          monthCommission,
          assignedLeads,
          paceStatus,
          projectedDials,
        } as RepWithStats
      }))

      setReps(enrichedReps)

      // Load recent activity across all part-time reps
      try {
        const repIds = partTimeReps.map((r: any) => r.id)
        if (repIds.length > 0) {
          const actRes = await fetch(`/api/activity?limit=20`)
          if (actRes.ok) {
            const data = await actRes.json()
            const activities = (data.activities || []).filter((a: any) =>
              repIds.includes(a.repId) && a.activityType === 'CALL'
            )
            setRecentActivity(activities.slice(0, 20))
          }
        }
      } catch { /* ignore */ }
    } catch (error) {
      console.error('Failed to load part-time rep data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let pw = ''
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    return pw
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleAddRep = async () => {
    if (!newRep.name || !newRep.email) return
    const password = newRep.password || generatePassword()
    setCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRep.name,
          email: newRep.email,
          phone: newRep.phone,
          password,
          role: 'REP',
          portalType: 'PART_TIME',
        }),
      })
      if (res.ok) {
        setShowAddDialog(false)
        setCreatedCreds({ email: newRep.email, password })
        setNewRep({ name: '', email: '', phone: '', password: '' })
        loadData()
      }
    } catch (e) { console.error('Failed to create rep:', e) }
    finally { setCreating(false) }
  }

  const handleResetPassword = async () => {
    if (!resetTarget) return
    const newPassword = resetPassword || generatePassword()
    setResetting(true)
    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      })
      if (res.ok) {
        setResetResult(newPassword)
        setResetPassword('')
      } else {
        alert('Failed to reset password')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  const getStatusBadge = (rep: RepWithStats) => {
    switch (rep.paceStatus) {
      case 'on_track':
        return <Badge className="bg-green-100 text-green-700 border-0">On Track</Badge>
      case 'behind':
        return <Badge className="bg-yellow-100 text-yellow-700 border-0">Behind Pace</Badge>
      case 'idle':
        return <Badge className="bg-red-100 text-red-700 border-0">Idle 30+ min</Badge>
      case 'no_data':
        return <Badge className="bg-gray-100 text-gray-500 border-0">No Activity</Badge>
    }
  }

  const formatTimeAgo = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading part-time rep data...</div>

  const activeToday = reps.filter(r => r.todayDials > 0).length
  const totalAssignedLeads = reps.reduce((sum, r) => sum + r.assignedLeads, 0)
  const totalMonthEarnings = reps.reduce((sum, r) => sum + r.monthCommission, 0)

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Part-Time Rep Management</h1>
          <p className="text-gray-500 mt-1">Monitor activity, pace, and performance</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <UserPlus size={18} /> Add Part-Time Rep
        </Button>
      </div>

      {/* Created Credentials Banner */}
      {createdCreds && (
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-green-800 mb-1">Rep Account Created</h4>
              <p className="text-sm text-green-700 mb-2">Share these login credentials with the rep:</p>
              <div className="bg-white rounded-md p-3 border border-green-200 space-y-1 font-mono text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20">Email:</span>
                  <span className="font-medium">{createdCreds.email}</span>
                  <button onClick={() => copyToClipboard(createdCreds.email)} className="text-gray-400 hover:text-gray-600"><Copy size={14} /></button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20">Password:</span>
                  <span className="font-medium">{createdCreds.password}</span>
                  <button onClick={() => copyToClipboard(createdCreds.password)} className="text-gray-400 hover:text-gray-600"><Copy size={14} /></button>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(`Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`)}
                className="text-xs text-green-600 hover:text-green-800 mt-2 underline"
              >
                Copy both to clipboard
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCreatedCreds(null)} className="text-green-600">Dismiss</Button>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Part-Time Reps</span>
            <Users size={20} className="text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{reps.length}</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active Today</span>
            <Activity size={20} className="text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{activeToday}</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Assigned Leads</span>
            <Target size={20} className="text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalAssignedLeads}</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Month Earnings</span>
            <DollarSign size={20} className="text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalMonthEarnings)}</div>
        </Card>
      </div>

      {/* Rep Activity Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rep Activity</h3>
        {reps.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No part-time reps yet</p>
            <p className="text-sm mt-1">Click &quot;Add Part-Time Rep&quot; to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Rep</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-center p-4 text-sm font-semibold text-gray-700">Calls</th>
                  <th className="text-center p-4 text-sm font-semibold text-gray-700">Convos</th>
                  <th className="text-center p-4 text-sm font-semibold text-gray-700">Closes</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Pace</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Last Active</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Commission</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reps.map((rep) => (
                  <tr key={rep.id} className={`hover:bg-gray-50 ${rep.paceStatus === 'idle' ? 'bg-red-50/50' : ''}`}>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{rep.name}</div>
                      <div className="text-sm text-gray-500">{rep.email}</div>
                    </td>
                    <td className="p-4">{getStatusBadge(rep)}</td>
                    <td className="p-4 text-center">
                      <div className="font-semibold text-gray-900">{rep.todayDials}</div>
                      <div className="text-xs text-gray-400">/ {DAILY_TARGET}</div>
                    </td>
                    <td className="p-4 text-center font-medium text-gray-900">{rep.todayConversations}</td>
                    <td className="p-4 text-center font-medium text-gray-900">{rep.todayCloses}</td>
                    <td className="p-4">
                      {rep.paceStatus === 'on_track' && (
                        <div className="flex items-center gap-1.5 text-sm text-green-600">
                          <TrendingUp size={14} />
                          <span>On track for {rep.projectedDials} by 5 PM</span>
                        </div>
                      )}
                      {rep.paceStatus === 'behind' && (
                        <div className="flex items-center gap-1.5 text-sm text-yellow-600">
                          <AlertTriangle size={14} />
                          <span>Behind pace ({rep.projectedDials} projected)</span>
                        </div>
                      )}
                      {rep.paceStatus === 'idle' && (
                        <div className="flex items-center gap-1.5 text-sm text-red-600">
                          <Clock size={14} />
                          <span>Idle — {formatTimeAgo(rep.lastActivityAt)}</span>
                        </div>
                      )}
                      {rep.paceStatus === 'no_data' && (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600">{formatTimeAgo(rep.lastActivityAt)}</td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-gray-900">{formatCurrency(rep.weekCommission)}</div>
                      <div className="text-xs text-gray-400">this week</div>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          setResetTarget(rep)
                          setResetPassword('')
                          setResetResult(null)
                          setResetDialogOpen(true)
                        }}
                      >
                        <RefreshCw size={14} />
                        Reset PW
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent Activity Feed */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentActivity.map((act, idx) => {
              const dispositionIcons: Record<string, string> = {
                INTERESTED: '✅', NOT_INTERESTED: '❌', CALLBACK: '📅',
                NO_ANSWER: '📵', VOICEMAIL: '📭', WRONG_NUMBER: '🚫',
              }
              return (
                <div key={idx} className="flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-50 text-sm">
                  <span className="text-gray-400 w-14 text-xs">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="font-medium text-gray-700 w-24 truncate">{act.repName || 'Rep'}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-700 flex-1 truncate">{act.leadName || act.lead?.companyName || 'Lead'}</span>
                  <span>{dispositionIcons[act.callDisposition] || '📞'}</span>
                  <span className="text-xs text-gray-500 w-24 text-right">{act.callDisposition?.replace(/_/g, ' ')}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No recent activity from part-time reps</p>
        )}
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={(open) => { setResetDialogOpen(open); if (!open) setResetResult(null) }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Reset the password for {resetTarget?.name} ({resetTarget?.email})</p>
          {resetResult ? (
            <div className="py-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800 mb-2">Password has been reset!</p>
                <div className="bg-white rounded-md p-3 border border-green-200 font-mono text-sm flex items-center justify-between">
                  <span>{resetResult}</span>
                  <button onClick={() => copyToClipboard(resetResult)} className="text-gray-400 hover:text-gray-600 ml-2"><Copy size={14} /></button>
                </div>
                <button
                  onClick={() => copyToClipboard(`Email: ${resetTarget?.email}\nNew Password: ${resetResult}`)}
                  className="text-xs text-green-600 hover:text-green-800 mt-2 underline"
                >
                  Copy email + password to clipboard
                </button>
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={() => { setResetDialogOpen(false); setResetResult(null) }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-2 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <div className="flex gap-2">
                  <Input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
                  <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setResetPassword(generatePassword())}>Generate</Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleResetPassword} disabled={resetting}>{resetting ? 'Resetting...' : 'Reset Password'}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Rep Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Part-Time Rep</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <Input value={newRep.name} onChange={(e) => setNewRep({ ...newRep, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input type="email" value={newRep.email} onChange={(e) => setNewRep({ ...newRep, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Phone (optional)</label>
              <Input value={newRep.phone} onChange={(e) => setNewRep({ ...newRep, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="flex gap-2">
                <Input value={newRep.password} onChange={(e) => setNewRep({ ...newRep, password: e.target.value })} placeholder="Leave blank to auto-generate" />
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setNewRep({ ...newRep, password: generatePassword() })}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-gray-400">Credentials will be shown after creation.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddRep} disabled={creating || !newRep.name || !newRep.email}>
              {creating ? 'Creating...' : 'Add Rep'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
