'use client'
import { useState } from 'react'
import type { QueueLead } from '@/types/dialer'
import { Building, Phone, Mail, MapPin, Pencil, Check, X, CalendarDays } from 'lucide-react'

const PIPELINE_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-600',
  COLD_SENT: 'bg-blue-100 text-blue-700',
  WARM: 'bg-amber-100 text-amber-700',
  CONTACTED: 'bg-teal-100 text-teal-700',
  OPTED_IN: 'bg-purple-100 text-purple-700',
  MEETING_BOOKED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-green-100 text-green-800',
  COLD_NO_RESPONSE: 'bg-gray-100 text-gray-500',
  NOT_INTERESTED: 'bg-red-100 text-red-600',
  OPTED_OUT: 'bg-red-100 text-red-700',
  EXHAUSTED: 'bg-gray-200 text-gray-400',
}
import { useDialer } from './DialerProvider'

const normalizePhone = (input: string): string | null => {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`
  return null
}

const validateEmail = (email: string): boolean => {
  const atIdx = email.indexOf('@')
  return atIdx > 0 && email.indexOf('.', atIdx) > atIdx
}

const formatPhoneDisplay = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')
  const last10 = digits.length > 10 ? digits.slice(-10) : digits
  if (last10.length === 10) return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`
  return phone
}

const getFunnelStageColor = (stage: string): string => {
  switch (stage) {
    case 'QUEUED': return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
    case 'TEXTED': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
    case 'CLICKED': return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
    case 'REP_CALLED': return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400'
    case 'OPTED_IN': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
    case 'DRIP_ACTIVE': return 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400'
    case 'HOT': return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
    case 'CLOSED': return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
    case 'OPTED_OUT': return 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
    case 'ARCHIVED': return 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
    default: return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
  }
}

export function LeadInfo({ lead }: { lead: QueueLead }) {
  const { queue } = useDialer()
  const [editingField, setEditingField] = useState<'phone' | 'secondaryPhone' | 'email' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEdit = (field: 'phone' | 'secondaryPhone' | 'email') => {
    setEditingField(field)
    setEditValue((lead as any)[field] || '')
    setError(null)
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
    setError(null)
  }

  const handleSave = async () => {
    if (!editingField) return

    let normalizedValue: string | null = editValue.trim()

    if (editingField === 'phone') {
      normalizedValue = normalizePhone(editValue)
      if (!normalizedValue) { setError('Enter a valid 10 or 11 digit US number'); return }
    } else if (editingField === 'secondaryPhone') {
      if (normalizedValue === '') {
        normalizedValue = null
      } else {
        normalizedValue = normalizePhone(editValue)
        if (!normalizedValue) { setError('Enter a valid 10 or 11 digit US number'); return }
      }
    } else if (editingField === 'email') {
      if (!validateEmail(normalizedValue)) { setError('Enter a valid email address'); return }
    }

    setSaving(true)
    setError(null)
    const previousValue = (lead as any)[editingField] || ''
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [editingField]: normalizedValue,
          _editedField: editingField,
          _previousValue: previousValue,
          _editedBy: 'rep',
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      queue.updateLeadInQueue(lead.id, { [editingField]: normalizedValue } as any)
      setEditingField(null)
      setEditValue('')
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const renderField = (field: 'phone' | 'secondaryPhone' | 'email', icon: React.ReactNode, value: string | undefined | null, suffix?: string) => {
    if (editingField === field) {
      return (
        <div className="col-span-2 flex items-center gap-2">
          {icon}
          <input
            type={field === 'email' ? 'email' : 'tel'}
            value={editValue}
            onChange={(e) => { setEditValue(e.target.value); setError(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit() }}
            autoFocus
            className="flex-1 px-2 py-0.5 text-sm border border-gray-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-900 dark:text-gray-100"
          />
          <button onClick={handleSave} disabled={saving} className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50" title="Save">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={cancelEdit} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600" title="Cancel">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }

    if (!value && field !== 'secondaryPhone') return null
    if (!value && field === 'secondaryPhone') {
      return (
        <div className="group flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm cursor-pointer" onClick={() => startEdit(field)}>
          {icon}
          <span className="italic text-xs">Add 2nd phone</span>
          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )
    }

    return (
      <div className="group flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
        {icon}
        <span className="truncate">{field.includes('hone') ? formatPhoneDisplay(value!) : value}{suffix ? ` ${suffix}` : ''}</span>
        <button onClick={() => startEdit(field)} className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-500" title="Edit">
          <Pencil className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-sm p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{lead.companyName}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{lead.firstName || lead.contactName || ''} {lead.lastName || ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {lead.pipelineStatus && (
            <span className={`px-3 py-1 text-[11px] font-semibold rounded-full tracking-wide ${PIPELINE_STATUS_COLORS[lead.pipelineStatus] || 'bg-gray-100 text-gray-600'}`}>
              {lead.pipelineStatus.replace(/_/g, ' ')}
            </span>
          )}
          <span className={`px-3 py-1 text-[11px] font-semibold rounded-full tracking-wide ${
            lead.priority === 'HOT' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
            lead.priority === 'WARM' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' :
            lead.priority === 'COLD' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600' :
            'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
          }`}>
            {lead.priority || 'NORMAL'}
          </span>
          {lead.smsCampaignLead && (
            <>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-full">
                SMS Campaign
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getFunnelStageColor(lead.smsCampaignLead.funnelStage)}`}>
                {lead.smsCampaignLead.funnelStage.replace(/_/g, ' ')}
              </span>
            </>
          )}
        </div>
      </div>
      {(lead as any).meetingBookedAt && (
        <div className="flex items-center gap-1.5 mt-2">
          <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs text-emerald-600 font-medium">
            Meeting: {new Date((lead as any).meetingBookedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-4 text-sm">
        {renderField('phone', <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />, lead.phone)}
        {renderField('secondaryPhone', <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />, lead.secondaryPhone, '(2nd)')}
        {renderField('email', <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />, lead.email)}
        {(lead.city || lead.state) && (
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span>{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {lead.industry && (
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400">
            <Building className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="capitalize">{lead.industry.replace(/_/g, ' ').toLowerCase()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
