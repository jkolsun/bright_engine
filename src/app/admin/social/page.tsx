'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Plus, Play, Pause, Eye, ChevronDown, ChevronUp, Loader2,
  Instagram, Linkedin, Settings, Send, Trash2, CheckCircle, X,
  Save, AlertTriangle, Copy
} from 'lucide-react'

// ── Types ──

type Tab = 'campaigns' | 'settings'

interface Campaign {
  id: string
  name: string
  channel: 'INSTAGRAM' | 'LINKEDIN'
  status: string
  totalLeads: number
  sentCount: number
  clickCount: number
  bookingSentCount: number
  bookedCount: number
  closedCount: number
  optOutCount: number
  templateDm1: string
  templateDm2Click: string
  templateDm2NoClick: string
  templateDm3: string | null
  bookingLink: string | null
  dm2ClickDelay: number
  dm2NoClickDelay: number
  dm3Delay: number
  startedAt: string | null
  createdAt: string
  leads?: CampaignLead[]
  _count?: { leads: number }
}

interface CampaignLead {
  id: string
  socialHandle: string
  funnelStage: string
  dm1SentAt: string | null
  clickedAt: string | null
  dm2SentAt: string | null
  bookedAt: string | null
  closedAt: string | null
  lead: {
    id: string
    firstName: string
    companyName: string
    industry: string | null
    city: string | null
    state: string | null
    previewUrl: string | null
  }
}

interface SocialSettings {
  bookingLink: string
  webhookSecret: string
  instagram: {
    connected: boolean
    phantombusterApiKey: string
    phantombusterAgentId: string
    dailyLimit: number
    sendWindowStart: number
    sendWindowEnd: number
  }
  linkedin: {
    connected: boolean
    expandiApiKey: string
    expandiCampaignId: string
    dailyLimit: number
    sendWindowStart: number
    sendWindowEnd: number
  }
}

// ── Page ──

export default function SocialOutreachPage() {
  const [activeTab, setActiveTab] = useState<Tab>('campaigns')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'campaigns', label: 'Campaigns', icon: <Send size={16} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Social Outreach</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Instagram DM + LinkedIn DM campaigns with click-branched sequences.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'campaigns' && <CampaignsTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  )
}

// ══════════════════════════════════════
// CAMPAIGNS TAB
// ══════════════════════════════════════

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/social-campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const handleStartPause = async (id: string, currentStatus: string) => {
    if (currentStatus === 'SENDING') {
      await fetch(`/api/social-campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAUSED' }),
      })
    } else {
      await fetch(`/api/social-campaigns/${id}/start`, { method: 'POST' })
    }
    fetchCampaigns()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft campaign?')) return
    await fetch(`/api/social-campaigns/${id}`, { method: 'DELETE' })
    fetchCampaigns()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading campaigns...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus size={16} className="mr-2" /> New Campaign
        </Button>
      </div>

      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchCampaigns() }}
        />
      )}

      {campaigns.length === 0 ? (
        <Card className="p-12 text-center text-gray-400 dark:text-gray-500">
          No social campaigns yet. Create one to get started.
        </Card>
      ) : (
        campaigns.map(campaign => (
          <Card key={campaign.id} className="overflow-hidden">
            {/* Campaign header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  campaign.channel === 'INSTAGRAM'
                    ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600'
                    : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600'
                }`}>
                  {campaign.channel === 'INSTAGRAM' ? <Instagram size={16} /> : <Linkedin size={16} />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{campaign.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Badge variant="outline" className={
                      campaign.channel === 'INSTAGRAM' ? 'text-pink-600 border-pink-300' : 'text-sky-600 border-sky-300'
                    }>{campaign.channel}</Badge>
                    <StatusBadge status={campaign.status} />
                    <span>{campaign._count?.leads || campaign.totalLeads} leads</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Funnel stats */}
                <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 mr-4">
                  <span>Sent: {campaign.sentCount}</span>
                  <span>Clicked: {campaign.clickCount}</span>
                  <span>Booked: {campaign.bookedCount}</span>
                  <span>Closed: {campaign.closedCount}</span>
                </div>

                {campaign.status !== 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartPause(campaign.id, campaign.status)}
                  >
                    {campaign.status === 'SENDING' ? <><Pause size={14} className="mr-1" /> Pause</> : <><Play size={14} className="mr-1" /> Start</>}
                  </Button>
                )}
                {campaign.status === 'DRAFT' && (
                  <Button size="sm" variant="outline" onClick={() => handleDelete(campaign.id)}>
                    <Trash2 size={14} />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpandedId(expandedId === campaign.id ? null : campaign.id)}
                >
                  {expandedId === campaign.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </Button>
              </div>
            </div>

            {/* Expanded detail */}
            {expandedId === campaign.id && (
              <CampaignDetail campaignId={campaign.id} onUpdate={fetchCampaigns} />
            )}
          </Card>
        ))
      )}
    </div>
  )
}

