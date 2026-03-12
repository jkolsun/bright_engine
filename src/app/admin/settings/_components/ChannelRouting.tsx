'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Split } from 'lucide-react'
import { useSettingsContext } from '../_lib/context'
import { SaveButton, SectionHeader, FieldLabel } from '../_lib/components'
import { DEFAULT_CHANNEL_ROUTING } from '../_lib/defaults'

// ── Types ──────────────────────────────────────────────────────
export interface ChannelRoutingProps {}

// ── Component ──────────────────────────────────────────────────
export default function ChannelRouting(_props: ChannelRoutingProps) {
  const { rawSettings, settingsLoaded, saveSetting, savingKey, savedKey } = useSettingsContext()

  const [channelRouting, setChannelRouting] = useState(DEFAULT_CHANNEL_ROUTING)

  // ── Load settings from context ─────────────────────────────
  useEffect(() => {
    if (!settingsLoaded) return
    const s = rawSettings

    if (s.channel_routing && typeof s.channel_routing === 'object') {
      setChannelRouting({ ...DEFAULT_CHANNEL_ROUTING, ...s.channel_routing })
    }
  }, [settingsLoaded, rawSettings])

  return (
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
  )
}
