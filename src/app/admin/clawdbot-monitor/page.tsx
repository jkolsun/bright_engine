'use client'

import { useEffect, useState } from 'react'

interface Activity {
  id: string
  actionType: string
  description: string
  lead?: { firstName: string; companyName: string }
  client?: { companyName: string }
  rep?: { name: string }
  createdAt: Date
}

interface Stats {
  totalActions: number
  textsSent: number
  textsReceived: number
  alertsSent: number
  previewsGenerated: number
  upsellsPitched: number
  referralsAsked: number
  errors: number
}

interface QueueInfo {
  nurture_active: number
  preview_urgency: number
  upsell_pending: number
  referral_pending: number
  total_hot: number
  leads: Array<{
    id: string
    companyName: string
    status: string
    priority: string
  }>
}

export default function ClawdbotMonitorPage() {
  const [activity, setActivity] = useState<Activity[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [queues, setQueues] = useState<QueueInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [expandedSections, setExpandedSections] = useState({
    queues: false,
    activity: true,
    stats: false,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/clawdbot-monitor')
        const data = await response.json()
        setActivity(data.activity || [])
        setStats(data.stats || null)
        setQueues(data.queues || null)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch monitor data:', error)
        setLoading(false)
      }
    }

    fetchData()

    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const getActionEmoji = (action: string) => {
    const emojis: Record<string, string> = {
      TEXT_SENT: '📱',
      TEXT_RECEIVED: '📱',
      ALERT: '🔥',
      HEARTBEAT: '🫀',
      IMPORT: '📥',
      ENRICHMENT: '🔍',
      PREVIEW_GENERATED: '🔗',
      NURTURE_ACTION: '📧',
      URGENCY_ACTION: '⏰',
      UPSELL_PITCH: '💰',
      REFERRAL_ASK: '👥',
      ANNUAL_PITCH: '📅',
      ESCALATION: '🚨',
      SCORE_UPDATE: '📊',
      QUEUE_UPDATE: '📋',
      PAYMENT_RECEIVED: '✅',
      ERROR: '❌',
      NIGHTLY_DIGEST: '📊',
      MORNING_REPORT: '☀️',
      WEEKLY_REPORT: '📈',
    }
    return emojis[action] || '•'
  }

  const getActionColor = (action: string) => {
    if (action.includes('ERROR')) return 'text-red-400'
    if (action.includes('ALERT') || action.includes('ESCALATION')) return 'text-orange-400'
    if (action.includes('PAYMENT')) return 'text-green-400'
    if (action.includes('UPSELL') || action.includes('REFERRAL')) return 'text-blue-400'
    return 'text-gray-300'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-green-500 text-sm">Loading Clawdbot...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20 md:p-8 max-w-full w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
            <h1 className="text-lg font-bold">🤖 CLAWDBOT</h1>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs bg-green-600 text-black px-3 py-1 rounded font-semibold active:opacity-70"
          >
            ↻
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={e => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          Auto-refresh (5s)
        </label>
      </div>

      {/* Top Stats Bar - Show only key metrics */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-900 p-3 rounded border border-gray-800">
            <p className="text-xs text-gray-400">Actions</p>
            <p className="text-2xl font-bold text-green-400">{stats.totalActions}</p>
          </div>
          <div className="bg-gray-900 p-3 rounded border border-gray-800">
            <p className="text-xs text-gray-400">📱 Texts</p>
            <p className="text-2xl font-bold text-blue-400">{stats.textsSent}</p>
          </div>
          <div className="bg-gray-900 p-3 rounded border border-gray-800">
            <p className="text-xs text-gray-400">🔗 Previews</p>
            <p className="text-2xl font-bold">{stats.previewsGenerated}</p>
          </div>
          <div className="bg-gray-900 p-3 rounded border border-gray-800">
            <p className="text-xs text-gray-400">💰 Upsells</p>
            <p className="text-2xl font-bold text-green-400">{stats.upsellsPitched}</p>
          </div>
        </div>
      )}

      {/* Queues - Collapsible */}
      <div className="bg-gray-900 rounded border border-gray-800 mb-4 overflow-hidden">
        <button
          onClick={() => toggleSection('queues')}
          className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-gray-800 active:bg-gray-700"
        >
          <span>QUEUES</span>
          <span>{expandedSections.queues ? '▼' : '▶'}</span>
        </button>
        {expandedSections.queues && queues && (
          <div className="border-t border-gray-800 p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Nurture active</span>
              <span className="font-bold text-cyan-400">{queues.nurture_active}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Preview urgency</span>
              <span className="font-bold text-yellow-400">{queues.preview_urgency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Upsells pending</span>
              <span className="font-bold text-green-400">{queues.upsell_pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Referrals pending</span>
              <span className="font-bold text-purple-400">{queues.referral_pending}</span>
            </div>
            {queues.total_hot > 0 && (
              <div className="border-t border-gray-700 pt-3 mt-3">
                <p className="text-xs text-gray-400 mb-2">🔥 Hot leads ({queues.total_hot})</p>
                <div className="space-y-1">
                  {queues.leads.slice(0, 3).map(lead => (
                    <div key={lead.id} className="text-xs text-gray-300 truncate">
                      {lead.companyName}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Detail - Collapsible */}
      <div className="bg-gray-900 rounded border border-gray-800 mb-4 overflow-hidden">
        <button
          onClick={() => toggleSection('stats')}
          className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-gray-800 active:bg-gray-700"
        >
          <span>TODAY'S STATS</span>
          <span>{expandedSections.stats ? '▼' : '▶'}</span>
        </button>
        {expandedSections.stats && stats && (
          <div className="border-t border-gray-800 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Texts received</span>
              <span className="text-blue-400">{stats.textsReceived}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Alerts sent</span>
              <span className="text-orange-400">{stats.alertsSent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Referrals asked</span>
              <span className="text-purple-400">{stats.referralsAsked}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Errors</span>
              <span className="text-red-400">{stats.errors}</span>
            </div>
          </div>
        )}
      </div>

      {/* Activity Log - Always expanded, top 10 only */}
      <div className="bg-gray-900 rounded border border-gray-800 overflow-hidden">
        <div className="p-4 font-semibold text-sm border-b border-gray-800">ACTIVITY</div>
        <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
          {activity.length === 0 ? (
            <div className="p-4 text-xs text-gray-500">No activity yet</div>
          ) : (
            activity.slice(0, 10).map(item => (
              <div key={item.id} className="p-3 hover:bg-gray-800 active:bg-gray-700 text-xs">
                <div className="flex gap-2 items-start">
                  <span className="text-lg flex-shrink-0">{getActionEmoji(item.actionType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-xs ${getActionColor(item.actionType)}`}>
                      {item.actionType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-gray-300 text-xs truncate">{item.description}</p>
                    {(item.lead || item.client) && (
                      <p className="text-gray-500 text-xs mt-1 truncate">
                        {item.lead?.companyName || item.client?.companyName}
                      </p>
                    )}
                  </div>
                  <div className="text-gray-500 text-xs flex-shrink-0 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
