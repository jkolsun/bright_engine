'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import {
  Mail, Phone, MessageSquare, Eye, TrendingUp, Search, Filter
} from 'lucide-react'
import Link from 'next/link'

export default function OutboundTrackerPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterView, setFilterView] = useState('all')

  const [engagementScores, setEngagementScores] = useState<Record<string, any>>({})

  useEffect(() => {
    loadData()
    // Auto-refresh engagement scores every 30 seconds
    const interval = setInterval(() => {
      fetch('/api/engagement-score?all=true')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.scores) {
            const scoresMap: Record<string, any> = {}
            data.scores.forEach((score: any) => {
              scoresMap[score.leadId] = score
            })
            setEngagementScores(scoresMap)
          }
        })
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [leadsRes, eventsRes, scoresRes] = await Promise.all([
        fetch('/api/leads?limit=100'),
        fetch('/api/dashboard/stats'),
        fetch('/api/engagement-score?all=true')
      ])

      if (leadsRes.ok) {
        const data = await leadsRes.json()
        setLeads(data.leads || [])
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json()
        setStats(data)
      }
      if (scoresRes.ok) {
        const data = await scoresRes.json()
        const scoresMap: Record<string, any> = {}
        if (data.scores) {
          data.scores.forEach((score: any) => {
            scoresMap[score.leadId] = score
          })
        }
        setEngagementScores(scoresMap)
      }
    } catch (error) {
      console.error('Failed to load outbound data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.companyName?.toLowerCase().includes(searchTerm.toLowerCase())

    if (filterView === 'all') return matchesSearch
    if (filterView === 'hot') return matchesSearch && lead.status === 'HOT_LEAD'
    if (filterView === 'qualified') return matchesSearch && lead.status === 'QUALIFIED'
    if (filterView === 'building') return matchesSearch && lead.status === 'BUILDING'
    
    return matchesSearch
  })

  // Get real engagement score from API cache
  const getEngagementScore = (lead: any) => {
    const scoreData = engagementScores[lead.id]
    return scoreData?.score || 0
  }

  const getTemperature = (leadId: string) => {
    const scoreData = engagementScores[leadId]
    const temperature = scoreData?.temperature || 'COLD'
    
    const colorMap: Record<string, string> = {
      'COLD': 'bg-blue-100 text-blue-800',
      'WARM': 'bg-amber-100 text-amber-800',
      'HOT': 'bg-red-100 text-red-800',
    }
    
    return { label: temperature, color: colorMap[temperature] }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading outbound tracker...</div>
  }

  const defaultStats = {
    totalLeads: leads.length,
    previewViews: 0,
    previewClicks: 0
  }

  const data = stats || defaultStats

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Multi-Channel Outbound Tracker</h1>
        <p className="text-gray-500 mt-1">
          Track every touchpoint across email, calls, texts, and previews with AI-powered recommendations
        </p>
      </div>

      {/* Channel Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Leads</span>
            <Mail size={20} className="text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{data.totalLeads}</div>
          <div className="text-sm text-gray-500 mt-2">In pipeline</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Preview Views</span>
            <Eye size={20} className="text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{data.previewViews}</div>
          <div className="text-sm text-gray-500 mt-2">Total views</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Preview Clicks</span>
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{data.previewClicks}</div>
          <div className="text-sm text-gray-500 mt-2">CTA clicks</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Hot Leads</span>
            <Phone size={20} className="text-red-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {leads.filter(l => l.status === 'HOT_LEAD').length}
          </div>
          <div className="text-sm text-gray-500 mt-2">Needs attention</div>
        </Card>
      </div>

      {/* Quick Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button 
              variant={filterView === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterView('all')}
            >
              All ({leads.length})
            </Button>
            <Button 
              variant={filterView === 'hot' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterView('hot')}
            >
              Hot ({leads.filter(l => l.status === 'HOT_LEAD').length})
            </Button>
            <Button 
              variant={filterView === 'qualified' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterView('qualified')}
            >
              Qualified ({leads.filter(l => l.status === 'QUALIFIED').length})
            </Button>
            <Button 
              variant={filterView === 'building' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterView('building')}
            >
              Building ({leads.filter(l => l.status === 'BUILDING').length})
            </Button>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              className="pl-10" 
              placeholder="Search by name, company, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Leads Table */}
      <Card>
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Add leads to start tracking outbound activity'}
            </p>
            {!searchTerm && (
              <Link href="/admin/import">
                <Button>
                  <Mail size={18} className="mr-2" />
                  Import Leads
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Lead</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Company</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Location</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Temperature</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Engagement</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead) => {
                  const score = getEngagementScore(lead)
                  const temp = getTemperature(lead.id)
                  
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">
                          {lead.firstName} {lead.lastName}
                        </div>
                        {lead.email && (
                          <div className="text-sm text-gray-500">{lead.email}</div>
                        )}
                      </td>
                      <td className="p-4 text-gray-700">{lead.companyName}</td>
                      <td className="p-4 text-gray-700">
                        {lead.city && lead.state ? `${lead.city}, ${lead.state}` : '-'}
                      </td>
                      <td className="p-4">
                        <Badge variant={
                          lead.status === 'HOT_LEAD' ? 'destructive' :
                          lead.status === 'QUALIFIED' ? 'default' :
                          'secondary'
                        }>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${temp.color}`}>
                          {temp.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-700">Score: {score}</div>
                      </td>
                      <td className="p-4 text-right">
                        <Link href={`/admin/leads/${lead.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Info Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-3">📊 Engagement Scoring</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p className="font-medium">Score Calculation:</p>
          <div className="grid grid-cols-2 gap-4 ml-2">
            <div>
              <div>📧 Email opened: <span className="font-semibold">+2</span></div>
              <div>👀 Preview viewed: <span className="font-semibold">+3</span></div>
              <div>🖱️ CTA clicked: <span className="font-semibold">+5</span></div>
            </div>
            <div>
              <div>☎️ Call connected: <span className="font-semibold">+7</span></div>
              <div>💬 Text responded: <span className="font-semibold">+4</span></div>
            </div>
          </div>
          <p className="font-medium mt-3">Temperature Ranges:</p>
          <div className="ml-2 space-y-1">
            <div><span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">COLD</span> 0-5 points</div>
            <div><span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">WARM</span> 6-15 points</div>
            <div><span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">HOT</span> 16+ points</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
