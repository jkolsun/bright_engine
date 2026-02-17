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
import Link from 'next/link'
import { formatPhone } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { Search, Filter, Download, Plus, Eye, TrendingUp, UserPlus, UserMinus, Users } from 'lucide-react'

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [repFilter, setRepFilter] = useState<string>('all')
  const [leads, setLeads] = useState<any[]>([])
  const [reps, setReps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
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
    fetchReps()
  }, [])

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads?limit=500')
      const data = await res.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReps = async () => {
    try {
      const res = await fetch('/api/reps')
      const data = await res.json()
      setReps(data.reps || [])
    } catch (error) {
      console.error('Failed to fetch reps:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
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
        setSelectedLeads(new Set([...selectedLeads].filter(id => id !== leadId)))
        fetchLeads()
      } else {
        alert('Failed to delete lead')
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert('Failed to delete lead')
    }
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
        alert(`${data.updated} lead${data.updated !== 1 ? 's' : ''} ${repName ? `assigned to ${repName}` : 'unassigned'}`)
        setSelectedLeads(new Set())
        setAssignDialogOpen(false)
        fetchLeads()
        fetchReps()
      } else {
        alert('Failed to assign leads')
      }
    } catch (error) {
      console.error('Error assigning leads:', error)
      alert('Failed to assign leads')
    } finally {
      setAssigning(false)
    }
  }

  const handleExportCSV = () => {
    const leadsToExport = selectedLeads.size > 0
      ? filteredLeads.filter(l => selectedLeads.has(l.id))
      : filteredLeads

    if (leadsToExport.length === 0) {
      alert('No leads to export')
      return
    }

    const headers = ['First Name', 'Last Name', 'Company Name', 'Email', 'Phone', 'City', 'State', 'Industry', 'Status', 'Source', 'Assigned To']

    const rows = leadsToExport.map(lead => [
      lead.firstName || '',
      lead.lastName || '',
      lead.companyName || '',
      lead.email || '',
      lead.phone || '',
      lead.city || '',
      lead.state || '',
      lead.industry || '',
      lead.status || '',
      lead.source || '',
      lead.assignedTo?.name || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    alert(`Exported ${leadsToExport.length} leads to CSV`)
    setSelectedLeads(new Set())
  }

  const handleDeleteSelected = async () => {
    if (selectedLeads.size === 0) {
      alert('No leads selected')
      return
    }

    const count = selectedLeads.size
    if (!confirm(`Are you sure you want to delete ${count} selected lead${count !== 1 ? 's' : ''}? This marks them as CLOSED_LOST.`)) {
      return
    }

    try {
      const res = await fetch('/api/leads/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeads)
        })
      })

      if (res.ok) {
        const data = await res.json()
        alert(`Deleted ${data.deletedCount || count} leads successfully`)
        setSelectedLeads(new Set())
        fetchLeads()
      } else {
        alert('Failed to delete leads')
      }
    } catch (error) {
      console.error('Error deleting leads:', error)
      alert('Failed to delete leads')
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter

    const matchesRep = repFilter === 'all'
      ? true
      : repFilter === 'unassigned'
        ? !lead.assignedTo
        : lead.assignedTo?.id === repFilter

    return matchesSearch && matchesStatus && matchesRep
  })

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW').length,
    hot: leads.filter(l => l.status === 'HOT_LEAD').length,
    qualified: leads.filter(l => l.status === 'QUALIFIED').length,
    building: leads.filter(l => l.status === 'BUILDING').length,
  }

  const activeReps = reps.filter(r => r.status === 'ACTIVE')

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">{stats.total} total leads</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setAssignDialogOpen(true)}
            disabled={selectedLeads.size === 0}
          >
            <UserPlus size={18} className="mr-2" />
            Assign to Rep {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={leads.length === 0}
            title={selectedLeads.size > 0 ? `Export ${selectedLeads.size} selected leads` : 'Export all leads'}
          >
            <Download size={18} className="mr-2" />
            Export {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteSelected}
            disabled={selectedLeads.size === 0}
          >
            Delete {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
          <Link href="/admin/import">
            <Button variant="outline">
              <Filter size={18} className="mr-2" />
              Import
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

      {/* Assign to Rep Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Assign {selectedLeads.size} Lead{selectedLeads.size !== 1 ? 's' : ''} to Rep</DialogTitle>
            <DialogDescription>
              Choose a sales rep to assign the selected leads to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto">
            {/* Unassign option */}
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

            {/* Rep options */}
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
                  <div className="font-medium text-gray-900">{rep.name}</div>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <StatCard label="Total Leads" value={stats.total} variant="default" onClick={() => { setStatusFilter('all'); setSelectedLeads(new Set()) }} active={statusFilter === 'all'} />
        <StatCard label="New" value={stats.new} variant="default" onClick={() => { setStatusFilter('NEW'); setSelectedLeads(new Set()) }} active={statusFilter === 'NEW'} />
        <StatCard label="Hot Leads" value={stats.hot} variant="danger" onClick={() => { setStatusFilter('HOT_LEAD'); setSelectedLeads(new Set()) }} active={statusFilter === 'HOT_LEAD'} />
        <StatCard label="Qualified" value={stats.qualified} variant="success" onClick={() => { setStatusFilter('QUALIFIED'); setSelectedLeads(new Set()) }} active={statusFilter === 'QUALIFIED'} />
        <StatCard label="Building" value={stats.building} variant="warning" onClick={() => { setStatusFilter('BUILDING'); setSelectedLeads(new Set()) }} active={statusFilter === 'BUILDING'} />
        <StatCard label="Closed" value={leads.filter(l => l.status === 'PAID').length} variant="success" onClick={() => { setStatusFilter('PAID'); setSelectedLeads(new Set()) }} active={statusFilter === 'PAID'} />
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
          <select
            value={repFilter}
            onChange={(e) => { setRepFilter(e.target.value); setSelectedLeads(new Set()) }}
            className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Reps</option>
            <option value="unassigned">Unassigned</option>
            {activeReps.map((rep) => (
              <option key={rep.id} value={rep.id}>{rep.name}</option>
            ))}
          </select>
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
                  <th className="text-center p-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                      title="Select all"
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Company</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Phone</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Location</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Assigned To</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
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
                      <div className="font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                      {lead.email && <div className="text-sm text-gray-500">{lead.email}</div>}
                    </td>
                    <td className="p-4 text-gray-700">{lead.companyName}</td>
                    <td className="p-4 text-gray-700">{lead.phone && formatPhone(lead.phone)}</td>
                    <td className="p-4 text-gray-700">{lead.city}{lead.city && lead.state ? ', ' : ''}{lead.state}</td>
                    <td className="p-4">
                      {lead.assignedTo ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                          <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-800">
                            {lead.assignedTo.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </span>
                          {lead.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={
                        lead.status === 'HOT_LEAD' ? 'destructive' :
                        lead.status === 'QUALIFIED' ? 'default' :
                        lead.status === 'BUILDING' ? 'secondary' :
                        lead.status === 'PAID' ? 'default' :
                        'secondary'
                      }>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-2 flex justify-end">
                      {lead.previewUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => window.open(lead.previewUrl, '_blank')}
                          title="Preview the personalized website"
                        >
                          <Eye size={16} className="mr-1" />
                          Preview
                        </Button>
                      )}
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
