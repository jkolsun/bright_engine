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
import {
  Search, Filter, Plus, Eye, TrendingUp, UserPlus, UserMinus, Users,
  FolderOpen, FolderPlus, ArrowLeft, Target, Mail, X, MoreVertical, Pencil, Trash2
} from 'lucide-react'

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

  // Folder state
  const [folders, setFolders] = useState<any[]>([])
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null)
  const [editFolderDialogOpen, setEditFolderDialogOpen] = useState(false)
  const [editFolderId, setEditFolderId] = useState<string | null>(null)
  const [editFolderName, setEditFolderName] = useState('')

  // Edit lead state
  const [editLeadDialogOpen, setEditLeadDialogOpen] = useState(false)
  const [editLeadId, setEditLeadId] = useState<string | null>(null)
  const [editLeadForm, setEditLeadForm] = useState<any>({})
  const [savingLead, setSavingLead] = useState(false)

  // Assignment destination state
  const [assignDestination, setAssignDestination] = useState<'rep-tracker' | 'instantly' | null>(null)

  useEffect(() => {
    fetchLeads()
    fetchReps()
    fetchFolders()
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

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders')
      const data = await res.json()
      setFolders(data.folders || [])
    } catch { /* ignore */ }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      })
      if (res.ok) {
        setNewFolderName('')
        setNewFolderDialogOpen(false)
        fetchFolders()
      }
    } catch { /* ignore */ }
    finally { setCreatingFolder(false) }
  }

  const handleEditFolder = async () => {
    if (!editFolderId || !editFolderName.trim()) return
    try {
      const res = await fetch(`/api/folders/${editFolderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editFolderName.trim() }),
      })
      if (res.ok) {
        setEditFolderDialogOpen(false)
        setEditFolderId(null)
        setEditFolderName('')
        fetchFolders()
      }
    } catch { /* ignore */ }
  }

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`Delete folder "${folderName}"? Leads inside will become unorganized.`)) return
    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchFolders()
        fetchLeads()
      }
    } catch { /* ignore */ }
  }

  const handleAssignFolder = (folderId: string) => {
    setActiveFolder(folderId)
    setSelectedLeads(new Set())
    setStatusFilter('all')
    setFolderMenuOpen(null)
  }

  const openEditLeadDialog = (lead: any) => {
    setEditLeadId(lead.id)
    setEditLeadForm({
      firstName: lead.firstName || '', lastName: lead.lastName || '',
      companyName: lead.companyName || '', phone: lead.phone || '',
      email: lead.email || '', city: lead.city || '', state: lead.state || '',
      industry: lead.industry || '', status: lead.status || 'NEW',
    })
    setEditLeadDialogOpen(true)
  }

  const handleSaveLeadEdit = async () => {
    if (!editLeadId) return
    setSavingLead(true)
    try {
      const res = await fetch(`/api/leads/${editLeadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editLeadForm),
      })
      if (res.ok) {
        setEditLeadDialogOpen(false)
        setEditLeadId(null)
        fetchLeads()
      } else {
        alert('Failed to save lead')
      }
    } catch { alert('Failed to save lead') }
    finally { setSavingLead(false) }
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
    if (!confirm(`Are you sure you want to permanently delete ${firstName}? This cannot be undone.`)) {
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
        setAssignDestination(null)
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

  const handleAssignToInstantly = () => {
    // Navigate to Instantly campaigns page with selected lead IDs in query
    const leadIds = Array.from(selectedLeads).join(',')
    window.location.href = `/admin/instantly?assignLeads=${leadIds}`
  }

  const handleDeleteSelected = async () => {
    if (selectedLeads.size === 0) {
      alert('No leads selected')
      return
    }

    const count = selectedLeads.size
    if (!confirm(`Are you sure you want to permanently delete ${count} selected lead${count !== 1 ? 's' : ''}? This cannot be undone.`)) {
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

  // Filter leads: if a folder is active, only show leads in that folder
  const folderFilteredLeads = activeFolder
    ? leads.filter(l => l.folderId === activeFolder)
    : leads

  const filteredLeads = folderFilteredLeads.filter(lead => {
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
    total: folderFilteredLeads.length,
    new: folderFilteredLeads.filter(l => l.status === 'NEW').length,
    hot: folderFilteredLeads.filter(l => l.status === 'HOT_LEAD').length,
    qualified: folderFilteredLeads.filter(l => l.status === 'QUALIFIED').length,
    building: folderFilteredLeads.filter(l => l.status === 'BUILDING').length,
  }

  const activeReps = reps.filter(r => r.status === 'ACTIVE')
  const activeFolderData = folders.find(f => f.id === activeFolder)
  const unfolderedCount = leads.filter(l => !l.folderId).length

  // ===== FOLDER VIEW (no active folder selected) =====
  if (!activeFolder) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-500 mt-1">{leads.length} total leads in {folders.length} folders</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/import">
              <Button variant="outline">
                <Filter size={18} className="mr-2" />
                Import
              </Button>
            </Link>
            <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <FolderPlus size={18} className="mr-2" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                  <DialogDescription>
                    Organize your leads into folders for easy management.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Folder Name</label>
                    <Input
                      placeholder="e.g., January Import, Texas Leads..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}>
                    {creatingFolder ? 'Creating...' : 'Create Folder'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Folder Dialog */}
            <Dialog open={editFolderDialogOpen} onOpenChange={(open) => { setEditFolderDialogOpen(open); if (!open) setFolderMenuOpen(null) }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Folder</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <label className="text-sm font-medium">Folder Name</label>
                  <Input
                    className="mt-2"
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEditFolder()}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditFolderDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleEditFolder} disabled={!editFolderName.trim()}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Folders Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map((folder) => {
              const folderLeads = leads.filter(l => l.folderId === folder.id)
              const newCount = folderLeads.filter(l => l.status === 'NEW').length
              const hotCount = folderLeads.filter(l => l.status === 'HOT_LEAD').length

              return (
                <Card
                  key={folder.id}
                  className="p-6 cursor-pointer hover:shadow-md transition-all hover:border-blue-300 relative"
                  onClick={() => { setActiveFolder(folder.id); setSelectedLeads(new Set()); setStatusFilter('all') }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: folder.color + '20' }}>
                      <FolderOpen size={22} style={{ color: folder.color }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{folder.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{folder._count?.leads || 0} leads</p>
                      <div className="flex gap-2 mt-2">
                        {newCount > 0 && <Badge variant="secondary" className="text-xs">{newCount} new</Badge>}
                        {hotCount > 0 && <Badge variant="destructive" className="text-xs">{hotCount} hot</Badge>}
                      </div>
                    </div>
                    {/* Three-dot menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id) }}
                        className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>
                      {folderMenuOpen === folder.id && (
                        <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              setEditFolderId(folder.id)
                              setEditFolderName(folder.name)
                              setEditFolderDialogOpen(true)
                              setFolderMenuOpen(null)
                            }}
                          >
                            <Pencil size={14} /> Edit
                          </button>
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => handleAssignFolder(folder.id)}
                          >
                            <UserPlus size={14} /> Assign Leads
                          </button>
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            onClick={() => { setFolderMenuOpen(null); handleDeleteFolder(folder.id, folder.name) }}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}

            {/* Unfoldered leads */}
            {unfolderedCount > 0 && (
              <Card
                className="p-6 cursor-pointer hover:shadow-md transition-all hover:border-gray-400 border-dashed"
                onClick={() => { setActiveFolder('unfoldered'); setSelectedLeads(new Set()); setStatusFilter('all') }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <FolderOpen size={22} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-700">Unorganized</h3>
                    <p className="text-sm text-gray-500 mt-1">{unfolderedCount} leads not in any folder</p>
                  </div>
                </div>
              </Card>
            )}

            {folders.length === 0 && unfolderedCount === 0 && (
              <div className="col-span-full text-center py-12">
                <FolderOpen size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No folders yet</h3>
                <p className="text-gray-600 mb-4">Create a folder or import leads to get started</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setNewFolderDialogOpen(true)}>
                    <FolderPlus size={18} className="mr-2" />
                    New Folder
                  </Button>
                  <Link href="/admin/import">
                    <Button variant="outline">Import Leads</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ===== LEAD LIST VIEW (inside a folder) =====
  // If activeFolder === 'unfoldered', show leads with no folder
  const folderLeadsForView = activeFolder === 'unfoldered'
    ? leads.filter(l => !l.folderId)
    : leads.filter(l => l.folderId === activeFolder)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setActiveFolder(null); setSelectedLeads(new Set()) }}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {activeFolderData?.name || 'Unorganized'}
            </h1>
            <p className="text-gray-500 mt-1">{stats.total} leads</p>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Assignment button — opens destination picker */}
          <Button
            variant="outline"
            onClick={() => setAssignDialogOpen(true)}
            disabled={selectedLeads.size === 0}
          >
            <UserPlus size={18} className="mr-2" />
            Assignment {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteSelected}
            disabled={selectedLeads.size === 0}
          >
            Delete {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
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

      {/* Assignment Dialog — Step 1: Choose destination */}
      <Dialog open={assignDialogOpen} onOpenChange={(open) => { setAssignDialogOpen(open); if (!open) setAssignDestination(null) }}>
        <DialogContent className="sm:max-w-[450px]">
          {!assignDestination ? (
            <>
              <DialogHeader>
                <DialogTitle>Assign {selectedLeads.size} Lead{selectedLeads.size !== 1 ? 's' : ''}</DialogTitle>
                <DialogDescription>
                  Choose where to assign the selected leads.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-3">
                <button
                  onClick={() => setAssignDestination('rep-tracker')}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Target size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Sales Rep Tracker</div>
                    <div className="text-sm text-gray-500">Assign to a sales rep for calling</div>
                  </div>
                </button>
                <button
                  onClick={handleAssignToInstantly}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Mail size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Instantly Campaigns</div>
                    <div className="text-sm text-gray-500">Add to an email campaign</div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Choose rep */}
              <DialogHeader>
                <DialogTitle>
                  <button onClick={() => setAssignDestination(null)} className="mr-2 text-gray-400 hover:text-gray-600">
                    <ArrowLeft size={18} className="inline" />
                  </button>
                  Assign to Sales Rep
                </DialogTitle>
                <DialogDescription>
                  Choose a sales rep to assign {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} to.
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
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <StatCard label="Total Leads" value={stats.total} variant="default" onClick={() => { setStatusFilter('all'); setSelectedLeads(new Set()) }} active={statusFilter === 'all'} />
        <StatCard label="New" value={stats.new} variant="default" onClick={() => { setStatusFilter('NEW'); setSelectedLeads(new Set()) }} active={statusFilter === 'NEW'} />
        <StatCard label="Hot Leads" value={stats.hot} variant="danger" onClick={() => { setStatusFilter('HOT_LEAD'); setSelectedLeads(new Set()) }} active={statusFilter === 'HOT_LEAD'} />
        <StatCard label="Qualified" value={stats.qualified} variant="success" onClick={() => { setStatusFilter('QUALIFIED'); setSelectedLeads(new Set()) }} active={statusFilter === 'QUALIFIED'} />
        <StatCard label="Building" value={stats.building} variant="warning" onClick={() => { setStatusFilter('BUILDING'); setSelectedLeads(new Set()) }} active={statusFilter === 'BUILDING'} />
        <StatCard label="Closed" value={folderFilteredLeads.filter(l => l.status === 'PAID').length} variant="success" onClick={() => { setStatusFilter('PAID'); setSelectedLeads(new Set()) }} active={statusFilter === 'PAID'} />
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
                        <span className="text-sm text-gray-400">&mdash;</span>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => openEditLeadDialog(lead)}
                      >
                        <Pencil size={14} className="mr-1" /> Edit
                      </Button>
                      <Link href={`/admin/leads/${lead.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteLead(lead.id, lead.firstName)}
                      >
                        <Trash2 size={14} className="mr-1" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Lead Dialog */}
      <Dialog open={editLeadDialogOpen} onOpenChange={setEditLeadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>Update lead information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">First Name</label>
                <Input value={editLeadForm.firstName || ''} onChange={(e) => setEditLeadForm({ ...editLeadForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Name</label>
                <Input value={editLeadForm.lastName || ''} onChange={(e) => setEditLeadForm({ ...editLeadForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</label>
              <Input value={editLeadForm.companyName || ''} onChange={(e) => setEditLeadForm({ ...editLeadForm, companyName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</label>
                <Input value={editLeadForm.phone || ''} onChange={(e) => setEditLeadForm({ ...editLeadForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</label>
                <Input value={editLeadForm.email || ''} onChange={(e) => setEditLeadForm({ ...editLeadForm, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">City</label>
                <Input value={editLeadForm.city || ''} onChange={(e) => setEditLeadForm({ ...editLeadForm, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">State</label>
                <Input value={editLeadForm.state || ''} maxLength={2} onChange={(e) => setEditLeadForm({ ...editLeadForm, state: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</label>
              <select
                value={editLeadForm.status || 'NEW'}
                onChange={(e) => setEditLeadForm({ ...editLeadForm, status: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NEW">New</option>
                <option value="HOT_LEAD">Hot Lead</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="BUILDING">Building</option>
                <option value="PAID">Paid</option>
                <option value="CLOSED_LOST">Closed Lost</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLeadDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLeadEdit} disabled={savingLead}>
              {savingLead ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
