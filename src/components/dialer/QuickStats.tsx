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
        <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
          <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
          <div className={`text-xs font-medium ${stat.color}`}>{stat.value}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
