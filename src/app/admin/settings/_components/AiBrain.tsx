'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { useSettingsContext } from '../_lib/context'
import { SaveButton, FieldLabel } from '../_lib/components'
import {
  DEFAULT_PERSONALIZATION, DEFAULT_AI_CONTROLS, DEFAULT_AI_HANDLER,
} from '../_lib/defaults'

// ── Types ──────────────────────────────────────────────────────
export interface AiBrainProps {}

// ── Component ──────────────────────────────────────────────────
export default function AiBrain(_props: AiBrainProps) {
  const { rawSettings, settingsLoaded, saveSetting, savingKey, savedKey } = useSettingsContext()

  const [aiControls, setAiControls] = useState(DEFAULT_AI_CONTROLS)
  const [personalization, setPersonalization] = useState(DEFAULT_PERSONALIZATION)
  const [aiHandler, setAiHandler] = useState(DEFAULT_AI_HANDLER)
  const [smartChat, setSmartChat] = useState({
    batchWindowMs: 8000,
    conversationEnderEnabled: true,
    qualifyingQuestionCount: 2,
    formBaseUrl: '',
  })

  // ── Load settings from context ─────────────────────────────
  useEffect(() => {
    if (!settingsLoaded) return
    const s = rawSettings

    if (s.ai_controls && typeof s.ai_controls === 'object') {
      setAiControls(prev => ({ ...prev, ...s.ai_controls }))
    }
    if (s.smart_chat && typeof s.smart_chat === 'object') {
      setSmartChat(prev => ({ ...prev, ...s.smart_chat }))
    }
    if (s.personalization && typeof s.personalization === 'object') {
      setPersonalization(prev => ({ ...prev, ...s.personalization }))
    }
  }, [settingsLoaded, rawSettings])

  // ── Load AI Handler separately ─────────────────────────────
  useEffect(() => {
    const loadAiHandler = async () => {
      try {
        const res = await fetch('/api/ai-settings')
        if (res.ok) {
          const data = await res.json()
          if (data.settings) {
            setAiHandler({ ...DEFAULT_AI_HANDLER, ...data.settings })
          }
        }
      } catch (e) {
        console.error('Failed to load AI handler settings:', e)
      }
    }
    loadAiHandler()
  }, [])

  // ── Save ───────────────────────────────────────────────────
  const saveAiBrain = async () => {
    await saveSetting('ai_controls', aiControls)
    await saveSetting('smart_chat', smartChat)
    await saveSetting('personalization', personalization)
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

  return (
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
          <Input type="number" min={0} max={120} className="h-9 w-20 text-sm" value={aiControls.delayMin} onFocus={(e) => e.target.select()} onChange={(e) => setAiControls(prev => ({ ...prev, delayMin: parseInt(e.target.value || '0') }))} />
          <span className="text-sm text-gray-500">to</span>
          <Input type="number" min={0} max={300} className="h-9 w-20 text-sm" value={aiControls.delayMax} onFocus={(e) => e.target.select()} onChange={(e) => setAiControls(prev => ({ ...prev, delayMax: parseInt(e.target.value || '0') }))} />
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
            onFocus={(e) => e.target.select()}
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
  )
}