// ── Campaign Detail Panel ──

function CampaignDetail({ campaignId, onUpdate }: { campaignId: string; onUpdate: () => void }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<string | null>(null)
  const [channelConnected, setChannelConnected] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [campRes, settingsRes] = await Promise.all([
        fetch(`/api/social-campaigns/${campaignId}`),
        fetch('/api/social-campaigns/settings'),
      ])
      if (campRes.ok) {
        const data = await campRes.json()
        setCampaign(data.campaign)
        // Check if this campaign's channel is connected
        if (settingsRes.ok) {
          const sData = await settingsRes.json()
          const ch = data.campaign.channel
          setChannelConnected(
            ch === 'INSTAGRAM' ? !!sData.settings?.instagram?.connected : !!sData.settings?.linkedin?.connected
          )
        }
      }
      setLoading(false)
    }
    load()
  }, [campaignId])

  if (loading || !campaign) {
    return <div className="p-6 text-center text-gray-400"><Loader2 size={16} className="animate-spin inline mr-2" />Loading...</div>
  }

  const channelLabel = campaign.channel === 'INSTAGRAM' ? 'Instagram' : 'LinkedIn'
  const toolLabel = campaign.channel === 'INSTAGRAM' ? 'PhantomBuster' : 'Expandi'

  const stages = [
    { key: 'QUEUED', label: 'Queued', color: 'bg-gray-200 dark:bg-gray-700' },
    { key: 'SENT', label: 'Sent', color: 'bg-blue-200 dark:bg-blue-800' },
    { key: 'CLICKED', label: 'Clicked', color: 'bg-green-200 dark:bg-green-800' },
    { key: 'BOOKING_SENT', label: 'Booking Sent', color: 'bg-purple-200 dark:bg-purple-800' },
    { key: 'BOOKED', label: 'Booked', color: 'bg-emerald-200 dark:bg-emerald-800' },
    { key: 'CLOSED', label: 'Closed', color: 'bg-amber-200 dark:bg-amber-800' },
    { key: 'RE_ENGAGED', label: 'Re-engaged', color: 'bg-orange-200 dark:bg-orange-800' },
    { key: 'OPTED_OUT', label: 'Opted Out', color: 'bg-red-200 dark:bg-red-800' },
  ]

  const leads = campaign.leads || []
  const stageCounts = stages.map(s => ({
    ...s,
    count: leads.filter(l => l.funnelStage === s.key).length,
  }))

  const filtered = stageFilter ? leads.filter(l => l.funnelStage === stageFilter) : leads

  const handleAction = async (leadId: string, action: 'book' | 'close') => {
    await fetch(`/api/social-campaigns/${campaignId}/leads/${leadId}/book?action=${action}`, { method: 'POST' })
    onUpdate()
    // Reload detail
    const res = await fetch(`/api/social-campaigns/${campaignId}`)
    if (res.ok) setCampaign((await res.json()).campaign)
  }

  return (
    <div className="border-t dark:border-slate-700 p-6 space-y-4">
      {/* Not connected banner */}
      {!channelConnected && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {channelLabel} not connected — messages are queued but will not send until you configure {toolLabel} in Settings.
          </p>
        </div>
      )}
      {/* Funnel visualization */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStageFilter(null)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            !stageFilter ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          All ({leads.length})
        </button>
        {stageCounts.filter(s => s.count > 0).map(s => (
          <button
            key={s.key}
            onClick={() => setStageFilter(stageFilter === s.key ? null : s.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              stageFilter === s.key ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : `${s.color} text-gray-700 dark:text-gray-200`
            }`}
          >
            {s.label} ({s.count})
          </button>
        ))}
      </div>

      {/* Lead table */}
      {filtered.length === 0 ? (
        <p className="text-center py-8 text-gray-400">No leads in this stage</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-slate-700 text-left">
                <th className="pb-2 text-gray-600 dark:text-gray-400 font-medium">Company</th>
                <th className="pb-2 text-gray-600 dark:text-gray-400 font-medium">Handle</th>
                <th className="pb-2 text-gray-600 dark:text-gray-400 font-medium">Stage</th>
                <th className="pb-2 text-gray-600 dark:text-gray-400 font-medium">DM 1</th>
                <th className="pb-2 text-gray-600 dark:text-gray-400 font-medium">Clicked</th>
                <th className="pb-2 text-gray-600 dark:text-gray-400 font-medium">DM 2</th>
                <th className="pb-2 text-gray-600 dark:text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(cl => (
                <tr key={cl.id} className="border-b dark:border-slate-700/50">
                  <td className="py-2">
                    <a href={`/admin/leads/${cl.lead.id}`} className="text-blue-600 hover:underline">
                      {cl.lead.companyName || cl.lead.firstName || '—'}
                    </a>
                  </td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">{cl.socialHandle}</td>
                  <td className="py-2"><StageBadge stage={cl.funnelStage} /></td>
                  <td className="py-2 text-xs text-gray-500">{cl.dm1SentAt ? new Date(cl.dm1SentAt).toLocaleDateString() : '—'}</td>
                  <td className="py-2 text-xs text-gray-500">{cl.clickedAt ? new Date(cl.clickedAt).toLocaleDateString() : '—'}</td>
                  <td className="py-2 text-xs text-gray-500">{cl.dm2SentAt ? new Date(cl.dm2SentAt).toLocaleDateString() : '—'}</td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      {!['BOOKED', 'CLOSED', 'OPTED_OUT'].includes(cl.funnelStage) && (
                        <button
                          onClick={() => handleAction(cl.lead.id, 'book')}
                          className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded hover:bg-emerald-200"
                        >
                          Booked
                        </button>
                      )}
                      {cl.funnelStage === 'BOOKED' && (
                        <button
                          onClick={() => handleAction(cl.lead.id, 'close')}
                          className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded hover:bg-amber-200"
                        >
                          Closed
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Create Campaign Modal ──

function CreateCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [channel, setChannel] = useState<'INSTAGRAM' | 'LINKEDIN'>('INSTAGRAM')
  const [name, setName] = useState('')
  const [templateDm1, setTemplateDm1] = useState('Hey {firstName}! I built a free website for {companyName} — check it out: {previewUrl}')
  const [templateDm2Click, setTemplateDm2Click] = useState("Glad you checked it out! If you want to hop on a quick call to discuss, here's my calendar: {bookingLink}")
  const [templateDm2NoClick, setTemplateDm2NoClick] = useState("Hey {firstName}, just following up — I put together a custom site for {companyName}. Take a look when you get a chance: {previewUrl}")
  const [templateDm3, setTemplateDm3] = useState('')
  const [dm3Enabled, setDm3Enabled] = useState(false)
  const [dm2ClickDelay, setDm2ClickDelay] = useState(2)
  const [dm2NoClickDelay, setDm2NoClickDelay] = useState(3)
  const [dm3Delay, setDm3Delay] = useState(5)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [availableLeads, setAvailableLeads] = useState<any[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leadSearch, setLeadSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [settings, setSettings] = useState<SocialSettings | null>(null)

  // Load settings for booking link
  useEffect(() => {
    fetch('/api/social-campaigns/settings').then(r => r.json()).then(d => setSettings(d.settings)).catch(() => {})
  }, [])

  // Load available leads when channel changes
  useEffect(() => {
    const load = async () => {
      setLeadsLoading(true)
      const filter = channel === 'INSTAGRAM' ? 'instagram' : 'linkedin'
      const res = await fetch(`/api/leads?socialFilter=${filter}&limit=500`)
      if (res.ok) {
        const data = await res.json()
        setAvailableLeads(data.leads || [])
      }
      setLeadsLoading(false)
    }
    load()
  }, [channel])

  const filteredLeads = leadSearch
    ? availableLeads.filter((l: any) => l.companyName?.toLowerCase().includes(leadSearch.toLowerCase()))
    : availableLeads

  const handleCreate = async () => {
    if (!name || !templateDm1 || !templateDm2Click || !templateDm2NoClick) return
    setCreating(true)
    try {
      const res = await fetch('/api/social-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          channel,
          templateDm1,
          templateDm2Click,
          templateDm2NoClick,
          templateDm3: dm3Enabled ? templateDm3 : null,
          bookingLink: settings?.bookingLink || null,
          dm2ClickDelay,
          dm2NoClickDelay,
          dm3Delay,
          leadIds: selectedLeads,
        }),
      })
      if (res.ok) onCreated()
    } finally {
      setCreating(false)
    }
  }

  const toggleAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(filteredLeads.map((l: any) => l.id))
    }
  }

  return (
    <Card className="p-6 space-y-6 border-2 border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Campaign</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
      </div>

      {/* Name + Channel */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Campaign Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100"
            placeholder="e.g. Roofing IG Outreach March"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Channel</label>
          <div className="flex gap-2">
            {(['INSTAGRAM', 'LINKEDIN'] as const).map(ch => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  channel === ch
                    ? ch === 'INSTAGRAM'
                      ? 'bg-pink-50 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-400'
                      : 'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400'
                    : 'border-gray-200 dark:border-slate-600 text-gray-500'
                }`}
              >
                {ch === 'INSTAGRAM' ? <Instagram size={14} /> : <Linkedin size={14} />}
                {ch}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Message Templates</h3>
        <p className="text-xs text-gray-400">Merge fields: {'{firstName}'} {'{companyName}'} {'{previewUrl}'} {'{bookingLink}'}</p>

        <TemplateField label="DM 1 — Preview Link" value={templateDm1} onChange={setTemplateDm1} />
        <TemplateField label="DM 2 — If They Click (booking link)" value={templateDm2Click} onChange={setTemplateDm2Click} />
        {settings?.bookingLink && (
          <p className="text-xs text-gray-400">Booking link: {settings.bookingLink}</p>
        )}
        <TemplateField label="DM 2 — If No Click (soft re-engage)" value={templateDm2NoClick} onChange={setTemplateDm2NoClick} />

        <div className="flex items-center gap-2">
          <input type="checkbox" checked={dm3Enabled} onChange={e => setDm3Enabled(e.target.checked)} className="rounded" />
          <label className="text-sm text-gray-600 dark:text-gray-400">Enable DM 3 — Final Nudge</label>
        </div>
        {dm3Enabled && <TemplateField label="DM 3 — Final Nudge" value={templateDm3} onChange={setTemplateDm3} />}
      </div>

      {/* Timing */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">DM 2 Click Delay (days)</label>
          <input type="number" value={dm2ClickDelay} onFocus={(e) => e.target.select()} onChange={e => setDm2ClickDelay(+e.target.value)} min={1}
            className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">DM 2 No-Click Delay (days)</label>
          <input type="number" value={dm2NoClickDelay} onFocus={(e) => e.target.select()} onChange={e => setDm2NoClickDelay(+e.target.value)} min={1}
            className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">DM 3 Delay (days)</label>
          <input type="number" value={dm3Delay} onFocus={(e) => e.target.select()} onChange={e => setDm3Delay(+e.target.value)} min={1}
            className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
        </div>
      </div>

      {/* Lead selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Add Leads ({selectedLeads.length} selected of {availableLeads.length} available)
          </h3>
          <div className="flex gap-2">
            <input
              value={leadSearch}
              onChange={e => setLeadSearch(e.target.value)}
              placeholder="Search by company..."
              className="border dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs dark:bg-slate-800 dark:text-gray-100"
            />
            <button onClick={toggleAll} className="text-xs text-blue-600 hover:underline">
              {selectedLeads.length === filteredLeads.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        </div>

        {leadsLoading ? (
          <div className="py-4 text-center text-gray-400"><Loader2 size={16} className="animate-spin inline mr-2" />Loading leads...</div>
        ) : (
          <div className="max-h-60 overflow-y-auto border dark:border-slate-700 rounded-lg">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="p-2 w-8"></th>
                  <th className="p-2 text-left text-gray-600 dark:text-gray-400">Company</th>
                  <th className="p-2 text-left text-gray-600 dark:text-gray-400">Industry</th>
                  <th className="p-2 text-left text-gray-600 dark:text-gray-400">Handle</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.slice(0, 200).map((lead: any) => (
                  <tr key={lead.id} className="border-t dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedLeads(prev => [...prev, lead.id])
                          else setSelectedLeads(prev => prev.filter(id => id !== lead.id))
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="p-2 text-gray-900 dark:text-gray-100">{lead.companyName || '—'}</td>
                    <td className="p-2 text-gray-500">{lead.industry || '—'}</td>
                    <td className="p-2 text-gray-500">
                      {channel === 'INSTAGRAM' ? lead.instagramHandle || '—' : lead.linkedinUrl ? 'LinkedIn' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleCreate}
          disabled={creating || !name || !templateDm1}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {creating ? 'Creating...' : 'Create Campaign'}
        </Button>
      </div>
    </Card>
  )
}

// ══════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════

function SettingsTab() {
  const [settings, setSettings] = useState<SocialSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testingIg, setTestingIg] = useState(false)
  const [testingLi, setTestingLi] = useState(false)

  useEffect(() => {
    fetch('/api/social-campaigns/settings')
      .then(r => r.json())
      .then(d => { setSettings(d.settings); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/social-campaigns/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleTestInstagram = async () => {
    setTestingIg(true)
    try {
      const res = await fetch('/api/social-campaigns/settings/test-instagram', { method: 'POST' })
      const data = await res.json()
      if (data.connected) {
        setSettings({ ...settings!, instagram: { ...settings!.instagram, connected: true } })
      } else {
        alert(data.error || 'Instagram connection failed')
      }
    } catch { alert('Connection test failed') }
    finally { setTestingIg(false) }
  }

  const handleTestLinkedin = async () => {
    setTestingLi(true)
    try {
      const res = await fetch('/api/social-campaigns/settings/test-linkedin', { method: 'POST' })
      const data = await res.json()
      if (data.connected) {
        setSettings({ ...settings!, linkedin: { ...settings!.linkedin, connected: true } })
      } else {
        alert(data.error || 'LinkedIn connection failed')
      }
    } catch { alert('Connection test failed') }
    finally { setTestingLi(false) }
  }

  if (loading || !settings) {
    return <div className="py-20 text-center text-gray-400"><Loader2 size={20} className="animate-spin inline mr-2" />Loading settings...</div>
  }

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/social` : '/api/webhooks/social'

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Booking Link */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Booking Link</h3>
        <p className="text-xs text-gray-400 mb-3">Inserted as {'{bookingLink}'} in DM 2 Click templates.</p>
        <input
          value={settings.bookingLink}
          onChange={e => setSettings({ ...settings, bookingLink: e.target.value })}
          className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100"
          placeholder="https://calendar.google.com/calendar/appointments/..."
        />
      </Card>

      {/* Instagram */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Instagram size={18} className="text-pink-600" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Instagram (PhantomBuster)</h3>
          </div>
          <Badge variant="outline" className={settings.instagram.connected ? 'text-green-600 border-green-300' : 'text-gray-400 border-gray-300'}>
            {settings.instagram.connected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">PhantomBuster API Key</label>
            <input type="password" value={settings.instagram.phantombusterApiKey}
              onChange={e => setSettings({ ...settings, instagram: { ...settings.instagram, phantombusterApiKey: e.target.value } })}
              className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">PhantomBuster Agent ID</label>
            <input value={settings.instagram.phantombusterAgentId}
              onChange={e => setSettings({ ...settings, instagram: { ...settings.instagram, phantombusterAgentId: e.target.value } })}
              className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Daily Limit</label>
              <input type="number" value={settings.instagram.dailyLimit}
                onFocus={(e) => e.target.select()}
                onChange={e => setSettings({ ...settings, instagram: { ...settings.instagram, dailyLimit: +e.target.value } })}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Send From (hour)</label>
              <input type="number" value={settings.instagram.sendWindowStart} min={0} max={23}
                onFocus={(e) => e.target.select()}
                onChange={e => setSettings({ ...settings, instagram: { ...settings.instagram, sendWindowStart: +e.target.value } })}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Send Until (hour)</label>
              <input type="number" value={settings.instagram.sendWindowEnd} min={0} max={23}
                onFocus={(e) => e.target.select()}
                onChange={e => setSettings({ ...settings, instagram: { ...settings.instagram, sendWindowEnd: +e.target.value } })}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
            </div>
          </div>
          <Button
            onClick={handleTestInstagram}
            disabled={testingIg}
            variant="outline"
            className="mt-3 text-xs"
          >
            {testingIg ? <><Loader2 size={12} className="animate-spin mr-1" />Testing...</> : 'Test Connection'}
          </Button>
        </div>
      </Card>

      {/* LinkedIn */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Linkedin size={18} className="text-sky-600" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">LinkedIn (Expandi)</h3>
          </div>
          <Badge variant="outline" className={settings.linkedin.connected ? 'text-green-600 border-green-300' : 'text-gray-400 border-gray-300'}>
            {settings.linkedin.connected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Expandi API Key</label>
            <input type="password" value={settings.linkedin.expandiApiKey}
              onChange={e => setSettings({ ...settings, linkedin: { ...settings.linkedin, expandiApiKey: e.target.value } })}
              className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Expandi Campaign ID</label>
            <input value={settings.linkedin.expandiCampaignId}
              onChange={e => setSettings({ ...settings, linkedin: { ...settings.linkedin, expandiCampaignId: e.target.value } })}
              className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Daily Limit</label>
              <input type="number" value={settings.linkedin.dailyLimit}
                onFocus={(e) => e.target.select()}
                onChange={e => setSettings({ ...settings, linkedin: { ...settings.linkedin, dailyLimit: +e.target.value } })}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Send From (hour)</label>
              <input type="number" value={settings.linkedin.sendWindowStart} min={0} max={23}
                onFocus={(e) => e.target.select()}
                onChange={e => setSettings({ ...settings, linkedin: { ...settings.linkedin, sendWindowStart: +e.target.value } })}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Send Until (hour)</label>
              <input type="number" value={settings.linkedin.sendWindowEnd} min={0} max={23}
                onFocus={(e) => e.target.select()}
                onChange={e => setSettings({ ...settings, linkedin: { ...settings.linkedin, sendWindowEnd: +e.target.value } })}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100" />
            </div>
          </div>
          <Button
            onClick={handleTestLinkedin}
            disabled={testingLi}
            variant="outline"
            className="mt-3 text-xs"
          >
            {testingLi ? <><Loader2 size={12} className="animate-spin mr-1" />Testing...</> : 'Test Connection'}
          </Button>
        </div>
      </Card>

      {/* Webhook */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Webhook</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Webhook Secret</label>
            <input type="password" value={settings.webhookSecret}
              onChange={e => setSettings({ ...settings, webhookSecret: e.target.value })}
              className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100"
              placeholder="Shared secret for PhantomBuster/Expandi callbacks" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Webhook URL (copy this to PhantomBuster/Expandi)</label>
            <div className="flex items-center gap-2">
              <input value={webhookUrl} readOnly className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 dark:text-gray-400" />
              <button
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                className="p-2 border dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Copy size={14} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Saving...</> : <><Save size={14} className="mr-2" />Save Settings</>}
        </Button>
        {saved && <span className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle size={14} /> Saved</span>}
      </div>
    </div>
  )
}

// ── Shared Components ──

function TemplateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100 resize-none"
      />
      <p className="text-xs text-gray-400 text-right">{value.length} chars</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    SENDING: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    PAUSED: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    COMPLETED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  }
  return <Badge variant="outline" className={styles[status] || styles.DRAFT}>{status}</Badge>
}

function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, string> = {
    QUEUED: 'bg-gray-100 dark:bg-gray-800 text-gray-600',
    SENT: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    CLICKED: 'bg-green-100 dark:bg-green-900/30 text-green-600',
    BOOKING_SENT: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
    RE_ENGAGED: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
    BOOKED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    CLOSED: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    OPTED_OUT: 'bg-red-100 dark:bg-red-900/30 text-red-600',
  }
  return <Badge variant="outline" className={styles[stage] || styles.QUEUED}>{stage.replace('_', ' ')}</Badge>
}
