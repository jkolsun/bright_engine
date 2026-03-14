'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Phone } from 'lucide-react'
import { useSettingsContext } from '../_lib/context'
import { SaveButton, SectionHeader, FieldLabel, FieldInfo } from '../_lib/components'
import { DEFAULT_COMPANY } from '../_lib/defaults'

export default function CompanyTab() {
  const { rawSettings, settingsLoaded, saveSetting, savingKey, savedKey } = useSettingsContext()

  // ── Company Info state ──
  const [companyInfo, setCompanyInfo] = useState(DEFAULT_COMPANY)

  // ── Initialize state from rawSettings ──
  useEffect(() => {
    if (!settingsLoaded) return
    const s = rawSettings
    if (s.company_info && typeof s.company_info === 'object') {
      setCompanyInfo({ ...DEFAULT_COMPANY, ...s.company_info })
    }
  }, [settingsLoaded, rawSettings])

  // ── Render ──
  return (
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
            onFocus={(e) => e.target.select()}
            onChange={(e) => setCompanyInfo({ ...companyInfo, previewExpirationDays: parseInt(e.target.value) || 14 })}
          />
          <p className="text-xs text-gray-400 mt-1">How many days before a preview link expires</p>
        </div>
        <div className="mt-4">
          <FieldLabel>Post-Payment Explainer (shown to reps) <FieldInfo text="This is what reps see in their Product Info tab when a client asks 'what happens after I pay?' Keep it conversational." /></FieldLabel>
          <textarea
            value={companyInfo.postPaymentExplainer || ''}
            onChange={(e) => setCompanyInfo({ ...companyInfo, postPaymentExplainer: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Once payment is confirmed, our team finalizes your site within 48 hours..."
          />
        </div>
        <div className="mt-4">
          <FieldLabel>Competitive Advantages (shown to reps) <FieldInfo text="Talking points for reps when positioning against competitors. One per line works well." /></FieldLabel>
          <textarea
            value={companyInfo.competitiveAdvantages || ''}
            onChange={(e) => setCompanyInfo({ ...companyInfo, competitiveAdvantages: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Sites are mobile-first, load in under 2 seconds.&#10;SEO-optimized out of the box for local search."
          />
        </div>
        <div className="mt-6 flex justify-end">
          <SaveButton
            onClick={() => saveSetting('company_info', companyInfo)}
            saving={savingKey === 'company_info'}
            saved={savedKey === 'company_info'}
          />
        </div>
      </Card>
    </div>
  )
}
