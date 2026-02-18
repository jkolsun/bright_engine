'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Mail,
  MousePointerClick,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Eye,
  Phone,
  ArrowRight,
  RefreshCw,
  Zap,
  Target,
  BarChart3,
  Globe,
  X,
  UserPlus,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface DashboardStats {
  summary: {
    total_leads_in_instantly: number
    total_sent: number
    total_queued: number
    total_replied: number
    total_positive_replies: number
    total_bounced: number
    total_converted: number
    overall_reply_rate: number
    overall_positive_rate: number
    overall_conversion_rate: number
  }
  campaigns: Array<{
    campaign_id: string
    campaign_name: string
    total_leads: number
    queued: number
    in_sequence: number
    emails_opened: number
    previews_clicked: number
    replied: number
    replied_positive: number
    replied_negative: number
    replied_question: number
    bounced: number
    unsubscribed: number
    completed: number
    converted_to_paid: number
    open_rate: number
    preview_click_rate: number
    reply_rate: number
    positive_reply_rate: number
    conversion_rate: number
    targets: {
      open_rate: { target: number; red_flag: number }
      reply_rate: { target: number; red_flag: number }
      preview_click_rate: { target: number; red_flag: number }
      positive_reply_rate: { target: number; red_flag: number }
    }
  }>
  preview_engagement: {
    total_previews_generated: number
    total_previews_viewed: number
    total_cta_clicks: number
    total_call_clicks: number
    total_return_visits: number
    view_rate: number
    cta_click_rate: number
    hot_leads_from_previews: number
    from_instantly: number
  }
  personalization: {
    total_personalized: number
    total_with_preview_url: number
    total_missing_personalization: number
    total_missing_preview: number
    personalization_coverage: number
    preview_coverage: number
  }
  capacity_history: Array<{
    date: string
    campaign: string
    capacity: number
    usable: number
    followups: number
    available: number
    pushed: number
    remaining: number
  }>
  last_sync: {
    timestamp: string
    total_capacity: number
    total_pushed: number
  } | null
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function StatusBadge({ value, target, redFlag }: { value: number; target: number; redFlag: number }) {
  const isGood = value >= target
  const isBad = value < redFlag
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        isGood
          ? 'bg-emerald-100 text-emerald-700'
          : isBad
          ? 'bg-red-100 text-red-700'
          : 'bg-amber-100 text-amber-700'
      }`}
    >
      {isGood ? <CheckCircle2 size={12} /> : isBad ? <AlertTriangle size={12} /> : <TrendingUp size={12} />}
      {pct(value)}
    </span>
  )
}

export default function InstantlyDashboardPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    }>
      <InstantlyDashboard />
    </Suspense>
  )
}

function InstantlyDashboard() {
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  // Lead assignment from Leads page
  const assignLeadIds = searchParams.get('assignLeads')?.split(',').filter(Boolean) || []
  const [assigningToCampaign, setAssigningToCampaign] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState('')
  const [showAssignBanner, setShowAssignBanner] = useState(assignLeadIds.length > 0)

  const handleAssignToCampaign = async (campaignId: string, campaignName: string) => {
    if (assignLeadIds.length === 0) return
    setAssigningToCampaign(true)
    try {
      const res = await fetch('/api/instantly/assign-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: assignLeadIds, campaignId, campaignName }),
      })
      const data = await res.json()
      if (res.ok) {
        const skippedMsg = data.skipped > 0 ? ` (${data.skipped} skipped — missing email or preview URL)` : ''
        setAssignSuccess(`${data.updated} leads assigned to "${campaignName}"${skippedMsg}`)
        setShowAssignBanner(false)
        // Remove query params from URL
        window.history.replaceState({}, '', '/admin/instantly')
        setTimeout(() => setAssignSuccess(''), 7000)
        fetchStats()
      } else {
        alert(data.error || 'Failed to assign leads to campaign')
      }
    } catch {
      alert('Failed to assign leads to campaign')
    } finally {
      setAssigningToCampaign(false)
    }
  }

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/instantly/preview-stats')
      if (!res.ok) throw new Error(`Failed: ${res.statusText}`)
      const data = await res.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const triggerSync = async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/instantly/manual-sync', { method: 'POST' })
      if (res.ok) {
        // Refresh stats after sync completes
        await fetchStats()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(`Sync failed: ${data.details || data.error || 'Unknown error'}`)
      }
    } catch {
      alert('Sync request failed — check console for details')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={fetchStats} className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const s = stats.summary

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mail size={28} className="text-blue-600" />
            Instantly Campaigns
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Email campaigns with preview link engagement tracking
            {stats.last_sync && (
              <span className="ml-2 text-slate-400">
                Last sync: {new Date(stats.last_sync.timestamp).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Zap size={14} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Lead Assignment Banner */}
      {showAssignBanner && assignLeadIds.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserPlus size={20} className="text-purple-600" />
              <span className="font-semibold text-purple-900">
                Assign {assignLeadIds.length} lead{assignLeadIds.length !== 1 ? 's' : ''} to a campaign
              </span>
            </div>
            <button
              onClick={() => { setShowAssignBanner(false); window.history.replaceState({}, '', '/admin/instantly') }}
              className="text-purple-400 hover:text-purple-600"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-3 flex-wrap">
            {stats?.campaigns.map((campaign) => (
              <button
                key={campaign.campaign_id}
                onClick={() => handleAssignToCampaign(campaign.campaign_id, campaign.campaign_name)}
                disabled={assigningToCampaign}
                className="px-4 py-2 bg-white border border-purple-200 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors disabled:opacity-50"
              >
                {campaign.campaign_name} ({campaign.total_leads} leads)
              </button>
            ))}
            {(!stats?.campaigns || stats.campaigns.length === 0) && (
              <p className="text-sm text-purple-600">No campaigns found. Sync with Instantly first.</p>
            )}
          </div>
        </div>
      )}

      {/* Assignment Success */}
      {assignSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
          <CheckCircle2 size={20} className="text-green-600" />
          <span className="font-medium text-green-900">{assignSuccess}</span>
        </div>
      )}

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Mail size={20} className="text-blue-500" />}
          label="Total Sent"
          value={s.total_sent}
          sub={`${s.total_queued} queued`}
        />
        <StatCard
          icon={<Eye size={20} className="text-purple-500" />}
          label="Previews Clicked"
          value={stats.preview_engagement.total_previews_viewed}
          sub={`${pct(stats.preview_engagement.view_rate)} view rate`}
        />
        <StatCard
          icon={<MessageSquare size={20} className="text-emerald-500" />}
          label="Replies"
          value={s.total_replied}
          sub={`${s.total_positive_replies} positive (${pct(s.overall_positive_rate)})`}
        />
        <StatCard
          icon={<CheckCircle2 size={20} className="text-green-500" />}
          label="Converted"
          value={s.total_converted}
          sub={`${pct(s.overall_conversion_rate)} of replies`}
        />
      </div>

      {/* Email → Preview → Reply Funnel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-600" />
          Campaign Funnel
        </h2>
        <div className="flex items-center justify-between py-4">
          <FunnelStep label="Emails Sent" value={s.total_sent} color="bg-blue-500" />
          <ArrowRight size={20} className="text-slate-300 flex-shrink-0" />
          <FunnelStep
            label="Opened"
            value={stats.campaigns.reduce((sum, c) => sum + c.emails_opened, 0)}
            color="bg-indigo-500"
          />
          <ArrowRight size={20} className="text-slate-300 flex-shrink-0" />
          <FunnelStep
            label="Preview Clicked"
            value={stats.preview_engagement.total_previews_viewed}
            color="bg-purple-500"
          />
          <ArrowRight size={20} className="text-slate-300 flex-shrink-0" />
          <FunnelStep label="Replied" value={s.total_replied} color="bg-emerald-500" />
          <ArrowRight size={20} className="text-slate-300 flex-shrink-0" />
          <FunnelStep label="Positive" value={s.total_positive_replies} color="bg-green-500" />
          <ArrowRight size={20} className="text-slate-300 flex-shrink-0" />
          <FunnelStep label="Converted" value={s.total_converted} color="bg-amber-500" />
        </div>
      </div>

      {/* Campaign A vs B Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.campaigns.map((campaign) => (
          <div key={campaign.campaign_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">{campaign.campaign_name}</h3>
              <span className="text-xs text-slate-400 font-mono">{campaign.campaign_id.slice(0, 8)}...</span>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MetricRow label="Total Leads" value={campaign.total_leads} />
              <MetricRow label="In Sequence" value={campaign.in_sequence} />
              <MetricRow label="Queued" value={campaign.queued} />
              <MetricRow label="Completed" value={campaign.completed} />
            </div>

            {/* Rate metrics with targets */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <RateRow
                label="Open Rate"
                value={campaign.open_rate}
                target={campaign.targets.open_rate.target}
                redFlag={campaign.targets.open_rate.red_flag}
              />
              <RateRow
                label="Preview Click Rate"
                value={campaign.preview_click_rate}
                target={campaign.targets.preview_click_rate.target}
                redFlag={campaign.targets.preview_click_rate.red_flag}
              />
              <RateRow
                label="Reply Rate"
                value={campaign.reply_rate}
                target={campaign.targets.reply_rate.target}
                redFlag={campaign.targets.reply_rate.red_flag}
              />
              <RateRow
                label="Positive Reply Rate"
                value={campaign.positive_reply_rate}
                target={campaign.targets.positive_reply_rate.target}
                redFlag={campaign.targets.positive_reply_rate.red_flag}
              />
            </div>

            {/* Reply breakdown */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
              <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                +{campaign.replied_positive} positive
              </span>
              <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-full">
                -{campaign.replied_negative} negative
              </span>
              <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                ?{campaign.replied_question} questions
              </span>
              <span className="text-xs px-2 py-1 bg-slate-50 text-slate-600 rounded-full">
                {campaign.bounced} bounced
              </span>
            </div>
          </div>
        ))}

        {stats.campaigns.length === 0 && (
          <div className="col-span-2 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <Mail className="mx-auto text-slate-400 mb-3" size={40} />
            <p className="text-slate-500 font-medium">No campaigns found</p>
            <p className="text-slate-400 text-sm mt-1">
              Campaigns will appear after the first Instantly sync runs. Click "Sync Now" above.
            </p>
          </div>
        )}
      </div>

      {/* Preview Engine Stats */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Globe size={20} className="text-purple-600" />
          Preview Engine Performance
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MiniStat label="Previews Generated" value={stats.preview_engagement.total_previews_generated} />
          <MiniStat label="Previews Viewed" value={stats.preview_engagement.total_previews_viewed} />
          <MiniStat label="CTA Clicks" value={stats.preview_engagement.total_cta_clicks} />
          <MiniStat label="Call Clicks" value={stats.preview_engagement.total_call_clicks} />
          <MiniStat label="Return Visits" value={stats.preview_engagement.total_return_visits} />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{pct(stats.preview_engagement.view_rate)}</p>
            <p className="text-xs text-slate-500">View Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{pct(stats.preview_engagement.cta_click_rate)}</p>
            <p className="text-xs text-slate-500">CTA Click Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.preview_engagement.hot_leads_from_previews}</p>
            <p className="text-xs text-slate-500">Hot Leads from Previews</p>
          </div>
        </div>
      </div>

      {/* Personalization Coverage */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Target size={20} className="text-amber-600" />
          Personalization & Preview Coverage
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <CoverageBar
            label="Personalized"
            value={stats.personalization.personalization_coverage}
            count={stats.personalization.total_personalized}
            missing={stats.personalization.total_missing_personalization}
          />
          <CoverageBar
            label="Preview URLs"
            value={stats.personalization.preview_coverage}
            count={stats.personalization.total_with_preview_url}
            missing={stats.personalization.total_missing_preview}
          />
          <div className="col-span-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Campaign Readiness</p>
            <div className="space-y-2">
              <ReadinessItem
                label="Leads with personalization + preview"
                ready={stats.personalization.personalization_coverage > 0.9 && stats.personalization.preview_coverage > 0.9}
              />
              <ReadinessItem
                label="Instantly API connected"
                ready={stats.last_sync !== null}
              />
              <ReadinessItem
                label="Campaigns created (A + B)"
                ready={stats.campaigns.length >= 2}
              />
              <ReadinessItem
                label="Leads actively sending"
                ready={s.total_sent > 0}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Capacity History */}
      {stats.capacity_history.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Send Capacity (Last 14 Days)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Date</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Campaign</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Capacity</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Usable</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Follow-ups</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Available</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Pushed</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {stats.capacity_history.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-700">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        row.campaign === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {row.campaign === 'A' ? 'Bad Website' : 'No Website'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">{row.capacity}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{row.usable}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{row.followups}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{row.available}</td>
                    <td className="py-2 px-3 text-right font-medium text-emerald-600">{row.pushed}</td>
                    <td className="py-2 px-3 text-right text-slate-500">{row.remaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  )
}

function FunnelStep({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center flex-1">
      <div className={`${color} text-white rounded-lg py-3 px-2 mb-1`}>
        <p className="text-xl font-bold">{value.toLocaleString()}</p>
      </div>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value.toLocaleString()}</span>
    </div>
  )
}

function RateRow({ label, value, target, redFlag }: { label: string; value: number; target: number; redFlag: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <StatusBadge value={value} target={target} redFlag={redFlag} />
        <span className="text-xs text-slate-400">target: {pct(target)}</span>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center py-3 px-2 bg-slate-50 rounded-lg">
      <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  )
}

function CoverageBar({ label, value, count, missing }: { label: string; value: number; count: number; missing: number }) {
  const widthPct = Math.min(100, value * 100)
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{pct(value)}</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            value > 0.9 ? 'bg-emerald-500' : value > 0.7 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-1">{count} ready, {missing} missing</p>
    </div>
  )
}

function ReadinessItem({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {ready ? (
        <CheckCircle2 size={16} className="text-emerald-500" />
      ) : (
        <AlertTriangle size={16} className="text-amber-500" />
      )}
      <span className={`text-sm ${ready ? 'text-slate-700' : 'text-amber-700'}`}>{label}</span>
    </div>
  )
}