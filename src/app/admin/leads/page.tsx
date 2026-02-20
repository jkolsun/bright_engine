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
import { useRouter } from 'next/navigation'
import { formatPhone } from '@/lib/utils'
import React, { useState, useEffect } from 'react'
import {
  Search, Filter, Plus, Eye, TrendingUp, UserPlus, UserMinus, Users,
  FolderOpen, FolderPlus, ArrowLeft, Target, Mail, MoreVertical, Pencil, Trash2,
  ChevronDown, ChevronRight, Sparkles, Globe, Star, MapPin, Clock, Wrench, MessageSquare, ExternalLink,
  LayoutGrid, List, ChevronLeft, RefreshCw
} from 'lucide-react'

class LeadsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: `${error.message}\n${error.stack}` }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-red-800">Leads Page Error</h2>
            <pre className="text-xs text-red-500 mt-4 p-3 bg-red-100 rounded overflow-auto max-h-40">{this.state.error}</pre>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md text-sm">
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function LeadsPage() {
  return (
    <LeadsErrorBoundary>
      <LeadsPageInner />
    </LeadsErrorBoundary>
  )
}

/** Safely render any value as a string in JSX — prevents React Error #31 */
function safeRender(value: any, fallback: string = '—'): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value || fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(', ') || fallback
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function LeadsPageInner() {
  const router = useRouter()
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
    source: 'MANUAL'
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

  // Add to folder state
  const [folderAssignDialogOpen, setFolderAssignDialogOpen] = useState(false)
  const [assigningFolder, setAssigningFolder] = useState(false)

  // Expanded lead row state
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  const [expandedLeadEvents, setExpandedLeadEvents] = useState<Record<string, any[]>>({})
  const [refreshing, setRefreshing] = useState(false)

  // View mode & pagination
  const [viewMode, setViewMode] = useState<'folders' | 'leads'>('folders')
  const [currentPage, setCurrentPage] = useState(0)
  const LEADS_PER_PAGE = 50

  useEffect(() => {
    fetchLeads()
    fetchReps()
    fetchFolders()
  }, [])

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads?limit=100')
      const data = await res.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchLeads()
    setRefreshing(false)
  }

  const fetchLeadEvents = async (leadId: string) => {
    if (expandedLeadEvents[leadId]?.length > 0) return // Already fetched with results
    try {
      const res = await fetch(`/api/leads/${leadId}`)
      if (res.ok) {
        const data = await res.json()
        setExpandedLeadEvents(prev => ({ ...prev, [leadId]: data.lead?.events || [] }))
      } else {
        setExpandedLeadEvents(prev => ({ ...prev, [leadId]: [] }))
      }
    } catch {
      setExpandedLeadEvents(prev => ({ ...prev, [leadId]: [] }))
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
        source: formData.source || 'MANUAL',
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
          source: 'MANUAL'
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

  const handleAssignToFolder = async (folderId: string | null) => {
    if (selectedLeads.size === 0) return
    setAssigningFolder(true)
    try {
      const res = await fetch('/api/folders/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedLeads), folderId }),
      })
      if (res.ok) {
        const data = await res.json()
        const folderName = folderId ? folders.find(f => f.id === folderId)?.name : null
        alert(`${data.updated} lead${data.updated !== 1 ? 's' : ''} ${folderName ? `moved to "${folderName}"` : 'removed from folder'}`)
        setSelectedLeads(new Set())
        setFolderAssignDialogOpen(false)
        fetchLeads()
        fetchFolders()
      } else {
        alert('Failed to move leads')
      }
    } catch {
      alert('Failed to move leads')
    } finally {
      setAssigningFolder(false)
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
    ? (activeFolder === 'unfoldered'
        ? leads.filter(l => !l.folderId)
        : leads.filter(l => l.folderId === activeFolder))
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
        ? !lead.assignedTo && !lead.instantlyCampaignId
        : repFilter === 'instantly'
          ? !!lead.instantlyCampaignId
          : lead.assignedTo?.id === repFilter

    return matchesSearch && matchesStatus && matchesRep
  })

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / LEADS_PER_PAGE)
  const safePage = Math.min(currentPage, Math.max(0, totalPages - 1))
  const paginatedLeads = filteredLeads.slice(safePage * LEADS_PER_PAGE, (safePage + 1) * LEADS_PER_PAGE)

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

  // ===== FOLDER VIEW (no active folder selected, folder mode) =====
  if (!activeFolder && viewMode === 'folders') {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-500 mt-1">{leads.length} total leads in {folders.length} folders</p>
          </div>
          <div className="flex gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('folders')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-gray-100 text-gray-900 border-r border-gray-200"
              >
                <LayoutGrid size={16} /> Folders
              </button>
              <button
                onClick={() => { setViewMode('leads'); setCurrentPage(0); setStatusFilter('all'); setSearchTerm('') }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <List size={16} /> All Leads
              </button>
            </div>
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

  // ===== LEAD LIST VIEW (inside a folder OR "All Leads" mode) =====
  const isAllLeadsView = !activeFolder && viewMode === 'leads'

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => {
            if (isAllLeadsView) {
              setViewMode('folders')
            } else {
              setActiveFolder(null)
            }
            setSelectedLeads(new Set())
            setCurrentPage(0)
          }}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isAllLeadsView ? 'All Leads' : (activeFolderData?.name || 'Unorganized')}
            </h1>
            <p className="text-gray-500 mt-1">{stats.total} leads</p>
          </div>
          {/* View toggle in All Leads mode */}
          {isAllLeadsView && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden ml-4">
              <button
                onClick={() => { setViewMode('folders'); setSelectedLeads(new Set()) }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-200"
              >
                <LayoutGrid size={16} /> Folders
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-gray-100 text-gray-900"
              >
                <List size={16} /> All Leads
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          {/* Refresh button */}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          {/* Add to Folder button */}
          <Button
            variant="outline"
            onClick={() => setFolderAssignDialogOpen(true)}
            disabled={selectedLeads.size === 0}
          >
            <FolderPlus size={18} className="mr-2" />
            Add to Folder {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
          {/* Unassign button */}
          <Button
            variant="outline"
            onClick={() => handleBulkAssign(null)}
            disabled={selectedLeads.size === 0 || assigning}
          >
            <UserMinus size={18} className="mr-2" />
            Unassign {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
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

      {/* Add to Folder Dialog */}
      <Dialog open={folderAssignDialogOpen} onOpenChange={setFolderAssignDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Move {selectedLeads.size} Lead{selectedLeads.size !== 1 ? 's' : ''} to Folder</DialogTitle>
            <DialogDescription>
              Choose a folder to organize the selected leads.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto">
            {/* Remove from folder option */}
            <button
              onClick={() => handleAssignToFolder(null)}
              disabled={assigningFolder}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FolderOpen size={18} className="text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Remove from Folder</div>
                <div className="text-sm text-gray-500">Move to Unorganized</div>
              </div>
            </button>

            {folders.map((folder) => {
              const count = leads.filter(l => l.folderId === folder.id).length
              return (
                <button
                  key={folder.id}
                  onClick={() => handleAssignToFolder(folder.id)}
                  disabled={assigningFolder}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: folder.color + '20' }}>
                    <FolderOpen size={18} style={{ color: folder.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{folder.name}</div>
                    <div className="text-sm text-gray-500">{count} leads</div>
                  </div>
                </button>
              )
            })}

            {folders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FolderOpen size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No folders yet.</p>
                <p className="text-sm">Create a folder from the Folders view first.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <StatCard label="Total Leads" value={stats.total} variant="default" onClick={() => { setStatusFilter('all'); setSelectedLeads(new Set()); setCurrentPage(0) }} active={statusFilter === 'all'} />
        <StatCard label="New" value={stats.new} variant="default" onClick={() => { setStatusFilter('NEW'); setSelectedLeads(new Set()); setCurrentPage(0) }} active={statusFilter === 'NEW'} />
        <StatCard label="Hot Leads" value={stats.hot} variant="danger" onClick={() => { setStatusFilter('HOT_LEAD'); setSelectedLeads(new Set()); setCurrentPage(0) }} active={statusFilter === 'HOT_LEAD'} />
        <StatCard label="Qualified" value={stats.qualified} variant="success" onClick={() => { setStatusFilter('QUALIFIED'); setSelectedLeads(new Set()); setCurrentPage(0) }} active={statusFilter === 'QUALIFIED'} />
        <StatCard label="Building" value={stats.building} variant="warning" onClick={() => { setStatusFilter('BUILDING'); setSelectedLeads(new Set()); setCurrentPage(0) }} active={statusFilter === 'BUILDING'} />
        <StatCard label="Closed" value={folderFilteredLeads.filter(l => l.status === 'PAID').length} variant="success" onClick={() => { setStatusFilter('PAID'); setSelectedLeads(new Set()); setCurrentPage(0) }} active={statusFilter === 'PAID'} />
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
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0) }}
            />
          </div>
          <select
            value={repFilter}
            onChange={(e) => { setRepFilter(e.target.value); setSelectedLeads(new Set()); setCurrentPage(0) }}
            className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Reps</option>
            <option value="unassigned">Unassigned</option>
            <option value="instantly">Instantly Campaigns</option>
            {activeReps.map((rep) => (
              <option key={rep.id} value={rep.id}>{rep.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Leads Table — horizontally scrollable with frozen columns */}
      <Card className="overflow-hidden">
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
          <div className="overflow-x-auto relative">
            <table className="w-max min-w-full border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {/* Sticky left: checkbox */}
                  <th className="sticky left-0 z-20 bg-gray-50 text-center p-3 w-12 border-r border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                      title="Select all"
                    />
                  </th>
                  {/* Scrollable columns */}
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Company</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Phone</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Location</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Industry</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Source</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Website</th>
                  <th className="text-center p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Rating</th>
                  <th className="text-center p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Reviews</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Personalization</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Notes</th>
                  {/* Sticky right: Assigned To, Status, Actions */}
                  <th className="sticky right-[200px] z-20 bg-gray-50 text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-l border-gray-200 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]">Assigned To</th>
                  <th className="sticky right-[100px] z-20 bg-gray-50 text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="sticky right-0 z-20 bg-gray-50 text-center p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedLeads.map((lead) => {
                  const isSelected = selectedLeads.has(lead.id)
                  const isExpanded = expandedLead === lead.id
                  const rowBg = isSelected ? 'bg-blue-50' : 'bg-white'
                  const hoverBg = isSelected ? 'hover:bg-blue-100' : 'hover:bg-gray-50'

                  let personalizationData: any = null
                  try {
                    if (lead.personalization) {
                      personalizationData = typeof lead.personalization === 'string'
                        ? JSON.parse(lead.personalization)
                        : lead.personalization
                    }
                  } catch { /* ignore */ }

                  return (
                    <React.Fragment key={lead.id}>
                      <tr className={`${hoverBg} ${rowBg} cursor-pointer`} onClick={() => { const next = isExpanded ? null : lead.id; setExpandedLead(next); if (next) fetchLeadEvents(lead.id) }}>
                        {/* Sticky left: checkbox */}
                        <td className={`sticky left-0 z-10 ${rowBg} text-center p-3 border-r border-gray-100`} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectLead(lead.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        {/* Scrollable data columns */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                            <div className="font-medium text-gray-900 text-sm">{lead.firstName} {lead.lastName}</div>
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap text-sm text-gray-700">{lead.companyName || '—'}</td>
                        <td className="p-3 whitespace-nowrap text-sm text-gray-700">{lead.phone ? formatPhone(lead.phone) : '—'}</td>
                        <td className="p-3 whitespace-nowrap text-sm text-gray-700">{lead.email || '���'}</td>
                        <td className="p-3 whitespace-nowrap text-sm text-gray-700">
                          {lead.city || lead.state ? `${lead.city || ''}${lead.city && lead.state ? ', ' : ''}${lead.state || ''}` : '—'}
                        </td>
                        <td className="p-3 whitespace-nowrap text-sm text-gray-700">{lead.industry || '—'}</td>
                        <td className="p-3 whitespace-nowrap text-sm text-gray-700">{lead.source || '—'}</td>
                        <td className="p-3 whitespace-nowrap text-sm">
                          {lead.website ? (
                            <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline max-w-[180px] truncate block" onClick={(e) => e.stopPropagation()}>
                              {lead.website.replace(/^https?:\/\//, '')}
                            </a>
                          ) : '—'}
                        </td>
                        <td className="p-3 whitespace-nowrap text-sm text-center text-gray-700">
                          {lead.enrichedRating ? (
                            <span className="font-medium">{Number(lead.enrichedRating).toFixed(1)}</span>
                          ) : '—'}
                        </td>
                        <td className="p-3 whitespace-nowrap text-sm text-center text-gray-700">
                          {lead.enrichedReviews ?? '—'}
                        </td>
                        <td className="p-3 text-sm text-gray-700 max-w-[250px] relative group/pers">
                          {personalizationData?.firstLine ? (
                            <div className="flex items-center gap-1.5">
                              {personalizationData.tier && (
                                <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  personalizationData.tier === 'S' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300' :
                                  personalizationData.tier === 'A' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300' :
                                  'bg-gray-100 text-gray-600 ring-1 ring-gray-300'
                                }`}>{safeRender(personalizationData.tier)}</span>
                              )}
                              <Sparkles size={13} className="text-purple-500 flex-shrink-0" />
                              <span className="truncate">{safeRender(personalizationData.firstLine)}</span>
                              {/* Hover tooltip showing full personalization */}
                              <div className="hidden group-hover/pers:block absolute left-0 top-full z-50 mt-1 w-80 bg-white border border-purple-200 rounded-lg shadow-xl p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                  <Sparkles size={14} className="text-purple-500" />
                                  <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">AI Personalization</span>
                                  {personalizationData.tier && (
                                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      personalizationData.tier === 'S' ? 'bg-yellow-100 text-yellow-800' :
                                      personalizationData.tier === 'A' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>Tier {safeRender(personalizationData.tier)}</span>
                                  )}
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">First Line</div>
                                  <p className="text-xs text-gray-800 leading-relaxed">{safeRender(personalizationData.firstLine)}</p>
                                </div>
                                {personalizationData.hook && (
                                  <div>
                                    <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">Hook</div>
                                    <p className="text-xs text-gray-700">{safeRender(personalizationData.hook)}</p>
                                  </div>
                                )}
                                {personalizationData.angle && (
                                  <div>
                                    <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">Angle</div>
                                    <p className="text-xs text-gray-700">{safeRender(personalizationData.angle)}</p>
                                  </div>
                                )}
                                {personalizationData.websiteCopy && (
                                  <div>
                                    <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">Website Copy</div>
                                    {typeof personalizationData.websiteCopy === 'object' ? (
                                      <div className="space-y-0.5">
                                        {personalizationData.websiteCopy.heroHeadline && (
                                          <p className="text-xs text-gray-700 font-medium">{String(personalizationData.websiteCopy.heroHeadline)}</p>
                                        )}
                                        {personalizationData.websiteCopy.heroSubheadline && (
                                          <p className="text-xs text-gray-600 italic">{String(personalizationData.websiteCopy.heroSubheadline)}</p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-600 italic">{safeRender(personalizationData.websiteCopy)}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="p-3 text-sm text-gray-700 max-w-[150px]">
                          <div className="truncate" title={safeRender(lead.notes, '')}>{safeRender(lead.notes)}</div>
                        </td>
                        {/* Sticky right: Assigned To */}
                        <td className={`sticky right-[200px] z-10 ${rowBg} p-3 whitespace-nowrap border-l border-gray-100 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]`}>
                          <div className="flex flex-col gap-1">
                            {lead.assignedTo && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                                <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-800">
                                  {lead.assignedTo.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                </span>
                                {lead.assignedTo.name}
                              </span>
                            )}
                            {lead.instantlyCampaignId && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
                                <Mail size={12} />
                                Instantly
                              </span>
                            )}
                            {!lead.assignedTo && !lead.instantlyCampaignId && (
                              <span className="text-xs text-gray-400">&mdash;</span>
                            )}
                          </div>
                        </td>
                        {/* Sticky right: Status */}
                        <td className={`sticky right-[100px] z-10 ${rowBg} p-3 whitespace-nowrap`}>
                          <Badge variant={
                            lead.status === 'HOT_LEAD' ? 'destructive' :
                            lead.status === 'QUALIFIED' ? 'default' :
                            lead.status === 'BUILDING' ? 'secondary' :
                            lead.status === 'PAID' ? 'default' :
                            'secondary'
                          } className="text-xs">
                            {lead.status}
                          </Badge>
                        </td>
                        {/* Sticky right: Actions */}
                        <td className={`sticky right-0 z-10 ${rowBg} p-3 whitespace-nowrap w-[100px]`} onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {lead.previewUrl && (
                              <button
                                onClick={() => window.open(lead.previewUrl, '_blank')}
                                title="Preview"
                                className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Eye size={15} />
                              </button>
                            )}
                            <button
                              onClick={() => router.push(`/admin/messages?leadId=${lead.id}`)}
                              title="Open Chat"
                              className="p-1.5 rounded-md text-teal-600 hover:bg-teal-50 transition-colors"
                            >
                              <MessageSquare size={15} />
                            </button>
                            <button
                              onClick={() => openEditLeadDialog(lead)}
                              title="Edit"
                              className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteLead(lead.id, lead.firstName)}
                              title="Delete"
                              className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="bg-gray-50/70">
                          <td colSpan={16} className="p-0">
                            <div className="px-6 py-5 space-y-4 border-t border-b border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* Personalization Panel */}
                                <div className="bg-white rounded-lg border border-purple-200 p-4 shadow-sm">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-md bg-purple-100 flex items-center justify-center">
                                      <Sparkles size={15} className="text-purple-600" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 text-sm">AI Personalization</h4>
                                    {personalizationData?.tier && (
                                      <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                                        personalizationData.tier === 'S' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300' :
                                        personalizationData.tier === 'A' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' :
                                        'bg-gray-100 text-gray-600 ring-1 ring-gray-300'
                                      }`}>Tier {safeRender(personalizationData.tier)}</span>
                                    )}
                                  </div>
                                  {personalizationData ? (
                                    <div className="space-y-3">
                                      <div>
                                        <div className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">First Line</div>
                                        <p className="text-sm text-gray-800 leading-relaxed">{safeRender(personalizationData.firstLine)}</p>
                                      </div>
                                      {personalizationData.hook && (
                                        <div>
                                          <div className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Hook</div>
                                          <p className="text-sm text-gray-700">{safeRender(personalizationData.hook)}</p>
                                        </div>
                                      )}
                                      {personalizationData.angle && (
                                        <div>
                                          <div className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Angle</div>
                                          <p className="text-sm text-gray-700">{safeRender(personalizationData.angle)}</p>
                                        </div>
                                      )}
                                      {personalizationData.websiteCopy && (
                                        <div>
                                          <div className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Website Copy</div>
                                          {typeof personalizationData.websiteCopy === 'object' ? (
                                            <div className="space-y-1">
                                              {personalizationData.websiteCopy.heroHeadline && (
                                                <p className="text-sm text-gray-700 font-medium">{String(personalizationData.websiteCopy.heroHeadline)}</p>
                                              )}
                                              {personalizationData.websiteCopy.heroSubheadline && (
                                                <p className="text-sm text-gray-600 italic">{String(personalizationData.websiteCopy.heroSubheadline)}</p>
                                              )}
                                            </div>
                                          ) : (
                                            <p className="text-sm text-gray-600 italic">{safeRender(personalizationData.websiteCopy)}</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">No personalization generated yet</p>
                                  )}
                                </div>

                                {/* Enrichment Panel */}
                                <div className="bg-white rounded-lg border border-teal-200 p-4 shadow-sm">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-md bg-teal-100 flex items-center justify-center">
                                      <Globe size={15} className="text-teal-600" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 text-sm">Enrichment Data</h4>
                                  </div>
                                  {(lead.enrichedRating != null || lead.enrichedAddress || (Array.isArray(lead.enrichedServices) && lead.enrichedServices.length > 0)) ? (
                                    <div className="space-y-3">
                                      {lead.enrichedRating != null && (
                                        <div className="flex items-center gap-2">
                                          <Star size={14} className="text-amber-500" />
                                          <span className="text-sm font-medium text-gray-900">{Number(lead.enrichedRating || 0).toFixed(1)}</span>
                                          <span className="text-xs text-gray-500">({lead.enrichedReviews ?? 0} reviews)</span>
                                        </div>
                                      )}
                                      {lead.enrichedAddress && (
                                        <div className="flex items-start gap-2">
                                          <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                          <span className="text-sm text-gray-700">{safeRender(lead.enrichedAddress)}</span>
                                        </div>
                                      )}
                                      {lead.enrichedServices && Array.isArray(lead.enrichedServices) && lead.enrichedServices.length > 0 && (
                                        <div>
                                          <div className="flex items-center gap-1.5 mb-1.5">
                                            <Wrench size={13} className="text-gray-400" />
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Services</span>
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {(lead.enrichedServices as any[]).slice(0, 8).map((svc: any, i: number) => (
                                              <span key={i} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{typeof svc === 'string' ? svc : String(svc)}</span>
                                            ))}
                                            {(lead.enrichedServices as any[]).length > 8 && (
                                              <span className="text-xs text-gray-400">+{(lead.enrichedServices as any[]).length - 8} more</span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      {lead.enrichedHours && typeof lead.enrichedHours === 'object' && (
                                        <div className="flex items-start gap-2">
                                          <Clock size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                          <div className="text-xs text-gray-600">
                                            {Array.isArray(lead.enrichedHours) ? (
                                              lead.enrichedHours.slice(0, 3).map((h: any, i: number) => (
                                                <div key={i}>{typeof h === 'string' ? h : JSON.stringify(h)}</div>
                                              ))
                                            ) : (
                                              <span>Hours available</span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">No enrichment data yet</p>
                                  )}
                                </div>

                                {/* Lead Details Panel */}
                                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                                      <MessageSquare size={15} className="text-gray-600" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 text-sm">Details</h4>
                                  </div>
                                  <div className="space-y-3">
                                    {lead.campaign && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Campaign</div>
                                        <p className="text-sm text-gray-800">{lead.campaign}</p>
                                      </div>
                                    )}
                                    {lead.sourceDetail && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Source Detail</div>
                                        <p className="text-sm text-gray-800">{lead.sourceDetail}</p>
                                      </div>
                                    )}
                                    {lead.notes && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Notes</div>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
                                      </div>
                                    )}
                                    {lead.previewUrl && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Preview</div>
                                        <a href={lead.previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                                          <ExternalLink size={13} />
                                          View Preview Site
                                        </a>
                                      </div>
                                    )}
                                    {lead.priority && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Priority</div>
                                        <Badge variant={lead.priority === 'HOT' ? 'destructive' : lead.priority === 'WARM' ? 'secondary' : 'outline'} className="text-xs">
                                          {lead.priority}
                                        </Badge>
                                      </div>
                                    )}
                                    {!lead.campaign && !lead.sourceDetail && !lead.notes && !lead.previewUrl && (
                                      <p className="text-sm text-gray-400 italic">No additional details</p>
                                    )}
                                  </div>
                                </div>

                                {/* Event Timeline Panel */}
                                <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center">
                                      <Clock size={15} className="text-blue-600" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 text-sm">Event Timeline</h4>
                                  </div>
                                  {(() => {
                                    const events = expandedLeadEvents[lead.id]
                                    if (!events) return <p className="text-sm text-gray-400 italic">Loading events...</p>
                                    if (events.length === 0) return <p className="text-sm text-gray-400 italic">No events recorded yet.</p>
                                    const getIcon = (type: string) => {
                                      switch (type) {
                                        case 'PREVIEW_VIEWED': return '👁️'
                                        case 'PREVIEW_CTA_CLICKED': return '🔥'
                                        case 'PREVIEW_RETURN_VISIT': return '🔄'
                                        case 'TEXT_SENT': return '📤'
                                        case 'TEXT_RECEIVED': return '📥'
                                        case 'EMAIL_SENT': return '📧'
                                        case 'SMS_FALLBACK_EMAIL': return '⚠️'
                                        case 'CALL_LOGGED': return '📞'
                                        case 'STATUS_CHANGE': return '🔀'
                                        case 'HOT_LEAD_DETECTED': return '🔥'
                                        case 'CLOSE_ENGINE_TRIGGERED': return '🤖'
                                        default: return '📌'
                                      }
                                    }
                                    return (
                                      <div className="space-y-1.5 max-h-72 overflow-y-auto">
                                        {events.map((event: any) => (
                                          <div key={event.id} className="flex items-start gap-2 text-sm py-1.5 border-b border-gray-50">
                                            <span className="text-base flex-shrink-0">{getIcon(event.eventType)}</span>
                                            <div className="flex-1 min-w-0">
                                              <span className="font-medium text-gray-700">{event.eventType.replace(/_/g, ' ')}</span>
                                              {event.actor && event.actor !== 'system' && (
                                                <span className="text-gray-400 ml-1">by {event.actor}</span>
                                              )}
                                            </div>
                                            <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                              {new Date(event.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )
                                  })()}
                                </div>

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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {safePage * LEADS_PER_PAGE + 1}–{Math.min((safePage + 1) * LEADS_PER_PAGE, filteredLeads.length)} of {filteredLeads.length} leads
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft size={16} className="mr-1" /> Previous
            </Button>
            <span className="text-sm text-gray-600 px-2">
              Page {safePage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

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
