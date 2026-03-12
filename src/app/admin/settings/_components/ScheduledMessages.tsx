'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Trash2, Sparkles } from 'lucide-react'
import { useSettingsContext } from '../_lib/context'
import { SaveButton, SectionHeader, FieldLabel } from '../_lib/components'
import {
  DEFAULT_SEQUENCES, DEFAULT_CLIENT_SEQUENCES,
  DEFAULT_SYSTEM_MSGS, DEFAULT_AUTO_MSGS,
  SYS_MSG_META, AUTO_MSG_META,
} from '../_lib/defaults'
import ChannelRouting from './ChannelRouting'

// ── Types ──────────────────────────────────────────────────────
export interface ScheduledMessagesProps {}

// ── Component ──────────────────────────────────────────────────
export default function ScheduledMessages(_props: ScheduledMessagesProps) {
  const { rawSettings, settingsLoaded, saveSetting, savingKey, savedKey } = useSettingsContext()

  const [scheduledSubTab, setScheduledSubTab] = useState<'system' | 'pre_client' | 'post_client'>('system')
  const [systemMessages, setSystemMessages] = useState(DEFAULT_SYSTEM_MSGS)
  const [automatedMessages, setAutomatedMessages] = useState(DEFAULT_AUTO_MSGS)
  const [sequences, setSequences] = useState(DEFAULT_SEQUENCES)
  const [clientSequences, setClientSequences] = useState(DEFAULT_CLIENT_SEQUENCES)
  const [newDay, setNewDay] = useState('')
  const [newClientDay, setNewClientDay] = useState('')

  // Retention preview
  const [retentionClients, setRetentionClients] = useState<any[]>([])
  const [retentionSelectedClient, setRetentionSelectedClient] = useState<any>(null)
  const [retentionPreviews, setRetentionPreviews] = useState<Record<number, string>>({})
  const [retentionGenerating, setRetentionGenerating] = useState<number | null>(null)

  // ── Load settings from context ─────────────────────────────
  useEffect(() => {
    if (!settingsLoaded) return
    const s = rawSettings

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
  }, [settingsLoaded, rawSettings])

  // ── Urgency day helpers ────────────────────────────────────
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

  // ── Client sequence day helpers ────────────────────────────
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

  // ── Retention preview ──────────────────────────────────────
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

  return (
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
                  <span className="text-sm text-gray-500">({Math.round(sequences.safetyBuffer * 100)}% of daily limit)</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Conservative margin to avoid hitting rate limits. 0.85 = use 85% of capacity.</p>
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
          <ChannelRouting />
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
              onClick={() => { saveSetting('automated_messages', automatedMessages); saveSetting('client_sequences', clientSequences) }}
              saving={savingKey === 'client_sequences' || savingKey === 'automated_messages'}
              saved={savedKey === 'client_sequences' || savedKey === 'automated_messages'}
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
  )
}
