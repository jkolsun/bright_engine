'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { useSettingsContext } from '../_lib/context'
import { SaveButton, FieldLabel } from '../_lib/components'
import { DEFAULT_AI_HANDLER } from '../_lib/defaults'

// ── Types ──────────────────────────────────────────────────────
export interface EscalationRulesProps {}

// ── Component ──────────────────────────────────────────────────
export default function EscalationRules(_props: EscalationRulesProps) {
  const { savingKey, savedKey } = useSettingsContext()

  const [aiHandler, setAiHandler] = useState(DEFAULT_AI_HANDLER)

  // ── Load AI Handler ────────────────────────────────────────
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

  return (
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
                      onFocus={(e) => e.target.select()}
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
  )
}
