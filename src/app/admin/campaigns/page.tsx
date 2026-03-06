'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeft,
  Plus,
  Play,
  Pause,
  Send,
  Settings,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  X,
  Trash2,
  UserPlus,
  Pencil,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Campaign {
  id: string
  name: string
  status: 'DRAFT' | 'SENDING' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'
  templateBody: string
  fromNumber: string
  totalLeads: number
  sentCount: number
  deliveredCount: number
  clickedCount: number
  optedInCount: number
  optedOutCount: number
  closedCount: number
  createdAt: string
  updatedAt: string
}

interface CampaignLead {
  id: string
  leadId: string
  companyName: string
  firstName: string
  lastName: string
  phone: string
  city: string
  state: string
  stage: string
  lastActivityAt: string
  repName: string
}

interface TimelineEvent {
  id: string
  type: string
  title: string
  description?: string
  createdAt: string
}

interface CampaignSettings {
  coldTextTemplate: string
  drip1Template: string
  drip1DayOffset: number
  drip2Template: string
  drip2DayOffset: number
  drip3Template: string
  drip3DayOffset: number
  drip4Template: string
  drip4DayOffset: number
  drip5Template: string
  drip5DayOffset: number
  sendWindowStart: number
  sendWindowEnd: number
  sendDays: string[]
  dailyLimit: number
  messagesPerMinute: number
  smsFromNumber: string
}

interface FunnelStage {
  key: string
  label: string
  color: string
  bgColor: string
  textColor: string
  count: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
  SENDING: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  PAUSED: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300' },
  COMPLETED: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300' },
  ARCHIVED: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400' },
}

const FUNNEL_STAGES: { key: string; label: string; color: string; bgColor: string; textColor: string }[] = [
  { key: 'QUEUED', label: 'Queued', color: 'bg-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-700 dark:text-gray-300' },
  { key: 'TEXTED', label: 'Texted', color: 'bg-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/40', textColor: 'text-blue-700 dark:text-blue-300' },
  { key: 'CLICKED', label: 'Clicked', color: 'bg-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/40', textColor: 'text-orange-700 dark:text-orange-300' },
  { key: 'REP_CALLED', label: 'Rep Called', color: 'bg-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-900/40', textColor: 'text-purple-700 dark:text-purple-300' },
  { key: 'OPTED_IN', label: 'Opted In', color: 'bg-green-500', bgColor: 'bg-green-100 dark:bg-green-900/40', textColor: 'text-green-700 dark:text-green-300' },
  { key: 'DRIP_ACTIVE', label: 'Drip Active', color: 'bg-teal-500', bgColor: 'bg-teal-100 dark:bg-teal-900/40', textColor: 'text-teal-700 dark:text-teal-300' },
  { key: 'HOT', label: 'Hot', color: 'bg-red-500', bgColor: 'bg-red-100 dark:bg-red-900/40', textColor: 'text-red-700 dark:text-red-300' },
  { key: 'CLOSED', label: 'Closed', color: 'bg-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40', textColor: 'text-emerald-700 dark:text-emerald-300' },
  { key: 'OPTED_OUT', label: 'Opted Out', color: 'bg-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-700', textColor: 'text-slate-600 dark:text-slate-300' },
  { key: 'ARCHIVED', label: 'Archived', color: 'bg-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-500 dark:text-gray-400' },
]

const MERGE_FIELDS = ['{companyName}', '{firstName}', '{city}', '{state}', '{industry}', '{previewUrl}']

const TIMELINE_ICONS: Record<string, string> = {
  COLD_TEXT_SENT: '\u{1F4E4}',
  DELIVERED: '\u2705',
  PREVIEW_CLICKED: '\u{1F441}\uFE0F',
  REP_CALLED: '\u{1F4DE}',
  OPTED_IN: '\u2705',
  DRIP_SENT: '\u{1F4E4}',
  LEAD_REPLIED: '\u{1F4AC}',
  MARKED_HOT: '\u{1F525}',
  CLOSED: '\u{1F4B0}',
  OPTED_OUT: '\u{1F6D1}',
}

