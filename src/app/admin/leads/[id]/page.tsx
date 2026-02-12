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
import { useState } from 'react'

// Mock detailed lead data
const MOCK_LEAD = {
  id: 1,
  firstName: 'John',
  lastName: 'Smith',
  phone: '5551234567',
  email: 'john@abcroofing.com',
  companyName: 'ABC Roofing',
  address: '123 Main St',
  city: 'Dallas',
  state: 'TX',
  zip: '75201',
  status: 'HOT_LEAD',
  priority: 'HOT',
  source: 'Google Ads',
  assignedTo: { id: 1, name: 'Sarah Johnson', email: 'sarah@bright.com' },
  createdAt: new Date('2026-02-11'),
  estimatedValue: 299,
  website: 'abcroofing.com',
  previewUrl: 'preview.bright.ai/abc-roofing',
  
  // Analytics
  analytics: {
    previewViews: 8,
    previewClicks: 3,
    avgTimeOnPreview: '2:34',
    messagesExchanged: 12,
    lastView: new Date(Date.now() - 5 * 60 * 1000),
    engagement: 95,
    clickedElements: [
      { element: 'Schedule Call Button', clicks: 3 },
      { element: 'Service Gallery', clicks: 2 },
      { element: 'Contact Form', clicks: 1 }
    ]
  },
  
  // Timeline
  timeline: [
    {
      id: 1,
      type: 'preview_view',
      title: 'Viewed Preview',
      description: 'Opened preview for 3rd time (2min 45sec)',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      icon: Eye,
      color: 'blue'
    },
    {
      id: 2,
      type: 'sms_received',
      title: 'SMS Reply',
      description: '"This looks great! Can we add before/after photos?"',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      icon: MessageSquare,
      color: 'green'
    },
    {
      id: 3,
      type: 'hot_lead',
      title: 'Marked as Hot Lead',
      description: 'Auto-triggered: 3 views in 10 minutes',
      timestamp: new Date(Date.now() - 20 * 60 * 1000),
      icon: TrendingUp,
      color: 'red'
    },
    {
      id: 4,
      type: 'preview_click',
      title: 'Clicked "Schedule Call"',
      description: 'Engaged with CTA button on preview',
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      icon: MousePointer,
      color: 'purple'
    },
    {
      id: 5,
      type: 'sms_sent',
      title: 'Sent Follow-up SMS',
      description: 'Hot lead sequence: "Hi John! I saw you viewed..."',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      icon: Send,
      color: 'blue'
    },
    {
      id: 6,
      type: 'preview_view',
      title: 'Viewed Preview',
      description: 'Opened preview (1min 15sec)',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: Eye,
      color: 'blue'
    },
    {
      id: 7,
      type: 'sms_received',
      title: 'SMS Reply',
      description: '"YES, interested!"',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      icon: MessageSquare,
      color: 'green'
    },
    {
      id: 8,
      type: 'sms_sent',
      title: 'Sent Preview Link',
      description: 'Intro sequence: "Hi John! Here\'s a preview of what..."',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      icon: Send,
      color: 'blue'
    },
    {
      id: 9,
      type: 'lead_created',
      title: 'Lead Created',
      description: 'Source: Google Ads • Assigned to Sarah Johnson',
      timestamp: new Date('2026-02-11T10:30:00'),
      icon: User,
      color: 'gray'
    }
  ],
  
  // Messages
  messages: [
    {
      id: 1,
      direction: 'outbound',
      content: 'Hi John! I saw you viewed the preview again. The before/after photos are a great idea - I can add those today. Want me to include your top 3 recent projects?',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      status: 'delivered'
    },
    {
      id: 2,
      direction: 'inbound',
      content: 'This looks great! Can we add before/after photos?',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      status: 'received'
    },
    {
      id: 3,
      direction: 'outbound',
      content: 'Hi John! I saw you clicked the "Schedule Call" button. I\'m available today from 2-4pm or tomorrow morning. What works better for you?',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      status: 'delivered'
    },
    {
      id: 4,
      direction: 'inbound',
      content: 'YES, interested!',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      status: 'received'
    },
    {
      id: 5,
      direction: 'outbound',
      content: 'Hi John! Here\'s a preview of what your new website could look like: https://preview.bright.ai/abc-roofing\n\nI built this based on your roofing business in Dallas. Take a look and let me know what you think!',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      status: 'delivered'
    }
  ]
}

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'messages' | 'analytics'>('timeline')
  const lead = MOCK_LEAD

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-6">
          <Link href="/leads" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft size={16} />
            Back to Leads
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">
                  {lead.firstName[0]}{lead.lastName[0]}
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
              <Badge variant={lead.priority === 'HOT' ? 'destructive' : 'default'}>
                {lead.priority} PRIORITY
              </Badge>
              <StatusBadge status={lead.status} />
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="px-6 pb-4 flex items-center gap-3">
          <Button size="sm">
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
          <Button size="sm" variant="outline">
            <ExternalLink size={16} className="mr-2" />
            View Preview
          </Button>
          <div className="flex-1" />
          <select className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium">
            <option value={lead.status}>Change Status</option>
            <option value="QUALIFIED">Mark as Qualified</option>
            <option value="BUILDING">Move to Building</option>
            <option value="CLIENT_REVIEW">Send for Review</option>
            <option value="PAID">Mark as Paid</option>
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
                  Messages ({lead.messages.length})
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
                <div className="space-y-6">
                  {lead.timeline.map((event, idx) => {
                    const Icon = event.icon
                    const colorClasses = {
                      blue: 'bg-blue-100 text-blue-600',
                      green: 'bg-green-100 text-green-600',
                      red: 'bg-red-100 text-red-600',
                      purple: 'bg-purple-100 text-purple-600',
                      gray: 'bg-gray-100 text-gray-600',
                    }[event.color]

                    return (
                      <div key={event.id} className="flex gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{event.title}</p>
                              <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatTimeAgo(event.timestamp)}
                            </span>
                          </div>
                          {idx < lead.timeline.length - 1 && (
                            <div className="w-px h-6 bg-gray-200 ml-5 mt-2" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {activeTab === 'messages' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Thread</h3>
                <div className="space-y-4">
                  {lead.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${
                        msg.direction === 'outbound'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      } rounded-lg p-4`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-2 ${
                          msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTimeAgo(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Send Message */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button>
                      <Send size={16} className="mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview Analytics</h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye size={18} className="text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">Preview Views</span>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{lead.analytics.previewViews}</p>
                      <p className="text-sm text-gray-600 mt-1">Last viewed {formatTimeAgo(lead.analytics.lastView)}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MousePointer size={18} className="text-green-600" />
                        <span className="text-sm font-medium text-gray-600">Clicks</span>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{lead.analytics.previewClicks}</p>
                      <p className="text-sm text-gray-600 mt-1">Avg time: {lead.analytics.avgTimeOnPreview}</p>
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 mb-3">Clicked Elements</h4>
                  <div className="space-y-2">
                    {lead.analytics.clickedElements.map((el, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">{el.element}</span>
                        <span className="text-sm font-bold text-gray-900">{el.clicks} clicks</span>
                      </div>
                    ))}
                  </div>
                </Card>
                
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Score</h3>
                  <div className="flex items-center justify-center py-8">
                    <div className="relative">
                      <svg className="w-32 h-32">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="8"
                          strokeDasharray={`${lead.analytics.engagement * 3.52} 352`}
                          strokeLinecap="round"
                          transform="rotate(-90 64 64)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-gray-900">{lead.analytics.engagement}%</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-sm text-gray-600">
                    Highly engaged • {lead.analytics.messagesExchanged} messages exchanged
                  </p>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Lead Info */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Source</p>
                  <p className="font-medium text-gray-900">{lead.source}</p>
                </div>
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="font-medium text-gray-900">{lead.createdAt.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Assigned To</p>
                  <p className="font-medium text-gray-900">{lead.assignedTo.name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Estimated Value</p>
                  <p className="font-medium text-gray-900">{formatCurrency(lead.estimatedValue)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Website</p>
                  <p className="font-medium text-blue-600">{lead.website}</p>
                </div>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Engagement</span>
                  <span className="font-semibold text-green-600">{lead.analytics.engagement}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Messages</span>
                  <span className="font-semibold text-gray-900">{lead.analytics.messagesExchanged}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Preview Views</span>
                  <span className="font-semibold text-gray-900">{lead.analytics.previewViews}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Time on Preview</span>
                  <span className="font-semibold text-gray-900">{lead.analytics.avgTimeOnPreview}</span>
                </div>
              </div>
            </Card>

            {/* Next Steps */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recommended Action</h3>
              <p className="text-sm text-gray-700 mb-4">
                Lead is highly engaged! Schedule a call within the next 2 hours for best conversion rate.
              </p>
              <Button className="w-full">
                <Phone size={16} className="mr-2" />
                Schedule Call Now
              </Button>
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
    QUALIFIED: { label: 'Qualified', variant: 'info' },
    BUILDING: { label: 'Building', variant: 'warning' },
    CLIENT_REVIEW: { label: 'Review', variant: 'warning' },
    PAID: { label: 'Paid', variant: 'success' },
  }
  const { label, variant } = config[status] || { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}

function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}
