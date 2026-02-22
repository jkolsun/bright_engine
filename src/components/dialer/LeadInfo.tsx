'use client'
import type { QueueLead } from '@/types/dialer'
import { Building, Phone, Mail, MapPin } from 'lucide-react'

export function LeadInfo({ lead }: { lead: QueueLead }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{lead.companyName}</h2>
          <p className="text-sm text-gray-600">{lead.firstName || lead.contactName || ''} {lead.lastName || ''}</p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
          lead.priority === 'HOT' ? 'bg-red-100 text-red-700' :
          lead.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
          lead.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {lead.priority || 'NORMAL'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Phone className="w-3.5 h-3.5 text-gray-400" />
          <span>{lead.phone}</span>
        </div>
        {lead.secondaryPhone && (
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span>{lead.secondaryPhone} (2nd)</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {(lead.city || lead.state) && (
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span>{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {lead.industry && (
          <div className="flex items-center gap-2 text-gray-600">
            <Building className="w-3.5 h-3.5 text-gray-400" />
            <span>{lead.industry}</span>
          </div>
        )}
      </div>
    </div>
  )
}
