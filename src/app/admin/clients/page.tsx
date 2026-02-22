'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import React, { useState, useEffect, useCallback } from 'react'
import {
  Search, Download, Plus, ExternalLink, Users,
  Clock, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, DollarSign,
  Edit3, Star,
  ArrowLeft, Phone, Mail,
  CheckCircle, Eye, X, Trash2, MessageSquare,
  RefreshCw
} from 'lucide-react'

// ─── Types ───
type ViewMode = 'overview' | 'list' | 'edit-queue' | 'billing' | 'profile'

// ─── Health Score Logic ───
function getHealthScore(client: any) {
  let score = 0
  if (client.hostingStatus === 'ACTIVE') score += 30
  else if (client.hostingStatus === 'GRACE_PERIOD') score += 15
  if (client.lastInteraction) {
    const days = Math.floor((Date.now() - new Date(client.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 30) score += 20
    else if (days <= 60) score += 10
  }
  if (client._count?.editRequests > 0) score += 15
  if (client.analytics?.totalVisits > 0) score += 10
  if (client.upsells && Array.isArray(client.upsells) && client.upsells.length > 0) score += 10
  if (client._count?.messages > 0) score += 15
  return Math.min(100, score)
}

function getHealthBadge(score: number) {
  if (score >= 80) return { label: 'Healthy', color: 'bg-green-100 text-green-700', icon: '🟢' }
  if (score >= 50) return { label: 'Monitor', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' }
  return { label: 'At Risk', color: 'bg-red-100 text-red-700', icon: '🔴' }
}

const ONBOARDING_STEP_LABELS: Record<number, string> = {
  0: 'Not Started', 1: 'Welcome', 2: 'Domain', 3: 'Content Review',
  4: 'Domain Setup', 5: 'DNS Verify', 6: 'Go-Live', 7: 'Complete',
}

function getClientStage(client: any) {
  if (client.hostingStatus === 'DEACTIVATED') return { label: 'Deactivated', color: 'bg-orange-100 text-orange-700', icon: Clock }
  if (client.hostingStatus === 'CANCELLED') return { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle }
  if (client.hostingStatus === 'FAILED_PAYMENT') return { label: 'Payment Failed', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
  if (client.hostingStatus === 'GRACE_PERIOD') return { label: 'Grace Period', color: 'bg-amber-100 text-amber-700', icon: Clock }
  if (client.onboardingStep > 0 && client.onboardingStep < 7) {
    const stepLabel = ONBOARDING_STEP_LABELS[client.onboardingStep] || 'Onboarding'
    return { label: `Onboarding (${stepLabel}/${7})`, color: 'bg-blue-100 text-blue-700', icon: Clock }
  }
  if (!client.siteUrl && !client.siteLiveDate) return { label: 'Onboarding', color: 'bg-blue-100 text-blue-700', icon: Clock }
  if (client.churnRiskScore >= 70) return { label: 'At Risk', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
  if (client.siteLiveDate) {
    const daysSinceLive = Math.floor((Date.now() - new Date(client.siteLiveDate).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceLive <= 30) return { label: 'New Client', color: 'bg-green-100 text-green-700', icon: CheckCircle2 }
  }
  return { label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
}

function getDaysSince(date: string | null) {
  if (!date) return null
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

export default function ClientsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [profileTab, setProfileTab] = useState('overview')

  // Edit queue state
  const [editRequests, setEditRequests] = useState<any[]>([])
  const [editLoading, setEditLoading] = useState(false)


  // Overview stats
  const [overviewStats, setOverviewStats] = useState<any>({ stats: {}, alerts: {} })

  // Dynamic pricing from DB
  const [pricing, setPricing] = useState<{ siteBuildFee: number; monthlyHosting: number; firstMonthTotal: number }>({ siteBuildFee: 149, monthlyHosting: 39, firstMonthTotal: 188 })

  // Form data
  const [formData, setFormData] = useState({
    companyName: '', contactName: '', phone: '', email: '',
    siteUrl: '', location: '', industry: 'GENERAL_CONTRACTING',
    monthlyRevenue: 39, plan: 'base', siteBuildFee: 149,
    chargeSiteBuildFee: true, tags: [] as string[], notes: '',
  })

  useEffect(() => {
    fetchClients()
    fetchOverviewStats()
    fetchPricing()
  }, [])

  const fetchPricing = async () => {
    try {
      const res = await fetch('/api/settings/pricing')
      if (res.ok) {
        const data = await res.json()
        const p = { siteBuildFee: data.siteBuildFee, monthlyHosting: data.monthlyHosting, firstMonthTotal: data.firstMonthTotal }
        setPricing(p)
        setFormData(prev => ({ ...prev, monthlyRevenue: p.monthlyHosting, siteBuildFee: p.siteBuildFee }))
      }
    } catch { /* use defaults */ }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients?limit=200')
      const data = await res.json()
      setClients(data.clients || [])
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOverviewStats = async () => {
    try {
      const res = await fetch('/api/clients/stats')
      if (res.ok) {
        const data = await res.json()
        setOverviewStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchEditRequests = useCallback(async () => {
    setEditLoading(true)
    try {
      const res = await fetch('/api/edit-requests')
      if (res.ok) {
        const data = await res.json()
        setEditRequests(data.editRequests || [])
      }
    } catch (error) {
      console.error('Failed to fetch edit requests:', error)
    } finally {
      setEditLoading(false)
    }
  }, [])

  useEffect(() => {
    if (viewMode === 'edit-queue') fetchEditRequests()
  }, [viewMode, fetchEditRequests])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, siteBuildFee: formData.chargeSiteBuildFee ? pricing.siteBuildFee : 0 })
      })
      if (res.ok) {
        setDialogOpen(false)
        setFormData({
          companyName: '', contactName: '', phone: '', email: '',
          siteUrl: '', location: '', industry: 'GENERAL_CONTRACTING',
          monthlyRevenue: pricing.monthlyHosting, plan: 'base', siteBuildFee: pricing.siteBuildFee,
          chargeSiteBuildFee: true, tags: [], notes: '',
        })
        fetchClients()
        fetchOverviewStats()
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(`Failed to create client: ${errData.detail || errData.error || res.statusText}`)
      }
    } catch (error) {
      console.error('Error creating client:', error)
      alert('Failed to create client: network error')
    }
  }

  const handleEditRequestAction = async (id: string, action: string) => {
    try {
      await fetch(`/api/edit-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      })
      fetchEditRequests()
    } catch (error) {
      console.error('Error updating edit request:', error)
    }
  }

  const handleBatchApprove = async (ids: string[]) => {
    await Promise.all(ids.map(id => handleEditRequestAction(id, 'approved')))
  }

  const handleUpdateClient = async (clientId: string, data: any) => {
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        fetchClients()
        if (selectedClient?.id === clientId) {
          setSelectedClient({ ...selectedClient, ...data })
        }
      }
    } catch (error) {
      console.error('Error updating client:', error)
    }
  }

  const handleExportCSV = () => {
    const csv = [
      'Company,Contact,Phone,Email,Location,Status,Plan,MRR,Health,Tags,Days Active',
      ...filteredClients.map(c => {
        const contact = c.contactName || (c.lead ? `${c.lead.firstName} ${c.lead.lastName || ''}`.trim() : '')
        const phone = c.phone || c.lead?.phone || ''
        const email = c.email || c.lead?.email || ''
        const daysActive = getDaysSince(c.siteLiveDate)
        return `"${c.companyName}","${contact}","${phone}","${email}","${c.location || ''}","${c.hostingStatus}","${c.plan || 'base'}","${c.monthlyRevenue}","${getHealthScore(c)}","${(c.tags || []).join('; ')}","${daysActive ?? 'N/A'}"`
      }),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clients.csv'
    a.click()
  }

  const toggleSelectClient = (id: string) => {
    const next = new Set(selectedClients)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedClients(next)
  }

  const toggleSelectAll = () => {
    if (selectedClients.size === filteredClients.length) setSelectedClients(new Set())
    else setSelectedClients(new Set(filteredClients.map(c => c.id)))
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm ||
      client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.contactName && client.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.phone && client.phone.includes(searchTerm)) ||
      (client.lead?.firstName && client.lead.firstName.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'ACTIVE' && client.hostingStatus === 'ACTIVE') ||
      (statusFilter === 'DEACTIVATED' && client.hostingStatus === 'DEACTIVATED') ||
      (statusFilter === 'CANCELLED' && client.hostingStatus === 'CANCELLED') ||
      (statusFilter === 'FAILED_PAYMENT' && (client.hostingStatus === 'FAILED_PAYMENT' || client.hostingStatus === 'GRACE_PERIOD')) ||
      (statusFilter === 'AT_RISK' && getHealthScore(client) < 50 && client.hostingStatus === 'ACTIVE') ||
      (statusFilter === 'ONBOARDING' && ((client.onboardingStep > 0 && client.onboardingStep < 7) || (!client.siteUrl && !client.siteLiveDate && client.hostingStatus === 'ACTIVE')))

    const matchesTag = !tagFilter || (client.tags || []).includes(tagFilter)
    return matchesSearch && matchesStatus && matchesTag
  })

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.hostingStatus === 'ACTIVE').length,
    atRisk: clients.filter(c => getHealthScore(c) < 50 && c.hostingStatus === 'ACTIVE').length,
    onboarding: clients.filter(c => (c.onboardingStep > 0 && c.onboardingStep < 7) || (!c.siteUrl && !c.siteLiveDate && c.hostingStatus === 'ACTIVE')).length,
    failedPayment: clients.filter(c => c.hostingStatus === 'FAILED_PAYMENT' || c.hostingStatus === 'GRACE_PERIOD').length,
    totalMRR: clients.filter(c => c.hostingStatus === 'ACTIVE').reduce((sum, c) => sum + (c.monthlyRevenue || 0), 0),
    deactivated: clients.filter(c => c.hostingStatus === 'DEACTIVATED').length,
    cancelled: clients.filter(c => c.hostingStatus === 'CANCELLED').length,
  }

  const allTags = Array.from(new Set(clients.flatMap(c => c.tags || [])))

  // ─── Profile View ───
  if (viewMode === 'profile' && selectedClient) {
    return <ClientProfile
      client={selectedClient}
      onBack={() => { setViewMode('list'); setSelectedClient(null) }}
      onUpdate={(data: any) => handleUpdateClient(selectedClient.id, data)}
      onRefresh={async () => {
        const res = await fetch(`/api/clients/${selectedClient.id}`)
        if (res.ok) {
          const data = await res.json()
          setSelectedClient(data.client)
        }
        fetchClients()
      }}
      onDelete={async () => {
        try {
          const res = await fetch(`/api/clients/${selectedClient.id}?hard=true`, { method: 'DELETE' })
          if (res.ok) {
            setSelectedClient(null)
            setViewMode('list')
            await fetchClients()
          } else {
            alert('Failed to delete client')
          }
        } catch (e) { console.error('Delete failed:', e) }
      }}
      onDeleteMessages={async () => {
        try {
          const res = await fetch(`/api/clients/${selectedClient.id}/messages`, { method: 'DELETE' })
          if (res.ok) {
            const data = await res.json()
            alert(`Deleted ${data.count} messages`)
            // Refresh client data to clear messages from UI
            const refreshRes = await fetch(`/api/clients/${selectedClient.id}`)
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json()
              setSelectedClient(refreshData.client)
            }
          } else {
            alert('Failed to delete messages')
          }
        } catch (e) { console.error('Delete messages failed:', e) }
      }}
      profileTab={profileTab}
      setProfileTab={setProfileTab}
    />
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">Post-Sale Command Center</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download size={18} className="mr-2" />Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={18} className="mr-2" />Add Client</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                  <DialogDescription>Convert a lead to a paying client.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company Name *</label>
                      <Input value={formData.companyName} onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))} placeholder="Johnson Plumbing" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Contact Name</label>
                      <Input value={formData.contactName} onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))} placeholder="Mike Johnson" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone</label>
                      <Input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="(303) 555-1234" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="mike@company.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Site URL</label>
                      <Input value={formData.siteUrl} onChange={(e) => setFormData(prev => ({ ...prev, siteUrl: e.target.value }))} placeholder="johnsonplumbing.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Location</label>
                      <Input value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="Denver, CO" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Industry</label>
                      <select value={formData.industry} onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                        <option value="GENERAL_CONTRACTING">General Contracting</option>
                        <option value="ROOFING">Roofing</option>
                        <option value="PLUMBING">Plumbing</option>
                        <option value="HVAC">HVAC</option>
                        <option value="PAINTING">Painting</option>
                        <option value="LANDSCAPING">Landscaping</option>
                        <option value="ELECTRICAL">Electrical</option>
                        <option value="RESTORATION">Restoration</option>
                        <option value="CLEANING">Cleaning</option>
                        <option value="PEST_CONTROL">Pest Control</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Plan</label>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="font-medium">Website + Hosting</div>
                        <div className="text-sm text-gray-600">${pricing.siteBuildFee} first month &middot; ${pricing.monthlyHosting}/mo after</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="setup" className="rounded" checked={formData.chargeSiteBuildFee} onChange={(e) => setFormData(prev => ({ ...prev, chargeSiteBuildFee: e.target.checked }))} />
                    <label htmlFor="setup" className="text-sm">Charge ${pricing.siteBuildFee} site build fee + ${pricing.monthlyHosting}/mo hosting</label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Any notes about this client..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[60px]" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Create Client</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Admin Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard label="Active" value={stats.active} variant="success" onClick={() => setStatusFilter('ACTIVE')} active={statusFilter === 'ACTIVE'} />
        <StatCard label="MRR" value={formatCurrency(stats.totalMRR)} variant="primary" onClick={() => setStatusFilter('all')} active={statusFilter === 'all'} />
        <StatCard label="Avg LTV" value={formatCurrency(overviewStats.stats?.avgLtv || 0)} variant="default" />
        <StatCard label="Churn" value={`${overviewStats.stats?.churnRate || 0}%`} variant={overviewStats.stats?.churnRate > 5 ? 'danger' : 'default'} />
        <StatCard label="New This Month" value={overviewStats.stats?.newThisMonth || 0} variant="success" />
        <StatCard label="Net" value={`${(overviewStats.stats?.netNew || 0) >= 0 ? '+' : ''}${overviewStats.stats?.netNew || 0}`} variant={(overviewStats.stats?.netNew || 0) >= 0 ? 'success' : 'danger'} />
        {stats.onboarding > 0 && <StatCard label="Onboarding" value={stats.onboarding} variant="primary" onClick={() => setStatusFilter('ONBOARDING')} active={statusFilter === 'ONBOARDING'} />}
      </div>

      {/* Needs Attention Alerts */}
      {(overviewStats.alerts?.pastDuePayments > 0 || overviewStats.alerts?.pendingEdits > 0 || overviewStats.alerts?.upsellFollowups > 0 || overviewStats.alerts?.escalatedMessages > 0) && (
        <Card className="p-4 border-amber-200 bg-amber-50/50">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Needs Attention
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {overviewStats.alerts?.pastDuePayments > 0 && (
              <button className="flex items-center gap-2 text-red-700 text-left" onClick={() => setStatusFilter('FAILED_PAYMENT')}>
                🔴 {overviewStats.alerts.pastDuePayments} past-due payments
              </button>
            )}
            {overviewStats.alerts?.pendingEdits > 0 && (
              <button className="flex items-center gap-2 text-yellow-700 text-left" onClick={() => setViewMode('edit-queue')}>
                🟡 {overviewStats.alerts.pendingEdits} pending edits ({overviewStats.alerts.readyForReview || 0} ready for Jared)
              </button>
            )}
            {overviewStats.alerts?.upsellFollowups > 0 && (
              <button className="flex items-center gap-2 text-green-700 text-left">
                🟢 {overviewStats.alerts.upsellFollowups} upsell replies to follow up
              </button>
            )}
            {overviewStats.alerts?.escalatedMessages > 0 && (
              <div className="flex items-center gap-2 text-orange-700">
                🟠 {overviewStats.alerts.escalatedMessages} escalated conversations
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'list', label: 'All Clients', icon: Users },
          { key: 'edit-queue', label: 'Edit Queue', icon: Edit3 },
          { key: 'billing', label: 'Billing', icon: DollarSign },
        ].map(tab => (
          <Button key={tab.key} variant={viewMode === tab.key ? 'default' : 'outline'} size="sm" onClick={() => setViewMode(tab.key as ViewMode)}>
            <tab.icon size={14} className="mr-1.5" />{tab.label}
          </Button>
        ))}
      </div>

      {/* View Content */}
      {(viewMode === 'list' || viewMode === 'overview' || viewMode === 'billing') && (
        <>
          {/* Search & Filters */}
          <Card className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input className="pl-10" placeholder="Search clients by name, phone, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="ONBOARDING">Onboarding</option>
                <option value="AT_RISK">At Risk</option>
                <option value="FAILED_PAYMENT">Payment Issues</option>
                <option value="DEACTIVATED">Deactivated</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              {allTags.length > 0 && (
                <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="">All Tags</option>
                  {allTags.map((tag: string) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              )}
            </div>
            {selectedClients.size > 0 && (
              <div className="mt-3 pt-3 border-t flex items-center gap-3">
                <span className="text-sm text-gray-600">{selectedClients.size} selected</span>
                <Button variant="outline" size="sm">Send Upsell</Button>
                <Button variant="outline" size="sm">Send Stat Report</Button>
                <Button variant="outline" size="sm">Change Tags</Button>
              </div>
            )}
          </Card>

          {/* Client Table */}
          <Card>
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading clients...</div>
            ) : filteredClients.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={48} className="mx-auto mb-2 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients found</h3>
                <p className="text-gray-600 mb-4">Add your first client to get started</p>
                <Button onClick={() => setDialogOpen(true)}><Plus size={18} className="mr-2" />Add Client</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 w-10">
                        <input type="checkbox" className="rounded" checked={selectedClients.size === filteredClients.length && filteredClients.length > 0} onChange={toggleSelectAll} />
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Client</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Health</th>
                      <th className="text-right p-4 text-sm font-semibold text-gray-700">MRR</th>
                      {viewMode === 'billing' ? (
                        <>
                          <th className="text-right p-4 text-sm font-semibold text-gray-700">LTV</th>
                          <th className="text-right p-4 text-sm font-semibold text-gray-700">Stripe</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left p-4 text-sm font-semibold text-gray-700">Tags</th>
                          <th className="text-right p-4 text-sm font-semibold text-gray-700">Activity</th>
                        </>
                      )}
                      <th className="text-right p-4 text-sm font-semibold text-gray-700 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClients.map((client) => {
                      const stage = getClientStage(client)
                      const StageIcon = stage.icon
                      const healthScore = getHealthScore(client)
                      const health = getHealthBadge(healthScore)
                      const contact = client.contactName || (client.lead ? `${client.lead.firstName} ${client.lead.lastName || ''}`.trim() : '')
                      const location = client.location || (client.lead ? `${client.lead.city || ''}, ${client.lead.state || ''}`.replace(/^, |, $/g, '') : '')
                      const daysActive = getDaysSince(client.siteLiveDate)
                      const daysSinceInteraction = getDaysSince(client.lastInteraction)
                      const isExpanded = expandedClient === client.id
                      const pendingEdits = client.editRequests?.length || 0

                      return (
                        <React.Fragment key={client.id}>
                        <tr className="group hover:bg-gray-50">
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="rounded" checked={selectedClients.has(client.id)} onChange={() => toggleSelectClient(client.id)} />
                          </td>
                          <td className="p-4 cursor-pointer" onClick={() => { setSelectedClient(client); setViewMode('profile'); setProfileTab('overview') }}>
                            <div className="font-medium text-gray-900">{client.companyName}</div>
                            <div className="text-sm text-gray-500">
                              {contact && <span>{contact}</span>}
                              {location && <span className="ml-2 text-gray-400">- {location}</span>}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stage.color}`}>
                              <StageIcon size={12} />{stage.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${health.color}`}>
                              {health.icon} {healthScore}
                            </span>
                          </td>
                          <td className="p-4 text-right font-semibold text-gray-900">
                            {formatCurrency(client.monthlyRevenue)}<span className="text-xs text-gray-400">/mo</span>
                          </td>
                          {viewMode === 'billing' ? (
                            <>
                              <td className="p-4 text-right text-sm text-gray-600">
                                {daysActive !== null ? formatCurrency(Math.round((client.monthlyRevenue || 0) * (daysActive / 30))) : '—'}
                              </td>
                              <td className="p-4 text-right">
                                <span className={`text-xs font-medium ${client.stripeCustomerId ? 'text-green-600' : 'text-gray-400'}`}>
                                  {client.stripeCustomerId ? 'Connected' : 'Not linked'}
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-1">
                                  {(client.tags || []).slice(0, 3).map((tag: string) => (
                                    <span key={tag} className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{tag}</span>
                                  ))}
                                  {(client.tags || []).length > 3 && <span className="text-xs text-gray-400">+{client.tags.length - 3}</span>}
                                </div>
                              </td>
                              <td className="p-4 text-right text-sm text-gray-600">
                                <div>{daysSinceInteraction !== null ? `${daysSinceInteraction}d ago` : 'Never'}</div>
                                {pendingEdits > 0 && <div className="text-xs text-amber-600">{pendingEdits} pending edits</div>}
                              </td>
                            </>
                          )}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); router.push(`/admin/messages?clientId=${client.id}`) }}
                                title="Open Chat"
                                className="p-1.5 rounded-md text-teal-600 hover:bg-teal-50 transition-colors"
                              >
                                <MessageSquare size={15} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setExpandedClient(isExpanded ? null : client.id) }} className="p-1 hover:bg-gray-100 rounded">
                                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={viewMode === 'billing' ? 8 : 8} className="p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">Contact</p>
                                  <p className="font-medium">{contact || '—'}</p>
                                  {(client.phone || client.lead?.phone) && (
                                    <p className="text-gray-600 flex items-center gap-1 mt-1"><Phone size={12} /> {client.phone || client.lead?.phone}</p>
                                  )}
                                  {(client.email || client.lead?.email) && (
                                    <p className="text-gray-600 flex items-center gap-1 mt-1"><Mail size={12} /> {client.email || client.lead?.email}</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">Site</p>
                                  {client.siteUrl ? (
                                    <a href={`https://${client.siteUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                      {client.siteUrl} <ExternalLink size={12} />
                                    </a>
                                  ) : <p className="text-gray-400">Not set</p>}
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">Billing</p>
                                  <p className="font-medium">{formatCurrency(client.monthlyRevenue)}/mo</p>
                                  <p className="text-gray-600 mt-1">{daysActive !== null ? `${daysActive} days active` : 'Not live yet'}</p>
                                  <p className="text-gray-600 mt-1">Automation: {client.autonomyLevel || 'FULL_AUTO'}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <p className="text-gray-500 text-xs mb-1">Actions</p>
                                  <Button size="sm" variant="outline" onClick={() => { setSelectedClient(client); setViewMode('profile'); setProfileTab('overview') }}>
                                    <Eye size={14} className="mr-1" /> View Profile
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => { setSelectedClient(client); setViewMode('profile'); setProfileTab('messages') }}>
                                    <Mail size={14} className="mr-1" /> Messages
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {viewMode === 'edit-queue' && <EditQueueView editRequests={editRequests} loading={editLoading} onAction={handleEditRequestAction} onBatchApprove={handleBatchApprove} onRefresh={fetchEditRequests} />}
    </div>
  )
}

// ═══════════════════════════════════════════════
// CLIENT PROFILE VIEW
// ═══════════════════════════════════════════════
function ClientProfile({ client, onBack, onUpdate, onDelete, onDeleteMessages, onRefresh, profileTab, setProfileTab }: any) {
  const contact = client.contactName || (client.lead ? `${client.lead.firstName} ${client.lead.lastName || ''}`.trim() : '')
  const phone = client.phone || client.lead?.phone || ''
  const email = client.email || client.lead?.email || ''
  const location = client.location || (client.lead ? `${client.lead.city || ''}, ${client.lead.state || ''}`.replace(/^, |, $/g, '') : '')
  const healthScore = getHealthScore(client)
  const health = getHealthBadge(healthScore)
  const daysActive = getDaysSince(client.siteLiveDate)
  const daysSinceInteraction = getDaysSince(client.lastInteraction)
  const rating = client.lead?.enrichedRating
  const reviews = client.lead?.enrichedReviews

  const [noteInput, setNoteInput] = useState(client.notes || '')
  const [tagInput, setTagInput] = useState('')
  const [aiToggle, setAiToggle] = useState(client.aiAutoRespond !== false)
  const [reportFreq, setReportFreq] = useState(client.statReportFrequency || 'monthly')

  return (
    <div className="p-8 space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Back to Clients
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{client.companyName}</h1>
          <div className="flex items-center gap-3 mt-1 text-gray-500 text-sm flex-wrap">
            {contact && <span>{contact}</span>}
            {location && <span>- {location}</span>}
            {client.industry && <span>- {client.industry.replace(/_/g, ' ')}</span>}
            {rating && <span className="flex items-center gap-1"><Star size={12} className="text-amber-500" /> {rating} ({reviews} reviews)</span>}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            {phone && <span className="flex items-center gap-1"><Phone size={12} /> {phone}</span>}
            {email && <span className="flex items-center gap-1"><Mail size={12} /> {email}</span>}
          </div>
          {client.siteUrl && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-gray-600">Site:</span>
              <a href={`https://${client.siteUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                {client.siteUrl} <ExternalLink size={12} />
              </a>
              {client.stagingUrl && (
                <a href={client.stagingUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:underline text-sm flex items-center gap-1">Staging <ExternalLink size={12} /></a>
              )}
            </div>
          )}
        </div>
        <Badge variant={client.hostingStatus === 'ACTIVE' ? 'default' : 'destructive'}>{client.hostingStatus}</Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Billing</div>
          <div className="text-xl font-bold">{formatCurrency(client.monthlyRevenue)}/mo</div>
          <div className="text-xs mt-1"><span className={client.hostingStatus === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}>{client.hostingStatus === 'ACTIVE' ? '🟢 Current' : '🔴 ' + client.hostingStatus}</span></div>
          <div className="text-xs text-gray-400 mt-1">Since {client.closedDate ? new Date(client.closedDate).toLocaleDateString() : new Date(client.createdAt).toLocaleDateString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Health</div>
          <div className="text-xl font-bold">Score: {healthScore}</div>
          <div className={`text-xs mt-1 ${health.color} inline-block px-2 py-0.5 rounded-full`}>{health.icon} {health.label}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Engagement</div>
          <div className="text-xl font-bold">{daysSinceInteraction !== null ? `${daysSinceInteraction}d` : 'N/A'}</div>
          <div className="text-xs text-gray-400 mt-1">Edits: {client._count?.editRequests || 0}</div>
          <div className="text-xs text-gray-400">Messages: {client._count?.messages || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Revenue</div>
          <div className="text-xl font-bold">{daysActive !== null ? formatCurrency(Math.round((client.monthlyRevenue || 0) * (daysActive / 30))) : '—'}</div>
          <div className="text-xs text-gray-400 mt-1">Plan: {client.plan || 'base'}</div>
        </Card>
      </div>

      {/* Profile Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['overview', 'edit-requests', 'messages', 'billing', 'stat-reports', 'timeline'].map(tab => (
          <Button key={tab} variant={profileTab === tab ? 'default' : 'outline'} size="sm" onClick={() => setProfileTab(tab)}>
            {tab.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </Button>
        ))}
      </div>

      {profileTab === 'overview' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-500">Closed by:</span><span className="ml-2 font-medium">{client.rep?.name || '—'}</span></div>
              <div><span className="text-gray-500">Stripe:</span><span className={`ml-2 font-medium ${client.stripeCustomerId ? 'text-green-600' : 'text-gray-400'}`}>{client.stripeCustomerId ? 'Connected' : 'Not linked'}</span></div>
              <div><span className="text-gray-500">Referral:</span><span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{client.referralCode || '—'}</span></div>
            </div>
            {client.analytics && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Site Stats</h4>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {[
                    { v: client.analytics.totalVisits || 0, l: 'Visitors' },
                    { v: client.analytics.uniqueVisitors || 0, l: 'Unique' },
                    { v: client.analytics.totalCalls || 0, l: 'Calls' },
                    { v: client.analytics.totalForms || 0, l: 'Forms' },
                    { v: client.analytics.bounceRate ? `${Math.round(client.analytics.bounceRate * 100)}%` : '—', l: 'Bounce' },
                  ].map(s => (
                    <div key={s.l} className="bg-gray-50 rounded p-3 text-center">
                      <div className="text-lg font-bold">{s.v}</div>
                      <div className="text-xs text-gray-500">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Onboarding Progress — only show for clients in onboarding */}
          {client.onboardingStep > 0 && client.onboardingStep < 7 && (
            <OnboardingCard client={client} onRefresh={onRefresh || (() => {})} />
          )}

          {/* Tags */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {(client.tags || []).map((tag: string) => (
                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                  {tag}
                  <button onClick={() => onUpdate({ tags: (client.tags || []).filter((t: string) => t !== tag) })} className="hover:text-red-500"><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag..." className="max-w-[200px]" onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) { onUpdate({ tags: [...(client.tags || []), tagInput.trim()] }); setTagInput('') }
              }} />
              <Button variant="outline" size="sm" onClick={() => { if (tagInput.trim()) { onUpdate({ tags: [...(client.tags || []), tagInput.trim()] }); setTagInput('') } }}>Add</Button>
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
            <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[80px]" placeholder="Add notes about this client..." />
            <Button variant="outline" size="sm" className="mt-2" onClick={() => onUpdate({ notes: noteInput })}>Save Notes</Button>
          </Card>

          {/* Per-Client Settings */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">AI auto-respond</div>
                  <div className="text-xs text-gray-500">Let AI handle this client&apos;s messages</div>
                </div>
                <select value={aiToggle ? 'on' : 'off'} onChange={(e) => { const val = e.target.value === 'on'; setAiToggle(val); onUpdate({ aiAutoRespond: val }) }} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm">
                  <option value="on">ON</option>
                  <option value="off">OFF</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Stat report frequency</div>
                  <div className="text-xs text-gray-500">How often to send stats</div>
                </div>
                <select value={reportFreq} onChange={(e) => { setReportFreq(e.target.value); onUpdate({ statReportFrequency: e.target.value }) }} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm">
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Automation Mode */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Automation Mode</h3>
            <p className="text-sm text-gray-500 mb-3">Controls how much autonomy the AI has for this client.</p>
            <div className="flex gap-2">
              {[
                { value: 'FULL_AUTO', label: 'Full Auto', desc: 'AI handles everything' },
                { value: 'SEMI_AUTO', label: 'Semi-Auto', desc: 'AI drafts, you approve' },
                { value: 'MANUAL', label: 'Manual', desc: 'You handle everything' },
              ].map(mode => (
                <button
                  key={mode.value}
                  onClick={() => onUpdate({ autonomyLevel: mode.value })}
                  className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                    (client.autonomyLevel || 'FULL_AUTO') === mode.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-semibold">{mode.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{mode.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* What AI Sees */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">What AI Sees</h3>
            <p className="text-sm text-gray-500 mb-3">Context passed to the AI when handling this client&apos;s conversations.</p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-[300px]">
              {JSON.stringify({
                companyName: client.companyName,
                contact,
                phone,
                email,
                location,
                plan: client.plan || 'base',
                hostingStatus: client.hostingStatus,
                autonomyLevel: client.autonomyLevel || 'FULL_AUTO',
                aiAutoRespond: client.aiAutoRespond !== false,
                daysActive,
                healthScore,
                tags: client.tags || [],
              }, null, 2)}
            </pre>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border-red-200">
            <h3 className="font-semibold text-red-600 mb-2">Danger Zone</h3>
            <div className="space-y-4">
              {/* Deactivate / Reactivate */}
              <div>
                {client.hostingStatus === 'DEACTIVATED' ? (
                  <>
                    <p className="text-sm text-gray-500 mb-2">Reactivate this client. They will be set back to ACTIVE.</p>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        if (confirm(`Reactivate ${client.companyName}?`)) {
                          onUpdate({ hostingStatus: 'ACTIVE' })
                        }
                      }}
                    >
                      <RefreshCw size={14} className="mr-2" />
                      Reactivate Client
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 mb-2">Deactivate this client. They stay in the system but are paused and hidden from AI.</p>
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => {
                        if (confirm(`Deactivate ${client.companyName}? They can be reactivated later.`)) {
                          onUpdate({ hostingStatus: 'DEACTIVATED' })
                        }
                      }}
                    >
                      <Clock size={14} className="mr-2" />
                      Deactivate Client
                    </Button>
                  </>
                )}
              </div>
              {/* Cancel */}
              <div className="pt-4 border-t border-red-100">
                <p className="text-sm text-gray-500 mb-2">Cancel this client. Their site will be taken offline.</p>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Are you sure you want to cancel ${client.companyName}? Their hosting will be set to CANCELLED.`)) {
                      onUpdate({ hostingStatus: 'CANCELLED' })
                    }
                  }}
                >
                  <XCircle size={14} className="mr-2" />
                  Cancel Client
                </Button>
              </div>
              {/* Delete Messages */}
              <div className="pt-4 border-t border-red-100">
                <p className="text-sm text-gray-500 mb-2">Delete all message history for this client. The client record stays intact.</p>
                <Button
                  variant="destructive"
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => {
                    if (confirm(`Delete ALL messages for ${client.companyName}?\n\nThis will permanently remove every message in their thread. The client record itself will not be affected.\n\nThis cannot be undone.`)) {
                      onDeleteMessages()
                    }
                  }}
                >
                  <MessageSquare size={14} className="mr-2" />
                  Delete All Messages
                </Button>
              </div>
              {/* Hard Delete */}
              <div className="pt-4 border-t border-red-100">
                <p className="text-sm text-red-500 mb-2">Permanently delete this client and all their data (messages, revenue, commissions). This cannot be undone.</p>
                <Button
                  variant="destructive"
                  className="bg-red-700 hover:bg-red-800"
                  onClick={() => {
                    if (confirm(`PERMANENTLY DELETE ${client.companyName}?\n\nThis will remove the client and ALL associated data (messages, payments, commissions) from the database forever.\n\nThis cannot be undone.`)) {
                      onDelete()
                    }
                  }}
                >
                  <Trash2 size={14} className="mr-2" />
                  Permanently Delete
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {profileTab === 'billing' && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Billing</h3>
          <div className="space-y-3 text-sm">
            {[
              { l: 'Plan', v: `${client.plan || 'base'} - ${formatCurrency(client.monthlyRevenue)}/mo` },
              { l: 'Stripe Customer', v: client.stripeCustomerId || 'Not linked', c: client.stripeCustomerId ? 'text-green-600' : 'text-gray-400' },
              { l: 'Subscription', v: client.stripeSubscriptionId || 'Not linked', c: client.stripeSubscriptionId ? 'text-green-600' : 'text-gray-400' },
            ].map(row => (
              <div key={row.l} className="flex justify-between py-2 border-b">
                <span className="text-gray-500">{row.l}</span>
                <span className={`font-medium ${row.c || ''}`}>{row.v}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Status</span>
              <Badge variant={client.hostingStatus === 'ACTIVE' ? 'default' : 'destructive'}>{client.hostingStatus}</Badge>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Est. LTV</span>
              <span className="font-medium">{daysActive !== null ? formatCurrency(Math.round((client.monthlyRevenue || 0) * (daysActive / 30))) : '—'}</span>
            </div>
          </div>
        </Card>
      )}

      {profileTab === 'timeline' && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
          <div className="space-y-3 text-sm">
            {[
              { date: client.createdAt, label: 'Client created', color: 'bg-green-500' },
              client.closedDate && { date: client.closedDate, label: 'Deal closed', color: 'bg-blue-500' },
              client.siteLiveDate && { date: client.siteLiveDate, label: 'Site went live', color: 'bg-purple-500' },
              client.churnedDate && { date: client.churnedDate, label: 'Churned', color: 'bg-red-500' },
            ].filter(Boolean).map((event: any, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className={`w-2 h-2 ${event.color} rounded-full`} />
                <span className="text-gray-500 w-24">{new Date(event.date).toLocaleDateString()}</span>
                <span>{event.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {['messages', 'edit-requests', 'stat-reports'].includes(profileTab) && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">{profileTab.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</h3>
          <p className="text-sm text-gray-500">View full {profileTab.replace(/-/g, ' ')} in the dedicated tab above.</p>
        </Card>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// EDIT QUEUE VIEW
// ═══════════════════════════════════════════════
function EditQueueView({ editRequests, loading, onAction, onBatchApprove, onRefresh }: any) {
  const readyForReview = editRequests.filter((r: any) => r.status === 'ready_for_review')
  const aiProcessing = editRequests.filter((r: any) => r.status === 'ai_processing' || r.status === 'new')
  const completed = editRequests.filter((r: any) => r.status === 'approved' || r.status === 'live')
  const simpleEdits = readyForReview.filter((r: any) => r.complexityTier === 'simple')
  const mediumEdits = readyForReview.filter((r: any) => r.complexityTier === 'medium')
  const complexEdits = readyForReview.filter((r: any) => r.complexityTier === 'complex')

  const completedWithTime = completed.filter((r: any) => r.approvedAt && r.createdAt)
  const avgTurnaround = completedWithTime.length > 0
    ? Math.round(completedWithTime.reduce((sum: number, r: any) => sum + (new Date(r.approvedAt).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60), 0) / completedWithTime.length * 10) / 10
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Edit Queue</h2>
          <p className="text-sm text-gray-500">Avg turnaround: {avgTurnaround}hrs</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw size={14} className="mr-1" /> Refresh</Button>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-gray-500">Loading edit requests...</Card>
      ) : editRequests.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
          <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
          <p className="text-gray-500 text-sm">No pending edit requests.</p>
        </Card>
      ) : (
        <>
          {simpleEdits.length > 0 && (
            <Card className="p-4 border-green-200 bg-green-50/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-green-800 flex items-center gap-2"><CheckCircle2 size={16} />Batch Approve — Simple Edits ({simpleEdits.length})</h3>
                <Button size="sm" onClick={() => onBatchApprove(simpleEdits.map((r: any) => r.id))} className="bg-green-600 hover:bg-green-700">Approve All Simple</Button>
              </div>
              <div className="space-y-2">
                {simpleEdits.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between bg-white rounded p-3 text-sm">
                    <div><span className="font-medium">{req.client?.companyName}</span><span className="text-gray-500 ml-2">— {req.requestText}</span></div>
                    <Button variant="outline" size="sm" onClick={() => onAction(req.id, 'approved')}>Approve</Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {mediumEdits.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Eye size={16} />Review — Medium Edits ({mediumEdits.length})</h3>
              <div className="space-y-3">
                {mediumEdits.map((req: any) => <EditRequestCard key={req.id} request={req} onAction={onAction} />)}
              </div>
            </Card>
          )}

          {complexEdits.length > 0 && (
            <Card className="p-4 border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2"><AlertTriangle size={16} />Complex — Full Review ({complexEdits.length})</h3>
              <div className="space-y-3">
                {complexEdits.map((req: any) => <EditRequestCard key={req.id} request={req} onAction={onAction} />)}
              </div>
            </Card>
          )}

          {aiProcessing.length > 0 && (
            <Card className="p-4 bg-yellow-50/50 border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-3">🟡 AI Processing ({aiProcessing.length})</h3>
              <div className="space-y-2">
                {aiProcessing.map((req: any) => (
                  <div key={req.id} className="bg-white rounded p-3 text-sm flex items-center justify-between">
                    <div><span className="font-medium">{req.client?.companyName}</span><span className="text-gray-500 ml-2">— {req.requestText}</span></div>
                    <Badge variant="secondary">{req.status === 'new' ? 'Queued' : 'Processing'}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {completed.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-gray-800 mb-3">🟢 Completed ({completed.length})</h3>
              <div className="space-y-2 text-sm">
                {completed.slice(0, 10).map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between py-1.5">
                    <div>
                      <span className="text-gray-500">{req.approvedBy && `Approved by ${req.approvedBy}`}{req.approvedAt && ` ${new Date(req.approvedAt).toLocaleTimeString()}`}</span>
                      <span className="ml-2">— &quot;{req.requestText}&quot;</span>
                    </div>
                    <span className="text-gray-400">{req.client?.companyName}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function EditRequestCard({ request, onAction }: any) {
  const hoursSince = request.createdAt ? Math.round((Date.now() - new Date(request.createdAt).getTime()) / (1000 * 60 * 60) * 10) / 10 : 0

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-900">{request.client?.companyName}</div>
          <div className="text-sm text-gray-600 mt-1">Request: &quot;{request.requestText}&quot;</div>
          <div className="text-xs text-gray-400 mt-1">
            Received {hoursSince}h ago via {request.requestChannel}
            {request.aiInterpretation && <span className="ml-2 text-blue-600">AI: {request.aiInterpretation}</span>}
          </div>
        </div>
        <Badge variant="secondary" className="capitalize">{request.complexityTier}</Badge>
      </div>
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={() => onAction(request.id, 'approved')} className="bg-green-600 hover:bg-green-700"><CheckCircle size={14} className="mr-1" /> Approve</Button>
        <Button variant="outline" size="sm" onClick={() => onAction(request.id, 'rejected')}><X size={14} className="mr-1" /> Reject</Button>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════
function StatCard({ label, value, variant = 'default', onClick, active }: {
  label: string; value: string | number; variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning'; onClick?: () => void; active?: boolean
}) {
  const colors = {
    default: 'bg-white border-gray-200',
    primary: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
    success: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200',
    danger: 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200',
    warning: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200',
  }
  return (
    <Card className={`p-4 cursor-pointer transition-all ${colors[variant]} ${active ? 'ring-2 ring-blue-500' : ''}`} onClick={onClick}>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </Card>
  )
}


// ═══════════════════════════════════════════════
// ONBOARDING CARD
// ═══════════════════════════════════════════════
function OnboardingCard({ client, onRefresh }: { client: any; onRefresh: () => void }) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const step = client.onboardingStep || 0
  const data = (client.onboardingData || {}) as Record<string, any>
  const domain = data.domainPreference || client.customDomain || ''

  const steps = [
    { num: 1, label: 'Welcome' },
    { num: 2, label: 'Domain' },
    { num: 3, label: 'Content' },
    { num: 4, label: 'Setup' },
    { num: 5, label: 'DNS' },
    { num: 6, label: 'Go-Live' },
    { num: 7, label: 'Done' },
  ]

  const handleAction = async (action: string, extraData?: Record<string, any>) => {
    setActionLoading(action)
    try {
      const res = await fetch(`/api/clients/${client.id}/domain-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      })
      if (res.ok) {
        onRefresh()
      } else {
        const err = await res.json()
        alert(`Action failed: ${err.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Domain action failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleAdvance = async () => {
    setActionLoading('advance')
    try {
      const res = await fetch(`/api/clients/${client.id}/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance' }),
      })
      if (res.ok) onRefresh()
    } catch (err) {
      console.error('Advance failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Card className="p-6 border-blue-200 bg-blue-50/30">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Clock size={16} className="text-blue-500" />
        Onboarding Progress
      </h3>

      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-4">
        {steps.map((s) => (
          <div key={s.num} className="flex-1 flex flex-col items-center">
            <div className={`w-full h-2 rounded-full ${
              s.num < step ? 'bg-green-500' :
              s.num === step ? 'bg-blue-500' :
              'bg-gray-200'
            }`} />
            <span className={`text-[10px] mt-1 ${
              s.num === step ? 'text-blue-700 font-semibold' : 'text-gray-400'
            }`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Current step info */}
      <div className="text-sm text-gray-600 mb-3">
        Step {step}/7 — <span className="font-medium">{ONBOARDING_STEP_LABELS[step] || 'Unknown'}</span>
      </div>

      {/* Domain info */}
      {domain && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="text-gray-500">Domain:</span>
          <span className="font-mono bg-white px-2 py-0.5 rounded border text-gray-800">{domain}</span>
          {client.domainStatus && (
            <Badge variant="outline" className="text-xs">
              {client.domainStatus}
            </Badge>
          )}
          {data.domainOwnership && (
            <span className="text-xs text-gray-400">({data.domainOwnership === 'owns_domain' ? 'Client owns' : 'We register'})</span>
          )}
        </div>
      )}

      {/* Action buttons based on step */}
      <div className="flex flex-wrap gap-2 mt-3">
        {step === 4 && domain && (
          <Button size="sm" variant="default"
            onClick={() => handleAction('add_to_vercel', { domain })}
            disabled={actionLoading === 'add_to_vercel'}
          >
            {actionLoading === 'add_to_vercel' ? 'Adding...' : 'Add to Vercel'}
          </Button>
        )}

        {step === 4 && data.domainOwnership === 'needs_new' && (
          <Button size="sm" variant="outline"
            onClick={() => handleAction('mark_registered', { domain })}
            disabled={actionLoading === 'mark_registered'}
          >
            {actionLoading === 'mark_registered' ? 'Marking...' : 'Mark Registered'}
          </Button>
        )}

        {step === 5 && (
          <>
            <Button size="sm" variant="default"
              onClick={() => handleAction('check_dns')}
              disabled={actionLoading === 'check_dns'}
            >
              <RefreshCw size={14} className={`mr-1 ${actionLoading === 'check_dns' ? 'animate-spin' : ''}`} />
              {actionLoading === 'check_dns' ? 'Checking...' : 'Check DNS'}
            </Button>
            <Button size="sm" variant="outline"
              onClick={() => handleAction('resend_dns_instructions')}
              disabled={actionLoading === 'resend_dns_instructions'}
            >
              {actionLoading === 'resend_dns_instructions' ? 'Sending...' : 'Resend DNS Instructions'}
            </Button>
          </>
        )}

        {step === 6 && (
          <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700"
            onClick={() => handleAction('force_go_live')}
            disabled={actionLoading === 'force_go_live'}
          >
            {actionLoading === 'force_go_live' ? 'Going Live...' : 'Go Live Now'}
          </Button>
        )}

        {step > 0 && step < 7 && (
          <Button size="sm" variant="ghost"
            onClick={handleAdvance}
            disabled={actionLoading === 'advance'}
          >
            {actionLoading === 'advance' ? 'Advancing...' : 'Skip to Next Step'}
          </Button>
        )}
      </div>
    </Card>
  )
}