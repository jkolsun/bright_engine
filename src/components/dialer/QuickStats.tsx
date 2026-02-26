'use client'
import { useState, useEffect } from 'react'
import type { QueueLead } from '@/types/dialer'
import { Globe, Phone, Eye, Mail } from 'lucide-react'

export function QuickStats({ lead }: { lead: QueueLead }) {
  const [previewStatus, setPreviewStatus] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/dialer/preview/status?leadId=${lead.id}`).then(r => r.json()).then(setPreviewStatus).catch(err => console.warn('[QuickStats] Preview status fetch failed:', err))
  }, [lead.id])

  const stats = [
    { icon: Globe, label: 'Website', value: lead.previewUrl ? 'Built' : 'None', color: lead.previewUrl ? 'text-green-600' : 'text-gray-400' },
    { icon: Phone, label: 'Calls', value: `${lead._count?.dialerCalls || 0}`, color: 'text-gray-600' },
    { icon: Eye, label: 'Preview', value: previewStatus?.ctaClicked ? 'CTA Clicked' : previewStatus?.viewed ? 'Viewed' : previewStatus?.sent ? 'Sent' : 'Not Sent', color: previewStatus?.ctaClicked ? 'text-green-600' : previewStatus?.viewed ? 'text-blue-600' : 'text-gray-400' },
    { icon: Mail, label: 'Email', value: 'Active', color: 'text-gray-600' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(stat => (
        <div key={stat.label} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-3.5 text-center">
          <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-2">
            <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
          </div>
          <div className={`text-sm font-semibold ${stat.color}`}>{stat.value}</div>
          <div className="text-[11px] text-gray-400 mt-0.5 font-medium">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
