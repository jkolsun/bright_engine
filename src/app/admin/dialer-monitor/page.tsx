'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useRef } from 'react'
import {
  Phone,
  PhoneForwarded,
  Headphones,
  MessageSquare,
  Radio,
  Users,
  Target,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  RefreshCw,
  Settings,
  TrendingUp,
  Clock,
  Zap,
  ChevronDown,
  ChevronRight,
  Search,
  Sparkles,
  Loader2,
  History,
  Trash2,
} from 'lucide-react'

interface LiveRep {
  repId: string
  repName: string
  status: 'idle' | 'dialing' | 'on_call' | 'on_hold' | 'offline'
  sessionActive: boolean
  currentLead: { firstName: string; lastName: string; companyName: string } | null
  activeCalls: number
  callDuration: number
  todayStats: {
    dials: number
    conversations: number
    wantsToMoveForward: number
    callback: number
    interestedVerbal: number
    wantsChanges: number
    willLookLater: number
    notInterested: number
    voicemail: number
    noAnswer: number
    wrongNumber: number
    disconnected: number
    dnc: number
    previewsSent: number
  }
  previewStatus?: {
    opened: boolean
    sent?: boolean
    ctaClicked?: boolean
    viewDurationSeconds?: number
    lastViewedAt?: string
  } | null
}

interface SessionHistoryItem {
  id: string
  name: string | null
  repId: string
  repName: string
  startedAt: string
  endedAt: string | null
  duration: number
  totalCalls: number
  connectedCalls: number
  voicemails: number
  noAnswers: number
  previewsSent: number
  interestedCount: number
  notInterestedCount: number
  wantsToMoveForwardCount: number
  callbackCount: number
  interestedVerbalCount: number
  wantsChangesCount: number
  willLookLaterCount: number
  dncCount: number
  wrongNumberCount: number
  disconnectedCount: number
  avgCallDuration: number
  previewsOpened: number
  ctaClicks: number
  conversations: number
  freshLeadsAtStart: number | null
  uniqueFreshCalled: number | null
  freshLeadsRemaining: number | null
  aiRecommendation: string | null
  autoDialEnabled: boolean
}

interface SessionFilters {
  repId: string
  from: string
  to: string
  search: string
}

