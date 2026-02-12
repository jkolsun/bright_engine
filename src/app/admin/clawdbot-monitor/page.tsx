'use client'

import { useEffect, useState } from 'react'
import { getRecentActivity, getTodayStats, getQueueStatus } from '@/lib/logging'

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
      const interval = setInterval(fetchData, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

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
    if (action.includes('ERROR')) return 'text-red-600'
    if (action.includes('ALERT') || action.includes('ESCALATION')) return 'text-orange-600'
    if (action.includes('PAYMENT')) return 'text-green-600'
    if (action.includes('UPSELL') || action.includes('REFERRAL')) return 'text-blue-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Clawdbot Monitor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🤖 CLAWDBOT TASK MONITOR</h1>
            <div className="flex items-center mt-2 gap-2">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-gray-600">🟢 ONLINE</p>
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh (5s)
            </label>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* Top Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Total Actions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalActions}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">📱 Texts Sent</p>
              <p className="text-2xl font-bold text-blue-600">{stats.textsSent}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">📱 Received</p>
              <p className="text-2xl font-bold text-blue-600">{stats.textsReceived}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">🔗 Previews</p>
              <p className="text-2xl font-bold text-gray-900">{stats.previewsGenerated}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">💰 Upsells</p>
              <p className="text-2xl font-bold text-green-600">{stats.upsellsPitched}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">👥 Referrals</p>
              <p className="text-2xl font-bold text-green-600">{stats.referralsAsked}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">🔥 Alerts</p>
              <p className="text-2xl font-bold text-orange-600">{stats.alertsSent}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">❌ Errors</p>
              <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
            </div>
          </div>
        )}

        {/* Queues */}
        {queues && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">QUEUES</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nurture sequences active</p>
                <p className="text-2xl font-bold">{queues.nurture_active}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Preview urgency sequences</p>
                <p className="text-2xl font-bold">{queues.preview_urgency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Upsell pitches pending</p>
                <p className="text-2xl font-bold">{queues.upsell_pending}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Referral asks pending</p>
                <p className="text-2xl font-bold">{queues.referral_pending}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Hot leads requiring attention: {queues.total_hot}</p>
              {queues.leads.slice(0, 5).map(lead => (
                <div key={lead.id} className="text-sm text-gray-700">
                  • {lead.companyName} ({lead.priority.toUpperCase()})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Log */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">TODAY'S ACTIVITY LOG</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activity.length === 0 ? (
              <p className="text-gray-500 text-sm">No activity yet</p>
            ) : (
              activity.map(item => (
                <div
                  key={item.id}
                  className="flex gap-4 pb-3 border-b border-gray-100 hover:bg-gray-50 -mx-2 px-2 py-1"
                >
                  <div className="text-xl">{getActionEmoji(item.actionType)}</div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${getActionColor(item.actionType)}`}>
                      {item.actionType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-700">{item.description}</p>
                    {(item.lead || item.client || item.rep) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {item.lead && `${item.lead.firstName} @ ${item.lead.companyName}`}
                        {item.client && `${item.client.companyName}`}
                        {item.rep && ` • ${item.rep.name}`}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
