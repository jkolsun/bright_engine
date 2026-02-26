'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatPhone, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, TrendingUp, Eye, MousePointer,
  MessageSquare, Clock, CheckCircle, Send, ExternalLink, DollarSign, User,
  Plus, Trash2, UserCheck, Package, RefreshCw
} from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'

interface LeadDetailPageProps {
  params: { id: string }
}

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = params
  const [activeTab, setActiveTab] = useState<'timeline' | 'messages' | 'analytics'>('timeline')
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [smsText, setSmsText] = useState('')
  const [sendingSms, setSendingSms] = useState(false)
  // Alternate contacts
  const [alternateContacts, setAlternateContacts] = useState<any[]>([])
  const [showAddContact, setShowAddContact] = useState(false)
  const [addContactType, setAddContactType] = useState<'PHONE' | 'EMAIL'>('PHONE')
  const [addContactValue, setAddContactValue] = useState('')
  const [addContactLabel, setAddContactLabel] = useState('Other')
  // Reassignment
  const [showReassign, setShowReassign] = useState(false)
  const [reps, setReps] = useState<any[]>([])
  const [reassignRepId, setReassignRepId] = useState('')
  const [reassignReason, setReassignReason] = useState('')
  // Commissions
  const [commissions, setCommissions] = useState<any[]>([])
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchLead = useCallback(async () => {
    try {
      const response = await fetch(`/api/leads/${id}`)
      if (!response.ok) throw new Error('Failed to fetch lead')
      const data = await response.json()
      setLead(data.lead)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lead')
      setLead(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    fetchLead()

    refreshIntervalRef.current = setInterval(() => {
      fetchLead()
    }, 30000)

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [fetchLead])

  // Load alternate contacts, reps, and commissions
  useEffect(() => {
    const loadExtras = async () => {
      try {
        const [contactsRes, repsRes] = await Promise.all([
          fetch(`/api/admin/lead-contacts/${id}`),
          fetch('/api/reps'),
        ])
        if (contactsRes.ok) {
          const data = await contactsRes.json()
          setAlternateContacts(data.contacts || [])
        }
        if (repsRes.ok) {
          const data = await repsRes.json()
          setReps((data.reps || data).filter((r: any) => r.status === 'ACTIVE'))
        }
      } catch { /* supplemental data */ }
    }
    loadExtras()
  }, [id])

  useEffect(() => {
    if (!lead?.client?.id) return
    fetch(`/api/commissions?clientId=${lead.client.id}`)
      .then(r => r.ok ? r.json() : { commissions: [] })
      .then(d => setCommissions(d.commissions || []))
      .catch(err => console.warn('[LeadDetail] Commissions fetch failed:', err))
  }, [lead?.client?.id])

  const handleAddContact = async () => {
    if (!addContactValue.trim()) return
    try {
      const res = await fetch('/api/admin/lead-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id, type: addContactType, value: addContactValue.trim(), label: addContactLabel }),
      })
      if (res.ok) {
        const refreshRes = await fetch(`/api/admin/lead-contacts/${id}`)
        if (refreshRes.ok) setAlternateContacts((await refreshRes.json()).contacts || [])
        setShowAddContact(false)
        setAddContactValue('')
      }
    } catch (err) { console.error('Add contact failed:', err) }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Delete this contact?')) return
    try {
      await fetch(`/api/admin/lead-contacts/${id}?contactId=${contactId}`, { method: 'DELETE' })
      setAlternateContacts(prev => prev.filter(c => c.id !== contactId))
    } catch (err) { console.error('Delete contact failed:', err) }
  }

  const handleReassign = async () => {
    if (!reassignRepId) return
    try {
      const res = await fetch(`/api/admin/leads/${id}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRepId: reassignRepId, reason: reassignReason }),
      })
      if (res.ok) {
        // Refresh lead data
        const leadRes = await fetch(`/api/leads/${id}`)
        if (leadRes.ok) setLead((await leadRes.json()).lead)
        setShowReassign(false)
        setReassignReason('')
      }
    } catch (err) { console.error('Reassign failed:', err) }
  }

  const handleSendSms = async () => {
    if (!smsText.trim() || sendingSms) return
    setSendingSms(true)
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: id,
          to: lead.phone,
          content: smsText,
          channel: 'SMS',
          senderType: 'ADMIN',
          senderName: 'admin'
        })
      })
      setSmsText('')
      // Refresh lead to show new message
      const res = await fetch(`/api/leads/${id}`)
      if (res.ok) { const data = await res.json(); setLead(data.lead) }
    } catch (err) { console.error('SMS send failed:', err) }
    finally { setSendingSms(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8">
          <p className="text-gray-600">Loading lead details...</p>
        </Card>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8">
          <p className="text-red-600">Error: {error || 'Lead not found'}</p>
          <Link href="/admin/leads" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
            Back to Leads
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-6">
          <Link href="/admin/leads" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft size={16} />
            Back to Leads
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">
                  {lead.firstName?.[0] || 'L'}{lead.lastName?.[0] || 'D'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {lead.firstName} {lead.lastName}
                </h1>
                <p className="text-lg text-gray-600 mt-1">{lead.companyName}</p>
                <span className="text-xs text-gray-400 font-mono">ID: {id.slice(0, 12)}...</span>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} />
                    {lead.phone ? formatPhone(lead.phone) : '—'}
                  </div>
                  {lead.secondaryPhone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={14} />
                      {formatPhone(lead.secondaryPhone)} (2nd)
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} />
                    {lead.email || '—'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={14} />
                    {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <StatusBadge status={lead.status} />
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="px-6 pb-4 flex items-center gap-3">
          {lead.previewUrl && (
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => window.open(lead.previewUrl, '_blank')}
              title="View the personalized preview website"
            >
              <Eye size={16} className="mr-2" />
              Preview Website
            </Button>
          )}
          <Button size="sm" onClick={() => window.open(`tel:${lead.phone}`)}>
            <Phone size={16} className="mr-2" />
            Call Now
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            setActiveTab('messages')
            setTimeout(() => {
              const input = document.querySelector('input[placeholder="Type a message..."]') as HTMLInputElement
              if (input) input.focus()
            }, 100)
          }}>
            <MessageSquare size={16} className="mr-2" />
            Send SMS
          </Button>
          <Button size="sm" variant="outline">
            <Mail size={16} className="mr-2" />
            Send Email
          </Button>
          <div className="flex-1" />
          <select
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium"
            value={lead.status}
            onChange={async (e) => {
              const newStatus = e.target.value
              if (newStatus === lead.status) return
              try {
                const res = await fetch(`/api/leads/${id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: newStatus })
                })
                if (res.ok) {
                  const data = await res.json()
                  setLead(data.lead)
                } else {
                  alert('Failed to update status')
                }
              } catch (err) { console.error('Status update failed:', err) }
            }}
          >
            <option value="NEW">New</option>
            <option value="HOT_LEAD">Hot Lead</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="INFO_COLLECTED">Info Collected</option>
            <option value="BUILDING">Building</option>
            <option value="QA">QA</option>
            <option value="CLIENT_REVIEW">Client Review</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="CLOSED_LOST">Closed Lost</option>
            <option value="DO_NOT_CONTACT">Do Not Contact</option>
          </select>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <Card className="p-1">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                    activeTab === 'timeline'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                    activeTab === 'messages'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Messages ({lead.messages?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                    activeTab === 'analytics'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Analytics
                </button>
              </div>
            </Card>

            {/* Tab Content */}
            {activeTab === 'timeline' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
                {lead.events && lead.events.length > 0 ? (
                  <div className="space-y-4">
                    {lead.events.map((event: any, idx: number) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0 mt-2" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{event.eventType}</p>
                            {event.eventType === 'CALL_MADE' && (event.metadata as any)?.disposition && (
                              <DispositionBadge result={(event.metadata as any).disposition} />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {event.description || event.toStage}
                            {event.eventType === 'CALL_MADE' && (event.metadata as any)?.connected && ' (Connected)'}
                            {event.eventType === 'CALL_MADE' && (event.metadata as any)?.duration && ` — ${Math.floor((event.metadata as any).duration / 60)}m${(event.metadata as any).duration % 60}s`}
                          </p>
                          {event.eventType === 'REP_NOTE' && (event.metadata as any)?.text && (
                            <p className="text-sm text-gray-500 mt-1 italic">"{(event.metadata as any).text}"</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(event.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No activity yet</p>
                )}
              </Card>
            )}

            {activeTab === 'messages' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Thread</h3>
                {lead.messages && lead.messages.length > 0 ? (
                  <div className="space-y-4">
                    {lead.messages.map((msg: any) => (
                      <div key={msg.id} className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No messages yet</p>
                )}
                
                {/* Send Message */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={smsText}
                      onChange={(e) => setSmsText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendSms()}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button onClick={handleSendSms} disabled={sendingSms || !smsText.trim()}>
                      <Send size={16} className="mr-2" />
                      {sendingSms ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'analytics' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Analytics</h3>
                <EngagementPanel leadId={id} persistedScore={lead?.engagementScore} persistedLevel={lead?.engagementLevel} />
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Lead Info */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className="font-medium text-gray-900">{lead.status}</p>
                </div>
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="font-medium text-gray-900">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {lead.secondaryPhone && (
                  <div>
                    <p className="text-gray-600">Secondary Phone</p>
                    <p className="font-medium text-gray-900">{formatPhone(lead.secondaryPhone)}</p>
                  </div>
                )}
                {lead.estimatedValue && (
                  <div>
                    <p className="text-gray-600">Estimated Value</p>
                    <p className="font-medium text-gray-900">{formatCurrency(lead.estimatedValue)}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Assignment & Commission */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Assigned Rep</p>
                    <p className="font-medium text-gray-900">{lead.assignedTo?.name || 'Unassigned'}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowReassign(!showReassign)}>
                    <RefreshCw size={14} className="mr-1" /> Reassign
                  </Button>
                </div>
                {showReassign && (
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <select
                      value={reassignRepId}
                      onChange={(e) => setReassignRepId(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Select rep...</option>
                      {reps.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Reason (optional)"
                      value={reassignReason}
                      onChange={(e) => setReassignReason(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleReassign} disabled={!reassignRepId}>Confirm</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowReassign(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Commission Status */}
                <div className="border-t pt-3">
                  <p className="text-gray-600 mb-1">Commission</p>
                  {commissions.length > 0 ? (
                    commissions.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{formatCurrency(c.amount)}</span>
                        <Badge variant="outline" className={
                          c.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                          c.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          c.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }>{c.status}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-xs">No payment received yet</p>
                  )}
                </div>

                {/* Assignment History */}
                {lead.events?.filter((e: any) => e.eventType === 'REASSIGNED').length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-gray-600 mb-2">Assignment History</p>
                    {lead.events.filter((e: any) => e.eventType === 'REASSIGNED').map((e: any) => {
                      const meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : (e.metadata || {})
                      return (
                        <div key={e.id} className="text-xs text-gray-500 mb-1">
                          {new Date(e.createdAt).toLocaleDateString()} — {meta.fromRepName || '?'} → {meta.toRepName || '?'}
                          {meta.reason && <span className="italic"> ({meta.reason})</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* Alternate Contacts */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Alternate Contacts</h3>
                <button onClick={() => setShowAddContact(!showAddContact)} className="text-blue-600 hover:text-blue-800">
                  <Plus size={18} />
                </button>
              </div>
              {showAddContact && (
                <div className="p-3 bg-gray-50 rounded-lg mb-3 space-y-2">
                  <div className="flex gap-2">
                    <select value={addContactType} onChange={(e) => setAddContactType(e.target.value as 'PHONE' | 'EMAIL')} className="border rounded px-2 py-1 text-sm">
                      <option value="PHONE">Phone</option>
                      <option value="EMAIL">Email</option>
                    </select>
                    <select value={addContactLabel} onChange={(e) => setAddContactLabel(e.target.value)} className="border rounded px-2 py-1 text-sm">
                      <option value="Other">Other</option>
                      <option value="Owner Cell">Owner Cell</option>
                      <option value="Office">Office</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder={addContactType === 'PHONE' ? '+1 (555) 123-4567' : 'email@example.com'}
                    value={addContactValue}
                    onChange={(e) => setAddContactValue(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddContact}>Add</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddContact(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {alternateContacts.length > 0 ? (
                <div className="space-y-2">
                  {alternateContacts.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        {c.type === 'PHONE' ? <Phone size={12} className="text-gray-400" /> : <Mail size={12} className="text-gray-400" />}
                        <span>{c.value}</span>
                        <Badge variant="outline" className="text-[10px]">{c.label}</Badge>
                      </div>
                      <button onClick={() => handleDeleteContact(c.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No alternate contacts</p>
              )}
            </Card>

            {/* Call History */}
            {lead.dialerCalls && lead.dialerCalls.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Call History</h3>
                <div className="space-y-3">
                  {lead.dialerCalls.map((call: any) => (
                    <div key={call.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-gray-500" />
                          <span className="font-medium text-gray-800">{call.rep?.name || 'Unknown'}</span>
                          {call.connectedAt ? (
                            <span className="text-xs text-green-600 font-medium">Connected</span>
                          ) : (
                            <span className="text-xs text-gray-400">Not Connected</span>
                          )}
                        </div>
                        {call.dispositionResult && <DispositionBadge result={call.dispositionResult} />}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{new Date(call.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {call.duration && <span>{Math.floor(call.duration / 60)}m{call.duration % 60}s</span>}
                        {call.previewSentDuringCall && <span className="text-blue-500">Preview sent via {call.previewSentChannel || 'sms'}</span>}
                      </div>
                      {call.notes && <p className="text-xs text-gray-500 mt-1.5 pl-5 italic">"{call.notes}"</p>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Upsell Tags */}
            {lead.upsellTags && lead.upsellTags.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upsell Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {lead.upsellTags.map((tag: any) => (
                    <span key={tag.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-md text-xs font-medium">
                      <Package size={12} /> {tag.productName} (${tag.productPrice})
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Scheduled Callbacks */}
            {lead.callbackSchedules && lead.callbackSchedules.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Callbacks</h3>
                <div className="space-y-2">
                  {lead.callbackSchedules.map((cb: any) => (
                    <div key={cb.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <span className="font-medium text-gray-800">
                          {cb.notes?.startsWith('[ALL_DAY]')
                            ? `${new Date(cb.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — All Day`
                            : new Date(cb.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {cb.rep?.name && <span className="text-gray-500 ml-2">by {cb.rep.name}</span>}
                      </div>
                      <Badge variant="outline" className={
                        cb.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        cb.status === 'MISSED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }>{cb.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Upsells Pitched (from events) */}
            {lead.events?.some((e: any) => e.eventType === 'UPSELL_PITCHED' || e.eventType === 'UPSELL_LINK_SENT') && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upsells Pitched</h3>
                <div className="space-y-2">
                  {lead.events.filter((e: any) => e.eventType === 'UPSELL_PITCHED' || e.eventType === 'UPSELL_LINK_SENT').map((e: any) => {
                    const meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : (e.metadata || {})
                    return (
                      <div key={e.id} className="p-3 bg-violet-50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-violet-600" />
                          <span className="font-medium text-violet-800">{meta.productName || 'Unknown Product'}</span>
                          {meta.productPrice && <span className="text-violet-600">${meta.productPrice}</span>}
                        </div>
                        <p className="text-xs text-violet-500 mt-1">
                          {e.eventType === 'UPSELL_LINK_SENT' ? 'Link Sent' : 'Pitched'} on {new Date(e.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: any }> = {
    NEW: { label: 'New', variant: 'outline' },
    HOT_LEAD: { label: 'Hot Lead', variant: 'destructive' },
    QUALIFIED: { label: 'Qualified', variant: 'default' },
    BUILDING: { label: 'Building', variant: 'default' },
    CLIENT_REVIEW: { label: 'Review', variant: 'default' },
    PAID: { label: 'Paid', variant: 'default' },
    CLOSED_LOST: { label: 'Closed Lost', variant: 'outline' },
  }
  const { label, variant } = config[status] || { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}

function DispositionBadge({ result }: { result: string }) {
  const colors: Record<string, string> = {
    WANTS_TO_MOVE_FORWARD: 'bg-green-100 text-green-700',
    CALLBACK: 'bg-teal-100 text-teal-700',
    WANTS_CHANGES: 'bg-blue-100 text-blue-700',
    WILL_LOOK_LATER: 'bg-amber-100 text-amber-700',
    NOT_INTERESTED: 'bg-gray-100 text-gray-600',
    VOICEMAIL: 'bg-gray-100 text-gray-600',
    NO_ANSWER: 'bg-gray-100 text-gray-600',
    DNC: 'bg-red-100 text-red-700',
    WRONG_NUMBER: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${colors[result] || 'bg-gray-100 text-gray-600'}`}>
      {result.replace(/_/g, ' ')}
    </span>
  )
}

function EngagementPanel({ leadId, persistedScore, persistedLevel }: { leadId: string; persistedScore?: number | null; persistedLevel?: string | null }) {
  const [score, setScore] = useState<any>(
    persistedScore != null ? { score: persistedScore, temperature: persistedLevel || 'COLD', trend: 'flat', components: null } : null
  )

  useEffect(() => {
    // Only fetch from API if no persisted score available
    if (persistedScore != null) return
    fetch(`/api/engagement-score?leadId=${leadId}`)
      .then(r => r.json())
      .then(setScore)
      .catch(console.error)
  }, [leadId, persistedScore])

  if (!score) return <p className="text-gray-500">Loading engagement data...</p>

  const tempColors: Record<string, string> = { COLD: 'text-blue-600', WARM: 'text-amber-600', HOT: 'text-red-600' }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-3xl font-bold text-gray-900">{score.score}</p>
          <p className="text-sm text-gray-600">Score</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className={`text-3xl font-bold ${tempColors[score.temperature] || ''}`}>{score.temperature}</p>
          <p className="text-sm text-gray-600">Temperature</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-3xl font-bold text-gray-900">{score.trend === 'up' ? '📈' : score.trend === 'down' ? '📉' : '➡️'}</p>
          <p className="text-sm text-gray-600">Trend</p>
        </div>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <p>Preview engagement: {score.components?.previewEngagement || 0}/25</p>
        <p>Email engagement: {score.components?.emailEngagement || 0}/25</p>
        <p>Outbound recency: {score.components?.outboundRecency || 0}/25</p>
        <p>Conversion signals: {score.components?.conversionSignals || 0}/25</p>
      </div>
    </div>
  )
}
