'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useSettingsContext } from '../_lib/context'
import { SectionHeader, FieldLabel, FieldInfo, SaveButton } from '../_lib/components'
import { DEFAULT_TARGETS } from '../_lib/defaults'

export default function TargetsTab() {
  const { rawSettings, settingsLoaded, saveSetting, savingKey, savedKey } = useSettingsContext()

  const [targets, setTargets] = useState(DEFAULT_TARGETS)

  // Initialize from rawSettings once loaded
  useEffect(() => {
    if (!settingsLoaded) return
    if (rawSettings.targets && typeof rawSettings.targets === 'object') {
      setTargets({ ...DEFAULT_TARGETS, ...rawSettings.targets })
    }
  }, [settingsLoaded, rawSettings.targets])

  return (
    <div className="space-y-6">
      {/* Global Default Targets */}
      <Card className="p-6">
        <SectionHeader title="Default Targets" description="Global benchmarks for all reps" />
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
        <div className="mt-4">
          <FieldLabel>Minimum Auto-Dial Delay (seconds) <FieldInfo text="Floor for how fast reps can auto-dial the next lead. Prevents burning through the list without logging notes." /></FieldLabel>
          <Input
            type="number"
            min={0}
            max={30}
            className="w-32"
            value={targets.minAutoDialDelay}
            onChange={(e) => setTargets({ ...targets, minAutoDialDelay: parseInt(e.target.value) || 0 })}
          />
          <p className="text-xs text-gray-400 mt-1">Reps can set their own delay but can&apos;t go below this value</p>
        </div>
        <div className="mt-6 flex justify-end">
          <SaveButton
            onClick={() => saveSetting('targets', targets)}
            saving={savingKey === 'targets'}
            saved={savedKey === 'targets'}
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
    </div>
  )
}
