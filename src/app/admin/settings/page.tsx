'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Building, Target, Zap, Users, Key, DollarSign,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2,
  Save, Plus, Trash2, Phone, Link, FileText, Brain,
  BarChart3, ExternalLink
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────
type ServiceStatus = {
  key: string
  label: string
  configured: boolean
  connected: boolean | null
  detail: string
}

type SettingsData = Record<string, any>

type TabId = 'company' | 'sequences' | 'personalization' | 'targets' | 'team' | 'api'

// ── Helper Components ──────────────────────────────────────────

function StatusIcon({ service }: { service: ServiceStatus }) {
  if (!service.configured) return <XCircle size={16} className="text-gray-400 shrink-0" />
  if (service.connected === true) return <CheckCircle2 size={16} className="text-green-500 shrink-0" />
  return <AlertTriangle size={16} className="text-amber-500 shrink-0" />
}

function StatusBadge({ service }: { service: ServiceStatus }) {
  if (!service.configured) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not configured</span>
  if (service.connected === true) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">Connected</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Failed</span>
}

function SaveButton({ onClick, saving, saved }: { onClick: () => void, saving: boolean, saved: boolean }) {
  return (
    <Button onClick={onClick} disabled={saving} className={saved ? 'bg-green-600 hover:bg-green-700' : ''}>
      {saving ? (
        <><Loader2 size={16} className="mr-1 animate-spin" /> Saving...</>
      ) : saved ? (
        <><CheckCircle2 size={16} className="mr-1" /> Saved</>
      ) : (
        <><Save size={16} className="mr-1" /> Save Changes</>
      )}
    </Button>
  )
}

