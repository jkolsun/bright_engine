'use client'

export const dynamic = 'force-dynamic'

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
import Link from 'next/link'
import { formatPhone } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { Search, Filter, Download, Plus, Eye, MessageSquare, Phone as PhoneIcon, TrendingUp } from 'lucide-react'

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    industry: '',
    source: 'COLD_EMAIL'
  })

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads')
      const data = await res.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Clean up form data - remove empty strings, use defaults
      const cleanData = {
        ...formData,
        industry: formData.industry || 'GENERAL_CONTRACTING',
        source: formData.source || 'COLD_EMAIL',
        lastName: formData.lastName || undefined,
        email: formData.email || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
      }

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData)
      })

      if (res.ok) {
        setDialogOpen(false)
        setFormData({
          firstName: '',
          lastName: '',
          companyName: '',
          phone: '',
          email: '',
          city: '',
          state: '',
          industry: '',
          source: 'COLD_EMAIL'
        })
        fetchLeads()
      } else {
        alert('Failed to create lead')
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      alert('Failed to create lead')
    }
  }

  const handleDeleteLead = async (leadId: string, firstName: string) => {
    if (!confirm(`Are you sure you want to delete ${firstName}? This marks them as CLOSED_LOST.`)) {
      return
    }

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('Lead deleted successfully')
        fetchLeads()
      } else {
        alert('Failed to delete lead')
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert('Failed to delete lead')
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW').length,
    hot: leads.filter(l => l.status === 'HOT_LEAD').length,
    qualified: leads.filter(l => l.status === 'QUALIFIED').length,
    building: leads.filter(l => l.status === 'BUILDING').length,
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">{stats.total} total leads</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download size={18} className="mr-2" />
            Export CSV
          </Button>
          <Link href="/admin/import">
            <Button variant="outline">
              <Filter size={18} className="mr-2" />
              Import Leads
            </Button>
          </Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                  <DialogDescription>
                    Manually add a new lead to your pipeline.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="text-sm font-medium">
                        First Name *
                      </label>
                      <Input 
                        id="firstName" 
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="lastName" className="text-sm font-medium">
                        Last Name *
                      </label>
                      <Input 
                        id="lastName" 
                        placeholder="Smith"
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="company" className="text-sm font-medium">
                      Company Name *
                    </label>
                    <Input 
                      id="company" 
                      placeholder="ABC Roofing"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Phone *
                    </label>
                    <Input 
                      id="phone" 
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="john@abcroofing.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="city" className="text-sm font-medium">
                        City
                      </label>
                      <Input 
                        id="city" 
                        placeholder="Dallas"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="state" className="text-sm font-medium">
                        State
                      </label>
                      <Input 
                        id="state" 
                        placeholder="TX" 
                        maxLength={2}
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Lead
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <StatCard label="Total Leads" value={stats.total} variant="default" onClick={() => setStatusFilter('all')} active={statusFilter === 'all'} />
        <StatCard label="New" value={stats.new} variant="default" onClick={() => setStatusFilter('NEW')} active={statusFilter === 'NEW'} />
        <StatCard label="Hot Leads" value={stats.hot} variant="danger" onClick={() => setStatusFilter('HOT_LEAD')} active={statusFilter === 'HOT_LEAD'} />
        <StatCard label="Qualified" value={stats.qualified} variant="success" onClick={() => setStatusFilter('QUALIFIED')} active={statusFilter === 'QUALIFIED'} />
        <StatCard label="Building" value={stats.building} variant="warning" onClick={() => setStatusFilter('BUILDING')} active={statusFilter === 'BUILDING'} />
        <StatCard label="Closed" value={leads.filter(l => l.status === 'PAID').length} variant="success" onClick={() => setStatusFilter('PAID')} active={statusFilter === 'PAID'} />
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              className="pl-10" 
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Leads Table */}
      <Card>
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading leads...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <TrendingUp size={48} className="mx-auto mb-2" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads yet</h3>
            <p className="text-gray-600 mb-4">Add your first lead or import from CSV</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setDialogOpen(true)}>
                <Plus size={18} className="mr-2" />
                Add Lead
              </Button>
              <Link href="/admin/import">
                <Button variant="outline">
                  <Filter size={18} className="mr-2" />
                  Import CSV
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Company</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Phone</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Location</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                      {lead.email && <div className="text-sm text-gray-500">{lead.email}</div>}
                    </td>
                    <td className="p-4 text-gray-700">{lead.companyName}</td>
                    <td className="p-4 text-gray-700">{lead.phone && formatPhone(lead.phone)}</td>
                    <td className="p-4 text-gray-700">{lead.city}, {lead.state}</td>
                    <td className="p-4">
                      <Badge variant={
                        lead.status === 'HOT_LEAD' ? 'destructive' :
                        lead.status === 'QUALIFIED' ? 'default' :
                        lead.status === 'BUILDING' ? 'secondary' :
                        'secondary'
                      }>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-2 flex justify-end">
                      <Link href={`/admin/leads/${lead.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteLead(lead.id, lead.firstName)}
                      >
                        Delete
                      </Button>
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
      className={`p-6 cursor-pointer transition-all ${colors[variant]} ${active ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onClick}
    >
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </Card>
  )
}
