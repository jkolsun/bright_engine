'use client'
import { useState } from 'react'
import type { QueueLead } from '@/types/dialer'
import { Building, Phone, Mail, MapPin, Pencil, Check, X } from 'lucide-react'
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
            className="flex-1 px-2 py-0.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
          <button onClick={handleSave} disabled={saving} className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50" title="Save">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={cancelEdit} className="p-1 text-gray-400 hover:text-gray-600" title="Cancel">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }

    if (!value && field !== 'secondaryPhone') return null
    if (!value && field === 'secondaryPhone') {
      return (
        <div className="group flex items-center gap-2 text-gray-400 text-sm cursor-pointer" onClick={() => startEdit(field)}>
          {icon}
          <span className="italic text-xs">Add 2nd phone</span>
          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )
    }

    return (
      <div className="group flex items-center gap-2 text-gray-600 text-sm">
        {icon}
        <span className="truncate">{field.includes('hone') ? formatPhoneDisplay(value!) : value}{suffix ? ` ${suffix}` : ''}</span>
        <button onClick={() => startEdit(field)} className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-500" title="Edit">
          <Pencil className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{lead.companyName}</h2>
          <p className="text-sm text-gray-600">{lead.firstName || lead.contactName || ''} {lead.lastName || ''}</p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
          lead.priority === 'HOT' ? 'bg-red-100 text-red-700' :
          lead.priority === 'WARM' ? 'bg-amber-100 text-amber-700' :
          lead.priority === 'COLD' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {lead.priority || 'NORMAL'}
        </span>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
        {renderField('phone', <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />, lead.phone)}
        {renderField('secondaryPhone', <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />, lead.secondaryPhone, '(2nd)')}
        {renderField('email', <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />, lead.email)}
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