function SectionHeader({ title, description }: { title: string, description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-gray-700 block mb-1">{children}</label>
}

// ── Default Values ─────────────────────────────────────────────

const DEFAULT_COMPANY = { companyName: 'Bright Automations', adminPhone: '', previewExpirationDays: 14 }
const DEFAULT_PRICING = { siteBuild: 149, monthlyHosting: 39, annualHosting: 349 }
const DEFAULT_SEQUENCES = {
  urgencyDays: [3, 5, 6, 7, 8, 10, 14],
  urgencyTemplates: {
    3: '🔥 Hey {name}, previews expire in 11 days. Let\'s finalize your site so it goes live. Reply YES.',
    5: '⏰ {name}, 9 days left on your preview. Don\'t want to miss your window. Can we schedule a call?',
    6: '⚡ Quick question {name} - is time the only thing holding you back from launching?',
    7: '🚨 {name}, 7 days left. We\'re holding your spot, but can\'t wait forever. Ready to move forward?',
    8: 'Last chance to save your spot at this price, {name}. Preview expires in 6 days.',
    10: 'Your preview from {date} is ending soon. We can have you live TODAY if you say yes.',
    14: '{name}, your preview is ending in 24 hours! This is your final notice.',
  } as Record<number, string>,
  safetyBuffer: 0.85,
}
const DEFAULT_CLIENT_SEQUENCES = {
  touchpointDays: [7, 14, 30, 60, 90, 180, 365],
  touchpointTemplates: {
    7: 'Hey {name}! Your site for {company} has been live for a week. How\'s everything looking? Any changes you\'d like? Reply and we\'ll take care of it.',
    14: 'Hi {name}, quick 2-week check-in on your {company} site. We\'re seeing {pageViews} page views so far. Want a full performance report?',
    30: '{name}, your site has been live for a month! Time for a review. Have you claimed your Google Business Profile yet? We can set that up for $49 — huge for local visibility.',
    60: 'Hey {name}, month 2 update for {company}. Your site is performing well. Interested in adding a review widget ($69/mo) to build social proof?',
    90: '{name}, 3-month milestone! Let\'s talk about boosting {company}\'s online presence. Our SEO package ($149/mo) could help you rank higher for local searches.',
    180: 'Half-year check-in, {name}! {company}\'s site has been solid. Want to explore our social media management ($99/mo) to drive even more traffic?',
    365: 'Happy 1-year anniversary, {name}! Thanks for being a Bright Automations client. Let\'s schedule a call to review {company}\'s growth and plan for next year.',
  } as Record<number, string>,
  upsellProducts: [
    { name: 'Google Business Profile', price: '$49 one-time', key: 'GBP' },
    { name: 'Review Widget', price: '$69/mo', key: 'REVIEW_WIDGET' },
    { name: 'SEO Package', price: '$149/mo', key: 'SEO' },
    { name: 'Social Media Management', price: '$99/mo', key: 'SOCIAL' },
  ],
  enabled: true,
}
const DEFAULT_PERSONALIZATION = {
  model: 'claude-3-5-haiku-20241022',
  enabled: true,
  fallbackBehavior: 'generic_template',
  defaultCallScript: `OPENER (10 sec):
"Hey {{firstName}}, this is [YOUR NAME] with Bright Automations. Not trying to sell you anything crazy — quick question, do you have 30 seconds?"

If no: "When's a better time?"

HOOK — Bad Website (20 sec):
"I pulled up {{companyName}}'s website before I called. Not gonna sugarcoat it — not showing up well on mobile and the design looks dated. Are you getting leads from it?"

HOOK — No Website (20 sec):
"I searched for {{industry}} in {{location}} and couldn't find a site for {{companyName}}. Are you getting most business from referrals?"

PITCH (30 sec):
"Here's why I'm calling. We build professional sites specifically for {{industry}} businesses. Clean, works on phones, shows up on Google. $149, live in 48 hours. And actually — I already mocked up what a site for {{companyName}} would look like. Want me to text you the link so you can see it?"

CLOSE — If Interested:
"Awesome. I'm texting you the preview right now. Take a look, and if you like it, just text us back and we'll make it live. You don't pay until you're happy with it. What's the best number to text?"`,
}
const DEFAULT_TARGETS = {
  dailyDials: 100,
  dailyConversations: 20,
  dailyCloses: 3,
  dailyLeadCap: 25,
  monthlyRevenueTarget: 50000,
}

// ── Main Component ─────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('company')
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)

  // Settings state per key
  const [companyInfo, setCompanyInfo] = useState(DEFAULT_COMPANY)
  const [pricing, setPricing] = useState(DEFAULT_PRICING)
  const [sequences, setSequences] = useState(DEFAULT_SEQUENCES)
  const [clientSequences, setClientSequences] = useState(DEFAULT_CLIENT_SEQUENCES)
  const [sequenceMode, setSequenceMode] = useState<'pre_acquisition' | 'client_retention'>('pre_acquisition')
  const [personalization, setPersonalization] = useState(DEFAULT_PERSONALIZATION)
  const [targets, setTargets] = useState(DEFAULT_TARGETS)

  // Per-rep targets
  const [reps, setReps] = useState<{ id: string; name: string; status: string }[]>([])
  const [repTargets, setRepTargets] = useState<Record<string, typeof DEFAULT_TARGETS>>({})
  const [loadingReps, setLoadingReps] = useState(false)

  // Instantly campaigns (from existing key)
  const [campaigns, setCampaigns] = useState<Record<string, string>>({ campaign_a: '', campaign_b: '' })
  const [addCampaignOpen, setAddCampaignOpen] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [newCampaignId, setNewCampaignId] = useState('')

  // Upsell management
  const [addUpsellOpen, setAddUpsellOpen] = useState(false)
  const [newUpsell, setNewUpsell] = useState({ name: '', price: '', key: '', phone: '', paymentLink: '' })

  // Save state per section
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  // API tab state
  const [services, setServices] = useState<ServiceStatus[] | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  // New day inputs
  const [newDay, setNewDay] = useState('')
  const [newClientDay, setNewClientDay] = useState('')

  // ── Load all settings on mount ─────────────────────────────
  useEffect(() => {
    loadAllSettings()
    fetchReps()
  }, [])

  const fetchReps = async () => {
    setLoadingReps(true)
    try {
      const res = await fetch('/api/reps')
      if (res.ok) {
        const data = await res.json()
        setReps((data.reps || []).filter((r: any) => r.status === 'ACTIVE'))
      }
    } catch { /* ignore */ }
    finally { setLoadingReps(false) }
  }

  const getRepTarget = (repId: string, field: keyof typeof DEFAULT_TARGETS) => {
    return repTargets[repId]?.[field] ?? targets[field]
  }

  const setRepTarget = (repId: string, field: keyof typeof DEFAULT_TARGETS, value: number) => {
    setRepTargets(prev => ({
      ...prev,
      [repId]: {
        ...DEFAULT_TARGETS,
        ...prev[repId],
        [field]: value,
      }
    }))
  }

  const resetRepTargets = (repId: string) => {
    setRepTargets(prev => {
      const updated = { ...prev }
      delete updated[repId]
      return updated
    })
  }

  const loadAllSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) return
      const data = await res.json()
      const s: SettingsData = data.settings || {}

      if (s.company_info) setCompanyInfo({ ...DEFAULT_COMPANY, ...s.company_info })
      if (s.pricing) setPricing({ ...DEFAULT_PRICING, ...s.pricing })
      if (s.sequences) {
        setSequences({
          urgencyDays: s.sequences.urgencyDays || DEFAULT_SEQUENCES.urgencyDays,
          urgencyTemplates: { ...DEFAULT_SEQUENCES.urgencyTemplates, ...s.sequences.urgencyTemplates },
          safetyBuffer: s.sequences.safetyBuffer ?? DEFAULT_SEQUENCES.safetyBuffer,
        })
      }
      if (s.client_sequences) {
        setClientSequences({
          touchpointDays: s.client_sequences.touchpointDays || DEFAULT_CLIENT_SEQUENCES.touchpointDays,
          touchpointTemplates: { ...DEFAULT_CLIENT_SEQUENCES.touchpointTemplates, ...s.client_sequences.touchpointTemplates },
          upsellProducts: s.client_sequences.upsellProducts || DEFAULT_CLIENT_SEQUENCES.upsellProducts,
          enabled: s.client_sequences.enabled ?? true,
        })
      }
      if (s.personalization) setPersonalization({ ...DEFAULT_PERSONALIZATION, ...s.personalization })
      if (s.targets) setTargets({ ...DEFAULT_TARGETS, ...s.targets })
      if (s.instantly_campaigns) setCampaigns(s.instantly_campaigns)
      if (s.rep_targets) setRepTargets(s.rep_targets)

      setSettingsLoaded(true)
    } catch (e) {
      console.error('Failed to load settings:', e)
    } finally {
      setLoadingSettings(false)
    }
  }

  // ── Save a settings key ────────────────────────────────────
  const saveSetting = async (key: string, value: any) => {
    setSavingKey(key)
    setSavedKey(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        setSavedKey(key)
        setTimeout(() => setSavedKey(null), 2000)
      }
    } catch (e) {
      console.error('Failed to save:', e)
    } finally {
      setSavingKey(null)
    }
  }

  // ── API status check ───────────────────────────────────────
  const checkApiStatus = useCallback(async () => {
    setApiLoading(true)
    try {
      const res = await fetch('/api/settings/api-status')
      if (res.ok) {
        const data = await res.json()
        setServices(data.services)
        setLastChecked(new Date().toLocaleTimeString())
      }
    } catch { /* user can retry */ }
    finally { setApiLoading(false) }
  }, [])

  useEffect(() => {
    if (activeTab === 'api' && !services && !apiLoading) {
      checkApiStatus()
    }
  }, [activeTab, services, apiLoading, checkApiStatus])

  // ── Urgency day helpers ────────────────────────────────���───
  const addUrgencyDay = () => {
    const day = parseInt(newDay)
    if (!day || day < 1 || day > 30 || sequences.urgencyDays.includes(day)) return
    const newDays = [...sequences.urgencyDays, day].sort((a, b) => a - b)
    const newTemplates = { ...sequences.urgencyTemplates }
    if (!newTemplates[day]) {
      newTemplates[day] = `{name}, your preview for {company} is still waiting. Day ${day} reminder.`
    }
    setSequences({ ...sequences, urgencyDays: newDays, urgencyTemplates: newTemplates })
    setNewDay('')
  }

  const removeUrgencyDay = (day: number) => {
    const newDays = sequences.urgencyDays.filter(d => d !== day)
    const newTemplates = { ...sequences.urgencyTemplates }
    delete newTemplates[day]
    setSequences({ ...sequences, urgencyDays: newDays, urgencyTemplates: newTemplates })
  }

  // ── Client sequence day helpers ──────────────────────────────
  const addClientDay = () => {
    const day = parseInt(newClientDay)
    if (!day || day < 1 || day > 730 || clientSequences.touchpointDays.includes(day)) return
    const newDays = [...clientSequences.touchpointDays, day].sort((a, b) => a - b)
    const newTemplates = { ...clientSequences.touchpointTemplates }
    if (!newTemplates[day]) {
      newTemplates[day] = `Hey {name}, day ${day} check-in for {company}. How's everything going with your site?`
    }
    setClientSequences({ ...clientSequences, touchpointDays: newDays, touchpointTemplates: newTemplates })
    setNewClientDay('')
  }

  const removeClientDay = (day: number) => {
    const newDays = clientSequences.touchpointDays.filter(d => d !== day)
    const newTemplates = { ...clientSequences.touchpointTemplates }
    delete newTemplates[day]
    setClientSequences({ ...clientSequences, touchpointDays: newDays, touchpointTemplates: newTemplates })
  }

  // ── Sync Instantly campaigns ───────────────────────────────
  const [syncing, setSyncing] = useState(false)
  const syncCampaigns = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/instantly/sync-campaigns', { method: 'POST' })
      if (res.ok) {
        // Reload to get updated campaign IDs
        const settingsRes = await fetch('/api/settings?key=instantly_campaigns')
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          if (data.value) setCampaigns(data.value)
        }
      }
    } catch (e) { console.error('Sync failed:', e) }
    finally { setSyncing(false) }
  }

  const addCampaign = async () => {
    if (!newCampaignName.trim() || !newCampaignId.trim()) return
    const key = newCampaignName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
    const updated = { ...campaigns, [key]: newCampaignId.trim() }
    setCampaigns(updated)
    await saveSetting('instantly_campaigns', updated)
    setNewCampaignName('')
    setNewCampaignId('')
    setAddCampaignOpen(false)
  }

  const removeCampaign = async (key: string) => {
    const updated = { ...campaigns }
    delete updated[key]
    setCampaigns(updated)
    await saveSetting('instantly_campaigns', updated)
  }

  // ── Upsell helpers ─────────────────────────────────────────
  const addUpsellProduct = () => {
    if (!newUpsell.name.trim() || !newUpsell.price.trim() || !newUpsell.key.trim()) return
    const updated = {
      ...clientSequences,
      upsellProducts: [...clientSequences.upsellProducts, { ...newUpsell }],
    }
    setClientSequences(updated)
    setNewUpsell({ name: '', price: '', key: '', phone: '', paymentLink: '' })
    setAddUpsellOpen(false)
  }

  const removeUpsellProduct = (key: string) => {
    const updated = {
      ...clientSequences,
      upsellProducts: clientSequences.upsellProducts.filter((p: any) => p.key !== key),
    }
    setClientSequences(updated)
  }

  // ── Tab config ─────────────────────────────────────────────
  const tabs = [
    { id: 'company' as TabId, label: 'Company', icon: <Building size={16} /> },
    { id: 'sequences' as TabId, label: 'Sequences', icon: <Zap size={16} /> },
    { id: 'personalization' as TabId, label: 'Personalization', icon: <Brain size={16} /> },
    { id: 'targets' as TabId, label: 'Targets', icon: <BarChart3 size={16} /> },
    { id: 'team' as TabId, label: 'Team', icon: <Users size={16} /> },
    { id: 'api' as TabId, label: 'API Keys', icon: <Key size={16} /> },
  ]

  const connectedCount = services?.filter(s => s.connected === true).length ?? 0
  const totalCount = services?.length ?? 0

  if (loadingSettings) {
    return (
      <div className="p-8 flex items-center justify-center text-gray-500 gap-2">
        <Loader2 size={20} className="animate-spin" />
        <span>Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your system configuration</p>
      </div>

      {/* Tabs */}
      <Card className="p-1">
        <div className="flex gap-1 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          TAB: COMPANY
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          {/* Company Info */}
          <Card className="p-6">
            <SectionHeader title="Company Info" description="Basic company details and contact information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Company Name</FieldLabel>
                <Input
                  value={companyInfo.companyName}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Admin Notification Phone</FieldLabel>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <Input
                    value={companyInfo.adminPhone}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, adminPhone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Receives hot lead alerts, digest reports, and system alerts</p>
              </div>
            </div>
            <div className="mt-4">
              <FieldLabel>Preview Expiration (Days)</FieldLabel>
              <Input
                type="number"
                min={1}
                max={90}
                className="w-32"
                value={companyInfo.previewExpirationDays}
                onChange={(e) => setCompanyInfo({ ...companyInfo, previewExpirationDays: parseInt(e.target.value) || 14 })}
              />
              <p className="text-xs text-gray-400 mt-1">How many days before a preview link expires</p>
            </div>
            <div className="mt-6 flex justify-end">
              <SaveButton
                onClick={() => saveSetting('company_info', companyInfo)}
                saving={savingKey === 'company_info'}
                saved={savedKey === 'company_info'}
              />
            </div>
          </Card>

          {/* Pricing */}
          <Card className="p-6">
            <SectionHeader title="Product Pricing" description="Default pricing for your services" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel>Site Build (one-time)</FieldLabel>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={pricing.siteBuild}
                    onChange={(e) => setPricing({ ...pricing, siteBuild: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Monthly Hosting</FieldLabel>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={pricing.monthlyHosting}
                    onChange={(e) => setPricing({ ...pricing, monthlyHosting: parseInt(e.target.value) || 0 })}
                  />
                  <span className="text-xs text-gray-400">/mo</span>
                </div>
              </div>
              <div>
                <FieldLabel>Annual Hosting</FieldLabel>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={pricing.annualHosting}
                    onChange={(e) => setPricing({ ...pricing, annualHosting: parseInt(e.target.value) || 0 })}
                  />
                  <span className="text-xs text-gray-400">/yr</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <SaveButton
                onClick={() => saveSetting('pricing', pricing)}
                saving={savingKey === 'pricing'}
                saved={savedKey === 'pricing'}
              />
            </div>
          </Card>

          {/* Stripe Payment Links */}
          <Card className="p-6">
            <SectionHeader title="Stripe Payment Links" description="Configured via Railway environment variables" />
            <div className="space-y-2">
              {[
                { label: 'Site Build ($149)', env: 'STRIPE_LINK_SITE_BUILD' },
                { label: 'Monthly Hosting ($39/mo)', env: 'STRIPE_LINK_HOSTING_39' },
                { label: 'Annual Hosting ($349/yr)', env: 'STRIPE_LINK_HOSTING_ANNUAL' },
                { label: 'Google Business Profile ($49)', env: 'STRIPE_LINK_GBP' },
                { label: 'Review Widget ($69/mo)', env: 'STRIPE_LINK_REVIEW_WIDGET' },
                { label: 'SEO ($149/mo)', env: 'STRIPE_LINK_SEO' },
                { label: 'Social Media ($99/mo)', env: 'STRIPE_LINK_SOCIAL' },
              ].map((link) => (
                <div key={link.env} className="flex items-center justify-between p-3 bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Link size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-700">{link.label}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{link.env}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Payment links are managed in your Railway/Stripe dashboard. Changes there take effect immediately.</p>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: SEQUENCES
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'sequences' && (
        <div className="space-y-6">
          {/* Sequence Type Toggle */}
          <Card className="p-1">
            <div className="flex gap-1">
              <button
                onClick={() => setSequenceMode('pre_acquisition')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-colors ${
                  sequenceMode === 'pre_acquisition'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Target size={16} />
                Pre-Acquisition
              </button>
              <button
                onClick={() => setSequenceMode('client_retention')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-colors ${
                  sequenceMode === 'client_retention'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users size={16} />
                Client Retention
              </button>
            </div>
          </Card>

          {/* ── PRE-ACQUISITION SEQUENCES ─────────────────────────── */}
          {sequenceMode === 'pre_acquisition' && (
            <>
              {/* Instantly Campaigns */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <SectionHeader title="Instantly Campaigns" description="Email campaign mapping for lead distribution" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAddCampaignOpen(!addCampaignOpen)}>
                      <Plus size={14} className="mr-1" />
                      Add Campaign
                    </Button>
                    <Button variant="outline" size="sm" onClick={syncCampaigns} disabled={syncing}>
                      {syncing ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
                      {syncing ? 'Syncing...' : 'Sync Campaigns'}
                    </Button>
                  </div>
                </div>

                {/* Add Campaign Form */}
                {addCampaignOpen && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>Campaign Name</FieldLabel>
                        <Input
                          placeholder="e.g., Campaign C"
                          value={newCampaignName}
                          onChange={(e) => setNewCampaignName(e.target.value)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Campaign ID</FieldLabel>
                        <Input
                          placeholder="Paste Instantly campaign ID"
                          value={newCampaignId}
                          onChange={(e) => setNewCampaignId(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => { setAddCampaignOpen(false); setNewCampaignName(''); setNewCampaignId('') }}>Cancel</Button>
                      <Button size="sm" onClick={addCampaign} disabled={!newCampaignName.trim() || !newCampaignId.trim()}>Add Campaign</Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(campaigns).map(([key, id]) => (
                    <div key={key} className="p-4 bg-gray-50 rounded-lg group relative">
                      <div className="text-sm font-medium text-gray-700 mb-1 capitalize">{key.replace(/_/g, ' ')}</div>
                      <p className="text-xs text-gray-400 font-mono truncate">{id || 'Not configured'}</p>
                      {!['campaign_a', 'campaign_b'].includes(key) && (
                        <button
                          onClick={() => removeCampaign(key)}
                          className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Urgency Schedule */}
              <Card className="p-6">
                <SectionHeader title="Urgency Message Schedule" description="Days after preview creation when urgency texts are sent" />

                {/* Day pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {sequences.urgencyDays.map((day) => (
                    <div key={day} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm">
                      <span className="font-medium text-blue-700">Day {day}</span>
                      <button
                        onClick={() => removeUrgencyDay(day)}
                        className="text-blue-400 hover:text-red-500 ml-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      placeholder="Day"
                      className="w-20 h-8 text-sm"
                      value={newDay}
                      onChange={(e) => setNewDay(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addUrgencyDay()}
                    />
                    <Button variant="outline" size="sm" onClick={addUrgencyDay} className="h-8">
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>

                {/* Templates per day */}
                <div className="space-y-3">
                  {sequences.urgencyDays.map((day) => (
                    <div key={day} className="space-y-1">
                      <FieldLabel>Day {day} Message</FieldLabel>
                      <textarea
                        value={sequences.urgencyTemplates[day] || ''}
                        onChange={(e) => setSequences({
                          ...sequences,
                          urgencyTemplates: { ...sequences.urgencyTemplates, [day]: e.target.value }
                        })}
                        className="w-full h-16 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Use {name}, {company}, {date} as variables"
                      />
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 mt-3">Variables: {'{name}'}, {'{company}'}, {'{date}'}</p>
              </Card>

              {/* Send Settings */}
              <Card className="p-6">
                <SectionHeader title="Send Settings" description="Controls for email campaign capacity" />
                <div>
                  <FieldLabel>Safety Buffer</FieldLabel>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0.5}
                      max={1.0}
                      step={0.05}
                      className="w-24"
                      value={sequences.safetyBuffer}
                      onChange={(e) => setSequences({ ...sequences, safetyBuffer: parseFloat(e.target.value) || 0.85 })}
                    />
                    <span className="text-sm text-gray-500">({Math.round(sequences.safetyBuffer * 100)}% of Instantly daily limit)</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Conservative margin to avoid hitting Instantly rate limits. 0.85 = use 85% of capacity.</p>
                </div>
                <div className="mt-6 flex justify-end">
                  <SaveButton
                    onClick={() => saveSetting('sequences', sequences)}
                    saving={savingKey === 'sequences'}
                    saved={savedKey === 'sequences'}
                  />
                </div>
              </Card>
            </>
          )}

          {/* ── CLIENT RETENTION SEQUENCES ────────────────────────── */}
          {sequenceMode === 'client_retention' && (
            <>
              {/* Enable/Disable + Description */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <SectionHeader title="Client Retention Sequences" description="Automated touchpoints after a client goes live — check-ins, upsells, and performance reviews" />
                  <button
                    onClick={() => setClientSequences({ ...clientSequences, enabled: !clientSequences.enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      clientSequences.enabled ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      clientSequences.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-emerald-800">
                    These messages are sent based on <strong>days since the client&apos;s site went live</strong>.
                    Use them to check in, share performance data, and introduce upsell services at the right time.
                  </p>
                </div>
              </Card>

              {/* Touchpoint Schedule */}
              <Card className="p-6">
                <SectionHeader title="Touchpoint Schedule" description="Days after site goes live when messages are sent" />

                {/* Day pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {clientSequences.touchpointDays.map((day) => (
                    <div key={day} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-sm">
                      <span className="font-medium text-emerald-700">
                        {day < 30 ? `Day ${day}` : day < 365 ? `Month ${Math.round(day / 30)}` : `Year ${Math.round(day / 365)}`}
                      </span>
                      <span className="text-xs text-emerald-500">(d{day})</span>
                      <button
                        onClick={() => removeClientDay(day)}
                        className="text-emerald-400 hover:text-red-500 ml-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={730}
                      placeholder="Day"
                      className="w-20 h-8 text-sm"
                      value={newClientDay}
                      onChange={(e) => setNewClientDay(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addClientDay()}
                    />
                    <Button variant="outline" size="sm" onClick={addClientDay} className="h-8">
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>

                {/* Templates per day */}
                <div className="space-y-3">
                  {clientSequences.touchpointDays.map((day) => (
                    <div key={day} className="space-y-1">
                      <FieldLabel>
                        {day < 30 ? `Day ${day}` : day < 365 ? `Month ${Math.round(day / 30)}` : `Year ${Math.round(day / 365)}`} Message
                        <span className="text-xs text-gray-400 font-normal ml-2">(day {day})</span>
                      </FieldLabel>
                      <textarea
                        value={clientSequences.touchpointTemplates[day] || ''}
                        onChange={(e) => setClientSequences({
                          ...clientSequences,
                          touchpointTemplates: { ...clientSequences.touchpointTemplates, [day]: e.target.value }
                        })}
                        className="w-full h-20 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Use {name}, {company}, {pageViews} as variables"
                      />
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 mt-3">Variables: {'{name}'}, {'{company}'}, {'{pageViews}'}, {'{siteUrl}'}, {'{upsellName}'}, {'{upsellPrice}'}, {'{upsellPhone}'}, {'{paymentLink}'}</p>
              </Card>

              {/* Upsell Products */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <SectionHeader title="Upsell Products" description="Services to promote in retention touchpoints" />
                  <Button variant="outline" size="sm" onClick={() => setAddUpsellOpen(!addUpsellOpen)}>
                    <Plus size={14} className="mr-1" />
                    Add Upsell
                  </Button>
                </div>

                {/* Add Upsell Form */}
                {addUpsellOpen && (
                  <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <FieldLabel>Name</FieldLabel>
                        <Input
                          placeholder="e.g., SEO Package"
                          value={newUpsell.name}
                          onChange={(e) => setNewUpsell({ ...newUpsell, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <FieldLabel>Price</FieldLabel>
                        <Input
                          placeholder="e.g., $149/mo"
                          value={newUpsell.price}
                          onChange={(e) => setNewUpsell({ ...newUpsell, price: e.target.value })}
                        />
                      </div>
                      <div>
                        <FieldLabel>Key</FieldLabel>
                        <Input
                          placeholder="e.g., SEO"
                          value={newUpsell.key}
                          onChange={(e) => setNewUpsell({ ...newUpsell, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>Phone Number</FieldLabel>
                        <Input
                          placeholder="e.g., +1 (555) 123-4567"
                          value={newUpsell.phone}
                          onChange={(e) => setNewUpsell({ ...newUpsell, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <FieldLabel>Payment Link</FieldLabel>
                        <Input
                          placeholder="Stripe payment link URL"
                          value={newUpsell.paymentLink}
                          onChange={(e) => setNewUpsell({ ...newUpsell, paymentLink: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => { setAddUpsellOpen(false); setNewUpsell({ name: '', price: '', key: '', phone: '', paymentLink: '' }) }}>Cancel</Button>
                      <Button size="sm" onClick={addUpsellProduct} disabled={!newUpsell.name.trim() || !newUpsell.price.trim() || !newUpsell.key.trim()}>Add Upsell</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {clientSequences.upsellProducts.map((product: any, idx: number) => (
                    <div key={product.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.price}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {product.phone && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone size={12} /> {product.phone}
                          </span>
                        )}
                        {product.paymentLink && (
                          <a href={product.paymentLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
                            <Link size={12} /> Payment Link
                          </a>
                        )}
                        <span className="text-xs text-gray-400 font-mono">{product.key}</span>
                        <button
                          onClick={() => removeUpsellProduct(product.key)}
                          className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Use these in templates: {'{upsellName}'}, {'{upsellPrice}'}, {'{upsellPhone}'}, {'{paymentLink}'}
                </p>
              </Card>

              {/* Save */}
              <div className="flex justify-end">
                <SaveButton
                  onClick={() => saveSetting('client_sequences', clientSequences)}
                  saving={savingKey === 'client_sequences'}
                  saved={savedKey === 'client_sequences'}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: PERSONALIZATION
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'personalization' && (
        <div className="space-y-6">
          {/* AI Configuration */}
          <Card className="p-6">
            <SectionHeader title="AI Configuration" description="Control how AI personalization works for new leads" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <FieldLabel>AI Model</FieldLabel>
                <select
                  value={personalization.model}
                  onChange={(e) => setPersonalization({ ...personalization, model: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (fast, cost-effective)</option>
                  <option value="claude-sonnet-4-5-20250929">Claude 4.5 Sonnet (higher quality)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Haiku is recommended for high-volume personalization</p>
              </div>
              <div className="space-y-4">
                <div>
                  <FieldLabel>Personalization</FieldLabel>
                  <button
                    onClick={() => setPersonalization({ ...personalization, enabled: !personalization.enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      personalization.enabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      personalization.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">
                    {personalization.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <FieldLabel>Fallback Behavior</FieldLabel>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="fallback"
                        checked={personalization.fallbackBehavior === 'generic_template'}
                        onChange={() => setPersonalization({ ...personalization, fallbackBehavior: 'generic_template' })}
                        className="text-blue-600"
                      />
                      Use generic template (recommended)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="fallback"
                        checked={personalization.fallbackBehavior === 'skip'}
                        onChange={() => setPersonalization({ ...personalization, fallbackBehavior: 'skip' })}
                        className="text-blue-600"
                      />
                      Skip personalization entirely
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">What happens when AI personalization fails for a lead</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <SaveButton
                onClick={() => saveSetting('personalization', personalization)}
                saving={savingKey === 'personalization'}
                saved={savedKey === 'personalization'}
              />
            </div>
          </Card>

          {/* Default Call Script */}
          <Card className="p-6">
            <SectionHeader title="Default Call Script" description="Master template used when leads don't have a custom script" />
            <div className="bg-blue-50 p-3 rounded-lg mb-3">
              <p className="text-xs text-blue-700">
                <strong>Available variables:</strong>{' '}
                {'{{firstName}}'}, {'{{companyName}}'}, {'{{industry}}'}, {'{{location}}'}
              </p>
            </div>
            <textarea
              value={personalization.defaultCallScript}
              onChange={(e) => setPersonalization({ ...personalization, defaultCallScript: e.target.value })}
              className="w-full h-80 px-4 py-3 text-sm border border-gray-200 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
              placeholder="Enter your call script template..."
            />
            <div className="mt-4 flex justify-end">
              <SaveButton
                onClick={() => saveSetting('personalization', personalization)}
                saving={savingKey === 'personalization'}
                saved={savedKey === 'personalization'}
              />
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: TARGETS
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'targets' && (
        <div className="space-y-6">
          {/* Daily Rep Targets */}
          <Card className="p-6">
            <SectionHeader title="Default Targets" description="Global benchmarks — overridden per rep below" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <FieldLabel>Dials / Day</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={targets.dailyDials}
                  onChange={(e) => setTargets({ ...targets, dailyDials: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <FieldLabel>Conversations / Day</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={targets.dailyConversations}
                  onChange={(e) => setTargets({ ...targets, dailyConversations: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <FieldLabel>Closes / Day</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={targets.dailyCloses}
                  onChange={(e) => setTargets({ ...targets, dailyCloses: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <FieldLabel>Lead Cap / Day</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={targets.dailyLeadCap}
                  onChange={(e) => setTargets({ ...targets, dailyLeadCap: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-400 mt-1">Max new leads per rep</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <SaveButton
                onClick={() => saveSetting('targets', targets)}
                saving={savingKey === 'targets'}
                saved={savedKey === 'targets'}
              />
            </div>
          </Card>

          {/* Per-Rep Targets */}
          <Card className="p-6">
            <SectionHeader title="Individual Rep Targets" description="Override default targets for specific reps" />
            {loadingReps ? (
              <div className="text-center py-6 text-gray-500 text-sm">Loading reps...</div>
            ) : reps.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">No active reps found. Add reps in Team settings.</div>
            ) : (
              <div className="space-y-4">
                {reps.map((rep) => {
                  const hasCustom = !!repTargets[rep.id]
                  return (
                    <div key={rep.id} className={`p-4 rounded-lg border ${hasCustom ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {rep.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 text-sm">{rep.name}</span>
                          {hasCustom && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Custom</span>
                          )}
                        </div>
                        {hasCustom && (
                          <button
                            onClick={() => resetRepTargets(rep.id)}
                            className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                          >
                            Reset to defaults
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Dials/Day</label>
                          <Input
                            type="number"
                            min={0}
                            className="h-8 text-sm"
                            value={getRepTarget(rep.id, 'dailyDials')}
                            onChange={(e) => setRepTarget(rep.id, 'dailyDials', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Conversations/Day</label>
                          <Input
                            type="number"
                            min={0}
                            className="h-8 text-sm"
                            value={getRepTarget(rep.id, 'dailyConversations')}
                            onChange={(e) => setRepTarget(rep.id, 'dailyConversations', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Closes/Day</label>
                          <Input
                            type="number"
                            min={0}
                            className="h-8 text-sm"
                            value={getRepTarget(rep.id, 'dailyCloses')}
                            onChange={(e) => setRepTarget(rep.id, 'dailyCloses', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Lead Cap/Day</label>
                          <Input
                            type="number"
                            min={0}
                            className="h-8 text-sm"
                            value={getRepTarget(rep.id, 'dailyLeadCap')}
                            onChange={(e) => setRepTarget(rep.id, 'dailyLeadCap', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-gray-400">Reps without custom targets use the defaults above.</p>
              <SaveButton
                onClick={() => saveSetting('rep_targets', repTargets)}
                saving={savingKey === 'rep_targets'}
                saved={savedKey === 'rep_targets'}
              />
            </div>
          </Card>

          {/* Revenue Goals */}
          <Card className="p-6">
            <SectionHeader title="Revenue Goals" description="Team-wide monthly targets" />
            <div>
              <FieldLabel>Monthly Revenue Target</FieldLabel>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">$</span>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  className="w-40"
                  value={targets.monthlyRevenueTarget}
                  onChange={(e) => setTargets({ ...targets, monthlyRevenueTarget: parseInt(e.target.value) || 0 })}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Combined target across all reps</p>
            </div>
            <div className="mt-6 flex justify-end">
              <SaveButton
                onClick={() => saveSetting('targets', targets)}
                saving={savingKey === 'targets'}
                saved={savedKey === 'targets'}
              />
            </div>
          </Card>

          {/* Commission Settings Link */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Commission Settings</h3>
                <p className="text-sm text-gray-500 mt-0.5">Set individual commission rates per rep</p>
              </div>
              <Button onClick={() => window.location.href = '/admin/settings/commission'}>
                <DollarSign size={16} className="mr-1" /> Manage Commissions
                <ExternalLink size={14} className="ml-2" />
              </Button>
            </div>
            <div className="mt-4 p-3 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Default tiers:</strong> New reps 40% | Standard 50% | Top performers 60%
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: TEAM (unchanged)
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Team Management</h3>
                <p className="text-sm text-gray-500 mt-0.5">Add, edit, and manage your sales reps</p>
              </div>
              <Button onClick={() => window.location.href = '/admin/settings/reps'}>
                <Users size={16} className="mr-1" /> Manage Reps
                <ExternalLink size={14} className="ml-2" />
              </Button>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Commission Rates</h3>
                <p className="text-sm text-gray-500 mt-0.5">Set per-rep commission percentages</p>
              </div>
              <Button variant="outline" onClick={() => window.location.href = '/admin/settings/commission'}>
                <DollarSign size={16} className="mr-1" /> Commission Settings
                <ExternalLink size={14} className="ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: API KEYS (unchanged)
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'api' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">API Configuration</h3>
              {services && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {connectedCount}/{totalCount} services connected
                </p>
              )}
            </div>
            <button
              onClick={checkApiStatus}
              disabled={apiLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            >
              {apiLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {apiLoading ? 'Checking...' : 'Recheck'}
            </button>
          </div>

          {apiLoading && !services && (
            <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
              <Loader2 size={20} className="animate-spin" />
              <span>Testing API connections...</span>
            </div>
          )}

          {services && (
            <div className="space-y-2">
              {services.map((service) => (
                <div
                  key={service.key}
                  className={`flex items-center justify-between p-3 rounded text-sm ${
                    service.connected === true
                      ? 'bg-green-50 border border-green-100'
                      : service.configured
                      ? 'bg-amber-50 border border-amber-100'
                      : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon service={service} />
                    <span className="font-medium text-gray-900">{service.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 hidden sm:inline">{service.detail}</span>
                    <StatusBadge service={service} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-500">All API keys are managed via Railway environment variables for security.</p>
            {lastChecked && (
              <p className="text-xs text-gray-400">Last checked: {lastChecked}</p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
