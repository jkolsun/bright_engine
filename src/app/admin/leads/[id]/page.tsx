'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatPhone, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { 
  ArrowLeft, Phone, Mail, MapPin, Calendar, TrendingUp, Eye, MousePointer,
  MessageSquare, Clock, CheckCircle, Send, ExternalLink, DollarSign, User
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface LeadDetailPageProps {
  params: { id: string }
}

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'messages' | 'analytics'>('timeline')
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [smsText, setSmsText] = useState('')
  const [sendingSms, setSendingSms] = useState(false)

  useEffect(() => {
    const fetchLead = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/leads/${params.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch lead')
        }
        
        const data = await response.json()
        setLead(data.lead)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lead')
        setLead(null)
      } finally {
        setLoading(false)
      }
    }

    fetchLead()
  }, [params.id])

  const handleSendSms = async () => {
    if (!smsText.trim() || sendingSms) return
    setSendingSms(true)
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: params.id,
          to: lead.phone,
          content: smsText,
          channel: 'SMS',
          senderType: 'ADMIN',
          senderName: 'admin'
        })
      })
      setSmsText('')
      // Refresh lead to show new message
      const res = await fetch(`/api/leads/${params.id}`)
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
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} />
                    {formatPhone(lead.phone)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} />
                    {lead.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={14} />
                    {lead.city}, {lead.state}
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
          <Button size="sm" variant="outline">
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
                const res = await fetch(`/api/leads/${params.id}`, {
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
                          <p className="font-medium text-gray-900">{event.eventType}</p>
                          <p className="text-sm text-gray-600 mt-1">{event.description || event.toStage}</p>
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
                <EngagementPanel leadId={params.id} />
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
                {lead.assignedTo && (
                  <div>
                    <p className="text-gray-600">Assigned To</p>
                    <p className="font-medium text-gray-900">{lead.assignedTo.name}</p>
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

function EngagementPanel({ leadId }: { leadId: string }) {
  const [score, setScore] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/engagement-score?leadId=${leadId}`)
      .then(r => r.json())
      .then(setScore)
      .catch(console.error)
  }, [leadId])

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
