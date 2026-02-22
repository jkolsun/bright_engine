'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Loader2, Plus, Trash2, ChevronDown, Pencil, X, RefreshCw,
  Target, Users, Split, Sparkles,
} from 'lucide-react'
import { useSettingsContext } from '../_lib/context'
import {
  AccordionSection, SaveButton, SectionHeader, FieldLabel,
} from '../_lib/components'
import {
  DEFAULT_SEQUENCES, DEFAULT_CLIENT_SEQUENCES, DEFAULT_CHANNEL_ROUTING,
  DEFAULT_PERSONALIZATION, DEFAULT_AI_CONTROLS, DEFAULT_ONBOARDING_FLOW,
  DEFAULT_SYSTEM_MSGS, DEFAULT_AUTO_MSGS, DEFAULT_AI_HANDLER,
  DEFAULT_STAGE_PLAYBOOK, DEFAULT_FIRST_MESSAGES,
  SYS_MSG_META, AUTO_MSG_META,
} from '../_lib/defaults'

// ── CommunicationTab ─────────────────────────────────────────
export default function CommunicationTab() {
  const { rawSettings, settingsLoaded, saveSetting, savingKey, savedKey } = useSettingsContext()

  // ── Section 1: AI Brain ─────────────────────────────────────
  const [aiControls, setAiControls] = useState(DEFAULT_AI_CONTROLS)
  const [personalization, setPersonalization] = useState(DEFAULT_PERSONALIZATION)
  const [aiHandler, setAiHandler] = useState(DEFAULT_AI_HANDLER)
  const [aiHandlerLoaded, setAiHandlerLoaded] = useState(false)
  const [smartChat, setSmartChat] = useState({
    batchWindowMs: 8000,
    conversationEnderEnabled: true,
    qualifyingQuestionCount: 2,
    formBaseUrl: '',
  })

  // ── Section 2: Stage Playbook ────────────────────────────────
  const [scenarioTemplates, setScenarioTemplates] = useState<Record<string, { instructions_override: string; enabled: boolean }>>({})
  const [editingScenario, setEditingScenario] = useState<string | null>(null)
  const [firstMessageTemplates, setFirstMessageTemplates] = useState<Record<string, string>>({})
  const [qualifyingFlow, setQualifyingFlow] = useState<Record<string, string>>({})
  const [paymentFlow, setPaymentFlow] = useState<Record<string, string>>({})
  const [preAqPostAq, setPreAqPostAq] = useState<'pre_aq' | 'post_aq'>('pre_aq')
  const [onboardingFlow, setOnboardingFlow] = useState(DEFAULT_ONBOARDING_FLOW)

  // ── Section 3: Escalation Rules (from ai_handler) ────────────
  // escalation state lives in aiHandler

  // ── Section 4: Scheduled Messages ────────────────────────────
  const [scheduledSubTab, setScheduledSubTab] = useState<'system' | 'pre_client' | 'post_client'>('system')
  const [systemMessages, setSystemMessages] = useState(DEFAULT_SYSTEM_MSGS)
  const [automatedMessages, setAutomatedMessages] = useState(DEFAULT_AUTO_MSGS)
  const [sequences, setSequences] = useState(DEFAULT_SEQUENCES)
  const [clientSequences, setClientSequences] = useState(DEFAULT_CLIENT_SEQUENCES)
  const [channelRouting, setChannelRouting] = useState(DEFAULT_CHANNEL_ROUTING)
  const [newDay, setNewDay] = useState('')
  const [newClientDay, setNewClientDay] = useState('')

  // Retention preview
  const [retentionClients, setRetentionClients] = useState<any[]>([])
  const [retentionSelectedClient, setRetentionSelectedClient] = useState<any>(null)
  const [retentionPreviews, setRetentionPreviews] = useState<Record<number, string>>({})
  const [retentionGenerating, setRetentionGenerating] = useState<number | null>(null)

  // ── Section 5: Instantly Campaigns ───────────────────────────
  const [campaigns, setCampaigns] = useState<Record<string, string>>({ campaign_a: '', campaign_b: '' })
  const [addCampaignOpen, setAddCampaignOpen] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [newCampaignId, setNewCampaignId] = useState('')
  const [editingCampaignKey, setEditingCampaignKey] = useState<string | null>(null)
  const [editCampaignId, setEditCampaignId] = useState('')
  const [remoteCampaigns, setRemoteCampaigns] = useState<{ id: string; name: string; status: string }[]>([])
  const [showRemotePicker, setShowRemotePicker] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // ── Load settings from context ───────────────────────────────
  useEffect(() => {
    if (!settingsLoaded) return
    const s = rawSettings

    // AI Controls
    if (s.ai_controls && typeof s.ai_controls === 'object') {
      setAiControls(prev => ({ ...prev, ...s.ai_controls }))
    }

    // SmartChat
    if (s.smart_chat && typeof s.smart_chat === 'object') {
      setSmartChat(prev => ({ ...prev, ...s.smart_chat }))
    }

    // Personalization (model + fallback only)
    if (s.personalization && typeof s.personalization === 'object') {
      setPersonalization(prev => ({ ...prev, ...s.personalization }))
    }

    // Close engine scenarios / stage playbook
    if (s.close_engine_scenarios && typeof s.close_engine_scenarios === 'object') {
      setScenarioTemplates(s.close_engine_scenarios.scenarios || {})
      setFirstMessageTemplates(s.close_engine_scenarios.firstMessages || {})
      setQualifyingFlow(s.close_engine_scenarios.qualifyingFlow || {})
      setPaymentFlow(s.close_engine_scenarios.paymentFlow || {})
    }

    // Onboarding flow
    if (s.onboarding_flow && typeof s.onboarding_flow === 'object') {
      setOnboardingFlow(prev => ({ ...prev, ...s.onboarding_flow }))
    }

    // System messages
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

    // Automated messages
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

    // Sequences
    if (s.sequences && typeof s.sequences === 'object') {
      setSequences({
        urgencyDays: s.sequences.urgencyDays || DEFAULT_SEQUENCES.urgencyDays,
        urgencyTemplates: { ...DEFAULT_SEQUENCES.urgencyTemplates, ...(s.sequences.urgencyTemplates || {}) },
        safetyBuffer: s.sequences.safetyBuffer ?? DEFAULT_SEQUENCES.safetyBuffer,
      })
    }

    // Client sequences
    if (s.client_sequences && typeof s.client_sequences === 'object') {
      setClientSequences({
        touchpointDays: s.client_sequences.touchpointDays || DEFAULT_CLIENT_SEQUENCES.touchpointDays,
        touchpointGuidance: { ...DEFAULT_CLIENT_SEQUENCES.touchpointGuidance, ...(s.client_sequences.touchpointGuidance || {}) },
        touchpointTemplates: { ...DEFAULT_CLIENT_SEQUENCES.touchpointTemplates, ...(s.client_sequences.touchpointTemplates || {}) },
        upsellProducts: s.client_sequences.upsellProducts || DEFAULT_CLIENT_SEQUENCES.upsellProducts,
        enabled: s.client_sequences.enabled ?? true,
      })
    }

    // Channel routing
    if (s.channel_routing && typeof s.channel_routing === 'object') {
      setChannelRouting({ ...DEFAULT_CHANNEL_ROUTING, ...s.channel_routing })
    }

    // Instantly campaigns
    if (s.instantly_campaigns && typeof s.instantly_campaigns === 'object') {
      setCampaigns(s.instantly_campaigns)
    }
  }, [settingsLoaded, rawSettings])

  // ── Load AI Handler separately ────────────────────────────────
  useEffect(() => {
    const loadAiHandler = async () => {
      try {
        const res = await fetch('/api/ai-settings')
        if (res.ok) {
          const data = await res.json()
          if (data.settings) {
            setAiHandler({ ...DEFAULT_AI_HANDLER, ...data.settings })
          }
          setAiHandlerLoaded(true)
        }
      } catch (e) {
        console.error('Failed to load AI handler settings:', e)
      }
    }
    loadAiHandler()
  }, [])

  // ── Save AI Brain (Section 1) ─────────────────────────────────
  const saveAiBrain = async () => {
    // Save ai_controls for backwards compat
    await saveSetting('ai_controls', aiControls)
    // Save smart_chat
    await saveSetting('smart_chat', smartChat)
    // Save personalization (model + fallback)
    await saveSetting('personalization', personalization)
    // Save ai_handler
    const handlerPayload = {
      ...aiHandler,
      globalAiAutoRespond: aiControls.globalEnabled,
      preClientAi: aiControls.preClientEnabled,
      postClientAi: aiControls.postClientEnabled,
      responseDelay: { min: aiControls.delayMin, max: aiControls.delayMax },
      humanizingPrompt: aiControls.humanizingPrompt,
    }
    try {
      await fetch('/api/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(handlerPayload),
      })
    } catch (e) {
      console.error('Failed to save AI handler:', e)
    }
  }

  // ── Save Escalation Rules (Section 3) ──────────────────────────
  const saveEscalationRules = async () => {
    try {
      await fetch('/api/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiHandler),
      })
    } catch (e) {
      console.error('Failed to save escalation rules:', e)
    }
  }

  // ── Urgency day helpers ───────────────────────────────────────
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

  // ── Client sequence day helpers ────────────────────────────────
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

  // ── Retention preview ──────────────────────────────────────────
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

  // ── Instantly campaign CRUD ────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: AI BRAIN
         ═══════════════════════════════════════════════════════════ */}
      <AccordionSection
        title="AI Brain"
        description="How the AI thinks, talks, and responds in live conversations"
        defaultOpen
      >
        <div className="space-y-6 pt-4">
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

          {/* AI Model + Fallback */}
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
            <div>
              <FieldLabel>Fallback Behavior</FieldLabel>
              <select
                value={personalization.fallbackBehavior}
                onChange={(e) => setPersonalization({ ...personalization, fallbackBehavior: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="generic_template">Use generic template (recommended)</option>
                <option value="skip">Skip personalization entirely</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">What happens when AI personalization fails for a lead</p>
            </div>
          </div>

          {/* Tone + Emoji + Max Length */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <FieldLabel>Tone</FieldLabel>
              <select
                value={aiHandler.tone}
                onChange={(e) => setAiHandler(prev => ({ ...prev, tone: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="casual">Casual</option>
                <option value="professional">Professional</option>
                <option value="formal">Formal</option>
              </select>
            </div>
            <div>
              <FieldLabel>Emoji Usage</FieldLabel>
              <select
                value={aiHandler.useEmojis}
                onChange={(e) => setAiHandler(prev => ({ ...prev, useEmojis: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="never">Never</option>
                <option value="sparingly">Sparingly</option>
                <option value="moderate">Moderate</option>
              </select>
            </div>
            <div>
              <FieldLabel>Max Response Length</FieldLabel>
              <select
                value={aiHandler.maxResponseLength}
                onChange={(e) => setAiHandler(prev => ({ ...prev, maxResponseLength: parseInt(e.target.value) }))}
                className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1 sentence</option>
                <option value="2">2 sentences</option>
                <option value="3">3 sentences</option>
                <option value="4">4 sentences</option>
                <option value="5">5 sentences</option>
              </select>
            </div>
          </div>

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

          {/* Save */}
          <div className="flex justify-end">
            <SaveButton
              onClick={saveAiBrain}
              saving={savingKey === 'ai_controls' || savingKey === 'smart_chat' || savingKey === 'personalization'}
              saved={savedKey === 'ai_controls' || savedKey === 'smart_chat' || savedKey === 'personalization'}
            />
          </div>
        </div>
      </AccordionSection>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: STAGE PLAYBOOK
         ═══════════════════════════════════════════════════════════ */}
      <AccordionSection
        title="Stage Playbook"
        description="Instructions the AI follows at each stage of the sales pipeline"
      >
        <div className="space-y-6 pt-4">
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
                    { key: 'INSTANTLY_REPLY', label: 'Email Reply', desc: 'Lead replied to an Instantly email', default: DEFAULT_FIRST_MESSAGES.INSTANTLY_REPLY },
                    { key: 'SMS_REPLY', label: 'SMS Reply', desc: 'Lead replied to an SMS', default: DEFAULT_FIRST_MESSAGES.SMS_REPLY },
                    { key: 'REP_CLOSE', label: 'Rep Close', desc: 'Rep handed off a lead', default: DEFAULT_FIRST_MESSAGES.REP_CLOSE },
                    { key: 'PREVIEW_CTA', label: 'Preview CTA', desc: 'Lead clicked the preview CTA', default: DEFAULT_FIRST_MESSAGES.PREVIEW_CTA },
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
                      hint: 'Additional follow-ups at 24h, 48h, 72h are in Scheduled Messages.',
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
                    <strong>How it works:</strong> When a lead approves their preview, the AI sends Step 1. Then a PAYMENT_LINK approval is created for you to review. When you approve it, Step 2 is sent with the Stripe link. If they don&apos;t pay, follow-ups fire at 4h, 24h, 48h, 72h (see Scheduled Messages).
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
                    const defaultInstr = DEFAULT_STAGE_PLAYBOOK[stage]?.instructions_override || ''
                    const displayValue = override || defaultInstr
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
                              value={displayValue}
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
        </div>
      </AccordionSection>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: ESCALATION RULES
         ═══════════════════════════════════════════════════════════ */}
      <AccordionSection
        title="Escalation Rules"
        description="When the AI should stop and hand off to a human"
      >
        <div className="space-y-6 pt-4">
          {/* Escalation Message */}
          <div>
            <FieldLabel>Escalation Message</FieldLabel>
            <p className="text-xs text-gray-500 mb-2">What the AI sends to the client when it escalates to a human.</p>
            <textarea
              className="w-full p-3 border rounded-md text-sm resize-y min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={aiHandler.escalationMessage}
              onChange={(e) => setAiHandler(prev => ({ ...prev, escalationMessage: e.target.value }))}
              placeholder="Let me get the right person on this for you..."
            />
          </div>

          {/* Escalation Triggers */}
          <div>
            <FieldLabel>Escalation Triggers</FieldLabel>
            <p className="text-xs text-gray-500 mb-3">Toggle which situations cause the AI to hand off to a human.</p>
            <div className="space-y-3">
              {aiHandler.escalationTriggers.map((trigger, idx) => (
                <div key={trigger.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <span className="text-sm text-gray-900">{trigger.label}</span>
                    {trigger.threshold !== undefined && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Threshold:</span>
                        <Input
                          type="number"
                          min={1}
                          className="w-16 h-7 text-xs"
                          value={trigger.threshold}
                          onChange={(e) => {
                            const updated = [...aiHandler.escalationTriggers]
                            updated[idx] = { ...updated[idx], threshold: parseInt(e.target.value || '1') }
                            setAiHandler(prev => ({ ...prev, escalationTriggers: updated }))
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const updated = [...aiHandler.escalationTriggers]
                      updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled }
                      setAiHandler(prev => ({ ...prev, escalationTriggers: updated }))
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${trigger.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${trigger.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <SaveButton
              onClick={saveEscalationRules}
              saving={savingKey === 'ai_handler_escalation'}
              saved={savedKey === 'ai_handler_escalation'}
            />
          </div>
        </div>
      </AccordionSection>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4: SCHEDULED MESSAGES
         ═══════════════════════════════════════════════════════════ */}
      <AccordionSection
        title="Scheduled Messages"
        description="Automated messages sent on a timer -- no AI involved"
      >
        <div className="space-y-6 pt-4">
          {/* Sub-tab pills */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {[
              { key: 'system' as const, label: 'System Messages' },
              { key: 'pre_client' as const, label: 'Pre-Client Messages' },
              { key: 'post_client' as const, label: 'Post-Client Messages' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setScheduledSubTab(key)}
                className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  scheduledSubTab === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── System Messages ── */}
          {scheduledSubTab === 'system' && (
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
          )}

          {/* ── Pre-Client Messages ── */}
          {scheduledSubTab === 'pre_client' && (
            <>
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
                        placeholder="Variables: {name}, {company}, {date}, {preview_url}, {days_left}"
                      />
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 mt-3">Variables: {'{name}'}, {'{company}'}, {'{date}'}, {'{preview_url}'}, {'{days_left}'}</p>

                {/* Send Settings */}
                <div className="mt-6 pt-4 border-t">
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
                </div>
                <div className="mt-4 flex justify-end">
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

          {/* ── Post-Client Messages ── */}
          {scheduledSubTab === 'post_client' && (
            <>
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

              {/* Client Retention Touchpoints */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <SectionHeader title="AI-Adaptive Retention Messages" description="Each message is generated by AI using the client's real site stats -- visits, forms, calls, bounce rate, and more" />
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
                    Each client gets a unique, data-driven message -- not a template.
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
                    <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">AI Preview -- Select a client to generate sample messages</span>
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
                      <option key={c.id} value={c.id}>{c.companyName} -- {c.contactName || 'No contact'}</option>
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

              {/* Save Post-Client */}
              <div className="flex justify-end">
                <SaveButton
                  onClick={() => saveSetting('client_sequences', clientSequences)}
                  saving={savingKey === 'client_sequences'}
                  saved={savedKey === 'client_sequences'}
                />
              </div>
            </>
          )}

          {/* Save System + Automated Messages (shared across sub-tabs) */}
          {(scheduledSubTab === 'system' || scheduledSubTab === 'pre_client') && (
            <div className="flex justify-end">
              <SaveButton
                onClick={() => { saveSetting('system_messages', systemMessages); saveSetting('automated_messages', automatedMessages) }}
                saving={savingKey === 'system_messages' || savingKey === 'automated_messages'}
                saved={savedKey === 'system_messages' || savedKey === 'automated_messages'}
              />
            </div>
          )}
        </div>
      </AccordionSection>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5: INSTANTLY CAMPAIGNS
         ═══════════════════════════════════════════════════════════ */}
      <AccordionSection
        title="Instantly Campaigns"
        description="Manage your cold email campaign IDs for lead distribution"
      >
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <SectionHeader title="Campaign Mapping" description="Map Instantly campaign names to their IDs for lead distribution" />
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
        </div>
      </AccordionSection>

    </div>
  )
}