const DEFAULT_DRIP_TEMPLATES = {
  drip1Template: "Thanks for chatting {firstName}! Here's your website again: {previewUrl} \u2014 Let me know if you want any changes.",
  drip2Template: "Hey {firstName}, quick question \u2014 are you getting enough calls from Google right now? Most {industry} businesses in {city} are leaving money on the table without a website.",
  drip3Template: "Just wanted to share \u2014 we helped a {industry} company in {state} go from 0 to 15+ calls/month within 60 days of launching their site. Happy to do the same for {companyName}.",
  drip4Template: "{firstName}, your custom website for {companyName} is still ready to go. First month is free \u2014 just $199 to get set up. Want me to send over the details?",
  drip5Template: "Last check-in {firstName} \u2014 I'll keep your website saved for a bit longer in case you change your mind. Just reply here anytime. Have a great week!",
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return '\u2014'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '\u2014'
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function pct(num: number, den: number): string {
  if (!den) return '0.0'
  return ((num / den) * 100).toFixed(1)
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [tab, setTab] = useState<'list' | 'detail' | 'settings'>('list')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const selectCampaign = useCallback(async (campaign: Campaign) => {
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedCampaign(data.campaign || campaign)
      } else {
        setSelectedCampaign(campaign)
      }
    } catch {
      setSelectedCampaign(campaign)
    }
    setTab('detail')
  }, [])

  const goBackToList = useCallback(() => {
    setTab('list')
    setSelectedCampaign(null)
    fetchCampaigns()
  }, [fetchCampaigns])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage SMS campaigns, track funnel performance, and configure drip sequences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'list' && (
        <CampaignListTab
          campaigns={campaigns}
          loading={loading}
          onSelect={selectCampaign}
          onRefresh={fetchCampaigns}
        />
      )}
      {tab === 'detail' && selectedCampaign && (
        <CampaignDetailTab
          campaign={selectedCampaign}
          onBack={goBackToList}
          onRefresh={async () => {
            try {
              const res = await fetch(`/api/campaigns/${selectedCampaign.id}`)
              if (res.ok) {
                const data = await res.json()
                setSelectedCampaign(data.campaign)
              }
            } catch (err) {
              console.error('Failed to refresh campaign:', err)
            }
          }}
        />
      )}
      {tab === 'settings' && <CampaignSettingsTab />}
    </div>
  )
}

// ─── Tab 1: Campaign List ────────────────────────────────────────────────────

function CampaignListTab({
  campaigns,
  loading,
  onSelect,
  onRefresh,
}: {
  campaigns: Campaign[]
  loading: boolean
  onSelect: (c: Campaign) => void
  onRefresh: () => void
}) {
  const [showNewModal, setShowNewModal] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} />
            New Campaign
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Send size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No campaigns yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Create your first SMS campaign to start reaching leads
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} onClick={() => onSelect(c)} />
          ))}
        </div>
      )}

      {showNewModal && (
        <NewCampaignModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}

function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const c = campaign
  const progress = c.totalLeads > 0 ? (c.sentCount / c.totalLeads) * 100 : 0
  const statusStyle = STATUS_COLORS[c.status] || STATUS_COLORS.DRAFT

  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow w-full border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate pr-2">{c.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusStyle.bg} ${statusStyle.text}`}>
          {c.status}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>{c.sentCount} / {c.totalLeads} sent</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 rounded-full h-2 transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span title="Delivered">{pct(c.deliveredCount, c.sentCount)}% del</span>
        <span title="Clicked">{pct(c.clickedCount, c.sentCount)}% CTR</span>
        <span title="Opted In">{pct(c.optedInCount, c.sentCount)}% opt-in</span>
        <span title="Closed">{pct(c.closedCount, c.sentCount)}% close</span>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        Created {formatDate(c.createdAt)}
      </p>
    </button>
  )
}

// ─── New Campaign Modal ──────────────────────────────────────────────────────

function NewCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [fromNumber, setFromNumber] = useState('')
  const [folders, setFolders] = useState<any[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [manualLeadIds, setManualLeadIds] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const templateRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Fetch folders
    fetch('/api/folders')
      .then((r) => r.json())
      .then((data) => setFolders(data.folders || []))
      .catch(() => {})

    // Fetch default from number from settings
    fetch('/api/campaigns/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.smsFromNumber) {
          setFromNumber(data.settings.smsFromNumber)
        }
      })
      .catch(() => {})
  }, [])

  const insertMergeField = (field: string) => {
    const ta = templateRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = templateBody.slice(0, start)
    const after = templateBody.slice(end)
    const newVal = before + field + after
    setTemplateBody(newVal)
    // restore cursor after the inserted field
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + field.length
    }, 0)
  }

  const charCount = templateBody.length
  const segmentCount = Math.ceil(charCount / 160) || 0

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Campaign name is required')
      return
    }
    if (!templateBody.trim()) {
      setError('Template body is required')
      return
    }
    setCreating(true)
    setError('')
    try {
      const body: any = {
        name: name.trim(),
        templateBody: templateBody.trim(),
        fromNumber: fromNumber.trim() || undefined,
      }
      if (selectedFolderId) {
        body.folderId = selectedFolderId
      }
      if (manualLeadIds.trim()) {
        body.leadIds = manualLeadIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      }
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create campaign')
      }
      onCreated()
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. March Plumbers Blast"
            />
          </div>

          {/* Cold Text Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cold Text Template
            </label>
            <textarea
              ref={templateRef}
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              rows={4}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
              placeholder="Hey {firstName}, I built a free website for {companyName}..."
            />
            <div className="flex items-center justify-between mt-1">
              <div className="flex flex-wrap gap-1">
                {MERGE_FIELDS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => insertMergeField(f)}
                    className="px-2 py-0.5 rounded text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors"
                  >
                    {f}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
                {charCount} chars &middot; {segmentCount} segment{segmentCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* From Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Number
            </label>
            <input
              type="text"
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="+18005551234"
            />
          </div>

          {/* Lead Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lead Selection
            </label>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Select a Folder</label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">-- Choose folder --</option>
                  {folders.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f._count?.leads ?? f.leadCount ?? '?'} leads)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Or paste comma-separated Lead IDs
                </label>
                <input
                  type="text"
                  value={manualLeadIds}
                  onChange={(e) => setManualLeadIds(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  placeholder="lead_abc123, lead_def456, ..."
                />
                {manualLeadIds.trim() && (
                  <p className="text-xs text-gray-400 mt-1">
                    {manualLeadIds.split(',').filter((s) => s.trim()).length} lead ID(s) entered
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={16} />
                Create Campaign
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 2: Campaign Detail ──────────────────────────────────────────────────

function CampaignDetailTab({
  campaign,
  onBack,
  onRefresh,
}: {
  campaign: Campaign
  onBack: () => void
  onRefresh: () => void
}) {
  const [leads, setLeads] = useState<CampaignLead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [funnelCounts, setFunnelCounts] = useState<Record<string, number>>({})
  const [actionLoading, setActionLoading] = useState(false)
  const [showAddLeads, setShowAddLeads] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (stageFilter) params.set('stage', stageFilter)
      const res = await fetch(`/api/campaigns/${campaign.id}/leads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || [])
        setTotalPages(data.totalPages || 1)
        if (data.funnelCounts) setFunnelCounts(data.funnelCounts)
      }
    } catch (err) {
      console.error('Failed to fetch campaign leads:', err)
    } finally {
      setLeadsLoading(false)
    }
  }, [campaign.id, page, stageFilter])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const fetchTimeline = useCallback(async (leadId: string) => {
    setTimelineLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/leads/${leadId}/timeline`)
      if (res.ok) {
        const data = await res.json()
        setTimeline(data.events || [])
      }
    } catch (err) {
      console.error('Failed to fetch timeline:', err)
    } finally {
      setTimelineLoading(false)
    }
  }, [campaign.id])

  const handleExpandLead = useCallback(
    (leadId: string) => {
      if (expandedLeadId === leadId) {
        setExpandedLeadId(null)
        setTimeline([])
      } else {
        setExpandedLeadId(leadId)
        fetchTimeline(leadId)
      }
    },
    [expandedLeadId, fetchTimeline]
  )

  const handleAction = useCallback(
    async (action: 'start' | 'pause' | 'resume') => {
      setActionLoading(true)
      try {
        let res: Response
        if (action === 'start') {
          res = await fetch(`/api/campaigns/${campaign.id}/start`, { method: 'POST' })
        } else if (action === 'pause') {
          res = await fetch(`/api/campaigns/${campaign.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PAUSED' }),
          })
        } else {
          res = await fetch(`/api/campaigns/${campaign.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'SENDING' }),
          })
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          alert(data.error || `Failed to ${action} campaign`)
          return
        }
        onRefresh()
      } catch (err) {
        console.error('Campaign action failed:', err)
        alert('Network error — please try again')
      } finally {
        setActionLoading(false)
      }
    },
    [campaign.id, onRefresh]
  )

  const statusStyle = STATUS_COLORS[campaign.status] || STATUS_COLORS.DRAFT
  const totalSent = campaign.sentCount || 0

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft size={18} className="text-gray-500 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{campaign.name}</h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Created {formatDate(campaign.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'DRAFT' && (
            <button
              onClick={() => handleAction('start')}
              disabled={actionLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <Play size={16} />
              Start Sending
            </button>
          )}
          {campaign.status === 'SENDING' && (
            <button
              onClick={() => handleAction('pause')}
              disabled={actionLoading}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <Pause size={16} />
              Pause
            </button>
          )}
          {campaign.status === 'PAUSED' && (
            <button
              onClick={() => handleAction('resume')}
              disabled={actionLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <Play size={16} />
              Resume
            </button>
          )}
          {/* Add Leads — available for DRAFT, SENDING, PAUSED */}
          {['DRAFT', 'SENDING', 'PAUSED'].includes(campaign.status) && (
            <button
              onClick={() => setShowAddLeads(true)}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <UserPlus size={16} />
              Add Leads
            </button>
          )}
          {/* Edit — DRAFT only */}
          {campaign.status === 'DRAFT' && (
            <button
              onClick={() => setShowEditModal(true)}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Pencil size={16} />
              Edit
            </button>
          )}
          {/* Delete — not available for SENDING */}
          {campaign.status !== 'SENDING' && (
            <button
              onClick={async () => {
                if (!window.confirm('Are you sure? This will permanently delete this campaign and all associated records. Leads will not be deleted.')) return
                setActionLoading(true)
                try {
                  const res = await fetch(`/api/campaigns/${campaign.id}`, { method: 'DELETE' })
                  if (res.ok) onBack()
                  else {
                    const data = await res.json().catch(() => ({}))
                    alert(data.error || 'Failed to delete campaign')
                  }
                } catch (err) {
                  console.error('Delete failed:', err)
                } finally {
                  setActionLoading(false)
                }
              }}
              disabled={actionLoading}
              className="border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Funnel</h3>
        <div className="flex flex-wrap gap-2">
          {FUNNEL_STAGES.map((stage) => {
            const count = funnelCounts[stage.key] || 0
            const isActive = stageFilter === stage.key
            return (
              <button
                key={stage.key}
                onClick={() => {
                  setStageFilter(isActive ? null : stage.key)
                  setPage(1)
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                  isActive
                    ? `${stage.bgColor} border-current ${stage.textColor} ring-2 ring-offset-1 ring-blue-400`
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                <span className={isActive ? stage.textColor : 'text-gray-700 dark:text-gray-300'}>
                  {stage.label}
                </span>
                <span className={`font-semibold ${isActive ? stage.textColor : 'text-gray-900 dark:text-white'}`}>
                  {count}
                </span>
              </button>
            )
          })}
          {stageFilter && (
            <button
              onClick={() => {
                setStageFilter(null)
                setPage(1)
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <X size={14} />
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Total Sent" value={String(totalSent)} />
        <MetricCard label="Delivery Rate" value={`${pct(campaign.deliveredCount, totalSent)}%`} />
        <MetricCard label="Click Rate (CTR)" value={`${pct(campaign.clickedCount, totalSent)}%`} />
        <MetricCard label="Opt-Out Rate" value={`${pct(campaign.optedOutCount, totalSent)}%`} />
        <MetricCard label="Opt-In Rate" value={`${pct(campaign.optedInCount, totalSent)}%`} />
        <MetricCard label="Close Rate" value={`${pct(campaign.closedCount, totalSent)}%`} />
      </div>

      {/* Lead List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Leads {stageFilter ? `\u2014 ${stageFilter}` : ''}
          </h3>
        </div>

        {leadsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
            No leads found{stageFilter ? ` in stage "${stageFilter}"` : ''}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">
                    Company
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">
                    Contact
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">
                    Phone
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">
                    City/State
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">
                    Stage
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">
                    Last Activity
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">
                    Rep
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3 w-16">
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const stageInfo = FUNNEL_STAGES.find((s) => s.key === lead.stage)
                  const isExpanded = expandedLeadId === lead.leadId
                  return (
                    <LeadRow
                      key={lead.id || lead.leadId}
                      lead={lead}
                      stageInfo={stageInfo}
                      isExpanded={isExpanded}
                      onToggle={() => handleExpandLead(lead.leadId)}
                      onRemove={async () => {
                        try {
                          const res = await fetch(`/api/campaigns/${campaign.id}/leads/${lead.leadId}`, { method: 'DELETE' })
                          if (res.ok) { fetchLeads(); onRefresh() }
                          else {
                            const data = await res.json().catch(() => ({}))
                            alert(data.error || 'Failed to remove lead')
                          }
                        } catch (err) { console.error('Remove lead failed:', err) }
                      }}
                      timeline={isExpanded ? timeline : []}
                      timelineLoading={isExpanded && timelineLoading}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* From Number display */}
      {campaign.fromNumber && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">From Number</p>
          <p className="text-sm font-mono text-gray-900 dark:text-white">{campaign.fromNumber}</p>
        </div>
      )}

      {/* Add Leads Modal */}
      {showAddLeads && (
        <AddLeadsModal
          campaignId={campaign.id}
          onClose={() => setShowAddLeads(false)}
          onAdded={() => { setShowAddLeads(false); fetchLeads(); onRefresh() }}
        />
      )}

      {/* Edit Campaign Modal (DRAFT only) */}
      {showEditModal && (
        <EditCampaignModal
          campaign={campaign}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); onRefresh() }}
        />
      )}
    </div>
  )
}

// ─── Add Leads Modal ────────────────────────────────────────────────────────

function AddLeadsModal({
  campaignId,
  onClose,
  onAdded,
}: {
  campaignId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [folders, setFolders] = useState<any[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [manualLeadIds, setManualLeadIds] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ added: number; skipped: number; total: number } | null>(null)

  useEffect(() => {
    fetch('/api/folders')
      .then((r) => r.json())
      .then((data) => setFolders(data.folders || []))
      .catch(() => {})
  }, [])

  const handleAdd = async () => {
    if (!selectedFolderId && !manualLeadIds.trim()) {
      setError('Select a folder or paste lead IDs')
      return
    }
    setAdding(true)
    setError('')
    setResult(null)
    try {
      const body: any = {}
      if (selectedFolderId) body.folderId = selectedFolderId
      if (manualLeadIds.trim()) {
        body.leadIds = manualLeadIds.split(',').map(s => s.trim()).filter(Boolean)
      }
      const res = await fetch(`/api/campaigns/${campaignId}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add leads')
      setResult(data)
      if (data.added > 0) setTimeout(onAdded, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to add leads')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Leads to Campaign</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Select a Folder</label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">— None —</option>
              {folders.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name} ({f._count?.leads ?? '?'} leads)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Or Paste Lead IDs (comma-separated)</label>
            <textarea
              value={manualLeadIds}
              onChange={(e) => setManualLeadIds(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm"
              rows={3}
              placeholder="lead-id-1, lead-id-2, ..."
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {result && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Added {result.added} leads{result.skipped > 0 ? `, ${result.skipped} already in campaign` : ''}. Total: {result.total}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {adding ? 'Adding...' : 'Add Leads'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Campaign Modal ────────────────────────────────────────────────────

function EditCampaignModal({
  campaign,
  onClose,
  onSaved,
}: {
  campaign: Campaign
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(campaign.name)
  const [templateBody, setTemplateBody] = useState(campaign.templateBody)
  const [fromNumber, setFromNumber] = useState(campaign.fromNumber || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const templateRef = useRef<HTMLTextAreaElement>(null)

  const insertMergeField = (field: string) => {
    const ta = templateRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = templateBody.slice(0, start)
    const after = templateBody.slice(end)
    setTemplateBody(before + field + after)
    setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + field.length }, 0)
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    if (!templateBody.trim()) { setError('Template is required'); return }
    setSaving(true)
    setError('')
    try {
      const body: any = {}
      if (name !== campaign.name) body.name = name.trim()
      if (templateBody !== campaign.templateBody) body.templateBody = templateBody.trim()
      if (fromNumber !== campaign.fromNumber) body.fromNumber = fromNumber.trim()
      if (Object.keys(body).length === 0) { onSaved(); return }

      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save')
      }
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const charCount = templateBody.length
  const segmentCount = Math.ceil(charCount / 160) || 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Campaign</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Campaign Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Cold Text Template</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {['{companyName}', '{firstName}', '{city}', '{state}', '{industry}', '{previewUrl}'].map(f => (
                <button
                  key={f}
                  onClick={() => insertMergeField(f)}
                  className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  {f}
                </button>
              ))}
            </div>
            <textarea
              ref={templateRef}
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm"
              rows={4}
            />
            <p className="text-xs text-gray-400 mt-1">{charCount} chars · {segmentCount} segment{segmentCount !== 1 ? 's' : ''}</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">From Number</label>
            <input
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
              placeholder="+1XXXXXXXXXX"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

function LeadRow({
  lead,
  stageInfo,
  isExpanded,
  onToggle,
  onRemove,
  timeline,
  timelineLoading,
}: {
  lead: CampaignLead
  stageInfo: (typeof FUNNEL_STAGES)[number] | undefined
  isExpanded: boolean
  onToggle: () => void
  onRemove?: () => void
  timeline: TimelineEvent[]
  timelineLoading: boolean
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer transition-colors"
      >
        <td className="px-6 py-3 text-sm text-gray-900 dark:text-white font-medium">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
            )}
            {lead.companyName || '\u2014'}
          </div>
        </td>
        <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
          {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || '\u2014'}
        </td>
        <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">
          {lead.phone || '\u2014'}
        </td>
        <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
          {[lead.city, lead.state].filter(Boolean).join(', ') || '\u2014'}
        </td>
        <td className="px-6 py-3">
          {stageInfo ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageInfo.bgColor} ${stageInfo.textColor}`}>
              {stageInfo.label}
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {lead.stage || '\u2014'}
            </span>
          )}
        </td>
        <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
          {lead.lastActivityAt ? formatDateTime(lead.lastActivityAt) : '\u2014'}
        </td>
        <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
          {lead.repName || '\u2014'}
        </td>
        <td className="px-6 py-3 text-center" onClick={(e) => e.stopPropagation()}>
          {onRemove && ['QUEUED', 'TEXTED'].includes(lead.stage) && (
            <button
              onClick={() => {
                if (window.confirm(`Remove ${lead.companyName || lead.firstName} from this campaign?`)) onRemove()
              }}
              title="Remove from campaign"
              className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </td>
      </tr>

      {/* Expanded timeline */}
      {isExpanded && (
        <tr className="bg-gray-50 dark:bg-gray-900/40">
          <td colSpan={8} className="px-6 py-4">
            <div className="ml-6">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Lead Timeline
              </h4>
              {timelineLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  Loading timeline...
                </div>
              ) : timeline.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">No events recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {timeline.map((event, i) => (
                    <div key={event.id || i} className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {TIMELINE_ICONS[event.type] || '\u{1F4CB}'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {event.title}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDateTime(event.createdAt)}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Tab 3: Campaign Settings ────────────────────────────────────────────────

function CampaignSettingsTab() {
  const [settings, setSettings] = useState<CampaignSettings>({
    coldTextTemplate: '',
    drip1Template: DEFAULT_DRIP_TEMPLATES.drip1Template,
    drip1DayOffset: 0,
    drip2Template: DEFAULT_DRIP_TEMPLATES.drip2Template,
    drip2DayOffset: 2,
    drip3Template: DEFAULT_DRIP_TEMPLATES.drip3Template,
    drip3DayOffset: 5,
    drip4Template: DEFAULT_DRIP_TEMPLATES.drip4Template,
    drip4DayOffset: 8,
    drip5Template: DEFAULT_DRIP_TEMPLATES.drip5Template,
    drip5DayOffset: 12,
    sendWindowStart: 9,
    sendWindowEnd: 20,
    sendDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    dailyLimit: 500,
    messagesPerMinute: 10,
    smsFromNumber: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const coldTemplateRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/campaigns/settings')
        if (res.ok) {
          const data = await res.json()
          if (data.settings) {
            setSettings((prev) => ({ ...prev, ...data.settings }))
          }
        }
      } catch (err) {
        console.error('Failed to fetch campaign settings:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const updateField = <K extends keyof CampaignSettings>(key: K, value: CampaignSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const insertMergeFieldCold = (field: string) => {
    const ta = coldTemplateRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = settings.coldTextTemplate.slice(0, start)
    const after = settings.coldTextTemplate.slice(end)
    updateField('coldTextTemplate', before + field + after)
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + field.length
    }, 0)
  }

  const toggleDay = (day: string) => {
    setSettings((prev) => {
      const days = prev.sendDays.includes(day)
        ? prev.sendDays.filter((d) => d !== day)
        : [...prev.sendDays, day]
      return { ...prev, sendDays: days }
    })
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/campaigns/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save settings')
      }
      setSaved(true)
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const coldCharCount = settings.coldTextTemplate.length
  const coldSegments = Math.ceil(coldCharCount / 160) || 0

  // Sample preview data
  const previewText = settings.coldTextTemplate
    .replace(/\{companyName\}/g, 'Acme Plumbing')
    .replace(/\{firstName\}/g, 'John')
    .replace(/\{city\}/g, 'Austin')
    .replace(/\{state\}/g, 'TX')
    .replace(/\{industry\}/g, 'plumbing')
    .replace(/\{previewUrl\}/g, 'https://preview.example.com/acme')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
          Settings saved successfully
        </div>
      )}

      {/* Cold Text Template */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Cold Text Template</h3>
        <textarea
          ref={coldTemplateRef}
          value={settings.coldTextTemplate}
          onChange={(e) => updateField('coldTextTemplate', e.target.value)}
          rows={4}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
          placeholder="Hey {firstName}, I built a free website for {companyName}..."
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-wrap gap-1">
            {MERGE_FIELDS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => insertMergeFieldCold(f)}
                className="px-2 py-0.5 rounded text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors"
              >
                {f}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
            {coldCharCount} chars &middot; {coldSegments} segment{coldSegments !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Preview */}
        {settings.coldTextTemplate && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Preview (sample data)</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{previewText}</p>
          </div>
        )}
      </div>

      {/* Drip Sequence */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Drip Sequence Templates</h3>
        <div className="space-y-6">
          {([1, 2, 3, 4, 5] as const).map((n) => {
            const templateKey = `drip${n}Template` as keyof CampaignSettings
            const offsetKey = `drip${n}DayOffset` as keyof CampaignSettings
            return (
              <DripEditor
                key={n}
                index={n}
                template={settings[templateKey] as string}
                dayOffset={settings[offsetKey] as number}
                onTemplateChange={(val) => updateField(templateKey, val as any)}
                onOffsetChange={(val) => updateField(offsetKey, val as any)}
              />
            )
          })}
        </div>
      </div>

      {/* Send Window */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Send Window</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Hour (0-23)
            </label>
            <input
              type="number"
              min={0}
              max={23}
              value={settings.sendWindowStart}
              onChange={(e) => updateField('sendWindowStart', parseInt(e.target.value) || 0)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Hour (0-23)
            </label>
            <input
              type="number"
              min={0}
              max={23}
              value={settings.sendWindowEnd}
              onChange={(e) => updateField('sendWindowEnd', parseInt(e.target.value) || 0)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Active Days
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  settings.sendDays.includes(day)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Throttle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Throttle</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Daily Limit
            </label>
            <input
              type="number"
              min={1}
              value={settings.dailyLimit}
              onChange={(e) => updateField('dailyLimit', parseInt(e.target.value) || 1)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Messages per Minute
            </label>
            <input
              type="number"
              min={1}
              value={settings.messagesPerMinute}
              onChange={(e) => updateField('messagesPerMinute', parseInt(e.target.value) || 1)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* From Number */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">From Number</h3>
        <input
          type="text"
          value={settings.smsFromNumber}
          onChange={(e) => updateField('smsFromNumber', e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="+18005551234"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Toll-free number (TFN) used for outbound SMS
        </p>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Drip Template Editor ────────────────────────────────────────────────────

function DripEditor({
  index,
  template,
  dayOffset,
  onTemplateChange,
  onOffsetChange,
}: {
  index: number
  template: string
  dayOffset: number
  onTemplateChange: (val: string) => void
  onOffsetChange: (val: number) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertMergeField = (field: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = template.slice(0, start)
    const after = template.slice(end)
    onTemplateChange(before + field + after)
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + field.length
    }, 0)
  }

  const charCount = template.length
  const segmentCount = Math.ceil(charCount / 160) || 0

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Drip {index}
        </h4>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">Day offset:</label>
          <input
            type="number"
            min={0}
            value={dayOffset}
            onChange={(e) => onOffsetChange(parseInt(e.target.value) || 0)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-16 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center"
          />
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={template}
        onChange={(e) => onTemplateChange(e.target.value)}
        rows={3}
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
      />
      <div className="flex items-center justify-between mt-1">
        <div className="flex flex-wrap gap-1">
          {MERGE_FIELDS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => insertMergeField(f)}
              className="px-2 py-0.5 rounded text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors"
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
          {charCount} chars &middot; {segmentCount} seg{segmentCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
