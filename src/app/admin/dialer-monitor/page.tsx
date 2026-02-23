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
} from 'lucide-react'

interface LiveRep {
  repId: string
  repName: string
  status: 'idle' | 'dialing' | 'on_call' | 'on_hold'
  sessionActive: boolean
  currentLead: { firstName: string; lastName: string; companyName: string } | null
  activeCalls: number
  callDuration: number
  todayStats: {
    dials: number
    conversations: number
    closes: number
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

export default function DialerMonitorPage() {
  const [liveReps, setLiveReps] = useState<LiveRep[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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
      const res = await fetch('/api/dialer/live')
      if (res.ok) {
        const data = await res.json()
        setLiveReps(data.reps || [])
      }
    } catch (e) {
      console.error('Failed to load live status:', e)
    } finally {
      setLoading(false)
    }
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
  const totalCloses = liveReps.reduce((sum, r) => sum + r.todayStats.closes, 0)
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
          <div className="text-3xl font-bold text-amber-600">{totalCloses}</div>
          <div className="text-xs text-gray-500 mt-1">Closes</div>
        </Card>
      </div>

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
                         rep.status === 'dialing' ? `DIALING (${rep.activeCalls} lines)` :
                         rep.status === 'on_hold' ? 'ON HOLD' :
                         rep.sessionActive ? 'IDLE' : 'OFFLINE'}
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
                        <Target size={12} /> {rep.todayStats.closes} closes
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} /> {rep.todayStats.previewsSent} previews
                      </span>
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
    </div>
  )
}