export default function DialerMonitorPage() {
  const [liveReps, setLiveReps] = useState<LiveRep[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Session History state
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([])
  const [sessionPagination, setSessionPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
  const [filters, setFilters] = useState<SessionFilters>(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return {
      repId: '',
      from: weekAgo.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
      search: '',
    }
  })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [generatingAI, setGeneratingAI] = useState<string | null>(null)

  useEffect(() => {
    loadLiveStatus()

    if (autoRefresh) {
      intervalRef.current = setInterval(loadLiveStatus, 5000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh])

  const loadLiveStatus = async () => {
    try {
      const res = await fetch('/api/dialer/admin/live')
      if (res.ok) {
        const data = await res.json()
        const reps: LiveRep[] = (data.reps || []).map((r: any) => ({
          repId: r.repId,
          repName: r.repName || 'Unknown',
          status: r.status || 'offline',
          sessionActive: r.sessionActive ?? false,
          currentLead: r.currentLead || null,
          activeCalls: 0,
          callDuration: r.callDuration || 0,
          todayStats: {
            dials: r.todayStats?.dials || 0,
            conversations: r.todayStats?.conversations || 0,
            wantsToMoveForward: r.todayStats?.wantsToMoveForward || 0,
            callback: r.todayStats?.callback || 0,
            interestedVerbal: r.todayStats?.interestedVerbal || 0,
            wantsChanges: r.todayStats?.wantsChanges || 0,
            willLookLater: r.todayStats?.willLookLater || 0,
            notInterested: r.todayStats?.notInterested || 0,
            voicemail: r.todayStats?.voicemail || 0,
            noAnswer: r.todayStats?.noAnswer || 0,
            wrongNumber: r.todayStats?.wrongNumber || 0,
            disconnected: r.todayStats?.disconnected || 0,
            dnc: r.todayStats?.dnc || 0,
            previewsSent: r.todayStats?.previewsSent || 0,
          },
          previewStatus: null,
        }))
        setLiveReps(reps)
      }
    } catch (e) {
      console.error('Failed to load live status:', e)
    } finally {
      setLoading(false)
    }
  }

  // Load session history
  const loadSessionHistory = async (page = 1) => {
    setHistoryLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.repId) params.set('repId', filters.repId)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      if (filters.search) params.set('search', filters.search)
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await fetch(`/api/dialer/admin/sessions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
        setSessionPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
      }
    } catch (e) {
      console.error('Failed to load session history:', e)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadSessionHistory()
  }, [filters.repId, filters.from, filters.to]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchSubmit = () => {
    loadSessionHistory(1)
  }

  const handleHideSession = async (sessionId: string) => {
    if (!window.confirm('Hide this session from history?')) return
    try {
      const res = await fetch(`/api/dialer/admin/sessions/${sessionId}`, { method: 'DELETE' })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        setExpandedSessionId(null)
      }
    } catch (e) {
      console.error('Failed to hide session:', e)
    }
  }

  const handleGenerateAI = async (sessionId: string) => {
    setGeneratingAI(sessionId)
    try {
      await fetch(`/api/dialer/admin/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateAI: true }),
      })
      // Poll for result
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        if (attempts > 15) { clearInterval(poll); setGeneratingAI(null); return }
        try {
          const res = await fetch(`/api/dialer/admin/sessions/${sessionId}`)
          if (res.ok) {
            const data = await res.json()
            if (data.aiRecommendation) {
              setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, aiRecommendation: data.aiRecommendation } : s))
              clearInterval(poll)
              setGeneratingAI(null)
            }
          }
        } catch {}
      }, 3000)
    } catch (e) {
      console.error('Failed to generate AI analysis:', e)
      setGeneratingAI(null)
    }
  }

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const formatCallDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return `${m}m ${s}s`
  }

  const formatSessionTime = (startedAt: string, endedAt: string | null) => {
    const start = new Date(startedAt)
    const dateStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    if (!endedAt) return `${dateStr}, ${startTime}`
    const end = new Date(endedAt)
    const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return `${dateStr}, ${startTime} – ${endTime}`
  }

  // BUG 10.5/U.8: Listen/Whisper/Barge are not yet implemented — show disabled "Coming Soon" buttons instead of alert()
  const monitoringEnabled = false

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Aggregate stats
  const totalDials = liveReps.reduce((sum, r) => sum + r.todayStats.dials, 0)
  const totalConversations = liveReps.reduce((sum, r) => sum + r.todayStats.conversations, 0)
  const totalMoveForward = liveReps.reduce((sum, r) => sum + r.todayStats.wantsToMoveForward, 0)
  const activeReps = liveReps.filter(r => r.status !== 'idle')
  const onCallReps = liveReps.filter(r => r.status === 'on_call')

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading live monitor...</div>
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Radio size={28} className="text-red-500" />
            Live Dialer Monitor
          </h1>
          <p className="text-gray-500 mt-1">
            Real-time view of all rep dialing activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border ${
              autoRefresh ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            <RefreshCw size={14} className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? 'Auto-refreshing' : 'Paused'}
          </button>
          <Button variant="outline" size="sm" onClick={loadLiveStatus}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{liveReps.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Reps</div>
        </Card>
        <Card className={`p-4 text-center ${onCallReps.length > 0 ? 'border-green-300 bg-green-50' : ''}`}>
          <div className="text-3xl font-bold text-green-600">{onCallReps.length}</div>
          <div className="text-xs text-gray-500 mt-1">On Call Now</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{totalDials}</div>
          <div className="text-xs text-gray-500 mt-1">Total Dials Today</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{totalConversations}</div>
          <div className="text-xs text-gray-500 mt-1">Conversations</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{totalMoveForward}</div>
          <div className="text-xs text-gray-500 mt-1">Move Forward</div>
        </Card>
      </div>

      {/* Aggregate Disposition Breakdown */}
      {(() => {
        const DISPOSITION_BADGES: { key: keyof LiveRep['todayStats']; label: string; bg: string; text: string }[] = [
          { key: 'wantsToMoveForward', label: 'Move Fwd', bg: 'bg-green-100', text: 'text-green-700' },
          { key: 'callback', label: 'Callback', bg: 'bg-teal-100', text: 'text-teal-700' },
          { key: 'interestedVerbal', label: 'Verbal Int', bg: 'bg-green-50', text: 'text-green-600' },
          { key: 'wantsChanges', label: 'Changes', bg: 'bg-blue-100', text: 'text-blue-700' },
          { key: 'willLookLater', label: 'Look Later', bg: 'bg-amber-100', text: 'text-amber-700' },
          { key: 'notInterested', label: 'Not Int', bg: 'bg-gray-100', text: 'text-gray-600' },
          { key: 'voicemail', label: 'VM', bg: 'bg-gray-100', text: 'text-gray-500' },
          { key: 'noAnswer', label: 'No Ans', bg: 'bg-gray-50', text: 'text-gray-500' },
          { key: 'wrongNumber', label: 'Wrong #', bg: 'bg-red-50', text: 'text-red-600' },
          { key: 'disconnected', label: 'Disconn', bg: 'bg-red-50', text: 'text-red-600' },
          { key: 'dnc', label: 'DNC', bg: 'bg-red-100', text: 'text-red-700' },
        ]
        const totals = DISPOSITION_BADGES.map(b => ({
          ...b,
          total: liveReps.reduce((sum, r) => sum + (r.todayStats[b.key] as number || 0), 0),
        })).filter(b => b.total > 0)
        return totals.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {totals.map(b => (
              <span key={b.key} className={`px-2.5 py-1 rounded-full text-xs font-medium ${b.bg} ${b.text}`}>
                {b.total} {b.label}
              </span>
            ))}
          </div>
        ) : null
      })()}

      {/* Live Reps */}
      <div className="space-y-4">
        {liveReps.length === 0 ? (
          <Card className="p-12 text-center">
            <Users size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No Active Reps</h3>
            <p className="text-gray-500 mt-1">Rep status will appear here when they start dialing.</p>
          </Card>
        ) : (
          liveReps.map(rep => (
            <Card key={rep.repId} className={`p-5 ${
              rep.status === 'on_call' ? 'border-green-300 bg-green-50/50' :
              rep.status === 'dialing' ? 'border-blue-300 bg-blue-50/50' :
              rep.status === 'on_hold' ? 'border-yellow-300 bg-yellow-50/50' :
              ''
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div className={`w-3 h-3 rounded-full ${
                    rep.status === 'on_call' ? 'bg-green-500 animate-pulse' :
                    rep.status === 'dialing' ? 'bg-blue-500 animate-pulse' :
                    rep.status === 'on_hold' ? 'bg-yellow-500' :
                    'bg-gray-300'
                  }`} />

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{rep.repName}</h3>
                      <Badge variant="outline" className={
                        rep.status === 'on_call' ? 'bg-green-100 text-green-700 border-green-200' :
                        rep.status === 'dialing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        rep.status === 'on_hold' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                        'bg-gray-100 text-gray-600'
                      }>
                        {rep.status === 'on_call' ? `ON CALL (${formatTime(rep.callDuration)})` :
                         rep.status === 'dialing' ? 'DIALING' :
                         rep.status === 'on_hold' ? 'ON HOLD' :
                         rep.status === 'idle' ? 'IDLE' : 'OFFLINE'}
                      </Badge>
                    </div>

                    {rep.currentLead && (
                      <p className="text-sm text-gray-600 mt-0.5">
                        with <span className="font-medium">{rep.currentLead.firstName} {rep.currentLead.lastName}</span>
                        {' — '}{rep.currentLead.companyName}
                      </p>
                    )}

                    {/* Preview status indicator for on-call reps */}
                    {rep.status === 'on_call' && rep.previewStatus && (
                      <div className={`flex items-center gap-1.5 mt-1 text-xs font-medium ${
                        rep.previewStatus.ctaClicked ? 'text-emerald-600' :
                        rep.previewStatus.opened ? 'text-green-600' :
                        rep.previewStatus.sent ? 'text-yellow-600' :
                        'text-gray-400'
                      }`}>
                        <span>{
                          rep.previewStatus.ctaClicked ? '🟢' :
                          rep.previewStatus.opened ? '🟢' :
                          rep.previewStatus.sent ? '🟡' :
                          '🔴'
                        }</span>
                        <span>Preview: {
                          rep.previewStatus.ctaClicked ? 'CTA CLICKED' :
                          rep.previewStatus.opened && rep.previewStatus.viewDurationSeconds
                            ? `OPENED (viewing for ${Math.floor(rep.previewStatus.viewDurationSeconds / 60)}:${(rep.previewStatus.viewDurationSeconds % 60).toString().padStart(2, '0')})`
                            : rep.previewStatus.opened ? 'OPENED'
                            : rep.previewStatus.sent ? 'SENT — waiting for open'
                            : 'Not sent yet'
                        }</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {rep.todayStats.dials} dials
                      </span>
                      <span className="flex items-center gap-1">
                        <PhoneForwarded size={12} /> {rep.todayStats.conversations} convos
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} /> {rep.todayStats.previewsSent} previews
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {[
                        { val: rep.todayStats.wantsToMoveForward, label: 'Move Fwd', bg: 'bg-green-100', text: 'text-green-700' },
                        { val: rep.todayStats.callback, label: 'Callback', bg: 'bg-teal-100', text: 'text-teal-700' },
                        { val: rep.todayStats.interestedVerbal, label: 'Verbal Int', bg: 'bg-green-50', text: 'text-green-600' },
                        { val: rep.todayStats.wantsChanges, label: 'Changes', bg: 'bg-blue-100', text: 'text-blue-700' },
                        { val: rep.todayStats.willLookLater, label: 'Look Later', bg: 'bg-amber-100', text: 'text-amber-700' },
                        { val: rep.todayStats.notInterested, label: 'Not Int', bg: 'bg-gray-100', text: 'text-gray-600' },
                        { val: rep.todayStats.voicemail, label: 'VM', bg: 'bg-gray-100', text: 'text-gray-500' },
                        { val: rep.todayStats.noAnswer, label: 'No Ans', bg: 'bg-gray-50', text: 'text-gray-500' },
                        { val: rep.todayStats.wrongNumber, label: 'Wrong #', bg: 'bg-red-50', text: 'text-red-600' },
                        { val: rep.todayStats.disconnected, label: 'Disconn', bg: 'bg-red-50', text: 'text-red-600' },
                        { val: rep.todayStats.dnc, label: 'DNC', bg: 'bg-red-100', text: 'text-red-700' },
                      ].filter(d => d.val > 0).map(d => (
                        <span key={d.label} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${d.bg} ${d.text}`}>
                          {d.val} {d.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Admin Actions — BUG 10.5/U.8: Disabled "Coming Soon" until Twilio Conference is connected */}
                {rep.status === 'on_call' && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-gray-400 border-gray-200 cursor-not-allowed"
                      disabled
                      title="Coming Soon — Requires Twilio Conference API"
                    >
                      <Headphones size={14} className="mr-1" /> Listen
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-gray-400 border-gray-200 cursor-not-allowed"
                      disabled
                      title="Coming Soon — Requires Twilio Conference API"
                    >
                      <VolumeX size={14} className="mr-1" /> Whisper
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-gray-400 border-gray-200 cursor-not-allowed"
                      disabled
                      title="Coming Soon — Requires Twilio Conference API"
                    >
                      <Volume2 size={14} className="mr-1" /> Barge
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Info Card */}
      <Card className="p-5 bg-gray-50 border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Monitor Controls</h3>
        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <Headphones size={16} className="text-blue-500 mt-0.5" />
            <div>
              <span className="font-medium">Listen</span>
              <p className="text-xs text-gray-400">Hear the call silently. Rep and lead don&apos;t know.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <VolumeX size={16} className="text-purple-500 mt-0.5" />
            <div>
              <span className="font-medium">Whisper</span>
              <p className="text-xs text-gray-400">Talk to rep only. Lead can&apos;t hear you.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Volume2 size={16} className="text-red-500 mt-0.5" />
            <div>
              <span className="font-medium">Barge</span>
              <p className="text-xs text-gray-400">Join the call. Both rep and lead hear you.</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          All monitoring features use Twilio Conference API. These features are coming soon — connect your Twilio account in Settings to enable when ready.
        </p>
      </Card>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Session History Section                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}

      <div className="border-t border-gray-200 pt-8 mt-4">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History size={24} className="text-gray-500" />
            Session History
          </h2>
          <p className="text-gray-500 text-sm mt-1">Past dialer sessions by rep</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Rep</label>
            <select
              value={filters.repId}
              onChange={e => setFilters(f => ({ ...f, repId: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="">All Reps</option>
              {liveReps.map(r => (
                <option key={r.repId} value={r.repId}>{r.repName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Search</label>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Search session names..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-48"
              />
              <Button variant="outline" size="sm" onClick={handleSearchSubmit}>
                <Search size={14} />
              </Button>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadSessionHistory(1)}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>

        {/* Session List */}
        {historyLoading ? (
          <div className="text-center text-gray-500 py-12">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <Card className="p-12 text-center">
            <History size={40} className="text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700">No Sessions Found</h3>
            <p className="text-gray-500 mt-1 text-sm">No completed sessions match your filters. Try adjusting the date range or rep filter.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => {
              const isExpanded = expandedSessionId === s.id
              const connectRate = s.totalCalls > 0 ? ((s.connectedCalls / s.totalCalls) * 100).toFixed(1) : '0.0'
              const previewSendRate = s.conversations > 0 ? ((s.previewsSent / s.conversations) * 100).toFixed(1) : '0.0'
              const conversionRate = s.conversations > 0 ? ((s.wantsToMoveForwardCount / s.conversations) * 100).toFixed(1) : '0.0'

              return (
                <Card key={s.id} className="overflow-hidden">
                  {/* Collapsed Row */}
                  <button
                    onClick={() => setExpandedSessionId(isExpanded ? null : s.id)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{s.name || 'Unnamed Session'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatSessionTime(s.startedAt, s.endedAt)}
                      </div>
                      {s.freshLeadsAtStart != null && (
                        <div className="text-xs text-blue-600 mt-0.5">
                          Fresh: {s.freshLeadsAtStart} → {s.freshLeadsRemaining ?? '?'} remaining
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0 ml-4">
                      <span><strong className="text-gray-700">{s.totalCalls}</strong> dials</span>
                      <span><strong className="text-gray-700">{s.conversations}</strong> convos</span>
                      <span><strong className="text-green-600">{s.wantsToMoveForwardCount}</strong> fwd</span>
                      <span><strong className="text-purple-600">{s.previewsSent}</strong> previews</span>
                      <Badge variant="outline" className="text-xs">{formatDuration(s.duration)}</Badge>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-4">
                      {/* Session Name + Hide Button */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">{s.name || 'Unnamed Session'}</h3>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleHideSession(s.id) }}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Hide
                        </button>
                      </div>

                      {/* Disposition Breakdown */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 mb-1.5">Dispositions</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { val: s.wantsToMoveForwardCount, label: 'Move Fwd', bg: 'bg-green-100', text: 'text-green-700' },
                            { val: s.callbackCount, label: 'Callback', bg: 'bg-teal-100', text: 'text-teal-700' },
                            { val: s.interestedVerbalCount, label: 'Verbal Int', bg: 'bg-green-50', text: 'text-green-600' },
                            { val: s.wantsChangesCount, label: 'Changes', bg: 'bg-blue-100', text: 'text-blue-700' },
                            { val: s.willLookLaterCount, label: 'Look Later', bg: 'bg-amber-100', text: 'text-amber-700' },
                            { val: s.notInterestedCount, label: 'Not Int', bg: 'bg-gray-100', text: 'text-gray-600' },
                            { val: s.voicemails, label: 'VM', bg: 'bg-gray-100', text: 'text-gray-500' },
                            { val: s.noAnswers, label: 'No Ans', bg: 'bg-gray-50', text: 'text-gray-500' },
                            { val: s.wrongNumberCount, label: 'Wrong #', bg: 'bg-red-50', text: 'text-red-600' },
                            { val: s.disconnectedCount, label: 'Disconn', bg: 'bg-red-50', text: 'text-red-600' },
                            { val: s.dncCount, label: 'DNC', bg: 'bg-red-100', text: 'text-red-700' },
                          ].filter(d => d.val > 0).map(d => (
                            <span key={d.label} className={`px-2.5 py-1 rounded-full text-xs font-medium ${d.bg} ${d.text}`}>
                              {d.val} {d.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 mb-1.5">Stats</h4>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { label: 'Connect Rate', value: `${connectRate}%` },
                            { label: 'Preview Send Rate', value: `${previewSendRate}%` },
                            { label: 'Conversion Rate', value: `${conversionRate}%` },
                            { label: 'Avg Call Duration', value: formatCallDuration(s.avgCallDuration) },
                            { label: 'Previews Opened', value: String(s.previewsOpened) },
                            { label: 'CTA Clicks', value: String(s.ctaClicks) },
                            { label: 'Fresh Leads Start', value: s.freshLeadsAtStart != null ? String(s.freshLeadsAtStart) : 'N/A' },
                            { label: 'Fresh Burned', value: s.uniqueFreshCalled != null ? String(s.uniqueFreshCalled) : 'N/A' },
                            { label: 'Fresh Remaining', value: s.freshLeadsRemaining != null ? String(s.freshLeadsRemaining) : 'N/A' },
                            { label: 'Session Duration', value: formatDuration(s.duration) },
                            { label: 'Total Dials', value: String(s.totalCalls) },
                            { label: 'Auto-Dial', value: s.autoDialEnabled ? 'Yes' : 'No' },
                          ].map(stat => (
                            <div key={stat.label} className="bg-white rounded-lg border border-gray-100 p-2.5">
                              <div className="text-[10px] text-gray-400 uppercase tracking-wide">{stat.label}</div>
                              <div className="text-sm font-semibold text-gray-900 mt-0.5">{stat.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Recommendation */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                          <Sparkles size={12} /> AI Recommendation
                        </h4>
                        <Card className="p-3 bg-white">
                          {s.aiRecommendation ? (
                            <p className="text-sm text-gray-700 leading-relaxed">{s.aiRecommendation}</p>
                          ) : generatingAI === s.id ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Loader2 size={14} className="animate-spin" />
                              Generating AI analysis...
                            </div>
                          ) : s.totalCalls < 10 ? (
                            <p className="text-sm text-gray-400 italic">Not enough data for analysis (minimum 10 calls)</p>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleGenerateAI(s.id) }}
                            >
                              <Sparkles size={14} className="mr-1" /> Generate AI Analysis
                            </Button>
                          )}
                        </Card>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {sessionPagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>
              Showing {(sessionPagination.page - 1) * sessionPagination.limit + 1}–{Math.min(sessionPagination.page * sessionPagination.limit, sessionPagination.total)} of {sessionPagination.total} sessions
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={sessionPagination.page <= 1}
                onClick={() => loadSessionHistory(sessionPagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={sessionPagination.page >= sessionPagination.totalPages}
                onClick={() => loadSessionHistory(sessionPagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}