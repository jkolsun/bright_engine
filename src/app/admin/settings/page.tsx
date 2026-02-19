'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Building, Target, Zap, Users, Key, DollarSign,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2,
  Save, Plus, Trash2, Phone, Link, Brain, Sparkles,
  BarChart3, ExternalLink, Eye, Search, ChevronDown, Split,
  Pencil, Shield, AlertCircle, X
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
    3: '🔥 Hey {name}, your preview expires in {days_left} days. Take another look: {preview_url}',
    5: '⏰ {name}, {days_left} days left on your preview. Don\'t want to miss your window. Can we schedule a call?',
    6: '⚡ Quick question {name} — is time the only thing holding you back from launching?',
    7: '🚨 {name}, {days_left} days left. We\'re holding your spot but can\'t wait forever. Ready to move forward?',
    8: 'Last chance to save your spot at this price, {name}. Preview expires in {days_left} days: {preview_url}',
    10: 'Your {company} preview is ending soon. We can have you live TODAY if you say yes: {preview_url}',
    14: '{name}, your preview is gone in 24 hours. This is your final notice: {preview_url}',
  } as Record<number, string>,
  safetyBuffer: 0.85,
}
const DEFAULT_CLIENT_SEQUENCES = {
  touchpointDays: [7, 14, 30, 60, 90, 180, 365],
  touchpointGuidance: {
    7: 'Check-in + quick win. Use their site stats to show early traction. Suggest one actionable thing (Google Business Profile, share link on social) based on what their data is missing.',
    14: 'Performance report. Share real numbers (visits, forms, calls). If traffic is low, suggest how to drive it. If traffic is good, celebrate it.',
    30: 'Month milestone + first upsell. Use their actual data to recommend ONE upsell that would help the most: low traffic → SEO, no reviews → Review Widget.',
    60: 'Growth opportunity. Compare current stats to first month. Identify the biggest growth lever based on data.',
    90: 'Quarterly review + strategic upsell. Full quarter review. Use data to pitch the upsell that makes the most sense for their situation.',
    180: 'Half-year check. Share cumulative stats. Suggest a refresh or seasonal update. If they haven\'t purchased any upsells, make a tailored pitch.',
    365: 'Anniversary + expansion. Total year stats. Ask about goals for next year. Suggest premium plan based on what data says they need most.',
  } as Record<number, string>,
  // Keep legacy templates as fallback
  touchpointTemplates: {} as Record<number, string>,
  upsellProducts: [
    { name: 'Google Business Profile', price: '$49 one-time', key: 'GBP' },
    { name: 'Review Widget', price: '$69/mo', key: 'REVIEW_WIDGET' },
    { name: 'SEO Package', price: '$149/mo', key: 'SEO' },
    { name: 'Social Media Management', price: '$99/mo', key: 'SOCIAL' },
  ],
  enabled: true,
}
const DEFAULT_CHANNEL_ROUTING = {
  enabled: false,
  useAi: true,
  defaultChannel: 'SMS' as 'SMS' | 'EMAIL',
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

const INDUSTRY_MAP: Record<string, string> = {
  RESTORATION: 'restoration', WATER_DAMAGE: 'water damage restoration',
  ROOFING: 'roofing', PLUMBING: 'plumbing', HVAC: 'HVAC',
  PAINTING: 'painting', LANDSCAPING: 'landscaping', ELECTRICAL: 'electrical',
  GENERAL_CONTRACTING: 'general contracting', CLEANING: 'cleaning',
  PEST_CONTROL: 'pest control', CONSTRUCTION: 'construction',
}

function formatIndustry(industry: string): string {
  return INDUSTRY_MAP[industry] || industry?.toLowerCase().replace(/_/g, ' ') || ''
}

function getDeliveryDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    // Handle both {{key}} (email sequences) and {key} (urgency/retention templates)
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '')
  }
  return result
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
  const [channelRouting, setChannelRouting] = useState(DEFAULT_CHANNEL_ROUTING)
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
  const [editingCampaignKey, setEditingCampaignKey] = useState<string | null>(null)
  const [editCampaignId, setEditCampaignId] = useState('')
  const [remoteCampaigns, setRemoteCampaigns] = useState<{ id: string; name: string; status: string }[]>([])
  const [showRemotePicker, setShowRemotePicker] = useState(false)

  // Upsell management (legacy local state — kept for client_sequences compat)
  const [addUpsellOpen, setAddUpsellOpen] = useState(false)
  const [newUpsell, setNewUpsell] = useState({ name: '', price: '', key: '', phone: '', paymentLink: '' })

  // DB-backed upsell products
  const [dbUpsellProducts, setDbUpsellProducts] = useState<any[]>([])
  const [upsellProductsLoading, setUpsellProductsLoading] = useState(false)
  const [addDbUpsellOpen, setAddDbUpsellOpen] = useState(false)
  const [newDbUpsell, setNewDbUpsell] = useState({
    name: '', price: 0, recurring: true, stripeLink: '', description: '',
    aiPitchInstructions: '', aiProductSummary: '', eligibleIndustries: '',
    minClientAgeDays: '', maxPitchesPerClient: 3, pitchChannel: 'sms', sortOrder: 0,
  })

  // Payment Links (live CRUD)
  const [paymentLinks, setPaymentLinks] = useState<any[]>([])
  const [envLinks, setEnvLinks] = useState<Record<string, { set: boolean; preview: string }>>({})
  const [paymentLinksLoading, setPaymentLinksLoading] = useState(false)
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [editingLinkData, setEditingLinkData] = useState<any>(null)
  const [addingLink, setAddingLink] = useState(false)
  const [newLink, setNewLink] = useState({ id: '', label: '', url: '', price: 0, recurring: false, envKey: '', active: true })
  const [verifyResults, setVerifyResults] = useState<Record<string, { valid: boolean; reason: string } | null>>({})

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

  // Inline preview state
  const [previewLeads, setPreviewLeads] = useState<any[]>([])
  const [previewSelectedLead, setPreviewSelectedLead] = useState<any>(null)
  const [previewSearchTerm, setPreviewSearchTerm] = useState('')
  const [previewDropdownOpen, setPreviewDropdownOpen] = useState(false)
  const [previewOpenMessages, setPreviewOpenMessages] = useState<Set<string>>(new Set())

  // AI retention preview state
  const [retentionClients, setRetentionClients] = useState<any[]>([])
  const [retentionSelectedClient, setRetentionSelectedClient] = useState<any>(null)
  const [retentionPreviews, setRetentionPreviews] = useState<Record<number, string>>({})
  const [retentionGenerating, setRetentionGenerating] = useState<number | null>(null)

  // ── Load all settings on mount ─────────────────────────────
  useEffect(() => {
    loadAllSettings()
    fetchReps()
    fetchUpsellProducts()
    fetchPaymentLinks()
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
          touchpointGuidance: { ...DEFAULT_CLIENT_SEQUENCES.touchpointGuidance, ...s.client_sequences.touchpointGuidance },
          touchpointTemplates: { ...DEFAULT_CLIENT_SEQUENCES.touchpointTemplates, ...(s.client_sequences.touchpointTemplates || {}) },
          upsellProducts: s.client_sequences.upsellProducts || DEFAULT_CLIENT_SEQUENCES.upsellProducts,
          enabled: s.client_sequences.enabled ?? true,
        })
      }
      if (s.channel_routing) setChannelRouting({ ...DEFAULT_CHANNEL_ROUTING, ...s.channel_routing })
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

  // ── Upsell Products (DB-backed) ────────────────────────────
  const fetchUpsellProducts = async () => {
    setUpsellProductsLoading(true)
    try {
      const res = await fetch('/api/upsell-products')
      if (res.ok) {
        const data = await res.json()
        setDbUpsellProducts(data.products || [])
      }
    } catch { /* ignore */ }
    finally { setUpsellProductsLoading(false) }
  }

  const addDbUpsellProduct = async () => {
    if (!newDbUpsell.name.trim() || !newDbUpsell.price) return
    try {
      const res = await fetch('/api/upsell-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDbUpsell,
          eligibleIndustries: newDbUpsell.eligibleIndustries
            ? newDbUpsell.eligibleIndustries.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          minClientAgeDays: newDbUpsell.minClientAgeDays ? parseInt(newDbUpsell.minClientAgeDays) : null,
        }),
      })
      if (res.ok) {
        await fetchUpsellProducts()
        setNewDbUpsell({
          name: '', price: 0, recurring: true, stripeLink: '', description: '',
          aiPitchInstructions: '', aiProductSummary: '', eligibleIndustries: '',
          minClientAgeDays: '', maxPitchesPerClient: 3, pitchChannel: 'sms', sortOrder: 0,
        })
        setAddDbUpsellOpen(false)
      }
    } catch (e) { console.error('Failed to add upsell product:', e) }
  }

  const deleteDbUpsellProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/upsell-products/${id}`, { method: 'DELETE' })
      if (res.ok) await fetchUpsellProducts()
    } catch (e) { console.error('Failed to delete upsell product:', e) }
  }

  // ── Payment Links (live CRUD) ─────────────────────────────
  const DEFAULT_PAYMENT_LINK_SEEDS = [
    { id: 'site_build', label: 'Site Build', price: 149, recurring: false, envKey: 'STRIPE_LINK_SITE_BUILD' },
    { id: 'hosting_monthly', label: 'Monthly Hosting ($39/mo)', price: 39, recurring: true, envKey: 'STRIPE_LINK_HOSTING_39' },
    { id: 'hosting_annual', label: 'Annual Hosting ($349/yr)', price: 349, recurring: false, envKey: 'STRIPE_LINK_HOSTING_ANNUAL' },
    { id: 'gbp_setup', label: 'Google Business Profile', price: 49, recurring: false, envKey: 'STRIPE_LINK_GBP' },
    { id: 'review_widget', label: 'Review Widget', price: 69, recurring: true, envKey: 'STRIPE_LINK_REVIEW_WIDGET' },
    { id: 'seo_monthly', label: 'SEO Package', price: 149, recurring: true, envKey: 'STRIPE_LINK_SEO' },
    { id: 'social_monthly', label: 'Social Media', price: 99, recurring: true, envKey: 'STRIPE_LINK_SOCIAL' },
  ]

  const fetchPaymentLinks = async () => {
    setPaymentLinksLoading(true)
    try {
      const res = await fetch('/api/settings/payment-links')
      if (res.ok) {
        const data = await res.json()
        setEnvLinks(data.envLinks || {})

        if (data.links && data.links.length > 0) {
          setPaymentLinks(data.links)
        } else {
          // Auto-seed: if DB is empty, scaffold defaults with BLANK URLs
          const hasAnyEnvVar = Object.values(data.envLinks || {}).some((v: any) => v.set)
          if (hasAnyEnvVar) {
            const now = new Date().toISOString()
            const seeded = DEFAULT_PAYMENT_LINK_SEEDS.map(seed => ({
              ...seed,
              url: '', // CRITICAL: blank — user must paste their actual Stripe URLs
              active: true,
              createdAt: now,
              updatedAt: now,
            }))
            setPaymentLinks(seeded)
            // Save the scaffolded links to DB
            await fetch('/api/settings/payment-links', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ links: seeded }),
            })
          }
        }
      }
    } catch { /* ignore */ }
    finally { setPaymentLinksLoading(false) }
  }

  const savePaymentLinks = async (links: any[]) => {
    try {
      const res = await fetch('/api/settings/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links }),
      })
      if (res.ok) {
        const data = await res.json()
        setPaymentLinks(data.links || links)
      }
    } catch (e) { console.error('Failed to save payment links:', e) }
  }

  const handleAddLink = async () => {
    if (!newLink.label.trim() || !newLink.id.trim()) return
    const now = new Date().toISOString()
    const updated = [...paymentLinks, { ...newLink, createdAt: now, updatedAt: now }]
    setPaymentLinks(updated)
    await savePaymentLinks(updated)
    setNewLink({ id: '', label: '', url: '', price: 0, recurring: false, envKey: '', active: true })
    setAddingLink(false)
  }

  const handleDeleteLink = async (id: string) => {
    const updated = paymentLinks.filter((l: any) => l.id !== id)
    setPaymentLinks(updated)
    await savePaymentLinks(updated)
  }

  const handleUpdateLink = async (id: string, updates: any) => {
    const updated = paymentLinks.map((l: any) =>
      l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
    )
    setPaymentLinks(updated)
    await savePaymentLinks(updated)
    setEditingLinkId(null)
    setEditingLinkData(null)
  }

  const handleVerifyLink = async (url: string, id: string) => {
    setVerifyResults(prev => ({ ...prev, [id]: null }))
    try {
      const res = await fetch('/api/settings/payment-links/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (res.ok) {
        const data = await res.json()
        setVerifyResults(prev => ({ ...prev, [id]: { valid: data.valid, reason: data.reason } }))
      }
    } catch {
      setVerifyResults(prev => ({ ...prev, [id]: { valid: false, reason: 'Verification request failed' } }))
    }
  }

  const handleVerifyAll = async () => {
    for (const link of paymentLinks) {
      if (link.url && link.active) {
        await handleVerifyLink(link.url, link.id)
      }
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
    const newGuidance = { ...clientSequences.touchpointGuidance }
    if (!newGuidance[day]) {
      newGuidance[day] = `Day ${day} check-in. Use their site stats to suggest one improvement.`
    }
    setClientSequences({ ...clientSequences, touchpointDays: newDays, touchpointGuidance: newGuidance })
    setNewClientDay('')
  }

  const removeClientDay = (day: number) => {
    const newDays = clientSequences.touchpointDays.filter(d => d !== day)
    const newGuidance = { ...clientSequences.touchpointGuidance }
    delete newGuidance[day]
    setClientSequences({ ...clientSequences, touchpointDays: newDays, touchpointGuidance: newGuidance })
  }

  const fetchRetentionClients = async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setRetentionClients(data.clients || [])
      }
    } catch { /* ignore */ }
  }

  const generateRetentionPreview = async (day: number) => {
    if (!retentionSelectedClient) {
      fetchRetentionClients()
      return
    }
    setRetentionGenerating(day)
    try {
      const res = await fetch('/api/retention-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: retentionSelectedClient.id,
          touchpointDay: day,
          guidance: clientSequences.touchpointGuidance[day] || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setRetentionPreviews(prev => ({ ...prev, [day]: data.message }))
      }
    } catch { /* ignore */ }
    finally { setRetentionGenerating(null) }
  }

  // ── Instantly campaign CRUD ───────────────────────────────
  const [syncing, setSyncing] = useState(false)
  const syncCampaigns = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/instantly/sync-campaigns', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.campaigns?.length) {
          setRemoteCampaigns(data.campaigns)
          setShowRemotePicker(true)
        }
      }
    } catch (e) { console.error('Sync failed:', e) }
    finally { setSyncing(false) }
  }

  const importRemoteCampaign = async (remote: { id: string; name: string }) => {
    const key = remote.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
    const updated = { ...campaigns, [key]: remote.id }
    setCampaigns(updated)
    await saveSetting('instantly_campaigns', updated)
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

  const updateCampaignId = async (key: string, newId: string) => {
    const updated = { ...campaigns, [key]: newId.trim() }
    setCampaigns(updated)
    await saveSetting('instantly_campaigns', updated)
    setEditingCampaignKey(null)
    setEditCampaignId('')
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

  // ── Email Preview helpers ─────────────────────────────────────
  const fetchPreviewLeads = async () => {
    if (previewLeads.length > 0) return
    try {
      const res = await fetch('/api/leads?limit=500')
      const data = await res.json()
      setPreviewLeads(data.leads || [])
    } catch { /* ignore */ }
  }

  const selectPreviewLead = (lead: any) => {
    setPreviewSelectedLead(lead)
    setPreviewDropdownOpen(false)
    setPreviewSearchTerm('')
  }

  // Build merge vars for selected lead
  const previewMergeVars: Record<string, string> = previewSelectedLead ? {
    first_name: previewSelectedLead.firstName || '',
    last_name: previewSelectedLead.lastName || '',
    company_name: previewSelectedLead.companyName || '',
    name: previewSelectedLead.firstName || '',
    company: previewSelectedLead.companyName || '',
    email: previewSelectedLead.email || '',
    phone: previewSelectedLead.phone || '',
    website: previewSelectedLead.website || '',
    preview_url: previewSelectedLead.previewUrl || '[no preview]',
    industry: formatIndustry(previewSelectedLead.industry || ''),
    location: [previewSelectedLead.city, previewSelectedLead.state].filter(Boolean).join(', '),
    delivery_date: getDeliveryDate(),
    siteUrl: previewSelectedLead.previewUrl || '[no site]',
    pageViews: '127',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    days_left: previewSelectedLead.previewExpiresAt
      ? Math.max(0, Math.ceil((new Date(previewSelectedLead.previewExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))).toString()
      : '7',
  } : {}

  const filteredPreviewLeads = previewLeads.filter(l => {
    if (!previewSearchTerm) return true
    const term = previewSearchTerm.toLowerCase()
    return (
      l.firstName?.toLowerCase().includes(term) ||
      l.lastName?.toLowerCase().includes(term) ||
      l.companyName?.toLowerCase().includes(term) ||
      l.email?.toLowerCase().includes(term)
    )
  }).slice(0, 20)

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

          {/* Stripe Payment Links — Live CRUD */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Stripe Payment Links" description="Manage live Stripe payment links — DB is the single source of truth" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleVerifyAll}>
                  <Shield size={14} className="mr-1" />
                  Verify All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAddingLink(!addingLink)}>
                  <Plus size={14} className="mr-1" />
                  Add Link
                </Button>
              </div>
            </div>

            {/* Add New Link Form */}
            {addingLink && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Label</FieldLabel>
                    <Input
                      placeholder="e.g., Site Build"
                      value={newLink.label}
                      onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Stripe URL</FieldLabel>
                    <Input
                      placeholder="https://buy.stripe.com/..."
                      value={newLink.url}
                      onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel>Price ($)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      value={newLink.price}
                      onChange={(e) => setNewLink({ ...newLink, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Type</FieldLabel>
                    <select
                      value={newLink.recurring ? 'recurring' : 'one_time'}
                      onChange={(e) => setNewLink({ ...newLink, recurring: e.target.value === 'recurring' })}
                      className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
                    >
                      <option value="one_time">One-time</option>
                      <option value="recurring">Recurring</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>ID (unique key)</FieldLabel>
                    <Input
                      placeholder="e.g., site_build"
                      value={newLink.id}
                      onChange={(e) => setNewLink({ ...newLink, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel>Env Var Key (optional)</FieldLabel>
                    <Input
                      placeholder="e.g., STRIPE_LINK_SITE_BUILD"
                      value={newLink.envKey}
                      onChange={(e) => setNewLink({ ...newLink, envKey: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => { setAddingLink(false); setNewLink({ id: '', label: '', url: '', price: 0, recurring: false, envKey: '', active: true }) }}>Cancel</Button>
                  <Button size="sm" onClick={handleAddLink} disabled={!newLink.label.trim() || !newLink.id.trim()}>Add Link</Button>
                </div>
              </div>
            )}

            {/* Payment Links List */}
            {paymentLinksLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading payment links...</span>
              </div>
            ) : paymentLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No payment links configured. Click &quot;Add Link&quot; to get started.</div>
            ) : (
              <div className="space-y-2">
                {paymentLinks.map((link: any) => {
                  const isEditing = editingLinkId === link.id
                  const verify = verifyResults[link.id]
                  return (
                    <div key={link.id} className={`p-3 rounded-lg border ${link.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Label</label>
                              <Input
                                className="h-8 text-sm"
                                value={editingLinkData?.label || ''}
                                onChange={(e) => setEditingLinkData({ ...editingLinkData, label: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">URL</label>
                              <Input
                                className="h-8 text-sm font-mono"
                                value={editingLinkData?.url || ''}
                                onChange={(e) => setEditingLinkData({ ...editingLinkData, url: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Price</label>
                              <Input
                                type="number"
                                className="h-8 text-sm"
                                value={editingLinkData?.price || 0}
                                onChange={(e) => setEditingLinkData({ ...editingLinkData, price: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => { setEditingLinkId(null); setEditingLinkData(null) }}>Cancel</Button>
                            <Button size="sm" onClick={() => handleUpdateLink(link.id, editingLinkData)}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${link.url ? (link.active ? 'bg-green-500' : 'bg-gray-400') : 'bg-amber-500'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{link.label}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                  ${link.price}{link.recurring ? '/mo' : ''}
                                </span>
                                {!link.url && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">No URL</span>
                                )}
                              </div>
                              {link.url && (
                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline font-mono truncate block max-w-[400px]">
                                  {link.url}
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {verify && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${verify.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {verify.valid ? 'Live' : 'Failed'}
                              </span>
                            )}
                            {link.url && (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleVerifyLink(link.url, link.id)}>
                                <Shield size={12} className="mr-1" />
                                Verify
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setEditingLinkId(link.id); setEditingLinkData({ ...link }) }}>
                              <Pencil size={12} className="mr-1" />
                              Edit
                            </Button>
                            <button
                              onClick={() => handleDeleteLink(link.id)}
                              className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Environment Variable Cross-Check */}
            {Object.keys(envLinks).length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} className="text-gray-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Railway Env Var Cross-Check</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {Object.entries(envLinks).map(([key, status]) => (
                    <div key={key} className="flex items-center gap-2 text-xs py-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${status.set ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="font-mono text-gray-600">{key}</span>
                      <span className={status.set ? 'text-green-600' : 'text-gray-400'}>
                        {status.set ? 'Set' : 'Not set'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Env vars are fallbacks. DB links take priority when both exist.</p>
              </div>
            )}
          </Card>

          {/* Upsell Products (DB-backed) */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Upsell Products" description="AI-aware products — managed via database, visible to Close Engine and Post-Client AI" />
              <Button variant="outline" size="sm" onClick={() => setAddDbUpsellOpen(!addDbUpsellOpen)}>
                <Plus size={14} className="mr-1" />
                Add Product
              </Button>
            </div>

            {/* Add Product Form */}
            {addDbUpsellOpen && (
              <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Product Name</FieldLabel>
                    <Input
                      placeholder="e.g., SEO Package"
                      value={newDbUpsell.name}
                      onChange={(e) => setNewDbUpsell({ ...newDbUpsell, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Price ($)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      value={newDbUpsell.price || ''}
                      onChange={(e) => setNewDbUpsell({ ...newDbUpsell, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Type</FieldLabel>
                    <select
                      value={newDbUpsell.recurring ? 'recurring' : 'one_time'}
                      onChange={(e) => setNewDbUpsell({ ...newDbUpsell, recurring: e.target.value === 'recurring' })}
                      className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
                    >
                      <option value="one_time">One-time</option>
                      <option value="recurring">Recurring (monthly)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Stripe Payment Link</FieldLabel>
                    <Input
                      placeholder="https://buy.stripe.com/..."
                      value={newDbUpsell.stripeLink}
                      onChange={(e) => setNewDbUpsell({ ...newDbUpsell, stripeLink: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel>Pitch Channel</FieldLabel>
                    <select
                      value={newDbUpsell.pitchChannel}
                      onChange={(e) => setNewDbUpsell({ ...newDbUpsell, pitchChannel: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
                    >
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>
                <div>
                  <FieldLabel>Description (admin-facing)</FieldLabel>
                  <Input
                    placeholder="Brief description for the admin UI"
                    value={newDbUpsell.description}
                    onChange={(e) => setNewDbUpsell({ ...newDbUpsell, description: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel>AI Product Summary (one-liner the AI uses in conversation)</FieldLabel>
                  <Input
                    placeholder="e.g., Google Business Profile setup — $49 one-time, we claim and optimize your listing"
                    value={newDbUpsell.aiProductSummary}
                    onChange={(e) => setNewDbUpsell({ ...newDbUpsell, aiProductSummary: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel>AI Pitch Instructions (tells AI how/when to pitch)</FieldLabel>
                  <textarea
                    placeholder="e.g., Pitch GBP setup to local service businesses. Mention that 46% of Google searches are local. Only pitch if the client doesn't already have a claimed GBP listing."
                    value={newDbUpsell.aiPitchInstructions}
                    onChange={(e) => setNewDbUpsell({ ...newDbUpsell, aiPitchInstructions: e.target.value })}
                    className="w-full h-20 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Eligible Industries (comma-separated, blank = all)</FieldLabel>
                    <Input
                      placeholder="e.g., ROOFING, PLUMBING, HVAC"
                      value={newDbUpsell.eligibleIndustries}
                      onChange={(e) => setNewDbUpsell({ ...newDbUpsell, eligibleIndustries: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel>Min Client Age (days)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0 = no restriction"
                      value={newDbUpsell.minClientAgeDays}
                      onChange={(e) => setNewDbUpsell({ ...newDbUpsell, minClientAgeDays: e.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Max Pitches Per Client</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      value={newDbUpsell.maxPitchesPerClient}
                      onChange={(e) => setNewDbUpsell({ ...newDbUpsell, maxPitchesPerClient: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setAddDbUpsellOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={addDbUpsellProduct} disabled={!newDbUpsell.name.trim() || !newDbUpsell.price}>Add Product</Button>
                </div>
              </div>
            )}

            {/* Products List */}
            {upsellProductsLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading products...</span>
              </div>
            ) : dbUpsellProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No upsell products yet. Click &quot;Add Product&quot; to create one.</div>
            ) : (
              <div className="space-y-2">
                {dbUpsellProducts.map((product: any, idx: number) => {
                  const pitchCount = product.pitches?.length || 0
                  const paidCount = product.pitches?.filter((p: any) => p.status === 'paid').length || 0
                  return (
                    <div key={product.id} className={`flex items-center justify-between p-3 rounded-lg border group ${product.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{product.name}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                              ${product.price}{product.recurring ? '/mo' : ''}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{product.pitchChannel}</span>
                            {!product.active && <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600">Inactive</span>}
                          </div>
                          {product.aiProductSummary && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[500px]">{product.aiProductSummary}</p>
                          )}
                          {product.description && !product.aiProductSummary && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[500px]">{product.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {pitchCount > 0 && (
                          <span className="text-xs text-gray-500">
                            {paidCount}/{pitchCount} converted
                          </span>
                        )}
                        {product.stripeLink && (
                          <a href={product.stripeLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
                            <Link size={12} /> Link
                          </a>
                        )}
                        <button
                          onClick={() => deleteDbUpsellProduct(product.id)}
                          className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">Deactivating a product removes it from AI context and all pitch recommendations.</p>
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

          {/* Preview Lead Selector */}
          <Card className="p-4 border-dashed border-purple-200 bg-purple-50/30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                <Eye size={16} />
                Preview as Lead:
              </div>
              <div className="relative flex-1 max-w-xs">
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-purple-200 cursor-pointer hover:border-purple-400 transition-colors text-sm"
                  onClick={() => { setPreviewDropdownOpen(!previewDropdownOpen); fetchPreviewLeads() }}
                >
                  {previewSelectedLead ? (
                    <span className="text-gray-900 truncate flex-1">
                      {previewSelectedLead.firstName} {previewSelectedLead.lastName} — {previewSelectedLead.companyName || ''}
                    </span>
                  ) : (
                    <span className="text-gray-400 flex-1">Select a lead to preview messages...</span>
                  )}
                  <ChevronDown size={14} className="text-gray-400" />
                </div>

                {previewDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[280px] overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={previewSearchTerm}
                          onChange={(e) => setPreviewSearchTerm(e.target.value)}
                          placeholder="Search leads..."
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto">
                      {previewSelectedLead && (
                        <button
                          onClick={() => { setPreviewSelectedLead(null); setPreviewDropdownOpen(false) }}
                          className="w-full text-left px-3 py-2 hover:bg-red-50 transition-colors border-b border-gray-100 text-sm text-red-500"
                        >
                          Clear selection
                        </button>
                      )}
                      {filteredPreviewLeads.map((lead) => (
                        <button
                          key={lead.id}
                          onClick={() => selectPreviewLead(lead)}
                          className="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <div className="text-sm font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                          <div className="text-xs text-gray-500">{lead.companyName} {lead.email ? `· ${lead.email}` : ''}</div>
                        </button>
                      ))}
                      {filteredPreviewLeads.length === 0 && (
                        <div className="px-3 py-4 text-sm text-gray-400 text-center">No leads found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {previewSelectedLead && (
                <span className="text-xs text-purple-500">
                  Previews shown below each message
                </span>
              )}
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
                      Add Manual
                    </Button>
                    <Button variant="outline" size="sm" onClick={syncCampaigns} disabled={syncing}>
                      {syncing ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
                      {syncing ? 'Fetching...' : 'Import from Instantly'}
                    </Button>
                  </div>
                </div>

                {/* Add Campaign Form (manual) */}
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

                {/* Remote Campaign Picker (from Instantly sync) */}
                {showRemotePicker && remoteCampaigns.length > 0 && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <FieldLabel>Select campaigns to import from Instantly</FieldLabel>
                      <button onClick={() => setShowRemotePicker(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {remoteCampaigns.map((rc) => {
                        const alreadyImported = Object.values(campaigns).includes(rc.id)
                        return (
                          <div key={rc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <div>
                              <div className="text-sm font-medium">{rc.name}</div>
                              <div className="text-xs text-gray-400 font-mono">{rc.id}</div>
                            </div>
                            {alreadyImported ? (
                              <span className="text-xs text-green-600 font-medium">Already added</span>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => importRemoteCampaign(rc)}>
                                <Plus size={14} className="mr-1" />
                                Import
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(campaigns).map(([key, id]) => (
                    <div key={key} className="p-4 bg-gray-50 rounded-lg group relative">
                      <div className="text-sm font-medium text-gray-700 mb-1 capitalize">{key.replace(/_/g, ' ')}</div>
                      {editingCampaignKey === key ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editCampaignId}
                            onChange={(e) => setEditCampaignId(e.target.value)}
                            className="font-mono text-xs h-8"
                            placeholder="Campaign ID"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') updateCampaignId(key, editCampaignId)
                              if (e.key === 'Escape') { setEditingCampaignKey(null); setEditCampaignId('') }
                            }}
                          />
                          <Button size="sm" className="h-8 px-2" onClick={() => updateCampaignId(key, editCampaignId)}>Save</Button>
                          <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => { setEditingCampaignKey(null); setEditCampaignId('') }}>Cancel</Button>
                        </div>
                      ) : (
                        <p
                          className="text-xs text-gray-400 font-mono truncate cursor-pointer hover:text-blue-500 transition-colors"
                          title="Click to edit"
                          onClick={() => { setEditingCampaignKey(key); setEditCampaignId(id) }}
                        >
                          {id || 'Click to set campaign ID'}
                        </p>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => { setEditingCampaignKey(key); setEditCampaignId(id) }}
                          className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                          title="Edit campaign ID"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => removeCampaign(key)}
                          className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50"
                          title="Remove campaign"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
                  {sequences.urgencyDays.map((day) => {
                    const msgKey = `urgency-${day}`
                    const isOpen = previewOpenMessages.has(msgKey)
                    const rendered = previewSelectedLead ? fillTemplate(sequences.urgencyTemplates[day] || '', previewMergeVars) : null
                    return (
                      <div key={day} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <FieldLabel>Day {day} Message</FieldLabel>
                          <button
                            onClick={() => {
                              const next = new Set(previewOpenMessages)
                              if (next.has(msgKey)) next.delete(msgKey); else next.add(msgKey)
                              setPreviewOpenMessages(next)
                              if (!previewSelectedLead) { fetchPreviewLeads(); setPreviewDropdownOpen(true) }
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              isOpen ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600'
                            }`}
                          >
                            <Eye size={12} />
                            Preview
                          </button>
                        </div>
                        <textarea
                          value={sequences.urgencyTemplates[day] || ''}
                          onChange={(e) => setSequences({
                            ...sequences,
                            urgencyTemplates: { ...sequences.urgencyTemplates, [day]: e.target.value }
                          })}
                          className="w-full h-16 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Variables: {name}, {company}, {date}, {preview_url}, {days_left}"
                        />
                        {isOpen && (
                          rendered ? (
                            <div className="flex items-start gap-2 p-2.5 bg-purple-50 border border-purple-200 rounded-md">
                              <Eye size={13} className="text-purple-500 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-purple-900 whitespace-pre-wrap">{rendered}</p>
                            </div>
                          ) : (
                            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-400 italic">
                              Select a lead above to see the preview with real data
                            </div>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>

                <p className="text-xs text-gray-400 mt-3">Variables: {'{name}'}, {'{company}'}, {'{date}'}, {'{preview_url}'}, {'{days_left}'}</p>
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

              {/* Channel Routing */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <SectionHeader title="AI Channel Router" description="Intelligently route automated messages via SMS or Email based on client signals" />
                  <button
                    onClick={() => setChannelRouting({ ...channelRouting, enabled: !channelRouting.enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      channelRouting.enabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      channelRouting.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {channelRouting.enabled && (
                  <div className="space-y-4 mt-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Split size={14} className="text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">How it works</span>
                      </div>
                      <p className="text-xs text-blue-700">
                        The router checks <strong>8 hard rules</strong> first (no phone → email, payment failed → SMS, night hours → email, etc.).
                        For gray-area decisions, Claude Haiku analyzes engagement signals to pick the best channel. Every decision is logged for auditing.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>AI Routing</FieldLabel>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setChannelRouting({ ...channelRouting, useAi: !channelRouting.useAi })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              channelRouting.useAi ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              channelRouting.useAi ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                          <span className="text-sm text-gray-600">
                            {channelRouting.useAi ? 'AI decides gray-area routing' : 'Hard rules + fallback only'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">When off, uses rule-based fallback instead of Claude for ambiguous cases</p>
                      </div>
                      <div>
                        <FieldLabel>Default Channel</FieldLabel>
                        <select
                          value={channelRouting.defaultChannel}
                          onChange={(e) => setChannelRouting({ ...channelRouting, defaultChannel: e.target.value as 'SMS' | 'EMAIL' })}
                          className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="SMS">SMS (default)</option>
                          <option value="EMAIL">Email</option>
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Fallback when no rule or AI applies</p>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                      <p className="text-xs font-medium text-gray-700">Hard Rules (always apply, skip AI):</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>1. No phone → Email</span>
                        <span>5. Payment failed → SMS</span>
                        <span>2. No email → SMS</span>
                        <span>6. Critical urgency → SMS</span>
                        <span>3. Client prefers SMS → SMS</span>
                        <span>7. Night hours (9pm-8am) → Email</span>
                        <span>4. Client prefers Email → Email</span>
                        <span>8. Long report content → Email</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <SaveButton
                    onClick={() => saveSetting('channel_routing', channelRouting)}
                    saving={savingKey === 'channel_routing'}
                    saved={savedKey === 'channel_routing'}
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
                  <SectionHeader title="AI-Adaptive Retention Messages" description="Each message is generated by AI using the client's real site stats — visits, forms, calls, bounce rate, and more" />
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
                <div className="p-3 bg-emerald-50 rounded-lg space-y-2">
                  <p className="text-sm text-emerald-800">
                    Messages are <strong>generated at send time</strong> using Claude AI + the client&apos;s actual site analytics.
                    Each client gets a unique, data-driven message — not a template.
                  </p>
                  <p className="text-xs text-emerald-600">
                    The guidance below tells the AI what angle to take for each touchpoint. The AI uses the client&apos;s real stats (page views, form submissions, calls, bounce rate, traffic sources) to write a personalized message.
                  </p>
                </div>
              </Card>

              {/* Touchpoint Schedule */}
              <Card className="p-6">
                <SectionHeader title="Touchpoint Schedule" description="Days after site goes live when AI generates and sends a message" />

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

                {/* Client selector for AI preview */}
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-purple-600" />
                    <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">AI Preview — Select a client to generate sample messages</span>
                  </div>
                  <select
                    className="w-full h-9 px-3 text-sm border border-purple-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={retentionSelectedClient?.id || ''}
                    onChange={(e) => {
                      const c = retentionClients.find((c: any) => c.id === e.target.value)
                      setRetentionSelectedClient(c || null)
                      setRetentionPreviews({})
                    }}
                    onFocus={() => { if (retentionClients.length === 0) fetchRetentionClients() }}
                  >
                    <option value="">Choose a client to preview AI messages...</option>
                    {retentionClients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.companyName} — {c.contactName || 'No contact'}</option>
                    ))}
                  </select>
                </div>

                {/* Guidance per day */}
                <div className="space-y-4">
                  {clientSequences.touchpointDays.map((day) => {
                    const aiPreview = retentionPreviews[day]
                    const isGenerating = retentionGenerating === day
                    return (
                      <div key={day} className="border border-gray-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <FieldLabel>
                            {day < 30 ? `Day ${day}` : day < 365 ? `Month ${Math.round(day / 30)}` : `Year ${Math.round(day / 365)}`}
                            <span className="text-xs text-gray-400 font-normal ml-2">AI Guidance</span>
                          </FieldLabel>
                          <button
                            onClick={() => generateRetentionPreview(day)}
                            disabled={isGenerating || !retentionSelectedClient}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              retentionSelectedClient
                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {isGenerating ? 'Generating...' : 'Generate Preview'}
                          </button>
                        </div>
                        <textarea
                          value={clientSequences.touchpointGuidance[day] || ''}
                          onChange={(e) => setClientSequences({
                            ...clientSequences,
                            touchpointGuidance: { ...clientSequences.touchpointGuidance, [day]: e.target.value }
                          })}
                          className="w-full h-16 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Tell the AI what angle to take for this touchpoint..."
                        />
                        {aiPreview && (
                          <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
                            <Sparkles size={13} className="text-purple-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-purple-600 mb-1">AI-generated for {retentionSelectedClient?.companyName}:</p>
                              <p className="text-sm text-purple-900 whitespace-pre-wrap">{aiPreview}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  The AI uses each client&apos;s real data: page views, form submissions, calls, missed calls, bounce rate, traffic sources, active upsells, and days since launch.
                </p>
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
