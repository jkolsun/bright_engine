'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import {
  Mail, Send, ChevronDown, ChevronUp, Eye, Search,
  ArrowLeft, ArrowRight, Globe, Phone as PhoneIcon, User, Building, MapPin
} from 'lucide-react'
import Link from 'next/link'

// ── Email sequences (mirrors src/lib/instantly.ts) ──────────

const SEQUENCE_A = [
  {
    step: 1, delay: 0,
    subject: "{{company_name}}'s website",
    body: `Hey {{first_name}},

I came across {{company_name}} and pulled up your site. Looks like it could use a refresh — not loading great on mobile and the design is dated.

That matters because 70% of people searching for {{industry}} services are on their phone. If your site doesn't look right, they're calling your competitor.

I actually already mocked up what a new site would look like for {{company_name}}: {{preview_url}}

$149 to make it live. No contracts, no hassle.

Andrew
Bright Automations`,
  },
  {
    step: 2, delay: 2,
    subject: "Re: {{company_name}}'s website",
    body: `Hey {{first_name}},

Quick follow-up — did you get a chance to look at the preview I built for you? {{preview_url}}

The businesses we've built sites for are seeing more calls and form fills within the first week.

$149, live by {{delivery_date}}. Takes 10 minutes of your time.

Andrew`,
  },
  {
    step: 3, delay: 2,
    subject: "Re: {{company_name}}'s website",
    body: `{{first_name}},

Just wrapped a site for a {{industry}} company in {{location}}. They got 3 new leads in the first week.

Your preview is still live: {{preview_url}} — but it expires in a few days.

$149 to make it permanent. I handle everything.

Andrew`,
  },
  {
    step: 4, delay: 2,
    subject: "Re: {{company_name}}'s website",
    body: `Hey {{first_name}},

Your preview site expires tomorrow. If a $149 professional website isn't on your radar right now, no worries at all.

But if it ever is, just reply to this email and we'll rebuild it in 48 hours.

Good luck with {{company_name}}.

Andrew`,
  },
]

const SEQUENCE_B = [
  {
    step: 1, delay: 0,
    subject: "Found {{company_name}} on Google but no website",
    body: `Hey {{first_name}},

I searched for {{industry}} in {{location}} and found {{company_name}} on Google Maps — but no website. Most people won't call a business with no site.

I put together a preview of what a site could look like for you: {{preview_url}}

$149 to go live with your own domain. You'd have a real site showing up on Google by this weekend.

Andrew
Bright Automations`,
  },
  {
    step: 2, delay: 2,
    subject: "Re: Found {{company_name}} on Google but no website",
    body: `{{first_name}},

97% of people search online before hiring a local service company. Without a website, you're invisible to almost all of them.

Your preview is still live: {{preview_url}}

$149. We handle everything. No maintenance headaches.

Andrew`,
  },
  {
    step: 3, delay: 2,
    subject: "Re: Found {{company_name}} on Google but no website",
    body: `{{first_name}},

I searched '{{industry}} in {{location}}' and the top 5 results all have sites with reviews and click-to-call. They're getting calls that should go to you.

Your preview expires in 2 days: {{preview_url}}

Reply 'yes' and I'll get started today. $149.

Andrew`,
  },
  {
    step: 4, delay: 2,
    subject: "Re: Found {{company_name}} on Google but no website",
    body: `Hey {{first_name}},

Last note. Your preview expires today. If you ever want a website for {{company_name}}, just reply.

$149, 48 hours, we handle everything.

Good luck.

Andrew`,
  },
]

const INDUSTRY_MAP: Record<string, string> = {
  RESTORATION: 'restoration',
  WATER_DAMAGE: 'water damage restoration',
  ROOFING: 'roofing',
  PLUMBING: 'plumbing',
  HVAC: 'HVAC',
  PAINTING: 'painting',
  LANDSCAPING: 'landscaping',
  ELECTRICAL: 'electrical',
  GENERAL_CONTRACTING: 'general contracting',
  CLEANING: 'cleaning',
  PEST_CONTROL: 'pest control',
  CONSTRUCTION: 'construction',
}

function formatIndustry(industry: string): string {
  return INDUSTRY_MAP[industry] || industry?.toLowerCase().replace(/_/g, ' ') || ''
}

function getDeliveryDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
  }
  return result
}

export default function EmailPreviewPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [sendTo, setSendTo] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [emailPrice, setEmailPrice] = useState(149)

  useEffect(() => {
    fetchLeads()
    fetch('/api/settings/pricing').then(r => r.ok ? r.json() : null).then(d => { if (d?.firstMonthTotal) setEmailPrice(d.firstMonthTotal) }).catch(() => {})
  }, [])

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads?limit=500')
      const data = await res.json()
      setLeads(data.leads || [])
    } catch { /* ignore */ }
  }

  const selectLead = (lead: any) => {
    setSelectedLead(lead)
    setDropdownOpen(false)
    setSearchTerm('')
    setActiveStep(0)
    setSendResult(null)
  }

  // Determine sequence based on whether lead has a website
  const hasWebsite = selectedLead?.website && selectedLead.website.trim().length > 0
  const sequence = hasWebsite ? SEQUENCE_A : SEQUENCE_B
  const campaignLabel = hasWebsite ? 'Campaign A — Bad Website' : 'Campaign B — No Website'

  // Build merge variables
  const mergeVars: Record<string, string> = selectedLead ? {
    first_name: selectedLead.firstName || '',
    last_name: selectedLead.lastName || '',
    company_name: selectedLead.companyName || '',
    email: selectedLead.email || '',
    phone: selectedLead.phone || '',
    website: selectedLead.website || '',
    preview_url: selectedLead.previewUrl || '[no preview]',
    industry: formatIndustry(selectedLead.industry || ''),
    location: [selectedLead.city, selectedLead.state].filter(Boolean).join(', '),
    delivery_date: getDeliveryDate(),
    personalization: (() => {
      try {
        const p = typeof selectedLead.personalization === 'string'
          ? JSON.parse(selectedLead.personalization)
          : selectedLead.personalization
        return p?.firstLine || ''
      } catch { return '' }
    })(),
  } : {}

  const currentEmail = sequence[activeStep]
  const renderedSubject = currentEmail ? fillTemplate(currentEmail.subject, mergeVars) : ''
  const renderedBody = currentEmail ? fillTemplate(currentEmail.body, mergeVars).replace(/\$149/g, `$${emailPrice}`) : ''

  // Filter leads for dropdown
  const filteredLeads = leads.filter(l => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      l.firstName?.toLowerCase().includes(term) ||
      l.lastName?.toLowerCase().includes(term) ||
      l.companyName?.toLowerCase().includes(term) ||
      l.email?.toLowerCase().includes(term)
    )
  }).slice(0, 20)

  const handleSendTest = async () => {
    if (!sendTo.trim() || !selectedLead) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/email-preview/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: sendTo.trim(),
          subject: renderedSubject,
          body: renderedBody,
          leadId: selectedLead.id,
        }),
      })
      if (res.ok) {
        setSendResult('Test email sent!')
      } else {
        const data = await res.json()
        setSendResult(`Failed: ${data.error || 'Unknown error'}`)
      }
    } catch {
      setSendResult('Failed to send test email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
      <div className="w-[300px] border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Send size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900">Test Email</h2>
          </div>

          {/* Send from */}
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-500 block mb-1">Send from:</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
              <Mail size={14} className="text-gray-400" />
              <span className="truncate">andrew.tesauro@abr...</span>
              <ChevronDown size={14} className="ml-auto text-gray-400" />
            </div>
          </div>

          {/* Lead selector */}
          <div className="relative">
            <label className="text-xs font-medium text-gray-500 block mb-1">Load data for lead:</label>
            <div
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {selectedLead ? (
                <span className="text-sm text-gray-900 truncate flex-1">
                  {selectedLead.email || `${selectedLead.firstName} ${selectedLead.lastName}`}
                </span>
              ) : (
                <span className="text-sm text-gray-400 flex-1">Select a lead...</span>
              )}
              {dropdownOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </div>

            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[300px] overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search leads..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-[240px] overflow-y-auto">
                  {filteredLeads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => selectLead(lead)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="text-sm font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                      <div className="text-xs text-gray-500">{lead.companyName} {lead.email ? `· ${lead.email}` : ''}</div>
                    </button>
                  ))}
                  {filteredLeads.length === 0 && (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center">No leads found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedLead && (
            <div className="mt-2 text-xs text-blue-600">
              <Link href={`/admin/leads/${selectedLead.id}`} className="hover:underline">
                {selectedLead.firstName} {selectedLead.lastName} - {selectedLead.companyName}
              </Link>
            </div>
          )}
        </div>

        {/* Variables section */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-gray-900">Variables</span>
          </div>
          <div className="border-t border-dashed border-gray-300 mb-3" />

          {selectedLead ? (
            <div className="space-y-4">
              {Object.entries(mergeVars).map(([key, value]) => (
                <div key={key}>
                  <label className="text-xs text-gray-400 block mb-0.5">{key}</label>
                  <div className="text-sm text-gray-900 break-words">
                    {key === 'preview_url' && value !== '[no preview]' ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{value}</a>
                    ) : (
                      value || <span className="text-gray-300 italic">empty</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-8">
              Select a lead to see variables
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────── */}
      <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-gray-500" />
            <h1 className="text-lg font-semibold text-gray-900">Email Preview</h1>
            {selectedLead && (
              <Badge variant="secondary" className="text-xs">{campaignLabel}</Badge>
            )}
          </div>
          <Link href="/admin/instantly">
            <Button variant="outline" size="sm">
              <ArrowLeft size={14} className="mr-1" /> Back to Instantly
            </Button>
          </Link>
        </div>

        {!selectedLead ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Mail size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a lead to preview</h3>
              <p className="text-gray-500 text-sm">Choose a lead from the sidebar to see the email sequence with their data filled in.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Email step tabs */}
            <div className="flex gap-2 mb-4">
              {sequence.map((email, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeStep === idx
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Email {email.step}
                  <span className="ml-1.5 text-xs opacity-70">
                    {email.delay === 0 ? '(Day 0)' : `(+${email.delay}d)`}
                  </span>
                </button>
              ))}
            </div>

            {/* Email preview card */}
            <Card className="max-w-3xl">
              {/* Send to / Subject */}
              <div className="p-5 border-b border-gray-100 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-16">Send to:</span>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      placeholder="Enter email address"
                      value={sendTo}
                      onChange={(e) => setSendTo(e.target.value)}
                      className="flex-1 h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-16">Subject:</span>
                  <span className="text-sm font-medium text-gray-900">{renderedSubject}</span>
                </div>
              </div>

              {/* Email body */}
              <div className="p-6">
                <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-[system-ui]">
                  {renderedBody}
                </div>
              </div>
            </Card>

            {/* Lead info card */}
            <Card className="max-w-3xl mt-4 p-4">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <User size={14} className="text-gray-400" />
                  {selectedLead.firstName} {selectedLead.lastName}
                </div>
                <div className="flex items-center gap-1.5">
                  <Building size={14} className="text-gray-400" />
                  {selectedLead.companyName || '—'}
                </div>
                {(selectedLead.city || selectedLead.state) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-gray-400" />
                    {[selectedLead.city, selectedLead.state].filter(Boolean).join(', ')}
                  </div>
                )}
                {selectedLead.website && (
                  <div className="flex items-center gap-1.5">
                    <Globe size={14} className="text-gray-400" />
                    <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[200px]">
                      {selectedLead.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {selectedLead.phone && (
                  <div className="flex items-center gap-1.5">
                    <PhoneIcon size={14} className="text-gray-400" />
                    {selectedLead.phone}
                  </div>
                )}
              </div>
            </Card>

            {/* Actions */}
            <div className="max-w-3xl mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep(activeStep - 1)}
                >
                  <ArrowLeft size={14} className="mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeStep === sequence.length - 1}
                  onClick={() => setActiveStep(activeStep + 1)}
                >
                  Next <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                {sendResult && (
                  <span className={`text-sm ${sendResult.startsWith('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                    {sendResult}
                  </span>
                )}
                <Button
                  onClick={handleSendTest}
                  disabled={sending || !sendTo.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send size={14} className="mr-1.5" />
                  {sending ? 'Sending...' : 'Send test email'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}