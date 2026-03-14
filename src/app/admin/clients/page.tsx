'use client'

import { Button } from '@/components/ui/button'
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
import { useState, useEffect } from 'react'
import { Download, Plus, Users, DollarSign } from 'lucide-react'
import { getHealthScore, getDaysSince, type ViewMode } from './_lib/utils'
import ClientOverview from './_components/ClientOverview'
import ClientList from './_components/ClientList'
import ClientProfile from './_components/ClientProfile'

export default function ClientsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creatingClient, setCreatingClient] = useState(false)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [profileTab, setProfileTab] = useState('overview')

  // Edit queue moved to Build Queue page


  // Overview stats
  const [overviewStats, setOverviewStats] = useState<any>({ stats: {}, alerts: {} })

  // Dynamic pricing from DB
  const [pricing, setPricing] = useState<{ siteBuildFee: number; monthlyHosting: number; firstMonthTotal: number }>({ siteBuildFee: 0, monthlyHosting: 100, firstMonthTotal: 100 })

  // Form data
  const [formData, setFormData] = useState({
    companyName: '', contactName: '', phone: '', email: '',
    siteUrl: '', location: '', industry: 'GENERAL_CONTRACTING',
    monthlyRevenue: 100, plan: 'base', siteBuildFee: 0,
    chargeSiteBuildFee: true, tags: [] as string[], notes: '',
    clientTrack: 'COLD_SMS' as 'COLD_SMS' | 'MEETING_CLOSE',
    repName: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (creatingClient) return
    setCreatingClient(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          siteBuildFee: formData.chargeSiteBuildFee ? formData.siteBuildFee : 0,
          repName: formData.repName || undefined,
        })
      })
      if (res.ok) {
        setDialogOpen(false)
        setFormData({
          companyName: '', contactName: '', phone: '', email: '',
          siteUrl: '', location: '', industry: 'GENERAL_CONTRACTING',
          monthlyRevenue: pricing.monthlyHosting, plan: 'base', siteBuildFee: pricing.siteBuildFee,
          chargeSiteBuildFee: true, tags: [], notes: '',
          clientTrack: 'COLD_SMS', repName: '',
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
    } finally {
      setCreatingClient(false)
    }
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

  // BUG K.1: Use API-computed MRR with local fallback
  const localMRR = clients.filter(c => c.hostingStatus === 'ACTIVE').reduce((sum, c) => sum + (c.monthlyRevenue || 0), 0)
  const stats = {
    total: clients.length,
    active: clients.filter(c => c.hostingStatus === 'ACTIVE').length,
    atRisk: clients.filter(c => getHealthScore(c) < 50 && c.hostingStatus === 'ACTIVE').length,
    onboarding: clients.filter(c => (c.onboardingStep > 0 && c.onboardingStep < 7) || (!c.siteUrl && !c.siteLiveDate && c.hostingStatus === 'ACTIVE')).length,
    failedPayment: clients.filter(c => c.hostingStatus === 'FAILED_PAYMENT' || c.hostingStatus === 'GRACE_PERIOD').length,
    totalMRR: overviewStats.stats?.mrr || localMRR,
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Clients</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Post-Sale Command Center</p>
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
                  {/* Client Track Selector */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Client Track</label>
                      <select value={formData.clientTrack} onChange={(e) => {
                        const track = e.target.value as 'COLD_SMS' | 'MEETING_CLOSE'
                        setFormData(prev => ({
                          ...prev,
                          clientTrack: track,
                          repName: track === 'COLD_SMS' ? '' : prev.repName,
                          monthlyRevenue: pricing.monthlyHosting,
                        }))
                      }} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-800 dark:text-gray-100">
                        <option value="COLD_SMS">Cold SMS (Default)</option>
                        <option value="MEETING_CLOSE">Meeting Close</option>
                      </select>
                    </div>
                    {formData.clientTrack === 'MEETING_CLOSE' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Rep Name (optional)</label>
                        <Input value={formData.repName} onChange={(e) => setFormData(prev => ({ ...prev, repName: e.target.value }))} placeholder="e.g. Jake Smith" />
                      </div>
                    )}
                  </div>
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
                      <select value={formData.industry} onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-800 dark:text-gray-100">
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
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Build Fee</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input type="text" inputMode="numeric" value={formData.siteBuildFee} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setFormData(prev => ({ ...prev, siteBuildFee: v === '' ? 0 : parseInt(v) })) }} onFocus={(e) => e.target.select()} placeholder="0" className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-800 dark:text-gray-100" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Monthly Hosting</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input type="text" inputMode="numeric" value={formData.monthlyRevenue} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setFormData(prev => ({ ...prev, monthlyRevenue: v === '' ? 0 : parseInt(v) })) }} onFocus={(e) => e.target.select()} placeholder="100" className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-800 dark:text-gray-100" />
                        </div>
                        <p className="text-xs text-gray-400">/mo after first month</p>
                      </div>
                    </div>
                  </div>
                  {formData.clientTrack !== 'MEETING_CLOSE' && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="setup" className="rounded" checked={formData.chargeSiteBuildFee} onChange={(e) => setFormData(prev => ({ ...prev, chargeSiteBuildFee: e.target.checked }))} />
                      <label htmlFor="setup" className="text-sm">Charge ${formData.siteBuildFee} site build fee + ${formData.monthlyRevenue}/mo hosting</label>
                    </div>
                  )}
                  {formData.clientTrack === 'MEETING_CLOSE' && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded">Meeting close client — site will be created as &quot;Pending Launch&quot; (DEACTIVATED). Use Mark Live when ready.</p>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Any notes about this client..." className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-800 dark:text-gray-100 min-h-[60px]" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={creatingClient}>{creatingClient ? 'Creating...' : 'Create Client'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Stats & Alerts */}
      <ClientOverview
        stats={stats}
        overviewStats={overviewStats}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'list', label: 'All Clients', icon: Users },
          { key: 'billing', label: 'Billing', icon: DollarSign },
        ].map(tab => (
          <Button key={tab.key} variant={viewMode === tab.key ? 'default' : 'outline'} size="sm" onClick={() => setViewMode(tab.key as ViewMode)}>
            <tab.icon size={14} className="mr-1.5" />{tab.label}
          </Button>
        ))}
      </div>

      {/* View Content */}
      {(viewMode === 'list' || viewMode === 'overview' || viewMode === 'billing') && (
        <ClientList
          viewMode={viewMode}
          filteredClients={filteredClients}
          loading={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
          allTags={allTags}
          selectedClients={selectedClients}
          setSelectedClients={setSelectedClients}
          toggleSelectClient={toggleSelectClient}
          expandedClient={expandedClient}
          setExpandedClient={setExpandedClient}
          setDialogOpen={setDialogOpen}
          setSelectedClient={setSelectedClient}
          setViewMode={setViewMode}
          setProfileTab={setProfileTab}
        />
      )}

      {/* Edit Queue moved to Build Queue page */}
    </div>
  )
}
