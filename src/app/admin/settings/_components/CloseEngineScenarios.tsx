'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { ChevronDown, Target, Users } from 'lucide-react'
import { useSettingsContext } from '../_lib/context'
import { SaveButton, SectionHeader, FieldLabel } from '../_lib/components'
import {
  DEFAULT_ONBOARDING_FLOW, DEFAULT_STAGE_PLAYBOOK, DEFAULT_FIRST_MESSAGES,
} from '../_lib/defaults'

// ── Types ──────────────────────────────────────────────────────
export interface CloseEngineScenariosProps {}

// ── Component ──────────────────────────────────────────────────
export default function CloseEngineScenarios(_props: CloseEngineScenariosProps) {
  const { rawSettings, settingsLoaded, saveSetting, savingKey, savedKey } = useSettingsContext()

  const [scenarioTemplates, setScenarioTemplates] = useState<Record<string, { instructions_override: string; enabled: boolean }>>({})
  const [editingScenario, setEditingScenario] = useState<string | null>(null)
  const [firstMessageTemplates, setFirstMessageTemplates] = useState<Record<string, string>>({})
  const [qualifyingFlow, setQualifyingFlow] = useState<Record<string, string>>({})
  const [paymentFlow, setPaymentFlow] = useState<Record<string, string>>({})
  const [preAqPostAq, setPreAqPostAq] = useState<'pre_aq' | 'post_aq'>('pre_aq')
  const [onboardingFlow, setOnboardingFlow] = useState(DEFAULT_ONBOARDING_FLOW)

  // ── Load settings from context ─────────────────────────────
  useEffect(() => {
    if (!settingsLoaded) return
    const s = rawSettings

    if (s.close_engine_scenarios && typeof s.close_engine_scenarios === 'object') {
      setScenarioTemplates(s.close_engine_scenarios.scenarios || {})
      setFirstMessageTemplates(s.close_engine_scenarios.firstMessages || {})
      setQualifyingFlow(s.close_engine_scenarios.qualifyingFlow || {})
      setPaymentFlow(s.close_engine_scenarios.paymentFlow || {})
    }

    if (s.onboarding_flow && typeof s.onboarding_flow === 'object') {
      setOnboardingFlow(prev => ({ ...prev, ...s.onboarding_flow }))
    }
  }, [settingsLoaded, rawSettings])

  return (
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
  )
}
