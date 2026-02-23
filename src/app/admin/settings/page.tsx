'use client'

import { Card } from '@/components/ui/card'
import {
  Building, MessageSquare, Target, Users, Key, Activity, Loader2,
} from 'lucide-react'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SettingsProvider, useSettingsContext } from './_lib/context'

import CompanyTab from './_tabs/CompanyTab'
import CommunicationTab from './_tabs/CommunicationTab'
import TargetsTab from './_tabs/TargetsTab'
import TeamTab from './_tabs/TeamTab'
import ApiKeysTab from './_tabs/ApiKeysTab'
import DiagnosticsTab from './_tabs/DiagnosticsTab'

// ── Settings Table Key Registry (BUG 15.1 audit) ──
// All Settings keys stored in the `settings` table (key → value Json):
//
// COMPANY & CONFIG:
//   company_info        → Company name, phone, address (used in notifications.ts)
//   globalAutoPush      → Auto-push toggle for build pipeline (build-status, close-engine, post-client)
//   products            → Product catalog (system-test)
//   payment_links       → Stripe payment link URLs (settings/payment-links)
//
// AI & MESSAGING:
//   ai_handler          → AI handler config: escalation triggers, autonomy (close-engine, twilio webhook, ai-settings)
//   smart_chat          → SmartChat batching config (smart-chat, message-batcher)
//   automated_messages  → Automated message templates (automated-messages)
//   system_messages     → System message templates (system-messages)
//   email_templates     → Email template overrides (resend)
//   close_engine_scenarios → Close engine conversation scenarios (close-engine-prompts)
//   channel_routing     → Channel routing rules: SMS vs email logic (channel-router)
//
// INSTANTLY / OUTBOUND:
//   instantly_campaigns → Cached Instantly campaign data (instantly, distribution, store-campaigns)
//   instantly_webhook   → Instantly webhook config (instantly)
//
// SEQUENCES & RETENTION:
//   client_sequences    → Client retention sequences (retention-messages, worker, upsell-products)
//   onboarding_flow     → Onboarding flow config (onboarding)
//
// REP MANAGEMENT:
//   targets             → Global sales targets (rep-config)
//   rep_targets         → Per-rep target overrides (rep-config)
//   personalization     → Rep personalization settings (rep-config)
//   rep_onboarding_enabled → Rep onboarding gate toggle (auth/me)
//   call_guide_content  → Call guide markdown content (settings/call-guide)
//   defaultVoicemailUrl → Default voicemail URL (settings/voicemail)
//
// SECURITY:
//   api_keys            → Encrypted API keys (api-keys)
//
// NOTE: No overlap found between Settings table keys and direct model fields.
// Each key is unique to its purpose and only stored in the Settings table.

// ── Types ──
type TabId = 'company' | 'communication' | 'targets' | 'team' | 'api' | 'diagnostics'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'company', label: 'Company', icon: <Building size={16} /> },
  { id: 'communication', label: 'Communication', icon: <MessageSquare size={16} /> },
  { id: 'targets', label: 'Targets', icon: <Target size={16} /> },
  { id: 'team', label: 'Team', icon: <Users size={16} /> },
  { id: 'api', label: 'API Keys', icon: <Key size={16} /> },
  { id: 'diagnostics', label: 'Diagnostics', icon: <Activity size={16} /> },
]

const VALID_TAB_IDS = new Set<string>(TABS.map(t => t.id))

// ── Inner shell (reads SettingsContext + searchParams) ──
function SettingsInner() {
  const searchParams = useSearchParams()
  const { loadingSettings } = useSettingsContext()

  const initialTab = (() => {
    const param = searchParams.get('tab')
    if (param && VALID_TAB_IDS.has(param)) return param as TabId
    return 'company'
  })()

  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  // Sync tab from URL changes (e.g. redirect from reps/commission pages)
  useEffect(() => {
    const param = searchParams.get('tab')
    if (param && VALID_TAB_IDS.has(param)) {
      setActiveTab(param as TabId)
    }
  }, [searchParams])

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
          {TABS.map((tab) => (
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

      {/* Tab Content */}
      {activeTab === 'company' && <CompanyTab />}
      {activeTab === 'communication' && <CommunicationTab />}
      {activeTab === 'targets' && <TargetsTab />}
      {activeTab === 'team' && <TeamTab />}
      {activeTab === 'api' && <ApiKeysTab />}
      {activeTab === 'diagnostics' && <DiagnosticsTab />}
    </div>
  )
}

// ── Page export (wraps with provider) ──
export default function SettingsPage() {
  return (
    <SettingsProvider>
      <Suspense fallback={
        <div className="p-8 flex items-center justify-center text-gray-500 gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading settings...</span>
        </div>
      }>
        <SettingsInner />
      </Suspense>
    </SettingsProvider>
  )
}
