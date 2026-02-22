'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Building, Target, Zap, Users, Key, DollarSign,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2,
  Save, Plus, Trash2, Phone, Link, Brain, Sparkles,
  BarChart3, ExternalLink, Eye, Search, ChevronDown, Split,
  Pencil, Shield, AlertCircle, X, Info, RotateCcw, Activity,
  MessageSquare
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

type TabId = 'company' | 'messages_ai' | 'sequences' | 'personalization' | 'targets' | 'team' | 'api' | 'diagnostics'

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

function FieldInfo({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Info size={14} />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </span>
  )
}

function PriceInput({ value, onChange, className = '' }: { value: number | string; onChange: (val: string) => void; className?: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
      <Input type="number" min={0} className={`h-8 text-sm pl-7 ${className}`} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

// ── Default Values ─────────────────────────────────────────────

const DEFAULT_COMPANY = { companyName: 'Bright Automations', adminPhone: '', previewExpirationDays: 14 }
// Pricing is now driven by core product in Products table — see getPricingConfig()
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
    { name: 'SEO Package', price: '$59/mo', key: 'SEO' },
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
  model: 'claude-haiku-4-5-20251001',
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
"Here's why I'm calling. We build professional sites specifically for {{industry}} businesses. Clean, works on phones, shows up on Google. $188, live in 48 hours. And actually — I already mocked up what a site for {{companyName}} would look like. Want me to text you the link so you can see it?"

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

// Messages & AI defaults
const DEFAULT_SYSTEM_MSGS: Record<string, { text: string; enabled: boolean }> = {
  form_thank_you: { text: "Got it, thank you {firstName}! Our team is reviewing everything now and we'll get started on your site. You'll get a text when it's ready for review.", enabled: true },
  preview_sent: { text: "Hey {firstName}! Your website for {companyName} is ready for review. Take a look and let me know what you think: {previewUrl}", enabled: true },
  payment_link: { text: "Here's your payment link to go live: {paymentLink}\n\n{firstMonthTotal} gets your site built and launched, plus monthly hosting at {monthlyHosting}/month. You can cancel anytime.\n\nOnce you pay, we'll have your site live within 48 hours!", enabled: true },
  welcome_after_payment: { text: "Welcome aboard, {firstName}! Your site is going live. You'll get a text from us when it's up. Quick win: make sure your Google Business Profile is claimed — that alone can double your local visibility.", enabled: true },
  site_live: { text: "Hey {firstName}! Your site for {companyName} is officially live at {siteUrl}. Check it out and let us know if you want any changes!", enabled: true },
}
const SYS_MSG_META = [
  { key: 'form_thank_you', label: 'Form Thank You', desc: 'Sent immediately after lead completes the onboarding form.', vars: ['firstName'] },
  { key: 'preview_sent', label: 'Preview Sent', desc: 'Sent when admin approves sending the site preview.', vars: ['firstName', 'companyName', 'previewUrl'] },
  { key: 'payment_link', label: 'Payment Link Sent', desc: 'Sent with the Stripe checkout link when admin approves payment.', vars: ['firstName', 'companyName', 'paymentLink', 'firstMonthTotal', 'monthlyHosting'] },
  { key: 'welcome_after_payment', label: 'Welcome After Payment', desc: 'Sent ~2.5 min after Stripe payment succeeds.', vars: ['firstName'] },
  { key: 'site_live', label: 'Site Live Notification', desc: 'Sent after domain is set up and site goes live.', vars: ['firstName', 'companyName', 'siteUrl'] },
]
const DEFAULT_AUTO_MSGS: Record<string, { text: string; enabled: boolean; delayHours?: number }> = {
  form_nudge: { text: "Hey {firstName}, just following up — did you get a chance to fill out the form? Here's the link again: {formUrl}", enabled: true, delayHours: 24 },
  preview_followup: { text: "Hey {firstName}, wanted to check in — did you get a chance to look at the preview? Let me know what you think: {previewUrl}", enabled: true, delayHours: 24 },
  payment_followup_4h: { text: "Hey {firstName}, just checking — any questions about getting your site live?", enabled: true, delayHours: 4 },
  payment_followup_24h: { text: "Hey {firstName}, just wanted to make sure you got the payment link. Any questions about getting your site live?", enabled: true, delayHours: 24 },
  payment_followup_48h: { text: "Hey {firstName}, your preview is looking great. Payment link is ready when you are!", enabled: true, delayHours: 48 },
  payment_followup_72h: { text: "Last check-in — want me to hold your spot or should I free it up for someone else, {firstName}?", enabled: true, delayHours: 72 },
  touchpoint_day_3: { text: "Hey {firstName}! Quick tip — make sure your Google Business Profile is claimed and up to date. That alone can double your local visibility for {companyName}.", enabled: true, delayHours: 72 },
  touchpoint_day_7: { text: "Hey {firstName}! Your {companyName} site has been live for a week now. Everything looking good? Reply if you need anything.", enabled: true, delayHours: 168 },
  touchpoint_day_14: { text: "Hey {firstName}, quick 2-week check-in on {companyName}'s site. How's it working for you so far? Any changes you'd like?", enabled: true, delayHours: 336 },
  touchpoint_day_21: { text: "Hey {firstName}, just wanted to see how things are going with {companyName}'s site. Getting any leads from it?", enabled: true, delayHours: 504 },
  touchpoint_day_28: { text: "Hey {firstName}! It's been a month since {companyName} went live. Love to hear how it's going — and I have some ideas that could help you get even more out of it.", enabled: true, delayHours: 672 },
  winback_day_7: { text: 'Your hosting was cancelled. {companyName}\'s site goes offline in 7 days. Reply "keep it" to reactivate.', enabled: true, delayHours: 168 },
  winback_day_14: { text: "Hey, just wanted to let you know {companyName}'s site will be taken down soon. If you change your mind, just reply and we'll keep it live.", enabled: true, delayHours: 336 },
  winback_day_30: { text: "Last chance — {companyName}'s site data will be deleted in 48 hours. Reply to save it.", enabled: true, delayHours: 720 },
}
const AUTO_MSG_META = [
  { key: 'form_nudge', label: 'Form Nudge', desc: "Sent if client hasn't filled out form.", vars: ['firstName', 'formUrl'], cat: 'pre_client' as const },
  { key: 'preview_followup', label: 'Preview Follow-up', desc: "Sent if client hasn't responded after seeing preview.", vars: ['firstName', 'previewUrl'], cat: 'pre_client' as const },
  { key: 'payment_followup_4h', label: 'Payment Follow-up (4h)', desc: '4 hours after payment link sent.', vars: ['firstName'], cat: 'pre_client' as const },
  { key: 'payment_followup_24h', label: 'Payment Follow-up (24h)', desc: '24 hours after payment link sent.', vars: ['firstName'], cat: 'pre_client' as const },
  { key: 'payment_followup_48h', label: 'Payment Follow-up (48h)', desc: '48 hours after payment link sent.', vars: ['firstName'], cat: 'pre_client' as const },
  { key: 'payment_followup_72h', label: 'Payment Follow-up (72h)', desc: 'Final follow-up 72 hours after payment link sent.', vars: ['firstName'], cat: 'pre_client' as const },
  { key: 'touchpoint_day_3', label: 'Day 3 — GBP Reminder', desc: 'Google Business Profile optimization tip.', vars: ['firstName', 'companyName'], cat: 'post_client' as const },
  { key: 'touchpoint_day_7', label: 'Day 7 — First Week Stats', desc: 'First week check-in.', vars: ['firstName', 'companyName'], cat: 'post_client' as const },
  { key: 'touchpoint_day_14', label: 'Day 14 — Two Week Check-in', desc: 'Two week check-in.', vars: ['firstName', 'companyName'], cat: 'post_client' as const },
  { key: 'touchpoint_day_21', label: 'Day 21 — Lead Check', desc: "Check if they're getting leads.", vars: ['firstName', 'companyName'], cat: 'post_client' as const },
  { key: 'touchpoint_day_28', label: 'Day 28 — Month Review', desc: 'Andrew takes over for upsell conversation.', vars: ['firstName', 'companyName'], cat: 'post_client' as const },
  { key: 'winback_day_7', label: 'Win-Back Day 7', desc: '7 days after hosting cancellation.', vars: ['companyName'], cat: 'winback' as const },
  { key: 'winback_day_14', label: 'Win-Back Day 14', desc: '14 days after hosting cancellation.', vars: ['companyName'], cat: 'winback' as const },
  { key: 'winback_day_30', label: 'Win-Back Day 30', desc: 'Final notice 30 days after cancellation.', vars: ['companyName'], cat: 'winback' as const },
]
const DEFAULT_AI_CONTROLS = {
  globalEnabled: true,
  preClientEnabled: true,
  postClientEnabled: true,
  delayMin: 15,
  delayMax: 45,
  humanizingPrompt: '',
}
const DEFAULT_ONBOARDING_FLOW = {
  welcome: "Welcome aboard! Let's get {companyName} live.",
  domainQuestion: "Do you already have a domain you'd like to use, or would you like us to help pick one?",
  gbpPrompt: "Do you have a Google Business Profile? If so, we can connect it to your site for better local visibility.",
  stageTemplate: '',
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
  // pricing state removed — now driven by core product in Products table
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

  // Unified Products (core + upsells in one table)
  const [products, setProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editingProductData, setEditingProductData] = useState<any>(null)
  const [customPitch, setCustomPitch] = useState(false)
  const [customScript, setCustomScript] = useState(false)
  const [customBanner, setCustomBanner] = useState(false)
  const [showUpsellTargeting, setShowUpsellTargeting] = useState(false)
  const [verifyResults, setVerifyResults] = useState<Record<string, { valid: boolean; reason: string }>>({})
  const [verifyingAll, setVerifyingAll] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [envLinks, setEnvLinks] = useState<Record<string, { set: boolean; preview: string }>>({})

  // AI scenario templates
  const [scenarioTemplates, setScenarioTemplates] = useState<Record<string, { instructions_override: string; enabled: boolean }>>({})
  const [editingScenario, setEditingScenario] = useState<string | null>(null)
  const [firstMessageTemplates, setFirstMessageTemplates] = useState<Record<string, string>>({})
  const [qualifyingFlow, setQualifyingFlow] = useState<Record<string, string>>({})
  const [paymentFlow, setPaymentFlow] = useState<Record<string, string>>({})

  // SmartChat settings
  const [smartChat, setSmartChat] = useState({
    batchWindowMs: 8000,
    conversationEnderEnabled: true,
    qualifyingQuestionCount: 2,
    formBaseUrl: '',
  })
  const [smartChatLoaded, setSmartChatLoaded] = useState(false)

  // Messages & AI sub-tab navigation
  const [messagesAiTab, setMessagesAiTab] = useState<'ai_conversations' | 'automated_messages'>('ai_conversations')
  const [preAqPostAq, setPreAqPostAq] = useState<'pre_aq' | 'post_aq'>('pre_aq')
  // AI Controls
  const [aiControls, setAiControls] = useState(DEFAULT_AI_CONTROLS)
  // Onboarding flow (Post-AQ)
  const [onboardingFlow, setOnboardingFlow] = useState(DEFAULT_ONBOARDING_FLOW)
  // System messages (event-triggered)
  const [systemMessages, setSystemMessages] = useState(DEFAULT_SYSTEM_MSGS)
  // Automated messages (scheduled)
  const [automatedMessages, setAutomatedMessages] = useState(DEFAULT_AUTO_MSGS)

  const [newProduct, setNewProduct] = useState({
    name: '', price: '', recurring: true, isCore: false,
    stripeLink: '', month1Price: '', recurringPrice: '', annualPrice: '',
    stripeLinkAnnual: '', pitchOneLiner: '', previewBannerText: '', repCloseScript: '',
    description: '', aiPitchInstructions: '', aiProductSummary: '',
    eligibleIndustries: '', minClientAgeDays: '', maxPitchesPerClient: '3',
    pitchChannel: 'sms', sortOrder: '0',
  })

  // Save state per section
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  // API tab state
  const [services, setServices] = useState<ServiceStatus[] | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  // API key management state
  const [apiKeyData, setApiKeyData] = useState<Record<string, Record<string, { masked: string; hasValue: boolean; source: 'db' | 'env' | 'none' }>> | null>(null)
  const [apiKeyServiceConfig, setApiKeyServiceConfig] = useState<Array<{ id: string; label: string; keys: Array<{ name: string; label: string }> }>>([])
  const [expandedService, setExpandedService] = useState<string | null>(null)
  const [editingKeyField, setEditingKeyField] = useState<{ service: string; keyName: string } | null>(null)
  const [keyInputValue, setKeyInputValue] = useState('')
  const [savingApiKey, setSavingApiKey] = useState(false)

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
    fetchProducts()
    fetchEnvLinks()
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

      if (s.company_info && typeof s.company_info === 'object') setCompanyInfo({ ...DEFAULT_COMPANY, ...s.company_info })
      // pricing now comes from core product, not settings key
      if (s.sequences && typeof s.sequences === 'object') {
        setSequences({
          urgencyDays: s.sequences.urgencyDays || DEFAULT_SEQUENCES.urgencyDays,
          urgencyTemplates: { ...DEFAULT_SEQUENCES.urgencyTemplates, ...(s.sequences.urgencyTemplates || {}) },
          safetyBuffer: s.sequences.safetyBuffer ?? DEFAULT_SEQUENCES.safetyBuffer,
        })
      }
      if (s.client_sequences && typeof s.client_sequences === 'object') {
        setClientSequences({
          touchpointDays: s.client_sequences.touchpointDays || DEFAULT_CLIENT_SEQUENCES.touchpointDays,
          touchpointGuidance: { ...DEFAULT_CLIENT_SEQUENCES.touchpointGuidance, ...(s.client_sequences.touchpointGuidance || {}) },
          touchpointTemplates: { ...DEFAULT_CLIENT_SEQUENCES.touchpointTemplates, ...(s.client_sequences.touchpointTemplates || {}) },
          upsellProducts: s.client_sequences.upsellProducts || DEFAULT_CLIENT_SEQUENCES.upsellProducts,
          enabled: s.client_sequences.enabled ?? true,
        })
      }
      if (s.channel_routing && typeof s.channel_routing === 'object') setChannelRouting({ ...DEFAULT_CHANNEL_ROUTING, ...s.channel_routing })
      if (s.personalization && typeof s.personalization === 'object') setPersonalization({ ...DEFAULT_PERSONALIZATION, ...s.personalization })
      if (s.targets && typeof s.targets === 'object') setTargets({ ...DEFAULT_TARGETS, ...s.targets })
      if (s.instantly_campaigns && typeof s.instantly_campaigns === 'object') setCampaigns(s.instantly_campaigns)
      if (s.rep_targets && typeof s.rep_targets === 'object') setRepTargets(s.rep_targets)
      if (s.close_engine_scenarios && typeof s.close_engine_scenarios === 'object') {
        setScenarioTemplates(s.close_engine_scenarios.scenarios || {})
        setFirstMessageTemplates(s.close_engine_scenarios.firstMessages || {})
        setQualifyingFlow(s.close_engine_scenarios.qualifyingFlow || {})
        setPaymentFlow(s.close_engine_scenarios.paymentFlow || {})
      }
      if (s.smart_chat && typeof s.smart_chat === 'object') {
        setSmartChat(prev => ({ ...prev, ...s.smart_chat }))
        setSmartChatLoaded(true)
      }
      if (s.system_messages && typeof s.system_messages === 'object') {
        setSystemMessages(prev => {
          const merged = { ...prev }
          for (const key of Object.keys(prev)) {
            if (s.system_messages[key] && typeof s.system_messages[key] === 'object') {
              merged[key] = { ...prev[key], ...s.system_messages[key] }
            }
          }
          return merged
        })
      }
      if (s.automated_messages && typeof s.automated_messages === 'object') {
        setAutomatedMessages(prev => {
          const merged = { ...prev }
          for (const key of Object.keys(prev)) {
            if (s.automated_messages[key] && typeof s.automated_messages[key] === 'object') {
              merged[key] = { ...prev[key], ...s.automated_messages[key] }
            }
          }
          return merged
        })
      }
      if (s.ai_controls && typeof s.ai_controls === 'object') {
        setAiControls(prev => ({ ...prev, ...s.ai_controls }))
      }
      if (s.onboarding_flow && typeof s.onboarding_flow === 'object') {
        setOnboardingFlow(prev => ({ ...prev, ...s.onboarding_flow }))
      }

      setSettingsLoaded(true)
    } catch (e) {
      console.error('Failed to load settings:', e)
    } finally {
      setLoadingSettings(false)
    }
  }

  // ── Save a settings key ─���────────��─────────────────────────
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

  // ── Unified Products (core + upsells) ────────────────────────
  const fetchProducts = async () => {
    setProductsLoading(true)
    try {
      const res = await fetch(`/api/upsell-products?_t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        const loadedProducts = data.products || []
        setProducts(loadedProducts)

        // Auto-seed if empty
        if (loadedProducts.length === 0) {
          await seedDefaultProducts()
          return
        }

        // One-time fix: if core product pitch still says $149, update to use actual prices
        const core = loadedProducts.find((p: any) => p.isCore)
        if (core?.pitchOneLiner?.includes('$149')) {
          const m1 = core.month1Price || 188
          const rec = core.recurringPrice || 39
          await fetch(`/api/upsell-products/${core.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pitchOneLiner: `$${m1} to go live, $${rec}/mo after that`,
              repCloseScript: `It's $${m1} for the first month \u2014 that covers the full site build plus your first month of hosting. After that it's just $${rec}/month to keep everything running.`,
              previewBannerText: `$${m1} to get started`,
            }),
          })
          await fetch('/api/settings/pricing', { method: 'POST' })
          // Re-fetch to get updated data
          const res2 = await fetch(`/api/upsell-products?_t=${Date.now()}`)
          if (res2.ok) {
            const data2 = await res2.json()
            setProducts(data2.products || [])
          }
        }
      }
    } catch { /* ignore */ }
    finally { setProductsLoading(false) }
  }

  const fetchEnvLinks = async () => {
    try {
      const res = await fetch('/api/settings/payment-links')
      if (res.ok) {
        const data = await res.json()
        setEnvLinks(data.envLinks || {})
      }
    } catch { /* ignore */ }
  }

  const seedDefaultProducts = async () => {
    // Seed core product — NO annual fields (annual is a separate upsell)
    await fetch('/api/upsell-products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Website + Hosting', price: 188, recurring: true, isCore: true,
        month1Price: 188, recurringPrice: 39,
        stripeLink: 'https://buy.stripe.com/28E28k7uG0Wsaxu7IM7wA06',
        pitchOneLiner: '$188 to go live, $39/mo after that',
        previewBannerText: '$188 to get started',
        repCloseScript: "It's $188 for the first month \u2014 that covers the full site build plus your first month of hosting. After that it's just $39/month to keep everything running.",
        aiProductSummary: 'Professional website + monthly hosting for service businesses',
        sortOrder: 0,
      })
    })
    // Seed upsells
    const upsells = [
      { name: 'Annual Hosting Plan', price: 399, recurring: false, stripeLink: 'https://buy.stripe.com/3cI5kw3eqfRm7lid367wA08', aiProductSummary: 'Annual hosting \u2014 $399/yr (save $69 vs monthly)', aiPitchInstructions: 'Pitch after 3 months of active monthly hosting. Mention they save $69/yr. Only pitch to clients who are happy and engaged.', minClientAgeDays: 90, maxPitchesPerClient: 2, sortOrder: 1 },
      { name: 'GBP Optimization', price: 49, recurring: false, stripeLink: 'https://buy.stripe.com/fZu3coeX8ax2fROfbe7wA09', aiProductSummary: 'Google Business Profile setup \u2014 $49 one-time', sortOrder: 2 },
      { name: 'Review Widget', price: 29, recurring: true, stripeLink: 'https://buy.stripe.com/fZu00c02e34AgVS3sw7wA0a', aiProductSummary: 'Review widget \u2014 $29/mo, shows Google reviews on your site', sortOrder: 3 },
      { name: 'SEO Updates', price: 59, recurring: true, stripeLink: 'https://buy.stripe.com/14A9AM5my7kQ20Yd367wA0b', aiProductSummary: 'Monthly SEO optimization \u2014 $59/mo', sortOrder: 4 },
      { name: 'Social Page', price: 99, recurring: false, stripeLink: 'https://buy.stripe.com/fZeV6aGS20w8pm4wA7wA0c', aiProductSummary: 'Social media page setup \u2014 $99 one-time', sortOrder: 5 },
    ]
    for (const u of upsells) {
      await fetch('/api/upsell-products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...u, isCore: false }),
      })
    }
    await fetchProducts()
  }

  const handleAddProduct = async () => {
    const priceVal = parseFloat(newProduct.price) || 0
    // Auto-generate AI summary if blank
    let aiSummary = newProduct.aiProductSummary
    if (!aiSummary?.trim()) {
      const priceStr = newProduct.recurring ? `$${priceVal}/mo` : `$${priceVal} one-time`
      aiSummary = `${newProduct.name} \u2014 ${priceStr}`
    }
    const payload = {
      name: newProduct.name,
      price: priceVal,
      recurring: newProduct.recurring,
      isCore: newProduct.isCore,
      stripeLink: newProduct.stripeLink || null,
      month1Price: newProduct.isCore ? (parseFloat(newProduct.month1Price) || null) : null,
      recurringPrice: newProduct.isCore ? (parseFloat(newProduct.recurringPrice) || null) : null,
      pitchOneLiner: newProduct.pitchOneLiner || null,
      previewBannerText: newProduct.isCore ? (newProduct.previewBannerText || null) : null,
      repCloseScript: newProduct.isCore ? (newProduct.repCloseScript || null) : null,
      description: newProduct.description || null,
      aiPitchInstructions: newProduct.aiPitchInstructions || null,
      aiProductSummary: aiSummary || null,
      eligibleIndustries: newProduct.eligibleIndustries ? newProduct.eligibleIndustries.split(',').map(s => s.trim()).filter(Boolean) : [],
      minClientAgeDays: newProduct.minClientAgeDays ? parseInt(newProduct.minClientAgeDays) : null,
      maxPitchesPerClient: parseInt(newProduct.maxPitchesPerClient) || 3,
      pitchChannel: newProduct.pitchChannel,
      sortOrder: parseInt(newProduct.sortOrder) || 0,
    }
    const res = await fetch('/api/upsell-products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    if (res.ok) {
      setAddProductOpen(false)
      setNewProduct({ name: '', price: '', recurring: true, isCore: false, stripeLink: '', month1Price: '', recurringPrice: '', annualPrice: '', stripeLinkAnnual: '', pitchOneLiner: '', previewBannerText: '', repCloseScript: '', description: '', aiPitchInstructions: '', aiProductSummary: '', eligibleIndustries: '', minClientAgeDays: '', maxPitchesPerClient: '3', pitchChannel: 'sms', sortOrder: '0' })
      if (payload.isCore) await fetch('/api/settings/pricing', { method: 'POST' })
      await fetchProducts()
    }
  }

  const handleUpdateProduct = async (id: string, data: any) => {
    // Strip relational/readonly fields before sending
    const { pitches, createdAt, updatedAt, id: _id, ...payload } = data
    try {
      const res = await fetch(`/api/upsell-products/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[Settings] Product update failed:', err)
        alert(`Save failed: ${err.error || 'Unknown error'}`)
        return
      }
      if (payload.isCore) await fetch('/api/settings/pricing', { method: 'POST' })
      setEditingProductId(null)
      setEditingProductData(null)
      await fetchProducts()
    } catch (err) {
      console.error('[Settings] Product update error:', err)
      alert('Save failed — check console for details')
    }
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" permanently? This removes it from the system. Historical pitch data is preserved.`)) return
    await fetch(`/api/upsell-products/${id}`, { method: 'DELETE' })
    await fetchProducts()
  }

  const handleDeactivateProduct = async (id: string, active: boolean) => {
    await fetch(`/api/upsell-products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    await fetchProducts()
  }

  const handleVerifyLink = async (productId: string, url: string) => {
    if (!url) return
    const res = await fetch('/api/settings/payment-links/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
    })
    if (res.ok) {
      const data = await res.json()
      setVerifyResults(prev => ({ ...prev, [productId]: data }))
    }
  }

  const handleVerifyAll = async () => {
    setVerifyingAll(true)
    setVerifyResults({})
    for (const product of products) {
      if (!product.active) {
        setVerifyResults(prev => ({ ...prev, [product.id]: { valid: false, reason: 'Inactive' } }))
      } else if (!product.stripeLink) {
        setVerifyResults(prev => ({ ...prev, [product.id]: { valid: false, reason: 'No URL configured' } }))
      } else {
        await handleVerifyLink(product.id, product.stripeLink)
      }
    }
    setVerifyingAll(false)
  }

  // (Payment links handlers removed — unified into Products above)

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
    if (activeTab === 'api' && !apiKeyData) {
      loadApiKeys()
    }
  }, [activeTab, services, apiLoading, checkApiStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadApiKeys = async () => {
    try {
      const res = await fetch('/api/settings/api-keys')
      if (res.ok) {
        const data = await res.json()
        setApiKeyData(data.keys)
        setApiKeyServiceConfig(data.services)
      }
    } catch { /* retry manually */ }
  }

  const handleSaveApiKey = async (serviceId: string, keyName: string) => {
    if (!keyInputValue.trim()) return
    setSavingApiKey(true)
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceId, keys: { [keyName]: keyInputValue.trim() } }),
      })
      if (res.ok) {
        setEditingKeyField(null)
        setKeyInputValue('')
        await loadApiKeys()
        // Re-check status since key changed
        checkApiStatus()
      }
    } catch { /* user can retry */ }
    finally { setSavingApiKey(false) }
  }

  const handleRemoveApiKey = async (serviceId: string, keyName: string) => {
    setSavingApiKey(true)
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceId, keyName }),
      })
      if (res.ok) {
        await loadApiKeys()
        checkApiStatus()
      }
    } catch { /* user can retry */ }
    finally { setSavingApiKey(false) }
  }

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
    { id: 'messages_ai' as TabId, label: 'Messages & AI', icon: <MessageSquare size={16} /> },
    { id: 'sequences' as TabId, label: 'Sequences', icon: <Zap size={16} /> },
    { id: 'personalization' as TabId, label: 'Personalization', icon: <Brain size={16} /> },
    { id: 'targets' as TabId, label: 'Targets', icon: <BarChart3 size={16} /> },
    { id: 'team' as TabId, label: 'Team', icon: <Users size={16} /> },
    { id: 'api' as TabId, label: 'API Keys', icon: <Key size={16} /> },
    { id: 'diagnostics' as TabId, label: 'Diagnostics', icon: <Activity size={16} /> },
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

          {/* ── Unified Products Section ───────────────────────── */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Products" description="All products and payment links — core plan and upsells. The AI reads from this list." />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleVerifyAll} disabled={verifyingAll}>
                  {verifyingAll ? <><Loader2 size={14} className="mr-1 animate-spin" /> Verifying...</> : <><Shield size={14} className="mr-1" /> Verify All</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAddProductOpen(!addProductOpen)}>
                  <Plus size={14} className="mr-1" /> Add Product
                </Button>
              </div>
            </div>

            {/* Verify All Results Summary */}
            {Object.keys(verifyResults).length > 0 && !verifyingAll && (
              <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Verification Results</span>
                  <button onClick={() => setVerifyResults({})} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
                </div>
                <div className="flex gap-3 text-sm">
                  <span className="text-green-600 font-medium">{Object.values(verifyResults).filter(v => v?.valid).length} live</span>
                  <span className="text-red-600 font-medium">{Object.values(verifyResults).filter(v => v && !v.valid).length} failed</span>
                </div>
                {Object.values(verifyResults).some(v => v && !v.valid) && (
                  <div className="mt-2 space-y-1">
                    {products.filter(p => verifyResults[p.id] && !verifyResults[p.id]?.valid).map(p => (
                      <div key={p.id} className="text-xs text-red-600 flex items-center gap-1">
                        <XCircle size={12} /> <span className="font-medium">{p.name}:</span> {verifyResults[p.id]?.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add Product Form */}
            {addProductOpen && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Product Name</FieldLabel>
                    <Input placeholder="e.g., SEO Package" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Price ($)</FieldLabel>
                    <Input type="number" min={0} placeholder="0" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Type</FieldLabel>
                    <select value={newProduct.recurring ? 'recurring' : 'one_time'} onChange={(e) => setNewProduct({ ...newProduct, recurring: e.target.value === 'recurring' })} className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm">
                      <option value="one_time">One-time</option>
                      <option value="recurring">Recurring (monthly)</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isCore" checked={newProduct.isCore} onChange={(e) => setNewProduct({ ...newProduct, isCore: e.target.checked })} className="rounded" />
                  <label htmlFor="isCore" className="text-sm font-medium text-blue-700">Core Product (main plan — pricing propagates system-wide)</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Stripe Payment Link</FieldLabel>
                    <Input placeholder="https://buy.stripe.com/..." value={newProduct.stripeLink} onChange={(e) => setNewProduct({ ...newProduct, stripeLink: e.target.value })} className="font-mono text-sm" />
                  </div>
                  <div>
                    <FieldLabel>AI Product Summary</FieldLabel>
                    <Input placeholder="One-liner the AI uses in conversation" value={newProduct.aiProductSummary} onChange={(e) => setNewProduct({ ...newProduct, aiProductSummary: e.target.value })} />
                  </div>
                </div>
                {newProduct.isCore && (
                  <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg space-y-3">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Core Pricing Fields</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>First Month Price ($)</FieldLabel>
                        <Input type="number" min={0} value={newProduct.month1Price} onChange={(e) => setNewProduct({ ...newProduct, month1Price: e.target.value })} />
                      </div>
                      <div>
                        <FieldLabel>Recurring Price ($/mo)</FieldLabel>
                        <Input type="number" min={0} value={newProduct.recurringPrice} onChange={(e) => setNewProduct({ ...newProduct, recurringPrice: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Preview Banner Text</FieldLabel>
                      <Input placeholder='e.g., $188 to get started' value={newProduct.previewBannerText} onChange={(e) => setNewProduct({ ...newProduct, previewBannerText: e.target.value })} />
                    </div>
                    <div>
                      <FieldLabel>Pitch One-Liner (used everywhere)</FieldLabel>
                      <Input placeholder='e.g., $188 to go live, $39/mo after that' value={newProduct.pitchOneLiner} onChange={(e) => setNewProduct({ ...newProduct, pitchOneLiner: e.target.value })} />
                    </div>
                    <div>
                      <FieldLabel>Rep Close Script</FieldLabel>
                      <textarea placeholder="Full script reps use to close" value={newProduct.repCloseScript} onChange={(e) => setNewProduct({ ...newProduct, repCloseScript: e.target.value })} className="w-full h-20 px-3 py-2 text-sm border border-blue-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                  </div>
                )}
                <div>
                  <FieldLabel>AI Pitch Instructions</FieldLabel>
                  <textarea placeholder="How/when AI should pitch this product" value={newProduct.aiPitchInstructions} onChange={(e) => setNewProduct({ ...newProduct, aiPitchInstructions: e.target.value })} className="w-full h-16 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <FieldLabel>Description (admin-facing)</FieldLabel>
                  <Input placeholder="Brief description" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
                </div>
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <ChevronDown size={12} className={showAdvanced ? 'rotate-180 transition-transform' : 'transition-transform'} /> Advanced Targeting
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <FieldLabel>Eligible Industries</FieldLabel>
                      <Input placeholder="blank = all" value={newProduct.eligibleIndustries} onChange={(e) => setNewProduct({ ...newProduct, eligibleIndustries: e.target.value })} className="text-sm" />
                    </div>
                    <div>
                      <FieldLabel>Min Client Age (days)</FieldLabel>
                      <Input type="number" min={0} value={newProduct.minClientAgeDays} onChange={(e) => setNewProduct({ ...newProduct, minClientAgeDays: e.target.value })} />
                    </div>
                    <div>
                      <FieldLabel>Max Pitches</FieldLabel>
                      <Input type="number" min={1} value={newProduct.maxPitchesPerClient} onChange={(e) => setNewProduct({ ...newProduct, maxPitchesPerClient: e.target.value })} />
                    </div>
                    <div>
                      <FieldLabel>Pitch Channel</FieldLabel>
                      <select value={newProduct.pitchChannel} onChange={(e) => setNewProduct({ ...newProduct, pitchChannel: e.target.value })} className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm">
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setAddProductOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleAddProduct} disabled={!newProduct.name.trim() || !newProduct.price}>Add Product</Button>
                </div>
              </div>
            )}

            {/* Products List */}
            {productsLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
                <Loader2 size={16} className="animate-spin" /> <span className="text-sm">Loading products...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No products yet. Seeding defaults...</div>
            ) : (
              <div className="space-y-2">
                {/* ── Core Products ── */}
                {products.filter(p => p.isCore).map((product: any) => {
                  const verify = verifyResults[product.id]
                  const isEditing = editingProductId === product.id

                  const handleCorePriceChange = (field: string, value: string) => {
                    const numVal = parseFloat(value) || 0
                    const updated = { ...editingProductData, [field]: numVal || null }
                    if (field === 'month1Price') updated.price = numVal

                    const m1 = field === 'month1Price' ? numVal : (editingProductData?.month1Price || 0)
                    const rec = field === 'recurringPrice' ? numVal : (editingProductData?.recurringPrice || 0)

                    if (!customPitch) {
                      updated.pitchOneLiner = `$${m1} to go live, $${rec}/mo after that`
                    }
                    if (!customScript) {
                      updated.repCloseScript = `It's $${m1} for the first month \u2014 that covers the full site build plus your first month of hosting. After that it's just $${rec}/month to keep everything running.`
                    }
                    if (!customBanner) {
                      updated.previewBannerText = `$${m1} to get started`
                    }
                    setEditingProductData(updated)
                  }

                  return (
                    <div key={product.id} className={`p-4 rounded-lg border-2 ${product.active ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                      {isEditing ? (
                        <div className="space-y-3">
                          {/* Row 1: Name, First Month, Recurring */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Name <FieldInfo text="Product name shown in Settings. Not visible to customers." /></label>
                              <Input className="h-8 text-sm" value={editingProductData?.name || ''} onChange={(e) => setEditingProductData({ ...editingProductData, name: e.target.value })} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">First Month <FieldInfo text="What the customer pays month 1. Shows on: preview banners, rep scripts, email sequences, AI conversations, terms page, and Stripe webhook logic." /></label>
                              <PriceInput value={editingProductData?.month1Price || ''} onChange={(v) => handleCorePriceChange('month1Price', v)} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Recurring (/mo) <FieldInfo text="What the customer pays month 2+. Shows on: rep scripts, email sequences, AI conversations, terms page." /></label>
                              <PriceInput value={editingProductData?.recurringPrice || ''} onChange={(v) => handleCorePriceChange('recurringPrice', v)} />
                            </div>
                          </div>
                          {/* Row 2: Stripe Link + Banner Text */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Stripe Link <FieldInfo text="The Stripe payment link customers click to pay. AI sends this in conversations. Reps copy this during calls." /></label>
                              <Input className="h-8 text-sm font-mono" value={editingProductData?.stripeLink || ''} onChange={(e) => setEditingProductData({ ...editingProductData, stripeLink: e.target.value })} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Banner Text <FieldInfo text="Text shown on the sticky banner at the top of preview pages. Customers see this." /></label>
                              <Input className="h-8 text-sm" value={editingProductData?.previewBannerText || ''} onChange={(e) => { setCustomBanner(true); setEditingProductData({ ...editingProductData, previewBannerText: e.target.value }) }} />
                              <p className="text-[10px] mt-0.5 italic text-gray-400">{customBanner ? 'Custom override \u2014 won\u2019t auto-update when prices change.' : 'Auto-generated from prices. Edit to override.'} {customBanner && <button type="button" className="text-blue-500 hover:underline ml-1" onClick={() => { setCustomBanner(false); const m1 = editingProductData?.month1Price || 0; setEditingProductData({ ...editingProductData, previewBannerText: `$${m1} to get started` }) }}>Reset to auto</button>}</p>
                            </div>
                          </div>
                          {/* Row 3: Pitch One-Liner */}
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Pitch One-Liner <FieldInfo text="Short pricing pitch used by AI in conversations and shown in product cards. Auto-generates from prices \u2014 edit to override." /></label>
                            <Input className="h-8 text-sm" value={editingProductData?.pitchOneLiner || ''} onChange={(e) => { setCustomPitch(true); setEditingProductData({ ...editingProductData, pitchOneLiner: e.target.value }) }} />
                            <p className="text-[10px] mt-0.5 italic text-gray-400">{customPitch ? 'Custom override \u2014 won\u2019t auto-update when prices change.' : 'Auto-generated from prices. Edit to override.'} {customPitch && <button type="button" className="text-blue-500 hover:underline ml-1" onClick={() => { setCustomPitch(false); const m1 = editingProductData?.month1Price || 0; const rec = editingProductData?.recurringPrice || 0; setEditingProductData({ ...editingProductData, pitchOneLiner: `$${m1} to go live, $${rec}/mo after that` }) }}>Reset to auto</button>}</p>
                          </div>
                          {/* Row 4: Rep Close Script */}
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Rep Close Script <FieldInfo text="What reps read verbatim when closing a deal on the phone. Auto-generates from prices \u2014 edit to override." /></label>
                            <textarea className="w-full h-16 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none" value={editingProductData?.repCloseScript || ''} onChange={(e) => { setCustomScript(true); setEditingProductData({ ...editingProductData, repCloseScript: e.target.value }) }} />
                            <p className="text-[10px] mt-0.5 italic text-gray-400">{customScript ? 'Custom override \u2014 won\u2019t auto-update when prices change.' : 'Auto-generated from prices. Edit to override.'} {customScript && <button type="button" className="text-blue-500 hover:underline ml-1" onClick={() => { setCustomScript(false); const m1 = editingProductData?.month1Price || 0; const rec = editingProductData?.recurringPrice || 0; setEditingProductData({ ...editingProductData, repCloseScript: `It's $${m1} for the first month \u2014 that covers the full site build plus your first month of hosting. After that it's just $${rec}/month to keep everything running.` }) }}>Reset to auto</button>}</p>
                          </div>
                          {/* Buttons */}
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => { setEditingProductId(null); setEditingProductData(null) }}>Cancel</Button>
                            <Button size="sm" onClick={() => handleUpdateProduct(product.id, editingProductData)}><Save size={14} className="mr-1" /> Save</Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold uppercase">Core</span>
                              <span className="text-sm font-semibold text-gray-900">{product.name}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                ${product.month1Price || product.price} first month / ${product.recurringPrice || '?'}/mo after
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {verify && <span className={`text-xs px-2 py-0.5 rounded-full ${verify.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{verify.valid ? 'Live' : 'Failed'}</span>}
                              {product.stripeLink && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleVerifyLink(product.id, product.stripeLink)}><Shield size={12} className="mr-1" /> Verify</Button>}
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                                setEditingProductId(product.id)
                                setEditingProductData({ ...product })
                                setCustomPitch(false)
                                setCustomScript(false)
                                setCustomBanner(false)
                              }}><Pencil size={12} className="mr-1" /> Edit</Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs opacity-40 cursor-not-allowed" disabled title="Cannot delete core product"><Trash2 size={12} /></Button>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                            {product.previewBannerText && <div>Banner: &quot;{product.previewBannerText}&quot;</div>}
                            {product.pitchOneLiner && <div>Pitch: &quot;{product.pitchOneLiner}&quot;</div>}
                            {product.stripeLink && <a href={product.stripeLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-mono truncate block max-w-[400px]">{product.stripeLink}</a>}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* ── Upsell Products ── */}
                {products.filter(p => !p.isCore).map((product: any) => {
                  const verify = verifyResults[product.id]
                  const isEditing = editingProductId === product.id
                  const pitchCount = product.pitches?.length || 0
                  const paidCount = product.pitches?.filter((p: any) => p.status === 'paid').length || 0

                  const generateAiSummary = () => {
                    const priceStr = editingProductData?.recurring ? `$${editingProductData?.price || 0}/mo` : `$${editingProductData?.price || 0} one-time`
                    return `${editingProductData?.name || 'Product'} \u2014 ${priceStr}`
                  }

                  return (
                    <div key={product.id} className={`p-3 rounded-lg border ${product.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'} group`}>
                      {isEditing ? (
                        <div className="space-y-3">
                          {/* Row 1: Name, Price, Type */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Name <FieldInfo text="Product name the AI uses in conversations." /></label>
                              <Input className="h-8 text-sm" value={editingProductData?.name || ''} onChange={(e) => setEditingProductData({ ...editingProductData, name: e.target.value })} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Price <FieldInfo text="Product price. The AI includes this when pitching." /></label>
                              <PriceInput value={editingProductData?.price || 0} onChange={(v) => setEditingProductData({ ...editingProductData, price: parseFloat(v) || 0 })} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Type</label>
                              <select className="w-full h-8 px-3 rounded-md border border-gray-200 bg-white text-sm" value={editingProductData?.recurring ? 'recurring' : 'one_time'} onChange={(e) => setEditingProductData({ ...editingProductData, recurring: e.target.value === 'recurring' })}>
                                <option value="one_time">One-time</option>
                                <option value="recurring">Recurring (monthly)</option>
                              </select>
                            </div>
                          </div>
                          {/* Row 2: Stripe Link + Verify */}
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Stripe Link <FieldInfo text="Payment link the AI sends when a client is ready to buy." /></label>
                            <div className="flex gap-2">
                              <Input className="h-8 text-sm font-mono flex-1" value={editingProductData?.stripeLink || ''} onChange={(e) => setEditingProductData({ ...editingProductData, stripeLink: e.target.value })} />
                              {editingProductData?.stripeLink && <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleVerifyLink(product.id, editingProductData.stripeLink)}><Shield size={12} className="mr-1" /> Verify</Button>}
                            </div>
                          </div>
                          {/* Row 3: AI Summary + AI Pitch Instructions */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">AI Summary <FieldInfo text="One-line description the AI sees. Auto-generates if blank \u2014 edit to override." /></label>
                              <div className="flex gap-2">
                                <Input className="h-8 text-sm flex-1" value={editingProductData?.aiProductSummary || ''} onChange={(e) => setEditingProductData({ ...editingProductData, aiProductSummary: e.target.value })} />
                                <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" onClick={() => setEditingProductData({ ...editingProductData, aiProductSummary: generateAiSummary() })}><Sparkles size={12} className="mr-1" /> Generate</Button>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">AI Pitch Instructions <FieldInfo text="Tells the AI HOW to sell this. Write in plain English: when to pitch, what to say, what to avoid." /></label>
                              <Input className="h-8 text-sm" value={editingProductData?.aiPitchInstructions || ''} onChange={(e) => setEditingProductData({ ...editingProductData, aiPitchInstructions: e.target.value })} />
                            </div>
                          </div>
                          {/* Row 4: Description */}
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Description (admin-facing notes)</label>
                            <textarea className="w-full h-12 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none" value={editingProductData?.description || ''} onChange={(e) => setEditingProductData({ ...editingProductData, description: e.target.value })} />
                          </div>
                          {/* Targeting (collapsible) */}
                          <button type="button" onClick={() => setShowUpsellTargeting(!showUpsellTargeting)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                            <ChevronDown size={12} className={showUpsellTargeting ? 'rotate-180 transition-transform' : 'transition-transform'} /> Targeting
                          </button>
                          {showUpsellTargeting && (
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Industries <FieldInfo text="Comma-separated. Leave blank to pitch to all industries." /></label>
                                <Input className="h-8 text-sm" placeholder="blank = all" value={(editingProductData?.eligibleIndustries || []).join(', ')} onChange={(e) => setEditingProductData({ ...editingProductData, eligibleIndustries: e.target.value ? e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) : [] })} />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Min Age (days) <FieldInfo text="Don't pitch this product until the client has been active for this many days." /></label>
                                <Input type="number" min={0} className="h-8 text-sm" value={editingProductData?.minClientAgeDays || ''} onChange={(e) => setEditingProductData({ ...editingProductData, minClientAgeDays: parseInt(e.target.value) || null })} />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Max Pitches <FieldInfo text="Stop pitching after this many tries per client." /></label>
                                <Input type="number" min={1} className="h-8 text-sm" value={editingProductData?.maxPitchesPerClient || 3} onChange={(e) => setEditingProductData({ ...editingProductData, maxPitchesPerClient: parseInt(e.target.value) || 3 })} />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Channel <FieldInfo text="How the AI delivers the pitch: SMS, Email, or Both." /></label>
                                <select className="w-full h-8 px-2 rounded-md border border-gray-200 bg-white text-sm" value={editingProductData?.pitchChannel || 'sms'} onChange={(e) => setEditingProductData({ ...editingProductData, pitchChannel: e.target.value })}>
                                  <option value="sms">SMS</option>
                                  <option value="email">Email</option>
                                  <option value="both">Both</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Sort Order</label>
                                <Input type="number" min={0} className="h-8 text-sm" value={editingProductData?.sortOrder || 0} onChange={(e) => setEditingProductData({ ...editingProductData, sortOrder: parseInt(e.target.value) || 0 })} />
                              </div>
                            </div>
                          )}
                          {/* Buttons */}
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => { setEditingProductId(null); setEditingProductData(null); setShowUpsellTargeting(false) }}>Cancel</Button>
                            <Button size="sm" onClick={() => {
                              // Auto-fill AI summary if blank
                              const finalData = { ...editingProductData }
                              if (!finalData.aiProductSummary?.trim()) {
                                const priceStr = finalData.recurring ? `$${finalData.price || 0}/mo` : `$${finalData.price || 0} one-time`
                                finalData.aiProductSummary = `${finalData.name || 'Product'} \u2014 ${priceStr}`
                              }
                              handleUpdateProduct(product.id, finalData)
                            }}><Save size={14} className="mr-1" /> Save</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${product.stripeLink ? (product.active ? 'bg-green-500' : 'bg-gray-400') : 'bg-amber-500'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{product.name}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">${product.price}{product.recurring ? '/mo' : ''}</span>
                                {!product.stripeLink && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">No URL</span>}
                                {!product.active && <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600">Inactive</span>}
                              </div>
                              {product.aiProductSummary && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[500px]">{product.aiProductSummary}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {verify && <span className={`text-xs px-2 py-0.5 rounded-full ${verify.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{verify.valid ? 'Live' : 'Failed'}</span>}
                            {pitchCount > 0 && <span className="text-xs text-gray-500">{paidCount}/{pitchCount} converted</span>}
                            {product.stripeLink && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleVerifyLink(product.id, product.stripeLink)}><Shield size={12} className="mr-1" /> Verify</Button>}
                            <Button variant="outline" size="sm" className={`h-7 text-xs ${product.active ? '' : 'border-green-300 text-green-600 hover:bg-green-50'}`} onClick={() => handleDeactivateProduct(product.id, product.active)}>
                              {product.active ? 'Deactivate' : 'Reactivate'}
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setEditingProductId(product.id); setEditingProductData({ ...product }); setShowUpsellTargeting(false) }}><Pencil size={12} className="mr-1" /> Edit</Button>
                            <button onClick={() => handleDeleteProduct(product.id, product.name)} className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete permanently"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Env Var Cross-Check */}
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
                      <span className={status.set ? 'text-green-600' : 'text-gray-400'}>{status.set ? 'Set' : 'Not set'}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Env vars are legacy fallbacks. Products table is the source of truth.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════��══════════
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
                          placeholder="e.g., $59/mo"
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
                  <option value="claude-haiku-4-5-20251001">Claude 4.5 Haiku (fast, cost-effective)</option>
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
         ════════════════════════════════════════════════��══════════ */}
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
          TAB: API KEYS
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'api' && (
        <div className="space-y-4">
          {/* Connection Status Header */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">API Keys & Services</h3>
                {services && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {connectedCount}/{totalCount} services connected
                    {lastChecked && <span className="ml-2 text-gray-400">· checked {lastChecked}</span>}
                  </p>
                )}
              </div>
              <button
                onClick={() => { checkApiStatus(); loadApiKeys() }}
                disabled={apiLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              >
                {apiLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {apiLoading ? 'Checking...' : 'Test All'}
              </button>
            </div>
          </Card>

          {/* Service Cards */}
          {apiKeyServiceConfig.map((svc) => {
            const serviceStatus = services?.find(s => s.key === svc.id)
            const isExpanded = expandedService === svc.id
            const serviceKeys = apiKeyData?.[svc.id] || {}
            const hasAnyKey = Object.values(serviceKeys).some(k => k.hasValue)

            const serviceIcon = svc.id === 'anthropic' ? <Brain size={18} /> :
              svc.id === 'stripe' ? <DollarSign size={18} /> :
              svc.id === 'twilio' ? <Phone size={18} /> :
              svc.id === 'resend' ? <MessageSquare size={18} /> :
              svc.id === 'instantly' ? <Zap size={18} /> :
              svc.id === 'serpapi' || svc.id === 'serper' ? <Search size={18} /> :
              <ExternalLink size={18} />

            return (
              <Card key={svc.id} className="overflow-hidden">
                {/* Service Header */}
                <button
                  onClick={() => setExpandedService(isExpanded ? null : svc.id)}
                  className={`w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors ${isExpanded ? 'border-b' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${
                      serviceStatus?.connected === true ? 'text-green-600 bg-green-50' :
                      hasAnyKey ? 'text-amber-600 bg-amber-50' :
                      'text-gray-400 bg-gray-100'
                    }`}>
                      {serviceIcon}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{svc.label}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {serviceStatus?.connected === true ? (
                          <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={10} /> Connected</span>
                        ) : hasAnyKey ? (
                          <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle size={10} /> Key set</span>
                        ) : (
                          <span className="text-xs text-gray-400">Not configured</span>
                        )}
                        {serviceStatus?.detail && serviceStatus.connected !== true && (
                          <span className="text-xs text-gray-400 hidden sm:inline">· {serviceStatus.detail}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded Key List */}
                {isExpanded && (
                  <div className="p-4 bg-gray-50/50 space-y-3">
                    {svc.keys.map((keyDef) => {
                      const keyInfo = serviceKeys[keyDef.name]
                      const isEditing = editingKeyField?.service === svc.id && editingKeyField?.keyName === keyDef.name

                      return (
                        <div key={keyDef.name} className="bg-white rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-700">{keyDef.label}</div>
                              <div className="text-xs text-gray-400 font-mono">{keyDef.name}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {keyInfo?.hasValue && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  keyInfo.source === 'db' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {keyInfo.source === 'db' ? 'DB' : 'ENV'}
                                </span>
                              )}
                              {!isEditing && (
                                <>
                                  <button
                                    onClick={() => { setEditingKeyField({ service: svc.id, keyName: keyDef.name }); setKeyInputValue('') }}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                                    title="Edit key"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  {keyInfo?.source === 'db' && (
                                    <button
                                      onClick={() => handleRemoveApiKey(svc.id, keyDef.name)}
                                      disabled={savingApiKey}
                                      className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                                      title="Remove DB override (fall back to env)"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Current value (masked) */}
                          {!isEditing && (
                            <div className="mt-1.5">
                              {keyInfo?.hasValue ? (
                                <span className="text-sm font-mono text-gray-500">{keyInfo.masked}</span>
                              ) : (
                                <span className="text-sm text-gray-400 italic">Not set</span>
                              )}
                            </div>
                          )}

                          {/* Edit mode */}
                          {isEditing && (
                            <div className="mt-2 flex gap-2">
                              <Input
                                type="password"
                                value={keyInputValue}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyInputValue(e.target.value)}
                                placeholder={`Enter ${keyDef.label.toLowerCase()}...`}
                                className="text-sm font-mono flex-1"
                                autoFocus
                                onKeyDown={(e: React.KeyboardEvent) => {
                                  if (e.key === 'Enter') handleSaveApiKey(svc.id, keyDef.name)
                                  if (e.key === 'Escape') { setEditingKeyField(null); setKeyInputValue('') }
                                }}
                              />
                              <button
                                onClick={() => handleSaveApiKey(svc.id, keyDef.name)}
                                disabled={savingApiKey || !keyInputValue.trim()}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {savingApiKey ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingKeyField(null); setKeyInputValue('') }}
                                className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}

          {/* Loading state */}
          {!apiKeyData && (
            <Card className="p-8">
              <div className="flex items-center justify-center text-gray-500 gap-2">
                <Loader2 size={20} className="animate-spin" />
                <span>Loading API keys...</span>
              </div>
            </Card>
          )}

          <p className="text-xs text-gray-400 text-center">
            DB overrides take priority over Railway environment variables. Remove a DB key to fall back to the env var.
          </p>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <DiagnosticsPanel />
      )}

      {activeTab === 'messages_ai' && (
        <div className="space-y-6">
          {/* Sub-tab toggle */}
          <Card className="p-1">
            <div className="flex gap-1">
              <button
                onClick={() => setMessagesAiTab('ai_conversations')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-colors ${
                  messagesAiTab === 'ai_conversations'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Brain size={16} />
                AI Conversations
              </button>
              <button
                onClick={() => setMessagesAiTab('automated_messages')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-colors ${
                  messagesAiTab === 'automated_messages'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Zap size={16} />
                Automated Messages
              </button>
            </div>
          </Card>

          {/* ── SUB-TAB 1: AI CONVERSATIONS ────────────────────── */}
          {messagesAiTab === 'ai_conversations' && (
            <>
              {/* Pre-AQ / Post-AQ toggle */}
              <Card className="p-1">
                <div className="flex gap-1">
                  <button
                    onClick={() => setPreAqPostAq('pre_aq')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-colors ${
                      preAqPostAq === 'pre_aq'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Target size={16} />
                    Pre-AQ (Before Payment)
                  </button>
                  <button
                    onClick={() => setPreAqPostAq('post_aq')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-colors ${
                      preAqPostAq === 'post_aq'
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Users size={16} />
                    Post-AQ (After Payment)
                  </button>
                </div>
              </Card>

              {/* ── PRE-AQ ── */}
              {preAqPostAq === 'pre_aq' && (
                <>
                  {/* First Message Templates */}
                  <Card className="p-6">
                    <SectionHeader
                      title="First Message Templates"
                      description="Entry-point openers based on how the lead entered. The AI adapts naturally from these."
                    />
                    <div className="space-y-4">
                      {[
                        { key: 'INSTANTLY_REPLY', label: 'Email Reply', desc: 'Lead replied to an Instantly email', default: 'Hey {firstName}! Saw your reply about the website \u2014 excited to get {companyName} set up. Quick question, do you currently have a website or would this be your first one?' },
                        { key: 'SMS_REPLY', label: 'SMS Reply', desc: 'Lead replied to an SMS', default: "Hey {firstName}! Great to hear from you. We can get {companyName}'s site live fast. Quick question, do you currently have a website or would this be your first one?" },
                        { key: 'REP_CLOSE', label: 'Rep Close', desc: 'Rep handed off a lead', default: "Hey {firstName}! Just spoke with the team \u2014 let's get your site live. Quick question, do you currently have a website for {companyName} or would this be your first one?" },
                        { key: 'PREVIEW_CTA', label: 'Preview CTA', desc: 'Lead clicked the preview CTA', default: "Hey {firstName}! Saw you checked out the preview we built for {companyName}. We can get this live for you in no time. Quick question, do you currently have a website or would this be your first one?" },
                      ].map(({ key, label, desc, default: defaultTemplate }) => {
                        const customTemplate = firstMessageTemplates[key] || ''
                        return (
                          <div key={key} className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900 text-sm">{label}</span>
                              <span className="text-xs text-gray-500">{desc}</span>
                              {customTemplate && <span className="text-xs text-blue-600 font-medium ml-auto">Custom</span>}
                            </div>
                            <textarea
                              className="w-full p-3 border rounded-md text-sm resize-y min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={customTemplate || defaultTemplate}
                              onChange={(e) => setFirstMessageTemplates(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder={defaultTemplate}
                            />
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-gray-400">Variables: {'{firstName}'} {'{companyName}'}</p>
                              {customTemplate && (
                                <button onClick={() => setFirstMessageTemplates(prev => { const u = { ...prev }; delete u[key]; return u })} className="text-xs text-red-500 hover:text-red-700">Reset to default</button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>

                  {/* Qualifying Flow */}
                  <Card className="p-6">
                    <SectionHeader
                      title="Qualifying Flow"
                      description="The 3 texts the AI sends before the form link. The AI adapts the wording but follows this structure."
                    />
                    <div className="space-y-1 mb-5">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">1</div>
                          <span>Opening + Q1</span>
                        </div>
                        <div className="w-6 h-px bg-gray-300" />
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">2</div>
                          <span>Decision Maker</span>
                        </div>
                        <div className="w-6 h-px bg-gray-300" />
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">3</div>
                          <span>Form Link</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {[
                        {
                          key: 'TEXT_1_OPENING', step: 1, label: 'Opening + Website Question',
                          desc: 'First text after lead clicks CTA. Greets them and asks Q1.',
                          default: 'Hey {firstName}! Saw you checked out the preview we built for {companyName}. We can get this live for you in no time. Quick question, do you currently have a website or would this be your first one?',
                          hint: 'This is the very first thing they see. Set the tone here.',
                        },
                        {
                          key: 'TEXT_2_DECISION_MAKER', step: 2, label: 'Decision Maker Check',
                          desc: 'After they answer Q1. Confirms we\'re talking to the right person.',
                          default: 'Are you the one who handles marketing decisions for {companyName}, or is there someone else I should loop in?',
                          hint: 'Filters out people who can\'t say yes.',
                        },
                        {
                          key: 'TEXT_3_FORM_LINK', step: 3, label: 'Form Link',
                          desc: 'After both questions answered. Sends the onboarding form.',
                          default: 'Perfect here\'s a quick form to fill out with your business info, logo, and photos. Takes about 5-10 minutes and we\'ll have your site built from it: {formUrl}',
                          hint: '{formUrl} is auto-replaced with the lead\'s unique form link.',
                        },
                      ].map(({ key, step, label, desc, default: defaultTemplate, hint }) => {
                        const customTemplate = qualifyingFlow[key] || ''
                        return (
                          <div key={key} className="border rounded-lg overflow-hidden">
                            <div className="p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${customTemplate ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                  {step}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900 text-sm">{label}</span>
                                    {customTemplate && <span className="text-[10px] bg-blue-50 text-blue-600 font-medium px-1.5 py-0.5 rounded">Custom</span>}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                                </div>
                              </div>
                              <textarea
                                className="w-full p-3 border rounded-md text-sm resize-y min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                value={customTemplate || defaultTemplate}
                                onChange={(e) => setQualifyingFlow(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder={defaultTemplate}
                              />
                              <div className="flex items-center justify-between mt-1.5">
                                <p className="text-xs text-gray-400">{hint}</p>
                                {customTemplate && (
                                  <button onClick={() => setQualifyingFlow(prev => { const u = { ...prev }; delete u[key]; return u })} className="text-xs text-red-500 hover:text-red-700">Reset to default</button>
                                )}
                              </div>
                            </div>
                            {step < 3 && (
                              <div className="px-4 pb-3">
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider">
                                  <div className="h-px flex-1 bg-gray-200" />
                                  <span>lead responds</span>
                                  <div className="h-px flex-1 bg-gray-200" />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800">
                        <strong>How it works:</strong> The AI sends these in order, one per message. If the lead answers both questions in one message, it skips ahead to the form. Variables <code className="bg-amber-100 px-1 rounded">{'{firstName}'}</code> <code className="bg-amber-100 px-1 rounded">{'{companyName}'}</code> <code className="bg-amber-100 px-1 rounded">{'{formUrl}'}</code> are auto-replaced.
                      </p>
                    </div>
                  </Card>

                  {/* Payment Flow */}
                  <Card className="p-6">
                    <SectionHeader
                      title="Payment Flow"
                      description="The messages sent when a lead approves their preview and moves to payment. This is the Stripe checkout flow."
                    />
                    <div className="space-y-1 mb-5">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">1</div>
                          <span>Approval Ack</span>
                        </div>
                        <div className="w-6 h-px bg-gray-300" />
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">2</div>
                          <span>Payment Link</span>
                        </div>
                        <div className="w-6 h-px bg-gray-300" />
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">3</div>
                          <span>Follow-up</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {[
                        {
                          key: 'TEXT_1_APPROVAL_ACK', step: 1, label: 'Approval Acknowledgment',
                          desc: 'AI sends this when the lead says "looks good", "perfect", etc. Confirms their approval.',
                          default: 'Awesome, glad you like it {firstName}! Let me get your payment link ready so we can get {companyName} live.',
                          hint: 'AI adapts this naturally. Triggers when lead approves the preview.',
                        },
                        {
                          key: 'TEXT_2_PAYMENT_LINK', step: 2, label: 'Payment Link Message',
                          desc: 'System message sent with the Stripe link after admin approves.',
                          default: "Here's your payment link to go live: {paymentLink}\n\n{firstMonthTotal} gets your site built and launched, plus monthly hosting at {monthlyHosting}/month. You can cancel anytime.\n\nOnce you pay, we'll have your site live within 48 hours!",
                          hint: 'Variables: {paymentLink} {firstMonthTotal} {monthlyHosting} {firstName} {companyName}',
                        },
                        {
                          key: 'TEXT_3_PAYMENT_FOLLOWUP', step: 3, label: 'Payment Follow-up',
                          desc: 'First follow-up if no payment after 4 hours.',
                          default: 'Hey {firstName}, just checking — any questions about getting your site live?',
                          hint: 'Additional follow-ups at 24h, 48h, 72h are in Automated Messages.',
                        },
                      ].map(({ key, step, label, desc, default: defaultTemplate, hint }) => {
                        const customTemplate = paymentFlow[key] || ''
                        return (
                          <div key={key} className="border rounded-lg overflow-hidden">
                            <div className="p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${customTemplate ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                  {step}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900 text-sm">{label}</span>
                                    {customTemplate && <span className="text-[10px] bg-emerald-50 text-emerald-600 font-medium px-1.5 py-0.5 rounded">Custom</span>}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                                </div>
                              </div>
                              <textarea
                                className="w-full p-3 border rounded-md text-sm resize-y min-h-[80px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                value={customTemplate || defaultTemplate}
                                onChange={(e) => setPaymentFlow(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder={defaultTemplate}
                              />
                              <div className="flex items-center justify-between mt-1.5">
                                <p className="text-xs text-gray-400">{hint}</p>
                                {customTemplate && (
                                  <button onClick={() => setPaymentFlow(prev => { const u = { ...prev }; delete u[key]; return u })} className="text-xs text-red-500 hover:text-red-700">Reset to default</button>
                                )}
                              </div>
                            </div>
                            {step < 3 && (
                              <div className="px-4 pb-3">
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider">
                                  <div className="h-px flex-1 bg-gray-200" />
                                  <span>{step === 1 ? 'admin approves' : 'lead responds'}</span>
                                  <div className="h-px flex-1 bg-gray-200" />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-xs text-emerald-800">
                        <strong>How it works:</strong> When a lead approves their preview, the AI sends Step 1. Then a PAYMENT_LINK approval is created for you to review. When you approve it, Step 2 is sent with the Stripe link. If they don&apos;t pay, follow-ups fire at 4h, 24h, 48h, 72h (see Automated Messages tab).
                      </p>
                    </div>
                  </Card>

                  {/* Stage Templates */}
                  <Card className="p-6">
                    <SectionHeader title="Stage Templates" description="Customize AI instructions for each conversation stage. Leave blank to use defaults." />
                    <div className="space-y-3">
                      {[
                        { stage: 'INITIATED', label: 'Initiated', desc: 'Opening message when a new lead enters the funnel' },
                        { stage: 'QUALIFYING', label: 'Qualifying', desc: 'Collecting core info (services, hours, photos)' },
                        { stage: 'COLLECTING_INFO', label: 'Collecting Info', desc: 'Follow-up questions after core questions answered' },
                        { stage: 'BUILDING', label: 'Building', desc: 'Site is being built, keep lead engaged' },
                        { stage: 'PREVIEW_SENT', label: 'Preview Sent', desc: 'Waiting for lead feedback on preview' },
                        { stage: 'EDIT_LOOP', label: 'Edit Loop', desc: 'Lead wants changes to their preview' },
                        { stage: 'PAYMENT_SENT', label: 'Payment Sent', desc: 'Payment link sent, handling pricing questions' },
                        { stage: 'STALLED', label: 'Stalled', desc: 'Lead went quiet, follow-up needed' },
                        { stage: 'CLOSED_LOST', label: 'Closed Lost', desc: 'Lead declined, handle re-engagement' },
                      ].map(({ stage, label, desc }) => {
                        const override = scenarioTemplates[stage]?.instructions_override || ''
                        const isEditing = editingScenario === stage
                        return (
                          <div key={stage} className="border rounded-lg overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => setEditingScenario(isEditing ? null : stage)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${override ? 'bg-blue-500' : 'bg-gray-300'}`} />
                                <div>
                                  <span className="font-medium text-gray-900">{label}</span>
                                  <span className="text-xs text-gray-500 ml-2">{desc}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {override && <span className="text-xs text-blue-600 font-medium">Custom</span>}
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isEditing ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                            {isEditing && (
                              <div className="px-4 pb-4 border-t bg-gray-50/50">
                                <textarea
                                  className="w-full mt-3 p-3 border rounded-md text-sm font-mono resize-y min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  value={override}
                                  onChange={(e) => setScenarioTemplates(prev => ({
                                    ...prev,
                                    [stage]: { instructions_override: e.target.value, enabled: true }
                                  }))}
                                  placeholder="Leave blank to use default instructions for this stage..."
                                />
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-gray-400">
                                    Variables: {'{{firstName}}'} {'{{companyName}}'} {'{{siteBuildFee}}'} {'{{monthlyHosting}}'}
                                  </p>
                                  {override && (
                                    <button
                                      onClick={() => setScenarioTemplates(prev => { const u = { ...prev }; delete u[stage]; return u })}
                                      className="text-xs text-red-500 hover:text-red-700"
                                    >
                                      Reset to default
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>

                  {/* Save Pre-AQ */}
                  <div className="flex justify-end">
                    <SaveButton
                      onClick={() => saveSetting('close_engine_scenarios', {
                        scenarios: scenarioTemplates,
                        firstMessages: firstMessageTemplates,
                        qualifyingFlow,
                        paymentFlow,
                      })}
                      saving={savingKey === 'close_engine_scenarios'}
                      saved={savedKey === 'close_engine_scenarios'}
                    />
                  </div>
                </>
              )}

              {/* ── POST-AQ ── */}
              {preAqPostAq === 'post_aq' && (
                <>
                  <Card className="p-6">
                    <SectionHeader title="Onboarding Flow" description="Templates for the post-payment onboarding conversation. The AI uses these as starting points." />
                    <div className="space-y-4">
                      {[
                        { key: 'welcome' as const, label: 'Welcome Message', desc: 'First text after payment confirms.', hint: 'Variables: {companyName}' },
                        { key: 'domainQuestion' as const, label: 'Domain Question', desc: 'Asking the client what domain they want.', hint: 'Variables: {firstName} {companyName}' },
                        { key: 'gbpPrompt' as const, label: 'Google Business Profile Prompt', desc: 'Asking if they have a GBP and want help connecting it.', hint: 'Variables: {firstName} {companyName}' },
                      ].map(({ key, label, desc, hint }) => (
                        <div key={key}>
                          <FieldLabel>{label}</FieldLabel>
                          <p className="text-xs text-gray-500 mb-2">{desc}</p>
                          <textarea
                            className="w-full p-3 border rounded-md text-sm resize-y min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={onboardingFlow[key]}
                            onChange={(e) => setOnboardingFlow(prev => ({ ...prev, [key]: e.target.value }))}
                          />
                          <p className="text-xs text-gray-400 mt-1">{hint}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <SectionHeader title="Onboarding Stage Template" description="Instructions for how the AI handles the full onboarding conversation. Tone, info to collect, how to handle questions." />
                    <textarea
                      className="w-full p-3 border rounded-md text-sm font-mono resize-y min-h-[160px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={onboardingFlow.stageTemplate}
                      onChange={(e) => setOnboardingFlow(prev => ({ ...prev, stageTemplate: e.target.value }))}
                      placeholder="Enter onboarding AI instructions..."
                    />
                  </Card>

                  <div className="flex justify-end">
                    <SaveButton
                      onClick={() => saveSetting('onboarding_flow', onboardingFlow)}
                      saving={savingKey === 'onboarding_flow'}
                      saved={savedKey === 'onboarding_flow'}
                    />
                  </div>
                </>
              )}

              {/* ── AI CONTROLS (always visible at bottom) ── */}
              <Card className="p-6">
                <SectionHeader title="AI Controls" description="Global settings for AI behavior across all conversations." />
                <div className="space-y-6">
                  {/* Toggle rows */}
                  {[
                    { key: 'globalEnabled' as const, label: 'Global AI', desc: 'Master switch for all AI responses.' },
                    { key: 'preClientEnabled' as const, label: 'Pre-Client AI', desc: 'AI handles pre-payment conversations.' },
                    { key: 'postClientEnabled' as const, label: 'Post-Client AI', desc: 'AI handles post-payment conversations.' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <FieldLabel>{label}</FieldLabel>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                      <button
                        onClick={() => setAiControls(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(aiControls as any)[key] ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(aiControls as any)[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}

                  {/* Response Delay */}
                  <div>
                    <FieldLabel>Response Delay Range</FieldLabel>
                    <p className="text-xs text-gray-500 mb-2">How long the AI waits before responding (makes it feel natural).</p>
                    <div className="flex items-center gap-3">
                      <Input type="number" min={0} max={120} className="h-9 w-20 text-sm" value={aiControls.delayMin} onChange={(e) => setAiControls(prev => ({ ...prev, delayMin: parseInt(e.target.value || '0') }))} />
                      <span className="text-sm text-gray-500">to</span>
                      <Input type="number" min={0} max={300} className="h-9 w-20 text-sm" value={aiControls.delayMax} onChange={(e) => setAiControls(prev => ({ ...prev, delayMax: parseInt(e.target.value || '0') }))} />
                      <span className="text-sm text-gray-500">seconds</span>
                    </div>
                  </div>

                  {/* Message Batch Window */}
                  <div>
                    <FieldLabel>Message Batch Window</FieldLabel>
                    <p className="text-xs text-gray-500 mb-2">
                      When a client sends multiple texts quickly, the AI waits this long for more messages before responding. Set to 0 to disable batching.
                    </p>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        step={1}
                        className="h-9 w-24 text-sm"
                        value={smartChat.batchWindowMs / 1000}
                        onChange={(e) => setSmartChat(prev => ({ ...prev, batchWindowMs: Math.round(parseFloat(e.target.value || '0') * 1000) }))}
                      />
                      <span className="text-sm text-gray-500">seconds</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {smartChat.batchWindowMs === 0 ? 'Disabled' : smartChat.batchWindowMs <= 5000 ? 'Fast' : smartChat.batchWindowMs <= 10000 ? 'Balanced' : 'Patient'}
                      </span>
                    </div>
                  </div>

                  {/* Conversation-Ender Detection */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <FieldLabel>Conversation-Ender Detection</FieldLabel>
                        <p className="text-xs text-gray-500">
                          When enabled, the AI won&apos;t respond to messages like &quot;ok&quot;, &quot;thanks&quot;, or emoji-only texts.
                        </p>
                      </div>
                      <button
                        onClick={() => setSmartChat(prev => ({ ...prev, conversationEnderEnabled: !prev.conversationEnderEnabled }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${smartChat.conversationEnderEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${smartChat.conversationEnderEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Humanizing Prompt */}
                  <div>
                    <FieldLabel>Humanizing Prompt</FieldLabel>
                    <p className="text-xs text-gray-500 mb-2">Personality instructions that shape how the AI writes. Injected into every AI response.</p>
                    <textarea
                      className="w-full p-3 border rounded-md text-sm resize-y min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={aiControls.humanizingPrompt}
                      onChange={(e) => setAiControls(prev => ({ ...prev, humanizingPrompt: e.target.value }))}
                      placeholder="e.g., Write casually, use contractions, keep it short and punchy..."
                    />
                  </div>

                  {/* Form Base URL */}
                  <div>
                    <FieldLabel>Form Base URL</FieldLabel>
                    <p className="text-xs text-gray-500 mb-2">
                      Base URL for the onboarding form. Leave blank for default.
                    </p>
                    <Input
                      type="url"
                      className="h-9 w-full max-w-md text-sm"
                      placeholder={process.env.NEXT_PUBLIC_APP_URL || 'https://preview.brightautomations.org'}
                      value={smartChat.formBaseUrl}
                      onChange={(e) => setSmartChat(prev => ({ ...prev, formBaseUrl: e.target.value }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Full form links: <code className="bg-gray-100 px-1 rounded">{smartChat.formBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://preview.brightautomations.org'}/onboard/[leadId]</code>
                    </p>
                  </div>
                </div>
              </Card>

              <div className="flex justify-end">
                <SaveButton
                  onClick={() => { saveSetting('ai_controls', aiControls); saveSetting('smart_chat', smartChat) }}
                  saving={savingKey === 'ai_controls' || savingKey === 'smart_chat'}
                  saved={savedKey === 'ai_controls' || savedKey === 'smart_chat'}
                />
              </div>
            </>
          )}

          {/* ── SUB-TAB 2: AUTOMATED MESSAGES ────────────────── */}
          {messagesAiTab === 'automated_messages' && (
            <>
              {/* Pre-Client Messages */}
              <Card className="p-6">
                <SectionHeader title="Pre-Client Messages" description="Scheduled follow-ups to leads before payment." />
                <div className="space-y-4">
                  {AUTO_MSG_META.filter(m => m.cat === 'pre_client').map(m => {
                    const msg = automatedMessages[m.key]
                    return (
                      <div key={m.key} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium text-sm text-gray-900">{m.label}</span>
                            <span className="text-xs text-gray-500 ml-2">{m.desc}</span>
                          </div>
                          <button
                            onClick={() => setAutomatedMessages(prev => ({ ...prev, [m.key]: { ...prev[m.key], enabled: !prev[m.key].enabled } }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${msg?.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${msg?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                        <textarea
                          className="w-full p-3 border rounded-md text-sm resize-y min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={msg?.text || ''}
                          onChange={(e) => setAutomatedMessages(prev => ({ ...prev, [m.key]: { ...prev[m.key], text: e.target.value } }))}
                        />
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">Variables: {m.vars.map(v => `{${v}}`).join(' ')}</p>
                          {msg?.delayHours !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Delay:</span>
                              <Input type="number" min={1} className="w-16 h-7 text-xs" value={msg.delayHours} onChange={(e) => setAutomatedMessages(prev => ({ ...prev, [m.key]: { ...prev[m.key], delayHours: parseInt(e.target.value || '0') } }))} />
                              <span className="text-xs text-gray-500">hours</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Post-Client Messages */}
              <Card className="p-6">
                <SectionHeader title="Post-Client Messages" description="Scheduled touchpoints after payment and win-back sequences." />
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 mt-2">Touchpoints</h4>
                  {AUTO_MSG_META.filter(m => m.cat === 'post_client').map(m => {
                    const msg = automatedMessages[m.key]
                    return (
                      <div key={m.key} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium text-sm text-gray-900">{m.label}</span>
                            <span className="text-xs text-gray-500 ml-2">{m.desc}</span>
                          </div>
                          <button
                            onClick={() => setAutomatedMessages(prev => ({ ...prev, [m.key]: { ...prev[m.key], enabled: !prev[m.key].enabled } }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${msg?.enabled ? 'bg-emerald-600' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${msg?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                        <textarea
                          className="w-full p-3 border rounded-md text-sm resize-y min-h-[60px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          value={msg?.text || ''}
                          onChange={(e) => setAutomatedMessages(prev => ({ ...prev, [m.key]: { ...prev[m.key], text: e.target.value } }))}
                        />
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">Variables: {m.vars.map(v => `{${v}}`).join(' ')}</p>
                          {msg?.delayHours !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Delay:</span>
                              <Input type="number" min={1} className="w-16 h-7 text-xs" value={msg.delayHours} onChange={(e) => setAutomatedMessages(prev => ({ ...prev, [m.key]: { ...prev[m.key], delayHours: parseInt(e.target.value || '0') } }))} />
                              <span className="text-xs text-gray-500">hours</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  <h4 className="text-sm font-semibold text-gray-700 mt-4">Win-Back Sequence</h4>
                  {AUTO_MSG_META.filter(m => m.cat === 'winback').map(m => {
                    const msg = automatedMessages[m.key]
                    return (
                      <div key={m.key} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium text-sm text-gray-900">{m.label}</span>
                            <span className="text-xs text-gray-500 ml-2">{m.desc}</span>
                          </div>
                          <button
                            onClick={() => setAutomatedMessages(prev => ({ ...prev, [m.key]: { ...prev[m.key], enabled: !prev[m.key].enabled } }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${msg?.enabled ? 'bg-amber-600' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${msg?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                        <textarea
                          className="w-full p-3 border rounded-md text-sm resize-y min-h-[60px] focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          value={msg?.text || ''}
                          onChange={(e) => setAutomatedMessages(prev => ({ ...prev, [m.key]: { ...prev[m.key], text: e.target.value } }))}
                        />
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">Variables: {m.vars.map(v => `{${v}}`).join(' ')}</p>
                          {msg?.delayHours !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Delay:</span>
                              <Input type="number" min={1} className="w-16 h-7 text-xs" value={msg.delayHours} onChange={(e) => setAutomatedMessages(prev => ({ ...prev, [m.key]: { ...prev[m.key], delayHours: parseInt(e.target.value || '0') } }))} />
                              <span className="text-xs text-gray-500">hours</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* System Messages */}
              <Card className="p-6">
                <SectionHeader title="System Messages" description="One-time messages triggered by specific events. Not AI-generated." />
                <div className="space-y-4">
                  {SYS_MSG_META.map(m => {
                    const msg = systemMessages[m.key]
                    return (
                      <div key={m.key} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium text-sm text-gray-900">{m.label}</span>
                            <span className="text-xs text-gray-500 ml-2">{m.desc}</span>
                          </div>
                          <button
                            onClick={() => setSystemMessages(prev => ({ ...prev, [m.key]: { ...prev[m.key], enabled: !prev[m.key].enabled } }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${msg?.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${msg?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                        <textarea
                          className="w-full p-3 border rounded-md text-sm resize-y min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={msg?.text || ''}
                          onChange={(e) => setSystemMessages(prev => ({ ...prev, [m.key]: { ...prev[m.key], text: e.target.value } }))}
                        />
                        <p className="text-xs text-gray-400 mt-1">Variables: {m.vars.map(v => `{${v}}`).join(' ')}</p>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Save Automated Messages */}
              <div className="flex justify-end">
                <SaveButton
                  onClick={() => { saveSetting('system_messages', systemMessages); saveSetting('automated_messages', automatedMessages) }}
                  saving={savingKey === 'system_messages' || savingKey === 'automated_messages'}
                  saved={savedKey === 'system_messages' || savedKey === 'automated_messages'}
                />
              </div>
            </>
          )}
        </div>
      )}

    </div>
  )
}

function DiagnosticsPanel() {
  const [results, setResults] = useState<any>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)

  const runTest = async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/system-test', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResults(data)
      setLastRun(new Date().toLocaleString())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  // Auto-run on mount so diagnostics always reflect current deployment state
  useEffect(() => {
    runTest()
  }, [])

  // Optional auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(runTest, 60_000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const downloadJson = () => {
    if (!results) return
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diagnostics-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const statusIcon = (s: string) =>
    s === 'pass' ? '\u2705' : s === 'fail' ? '\u274C' : s === 'warn' ? '\u26A0\uFE0F' : '\u23ED\uFE0F'

  const statusColor = (s: string) =>
    s === 'pass' ? 'bg-green-50 border-green-200' :
    s === 'fail' ? 'bg-red-50 border-red-200' :
    s === 'warn' ? 'bg-amber-50 border-amber-200' :
    'bg-gray-50 border-gray-200'

  const grouped = results?.results?.reduce((acc: any, r: any) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {}) || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">System Diagnostics</h2>
          <p className="text-sm text-gray-500">
            Tests every connection, service, and feature end-to-end
            {lastRun && <span className="ml-2 text-gray-400">| Last run: {lastRun}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh
          </label>
          {results && (
            <button
              onClick={downloadJson}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download JSON
            </button>
          )}
          <button
            onClick={runTest}
            disabled={running}
            className={`px-6 py-2.5 rounded-xl font-bold text-white transition-all ${
              running
                ? 'bg-gray-400 cursor-wait'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Testing...
              </span>
            ) : 'Re-run Tests'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          Test failed to run: {error}
        </div>
      )}

      {!results && !error && running && (
        <div className="p-6 rounded-xl border-2 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-800 font-medium">Running system diagnostics...</span>
          </div>
        </div>
      )}

      {results && (
        <div className={`p-6 rounded-xl border-2 ${
          results.verdict === 'ALL_CLEAR' ? 'bg-green-50 border-green-300' :
          results.verdict === 'ISSUES_FOUND' ? 'bg-amber-50 border-amber-300' :
          'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                {results.verdict === 'ALL_CLEAR' ? 'All Systems Go' :
                 results.verdict === 'ISSUES_FOUND' ? 'Issues Found' :
                 'Critical Failures'}
              </div>
              <div className="text-sm mt-1 opacity-70">
                {results.summary.passed} passed | {results.summary.failed} failed | {results.summary.warned} warnings | {results.summary.skipped} skipped
              </div>
            </div>
            <div className="text-right text-sm opacity-60">
              <div>Completed in {results.duration}ms</div>
              <div>{new Date(results.timestamp).toLocaleTimeString()}</div>
              {autoRefresh && <div className="text-blue-600 font-medium mt-1">Auto-refreshing every 60s</div>}
            </div>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([category, tests]: [string, any]) => (
        <div key={category}>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">{category}</h3>
          <div className="space-y-1.5">
            {tests.map((test: any, i: number) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${statusColor(test.status)}`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{statusIcon(test.status)}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{test.name}</div>
                    <div className="text-xs text-gray-500">{test.detail}</div>
                  </div>
                </div>
                {test.ms > 0 && <span className="text-xs text-gray-400">{test.ms}ms</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
