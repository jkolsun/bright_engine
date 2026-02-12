'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import {
  Mail, Phone, MessageSquare, TrendingUp, TrendingDown, Eye, MousePointer,
  Search, Filter, Calendar, Clock, CheckCircle, Zap, ArrowUp, ArrowDown
} from 'lucide-react'

// Mock data for outbound tracking
const MOCK_STATS = {
  emailsSent: { total: 12456, today: 342, change: 12 },
  callsMade: { total: 3891, today: 67, change: -3 },
  textsSent: { total: 2847, today: 89, change: 24 },
  previewsClicked: { total: 1923, today: 45, change: 18 },
  emailOpenRate: 34.2,
  callConnectRate: 23.5,
  textResponseRate: 18.7,
  previewClickRate: 15.4
}

const MOCK_LEADS = [
  {
    id: 1,
    name: 'Mike Johnson',
    company: 'Johnson Plumbing',
    location: 'Denver, CO',
    temperature: 'HOT',
    engagementScore: 23,
    campaign: 'A',
    timeline: [
      { day: 1, type: 'email', event: 'Email 1 sent', detail: 'Opened (2:14 PM)', status: 'opened' },
      { day: 2, type: 'preview', event: 'Preview clicked', detail: '1:47 on page, clicked CTA', status: 'engaged' },
      { day: 3, type: 'email', event: 'Email 2 sent', detail: 'Opened (9:03 AM)', status: 'opened' },
      { day: 4, type: 'call', event: 'Rep called', detail: 'No answer, left voicemail', status: 'attempted' },
      { day: 5, type: 'email', event: 'Email 3 sent', detail: 'Not opened', status: 'sent' },
      { day: 6, type: 'text', event: 'Text sent', detail: 'Preview link — Clicked again', status: 'engaged' }
    ],
    recommendation: {
      nextTouch: 'call',
      timing: '9-10 AM',
      context: 'This lead opened 2 emails and clicked the preview twice but hasn\'t replied. They\'re interested but haven\'t committed. Rep should call again with context: "Hey Mike, saw you checked out the preview we built for Johnson Plumbing. What\'d you think?" Call between 9-10 AM (that\'s when they opened emails).',
      confidence: 'high'
    },
    bestChannel: 'text',
    bestTime: '9-10 AM EST'
  },
  {
    id: 2,
    name: 'Sarah Davis',
    company: 'Pro Painting',
    location: 'Houston, TX',
    temperature: 'WARM',
    engagementScore: 12,
    campaign: 'B',
    timeline: [
      { day: 1, type: 'email', event: 'Email 1 sent', detail: 'Opened (4:32 PM)', status: 'opened' },
      { day: 3, type: 'email', event: 'Email 2 sent', detail: 'Opened (10:15 AM)', status: 'opened' },
      { day: 4, type: 'preview', event: 'Preview clicked', detail: '0:23 on page', status: 'bounced' },
      { day: 5, type: 'call', event: 'Rep called', detail: 'Voicemail', status: 'attempted' }
    ],
    recommendation: {
      nextTouch: 'text',
      timing: 'Evening (6-7 PM)',
      context: 'Preview bounced fast (<30 sec). Something wasn\'t right. Rep should text: "Did the preview load okay for you? Happy to walk through it on a quick call." Best time: evening when they opened previous emails.',
      confidence: 'medium'
    },
    bestChannel: 'email',
    bestTime: '4-5 PM EST'
  },
  {
    id: 3,
    name: 'Tom Wilson',
    company: 'Quick HVAC',
    location: 'Austin, TX',
    temperature: 'COOL',
    engagementScore: 4,
    campaign: 'A',
    timeline: [
      { day: 1, type: 'email', event: 'Email 1 sent', detail: 'Opened (11:22 AM)', status: 'opened' },
      { day: 3, type: 'email', event: 'Email 2 sent', detail: 'Not opened', status: 'sent' },
      { day: 5, type: 'email', event: 'Email 3 sent', detail: 'Not opened', status: 'sent' }
    ],
    recommendation: {
      nextTouch: 'call',
      timing: 'Mid-morning',
      context: 'Opened first email but nothing since. Subject line works, CTA doesn\'t. Rep should cold call and mention the preview directly. Likely needs human touch.',
      confidence: 'medium'
    },
    bestChannel: 'email',
    bestTime: '11 AM EST'
  }
]

const PRESET_VIEWS = [
  { name: 'Needs Attention', filter: 'warm-hot', count: 89 },
  { name: 'Ready to Close', filter: 'on-fire', count: 12 },
  { name: 'Stuck Leads', filter: 'cool-3plus', count: 156 },
  { name: 'Dead Leads', filter: 'cold-full-sequence', count: 342 },
  { name: 'Rep Queue', filter: 'call-recommended', count: 67 },
  { name: 'Today\'s Touches', filter: 'today', count: 543 }
]

