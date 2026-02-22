'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Save, Info, ChevronDown } from 'lucide-react'

// ── Types ──

export type ServiceStatus = {
  key: string
  label: string
  configured: boolean
  connected: boolean | null
  detail: string
}

// ── Helper Components ──

export function StatusIcon({ service }: { service: ServiceStatus }) {
  if (!service.configured) return <XCircle size={16} className="text-gray-400 shrink-0" />
  if (service.connected === true) return <CheckCircle2 size={16} className="text-green-500 shrink-0" />
  return <AlertTriangle size={16} className="text-amber-500 shrink-0" />
}

export function StatusBadge({ service }: { service: ServiceStatus }) {
  if (!service.configured) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not configured</span>
  if (service.connected === true) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">Connected</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Failed</span>
}

export function SaveButton({ onClick, saving, saved }: { onClick: () => void, saving: boolean, saved: boolean }) {
  return (
    <Button onClick={onClick} disabled={saving} className={saved ? 'bg-green-600 hover:bg-green-700' : ''}>
      {saving ? (
        <><Loader2 size={16} className="mr-1 animate-spin" /> Saving...</>
      ) : saved ? (
        <><CheckCircle2 size={16} className="mr-1" /> Saved</>
      ) : (
        <><Save size={16} className="mr-1" /> Save Changes</>
      )}
    </Button>
  )
}

export function SectionHeader({ title, description }: { title: string, description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
    </div>
  )
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-gray-700 block mb-1">{children}</label>
}

export function FieldInfo({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Info size={14} />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </span>
  )
}

export function PriceInput({ value, onChange, className = '' }: { value: number | string; onChange: (val: string) => void; className?: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
      <Input type="number" min={0} className={`h-8 text-sm pl-7 ${className}`} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function AccordionSection({ title, description, defaultOpen = false, children }: {
  title: string
  description: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 border-t">{children}</div>}
    </div>
  )
}

// ── Utility Functions ──

export function formatIndustry(industry: string): string {
  const INDUSTRY_MAP: Record<string, string> = {
    RESTORATION: 'restoration', WATER_DAMAGE: 'water damage restoration',
    ROOFING: 'roofing', PLUMBING: 'plumbing', HVAC: 'HVAC',
    PAINTING: 'painting', LANDSCAPING: 'landscaping', ELECTRICAL: 'electrical',
    GENERAL_CONTRACTING: 'general contracting', CLEANING: 'cleaning',
    PEST_CONTROL: 'pest control', CONSTRUCTION: 'construction',
  }
  return INDUSTRY_MAP[industry] || industry?.toLowerCase().replace(/_/g, ' ') || ''
}

export function getDeliveryDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '')
  }
  return result
}

// Toggle switch used across multiple tabs
export function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (val: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </div>
  )
}
