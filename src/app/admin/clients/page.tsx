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
import { Search, Filter, Download, Plus, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    websiteUrl: '',
    industry: '',
    planType: 'BASIC',
    monthlyPrice: 39,
    setupFee: 0,
    chargeSetupFee: false
  })

  // Load clients from API
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
          setupFee: formData.chargeSetupFee ? 149 : 0
        })
      })

      if (res.ok) {
        setDialogOpen(false)
        setFormData({
          companyName: '',
          websiteUrl: '',
          industry: '',
          planType: 'BASIC',
          monthlyPrice: 39,
          setupFee: 0,
          chargeSetupFee: false
        })
        fetchClients() // Reload list
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
    const packages: Record<string, { planType: string; monthlyPrice: number }> = {
      basic: { planType: 'BASIC', monthlyPrice: 39 },
      premium: { planType: 'PREMIUM', monthlyPrice: 138 },
      enterprise: { planType: 'ENTERPRISE', monthlyPrice: 237 }
    }
    const selected = packages[value]
    setFormData(prev => ({ ...prev, ...selected }))
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.websiteUrl.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'ACTIVE' && client.hostingStatus === 'ACTIVE') ||
      (statusFilter === 'PAUSED' && client.hostingStatus === 'PAUSED')

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.hostingStatus === 'ACTIVE').length,
    paused: clients.filter(c => c.hostingStatus === 'PAUSED').length,
    totalMRR: clients.reduce((sum, c) => sum + (c.monthlyPrice || 0), 0)
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">
            {stats.total} total clients • {formatCurrency(stats.totalMRR)} MRR
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
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
                      Website URL *
                    </label>
                    <Input
                      id="website"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                      placeholder="abcroofing.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="industry" className="text-sm font-medium">
                      Industry
                    </label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      placeholder="Roofing"
                    />
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
                      checked={formData.chargeSetupFee}
                      onChange={(e) => setFormData(prev => ({ ...prev, chargeSetupFee: e.target.checked }))}
                    />
                    <label htmlFor="setup" className="text-sm">
                      Charge $149 setup fee
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          label="Total MRR" 
          value={formatCurrency(stats.totalMRR)} 
          variant="primary"
        />
        <StatCard 
          label="Active Clients" 
          value={stats.active} 
          variant="success"
          subtitle={`${stats.paused} paused`}
        />
        <StatCard 
          label="Total Clients" 
          value={stats.total} 
          variant="default"
        />
        <StatCard 
          label="Avg Rev/Client" 
          value={stats.total > 0 ? formatCurrency(Math.round(stats.totalMRR / stats.total)) : '$0'} 
          variant="default"
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
          <select 
            className="px-4 py-2 border border-gray-300 rounded-md"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </select>
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
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Website</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Plan</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">MRR</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{client.companyName}</div>
                      {client.industry && <div className="text-sm text-gray-500">{client.industry}</div>}
                    </td>
                    <td className="p-4">
                      <a 
                        href={`https://${client.websiteUrl}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {client.websiteUrl}
                        <ExternalLink size={14} />
                      </a>
                    </td>
                    <td className="p-4">
                      <Badge variant={client.hostingStatus === 'ACTIVE' ? 'default' : 'secondary'}>
                        {client.hostingStatus}
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-700">{client.planType}</td>
                    <td className="p-4 text-right font-semibold text-gray-900">
                      {formatCurrency(client.monthlyPrice)}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm">View</Button>
                    </td>
                  </tr>
                ))}
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
  subtitle
}: { 
  label: string
  value: string | number
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning'
  subtitle?: string
}) {
  const colors = {
    default: 'bg-white border-gray-200',
    primary: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
    success: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200',
    danger: 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200',
    warning: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
  }

  return (
    <Card className={`p-6 ${colors[variant]}`}>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </Card>
  )
}
