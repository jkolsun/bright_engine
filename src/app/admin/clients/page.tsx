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
import { useState, useEffect } from 'react'
import {
  Search, Download, Plus, ExternalLink, Users,
  Globe, Clock, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Calendar, DollarSign, Activity
} from 'lucide-react'

// Derive client journey stage from available data
function getClientStage(client: any) {
  if (client.hostingStatus === 'CANCELLED') return { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle }
  if (client.hostingStatus === 'FAILED_PAYMENT') return { label: 'Payment Failed', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
  if (client.hostingStatus === 'GRACE_PERIOD') return { label: 'Grace Period', color: 'bg-amber-100 text-amber-700', icon: Clock }
  if (!client.siteUrl && !client.siteLiveDate) return { label: 'Onboarding', color: 'bg-blue-100 text-blue-700', icon: Clock }
  if (client.churnRiskScore >= 70) return { label: 'At Risk', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
  if (client.churnRiskScore >= 40) return { label: 'Needs Attention', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle }

  // Check if recent (< 30 days since live)
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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    companyName: '',
    siteUrl: '',
    industry: 'GENERAL_CONTRACTING',
    monthlyRevenue: 39,
    siteBuildFee: 149,
    chargeSiteBuildFee: true,
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      setClients(data.clients || [])
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          siteBuildFee: formData.chargeSiteBuildFee ? 149 : 0
        })
      })

      if (res.ok) {
        setDialogOpen(false)
        setFormData({
          companyName: '',
          siteUrl: '',
          industry: 'GENERAL_CONTRACTING',
          monthlyRevenue: 39,
          siteBuildFee: 149,
          chargeSiteBuildFee: true,
        })
        fetchClients()
      } else {
        alert('Failed to create client')
      }
    } catch (error) {
      console.error('Error creating client:', error)
      alert('Failed to create client')
    }
  }

  const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const packages: Record<string, { monthlyRevenue: number }> = {
      basic: { monthlyRevenue: 39 },
      premium: { monthlyRevenue: 138 },
      enterprise: { monthlyRevenue: 237 }
    }
    const selected = packages[value]
    setFormData(prev => ({ ...prev, ...selected }))
  }

  const handleDeleteClient = async (clientId: string, companyName: string) => {
    if (!confirm(`Are you sure you want to delete ${companyName}? This marks them as CANCELLED.`)) {
      return
    }

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('Client deleted successfully')
        fetchClients()
      } else {
        alert('Failed to delete client')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Failed to delete client')
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.siteUrl && client.siteUrl.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'ACTIVE' && client.hostingStatus === 'ACTIVE') ||
      (statusFilter === 'CANCELLED' && client.hostingStatus === 'CANCELLED') ||
      (statusFilter === 'FAILED_PAYMENT' && client.hostingStatus === 'FAILED_PAYMENT') ||
      (statusFilter === 'GRACE_PERIOD' && client.hostingStatus === 'GRACE_PERIOD') ||
      (statusFilter === 'AT_RISK' && client.churnRiskScore >= 40 && client.hostingStatus === 'ACTIVE') ||
      (statusFilter === 'ONBOARDING' && !client.siteUrl && !client.siteLiveDate && client.hostingStatus === 'ACTIVE')

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.hostingStatus === 'ACTIVE').length,
    atRisk: clients.filter(c => c.churnRiskScore >= 40 && c.hostingStatus === 'ACTIVE').length,
    onboarding: clients.filter(c => !c.siteUrl && !c.siteLiveDate && c.hostingStatus === 'ACTIVE').length,
    failedPayment: clients.filter(c => c.hostingStatus === 'FAILED_PAYMENT' || c.hostingStatus === 'GRACE_PERIOD').length,
    totalMRR: clients.filter(c => c.hostingStatus === 'ACTIVE').reduce((sum, c) => sum + (c.monthlyRevenue || 0), 0)
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">
            {stats.total} total clients
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              const csv = [
                'Company,Site URL,Status,Stage,Industry,MRR,Days Active,Churn Risk,Domain',
                ...clients.map(c => {
                  const stage = getClientStage(c)
                  const daysActive = getDaysSince(c.siteLiveDate)
                  return `"${c.companyName}","${c.siteUrl || ''}","${c.hostingStatus}","${stage.label}","${c.industry}","${c.monthlyRevenue}","${daysActive ?? 'N/A'}","${c.churnRiskScore || 0}","${c.domainStatus || 'none'}"`
                }),
              ].join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'clients.csv'
              a.click()
            }}
          >
            <Download size={18} className="mr-2" />
            Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                  <DialogDescription>
                    Convert a lead to a paying client. Fill in the details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="company" className="text-sm font-medium">
                      Company Name *
                    </label>
                    <Input
                      id="company"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="ABC Roofing"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="website" className="text-sm font-medium">
                      Site URL
                    </label>
                    <Input
                      id="website"
                      value={formData.siteUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, siteUrl: e.target.value }))}
                      placeholder="abcroofing.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="industry" className="text-sm font-medium">
                      Industry *
                    </label>
                    <select
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
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
                    <label htmlFor="package" className="text-sm font-medium">
                      Package
                    </label>
                    <select
                      id="package"
                      onChange={handlePackageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="basic">Basic - $39/mo</option>
                      <option value="premium">Premium - $138/mo</option>
                      <option value="enterprise">Enterprise - $237/mo</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="setup"
                      className="rounded"
                      checked={formData.chargeSiteBuildFee}
                      onChange={(e) => setFormData(prev => ({ ...prev, chargeSiteBuildFee: e.target.checked }))}
                    />
                    <label htmlFor="setup" className="text-sm">
                      Charge $149 site build fee
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Client
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard
          label="MRR"
          value={formatCurrency(stats.totalMRR)}
          variant="primary"
          onClick={() => setStatusFilter('all')}
          active={statusFilter === 'all'}
        />
        <StatCard
          label="Active"
          value={stats.active}
          variant="success"
          onClick={() => setStatusFilter('ACTIVE')}
          active={statusFilter === 'ACTIVE'}
        />
        <StatCard
          label="Onboarding"
          value={stats.onboarding}
          variant="default"
          onClick={() => setStatusFilter('ONBOARDING')}
          active={statusFilter === 'ONBOARDING'}
        />
        <StatCard
          label="At Risk"
          value={stats.atRisk}
          variant={stats.atRisk > 0 ? 'warning' : 'default'}
          onClick={() => setStatusFilter('AT_RISK')}
          active={statusFilter === 'AT_RISK'}
        />
        <StatCard
          label="Payment Issues"
          value={stats.failedPayment}
          variant={stats.failedPayment > 0 ? 'danger' : 'default'}
          onClick={() => setStatusFilter('FAILED_PAYMENT')}
          active={statusFilter === 'FAILED_PAYMENT'}
        />
        <StatCard
          label="Cancelled"
          value={clients.filter(c => c.hostingStatus === 'CANCELLED').length}
          variant="default"
          onClick={() => setStatusFilter('CANCELLED')}
          active={statusFilter === 'CANCELLED'}
        />
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              className="pl-10"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Clients Table */}
      <Card>
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Users size={48} className="mx-auto mb-2" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients yet</h3>
            <p className="text-gray-600 mb-4">Add your first client to get started</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus size={18} className="mr-2" />
              Add Client
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Company</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Stage</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Site</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Hosting</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">MRR</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Days Active</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => {
                  const stage = getClientStage(client)
                  const StageIcon = stage.icon
                  const daysActive = getDaysSince(client.siteLiveDate)
                  const daysSinceInteraction = getDaysSince(client.lastInteraction)
                  const isExpanded = expandedClient === client.id

                  return (
                    <>
                      <tr
                        key={client.id}
                        className={`hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                      >
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{client.companyName}</div>
                          <div className="text-sm text-gray-500">{client.industry.replace(/_/g, ' ')}</div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stage.color}`}>
                            <StageIcon size={12} />
                            {stage.label}
                          </span>
                        </td>
                        <td className="p-4">
                          {client.siteUrl ? (
                            <a
                              href={`https://${client.siteUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {client.siteUrl}
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">Not live yet</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant={client.hostingStatus === 'ACTIVE' ? 'default' : client.hostingStatus === 'CANCELLED' ? 'secondary' : 'destructive'}>
                            {client.hostingStatus}
                          </Badge>
                        </td>
                        <td className="p-4 text-right font-semibold text-gray-900">
                          {formatCurrency(client.monthlyRevenue)}
                        </td>
                        <td className="p-4 text-right text-sm text-gray-600">
                          {daysActive !== null ? `${daysActive}d` : '\u2014'}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Status Panel */}
                      {isExpanded && (
                        <tr key={`${client.id}-detail`}>
                          <td colSpan={7} className="p-0">
                            <div className="bg-gray-50 border-t border-b border-gray-200 px-6 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                {/* Site Status */}
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Globe size={14} />
                                    Site Status
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Domain</span>
                                      <span className="font-medium text-gray-900">
                                        {client.domainStatus === 'client_owned' ? 'Client Owned' :
                                         client.domainStatus === 'registered_by_us' ? 'We Registered' : 'None'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Live URL</span>
                                      <span className="font-medium text-gray-900">{client.siteUrl || 'Pending'}</span>
                                    </div>
                                    {client.stagingUrl && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Staging</span>
                                        <a href={client.stagingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">{client.stagingUrl}</a>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Engagement */}
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Activity size={14} />
                                    Engagement
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Last Interaction</span>
                                      <span className={`font-medium ${daysSinceInteraction !== null && daysSinceInteraction > 30 ? 'text-amber-600' : 'text-gray-900'}`}>
                                        {daysSinceInteraction !== null ? `${daysSinceInteraction}d ago` : 'Never'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Churn Risk</span>
                                      <span className={`font-medium ${
                                        (client.churnRiskScore || 0) >= 70 ? 'text-red-600' :
                                        (client.churnRiskScore || 0) >= 40 ? 'text-amber-600' : 'text-green-600'
                                      }`}>
                                        {client.churnRiskScore || 0}/100
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Next Touchpoint</span>
                                      <span className="font-medium text-gray-900">
                                        {client.nextTouchpoint ? client.nextTouchpoint.replace(/_/g, ' ') : 'None scheduled'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Revenue */}
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <DollarSign size={14} />
                                    Revenue
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Monthly</span>
                                      <span className="font-medium text-gray-900">{formatCurrency(client.monthlyRevenue)}/mo</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Upsells</span>
                                      <span className="font-medium text-gray-900">
                                        {client.upsells && Array.isArray(client.upsells) ? client.upsells.length : 0} active
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Lifetime Est.</span>
                                      <span className="font-medium text-gray-900">
                                        {daysActive !== null ? formatCurrency(Math.round((client.monthlyRevenue || 0) * (daysActive / 30))) : '\u2014'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Timeline */}
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Calendar size={14} />
                                    Timeline
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Created</span>
                                      <span className="font-medium text-gray-900">{new Date(client.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Site Live</span>
                                      <span className="font-medium text-gray-900">
                                        {client.siteLiveDate ? new Date(client.siteLiveDate).toLocaleDateString() : 'Not yet'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Stripe</span>
                                      <span className={`font-medium ${client.stripeCustomerId ? 'text-green-600' : 'text-gray-400'}`}>
                                        {client.stripeCustomerId ? 'Connected' : 'Not linked'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex gap-2">
                                {client.siteUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); window.open(`https://${client.siteUrl}`, '_blank') }}
                                  >
                                    <Globe size={14} className="mr-1" />
                                    View Site
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id, client.companyName) }}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  variant = 'default',
  onClick,
  active
}: {
  label: string
  value: string | number
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning'
  onClick?: () => void
  active?: boolean
}) {
  const colors = {
    default: 'bg-white border-gray-200',
    primary: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
    success: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200',
    danger: 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200',
    warning: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
  }

  return (
    <Card
      className={`p-4 cursor-pointer transition-all ${colors[variant]} ${active ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onClick}
    >
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </Card>
  )
}
