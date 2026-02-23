'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import {
  Mail, Phone, Eye, TrendingUp, Search, UserPlus, UserMinus, Users, RefreshCw
} from 'lucide-react'
import Link from 'next/link'

export default function SalesRepTrackerPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterView, setFilterView] = useState('all')
  const [engagementScores, setEngagementScores] = useState<Record<string, any>>({})

  // Assignment state
  const [reps, setReps] = useState<any[]>([])
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData()
    fetchReps()
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
        .catch(err => console.warn('[Outbound] Engagement score fetch failed:', err))
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    setLoadError(null)
    const errors: string[] = []

    // Fetch leads
    try {
      const leadsRes = await fetch('/api/leads?limit=100')
      if (leadsRes.ok) {
        const data = await leadsRes.json()
        setLeads(data.leads || [])
      } else {
        errors.push('leads')
      }
    } catch {
      errors.push('leads')
    }

    // Fetch stats (non-critical)
    try {
      const eventsRes = await fetch('/api/dashboard/stats')
      if (eventsRes.ok) {
        const data = await eventsRes.json()
        setStats(data)
      }
    } catch {
      // Stats are non-critical, ignore
    }

    // Fetch engagement scores (non-critical)
    try {
      const scoresRes = await fetch('/api/engagement-score?all=true')
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
    } catch {
      // Scores are non-critical, ignore
    }

    if (errors.length > 0) {
      setLoadError('Failed to load data. Please try again.')
    }
    setLoading(false)
  }

  const fetchReps = async () => {
    try {
      const res = await fetch('/api/reps')
      const data = await res.json()
      setReps(data.reps || [])
    } catch { /* ignore */ }
  }

  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeads(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)))
    }
  }

  const handleBulkAssign = async (repId: string | null) => {
    if (selectedLeads.size === 0) return
    setAssigning(true)
    try {
      const res = await fetch('/api/admin/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reassign',
          leadIds: Array.from(selectedLeads),
          payload: { repId }
        })
      })
      if (res.ok) {
        const data = await res.json()
        const repName = repId ? reps.find(r => r.id === repId)?.name : null
        setFeedbackMsg({ type: 'success', text: `${data.updated} lead${data.updated !== 1 ? 's' : ''} ${repName ? `assigned to ${repName}` : 'unassigned'}` })
        setTimeout(() => setFeedbackMsg(null), 4000)
        setSelectedLeads(new Set())
        setAssignDialogOpen(false)
        loadData()
        fetchReps()
      } else {
        setFeedbackMsg({ type: 'error', text: 'Failed to assign leads' })
        setTimeout(() => setFeedbackMsg(null), 4000)
      }
    } catch (error) {
      console.error('Error assigning leads:', error)
      setFeedbackMsg({ type: 'error', text: 'Failed to assign leads' })
      setTimeout(() => setFeedbackMsg(null), 4000)
    } finally {
      setAssigning(false)
    }
  }

  const filteredLeads = leads.filter(lead => {
    // Only show leads that are assigned to a rep — unassigned leads don't belong here
    if (!lead.assignedTo) return false

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
    return <div className="p-8 text-center">Loading sales rep tracker...</div>
  }

  if (loadError && leads.length === 0) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-600">{loadError}</p>
        <Button onClick={() => { setLoading(true); loadData(); fetchReps() }}>
          Retry
        </Button>
      </div>
    )
  }

  const defaultStats = {
    totalLeads: leads.length,
    previewViews: 0,
    previewClicks: 0
  }

  const data = stats || defaultStats
  const activeReps = reps.filter(r => r.status === 'ACTIVE')

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Rep Tracker</h1>
          <p className="text-gray-500 mt-1">
            Track every touchpoint across email, calls, texts, and previews with AI-powered recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setLoading(true); loadData(); fetchReps() }}
            title="Refresh data"
          >
            <RefreshCw size={18} />
          </Button>
          <Button
            variant="outline"
            onClick={() => setAssignDialogOpen(true)}
            disabled={selectedLeads.size === 0}
          >
            <UserPlus size={18} className="mr-2" />
            Assign to Rep {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
        </div>
      </div>

      {loadError && leads.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm">Some data may be incomplete. {loadError}</span>
          <Button variant="ghost" size="sm" onClick={() => { setLoading(true); loadData(); fetchReps() }}>
            Retry
          </Button>
        </div>
      )}

      {feedbackMsg && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          feedbackMsg.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {feedbackMsg.text}
        </div>
      )}

      {/* Assign to Rep Dialog — includes both full-time and part-time reps */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Assign {selectedLeads.size} Lead{selectedLeads.size !== 1 ? 's' : ''} to Rep</DialogTitle>
            <DialogDescription>
              Choose a sales rep (full-time or part-time) to assign the selected leads to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto">
            <button
              onClick={() => handleBulkAssign(null)}
              disabled={assigning}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <UserMinus size={18} className="text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Unassign</div>
                <div className="text-sm text-gray-500">Remove rep assignment</div>
              </div>
            </button>

            {activeReps.map((rep) => (
              <button
                key={rep.id}
                onClick={() => handleBulkAssign(rep.id)}
                disabled={assigning}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-700 font-semibold text-sm">
                    {rep.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {rep.name}
                    {rep.portalType === 'PART_TIME' && (
                      <Badge variant="secondary" className="ml-2 text-xs">Part-Time</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{rep.stats?.assignedLeads || 0} leads assigned</div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {rep.stats?.monthActivity?.closes || 0} closes
                </Badge>
              </button>
            ))}

            {activeReps.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No active reps found.</p>
                <p className="text-sm">Create reps in Settings first.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
                  <th className="text-center p-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                      title="Select all"
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Lead</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Company</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Location</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Assigned To</th>
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
                    <tr key={lead.id} className={`hover:bg-gray-50 ${selectedLeads.has(lead.id) ? 'bg-blue-50' : ''}`}>
                      <td className="text-center p-4">
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead.id)}
                          onChange={() => handleSelectLead(lead.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
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
                        {lead.assignedTo ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                            <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-800">
                              {lead.assignedTo.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </span>
                            {lead.assignedTo.name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">&mdash;</span>
                        )}
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
        <h3 className="font-semibold text-gray-900 mb-3">Engagement Scoring</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p className="font-medium">Score Calculation:</p>
          <div className="grid grid-cols-2 gap-4 ml-2">
            <div>
              <div>Email opened: <span className="font-semibold">+2</span></div>
              <div>Preview viewed: <span className="font-semibold">+3</span></div>
              <div>CTA clicked: <span className="font-semibold">+5</span></div>
            </div>
            <div>
              <div>Call connected: <span className="font-semibold">+7</span></div>
              <div>Text responded: <span className="font-semibold">+4</span></div>
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