export default function OutboundPage() {
  const [activeView, setActiveView] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Multi-Channel Outbound Tracker</h1>
        <p className="text-gray-500 mt-1">Track every touchpoint across email, calls, texts, and previews with AI-powered recommendations</p>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Mail className="text-blue-600" />}
          label="Emails Sent"
          total={MOCK_STATS.emailsSent.total}
          today={MOCK_STATS.emailsSent.today}
          rate={`${MOCK_STATS.emailOpenRate}% open rate`}
          change={MOCK_STATS.emailsSent.change}
        />
        <StatCard
          icon={<Phone className="text-green-600" />}
          label="Calls Made"
          total={MOCK_STATS.callsMade.total}
          today={MOCK_STATS.callsMade.today}
          rate={`${MOCK_STATS.callConnectRate}% connect rate`}
          change={MOCK_STATS.callsMade.change}
        />
        <StatCard
          icon={<MessageSquare className="text-purple-600" />}
          label="Texts Sent"
          total={MOCK_STATS.textsSent.total}
          today={MOCK_STATS.textsSent.today}
          rate={`${MOCK_STATS.textResponseRate}% response rate`}
          change={MOCK_STATS.textsSent.change}
        />
        <StatCard
          icon={<Eye className="text-orange-600" />}
          label="Previews Clicked"
          total={MOCK_STATS.previewsClicked.total}
          today={MOCK_STATS.previewsClicked.today}
          rate={`${MOCK_STATS.previewClickRate}% click rate`}
          change={MOCK_STATS.previewsClicked.change}
        />
      </div>

      {/* Preset Views */}
      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700 mr-2">Quick Views:</span>
          {PRESET_VIEWS.map(view => (
            <button
              key={view.name}
              onClick={() => setActiveView(view.filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === view.filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {view.name} ({view.count})
            </button>
          ))}
        </div>
      </Card>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Search by name, company, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter size={16} className="mr-2" />
          More Filters
        </Button>
        <Button variant="outline">
          <Calendar size={16} className="mr-2" />
          Date Range
        </Button>
      </div>

      {/* Lead Timelines */}
      <div className="space-y-6">
        {MOCK_LEADS.map(lead => (
          <Card key={lead.id} className="p-6">
            {/* Lead Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{lead.name}</h3>
                  <TemperatureBadge temperature={lead.temperature} score={lead.engagementScore} />
                  <Badge variant="outline" className="text-xs">Campaign {lead.campaign}</Badge>
                </div>
                <p className="text-gray-600">{lead.company} — {lead.location}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>Best channel: <strong className="text-gray-900">{lead.bestChannel}</strong></span>
                  <span>Best time: <strong className="text-gray-900">{lead.bestTime}</strong></span>
                  <span>Engagement score: <strong className="text-gray-900">{lead.engagementScore}</strong></span>
                </div>
              </div>
              <Button variant="outline" size="sm">View Full Lead</Button>
            </div>

            {/* Timeline */}
            <div className="mb-6 space-y-3">
              {lead.timeline.map((event, idx) => (
                <TimelineEvent key={idx} event={event} />
              ))}
            </div>

            {/* AI Recommendation */}
            <div className={`p-4 rounded-lg border ${
              lead.recommendation.confidence === 'high' 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <Zap size={20} className="text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-2">🤖 RECOMMENDED NEXT TOUCH:</p>
                  <p className="text-sm text-gray-700 mb-3">{lead.recommendation.context}</p>
                  <div className="flex items-center gap-3">
                    <Button size="sm">
                      <CheckCircle size={14} className="mr-2" />
                      Execute
                    </Button>
                    <Button size="sm" variant="outline">Skip</Button>
                    <span className="text-xs text-gray-500 ml-auto">
                      Confidence: {lead.recommendation.confidence}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
        {/* Channel Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Performance Comparison</h3>
          <div className="space-y-4">
            <ChannelPerformanceRow
              channel="Email"
              icon={<Mail size={18} className="text-blue-600" />}
              openRate={34.2}
              engageRate={15.4}
              replyRate={4.2}
            />
            <ChannelPerformanceRow
              channel="Call"
              icon={<Phone size={18} className="text-green-600" />}
              openRate={23.5}
              engageRate={18.9}
              replyRate={11.3}
            />
            <ChannelPerformanceRow
              channel="Text"
              icon={<MessageSquare size={18} className="text-purple-600" />}
              openRate={92.1}
              engageRate={18.7}
              replyRate={12.4}
            />
            <ChannelPerformanceRow
              channel="Preview"
              icon={<Eye size={18} className="text-orange-600" />}
              openRate={15.4}
              engageRate={67.8}
              replyRate={8.9}
            />
          </div>
        </Card>

        {/* Best Channel Combinations */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Best Channel Combinations</h3>
          <div className="space-y-3">
            <CombinationRow
              rank={1}
              sequence="Email opened → Text with preview → Rep call"
              closeRate={14}
              trend="up"
            />
            <CombinationRow
              rank={2}
              sequence="Rep call + voicemail → Text with preview"
              closeRate={11}
              trend="up"
            />
            <CombinationRow
              rank={3}
              sequence="Email opened → Rep call with preview context"
              closeRate={9}
              trend="same"
            />
            <CombinationRow
              rank={4}
              sequence="Email only (4-email sequence)"
              closeRate={3}
              trend="down"
            />
          </div>
        </Card>
      </div>

      {/* Industry Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Industry Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Best Channel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Touches to Close</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Close Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <IndustryRow industry="Plumbing" bestChannel="Text" avgTouches={5.2} closeRate={18.4} />
              <IndustryRow industry="Roofing" bestChannel="Call" avgTouches={6.8} closeRate={14.2} />
              <IndustryRow industry="HVAC" bestChannel="Email + Text" avgTouches={5.9} closeRate={16.7} />
              <IndustryRow industry="Painting" bestChannel="Text" avgTouches={4.3} closeRate={22.1} />
              <IndustryRow industry="Landscaping" bestChannel="Call" avgTouches={7.1} closeRate={12.3} />
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function StatCard({ icon, label, total, today, rate, change }: any) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold ${
          change >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {change >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {Math.abs(change)}%
        </div>
      </div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{total.toLocaleString()}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-sm text-gray-600">+{today} today</p>
        <p className="text-sm font-medium text-gray-700">{rate}</p>
      </div>
    </Card>
  )
}

function TemperatureBadge({ temperature, score }: any) {
  const config: any = {
    'COLD': { color: 'bg-gray-200 text-gray-700', label: 'COLD' },
    'COOL': { color: 'bg-blue-200 text-blue-700', label: 'COOL' },
    'WARM': { color: 'bg-yellow-200 text-yellow-700', label: 'WARM' },
    'HOT': { color: 'bg-orange-200 text-orange-700', label: 'HOT' },
    'ON FIRE': { color: 'bg-red-200 text-red-700', label: '🔥 ON FIRE' }
  }

  const { color, label } = config[temperature] || config['COLD']

  return (
    <div className={`px-3 py-1 rounded-full text-xs font-bold ${color}`}>
      {label} ({score})
    </div>
  )
}

function TimelineEvent({ event }: any) {
  const getIcon = () => {
    switch (event.type) {
      case 'email': return <Mail size={16} className="text-blue-600" />
      case 'call': return <Phone size={16} className="text-green-600" />
      case 'text': return <MessageSquare size={16} className="text-purple-600" />
      case 'preview': return <Eye size={16} className="text-orange-600" />
      default: return <Clock size={16} className="text-gray-600" />
    }
  }

  const getStatusColor = () => {
    switch (event.status) {
      case 'opened': return 'text-green-600'
      case 'engaged': return 'text-blue-600'
      case 'bounced': return 'text-red-600'
      case 'attempted': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="flex items-start gap-4 text-sm">
      <div className="flex items-center gap-2 w-16 flex-shrink-0">
        <span className="font-semibold text-gray-600">Day {event.day}</span>
      </div>
      <div className="p-2 bg-gray-50 rounded-lg flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{event.event}</p>
        <p className={`text-sm ${getStatusColor()}`}>{event.detail}</p>
      </div>
    </div>
  )
}

function ChannelPerformanceRow({ channel, icon, openRate, engageRate, replyRate }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-gray-900">{channel}</span>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-gray-600">Open: </span>
          <span className="font-semibold text-gray-900">{openRate}%</span>
        </div>
        <div>
          <span className="text-gray-600">Engage: </span>
          <span className="font-semibold text-gray-900">{engageRate}%</span>
        </div>
        <div>
          <span className="text-gray-600">Reply: </span>
          <span className="font-semibold text-gray-900">{replyRate}%</span>
        </div>
      </div>
    </div>
  )
}

function CombinationRow({ rank, sequence, closeRate, trend }: any) {
  return (
    <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-start gap-3 flex-1">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
          rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : 'bg-orange-600'
        }`}>
          {rank}
        </div>
        <p className="text-sm text-gray-700">{sequence}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold text-gray-900">{closeRate}%</span>
        {trend === 'up' && <TrendingUp size={14} className="text-green-600" />}
        {trend === 'down' && <TrendingDown size={14} className="text-red-600" />}
      </div>
    </div>
  )
}

function IndustryRow({ industry, bestChannel, avgTouches, closeRate }: any) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{industry}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{bestChannel}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{avgTouches}</td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{closeRate}%</td>
    </tr>
  )
}
