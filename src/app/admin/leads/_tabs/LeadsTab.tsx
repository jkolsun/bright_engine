'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React, { useState, useEffect, useRef } from 'react'
import {
  UserPlus, UserMinus, FolderPlus, ArrowLeft, Filter,
  LayoutGrid, List, RefreshCw, Eraser,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

import LeadsTable from '../_components/LeadsTable'
import LeadsGrid from '../_components/LeadsGrid'
import LeadFilters from '../_components/LeadFilters'
import {
  NewFolderDialog,
  EditFolderDialog,
  AddLeadDialog,
  AssignDialog,
  FolderAssignDialog,
  EditLeadDialog,
} from '../_components/LeadDialogs'
import { StatCard } from '../_components/FolderSidebar'

// ─── Error Boundary ───

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
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-lg font-bold text-red-800 dark:text-red-400">Leads Page Error</h2>
            <pre className="text-xs text-red-500 dark:text-red-400 mt-4 p-3 bg-red-100 dark:bg-red-900/40 rounded overflow-auto max-h-40">{this.state.error}</pre>
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

export default function LeadsTab() {
  return (
    <LeadsErrorBoundary>
      <LeadsPageInner />
    </LeadsErrorBoundary>
  )
}

// ─── Main orchestrator ───

function LeadsPageInner() {
  // Core data
  const [leads, setLeads] = useState<any[]>([])
  const [reps, setReps] = useState<any[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [repFilter, setRepFilter] = useState<string>('all')
  const [contactedFilter, setContactedFilter] = useState('all')

  // Selection
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())

  // View mode & pagination
  const [viewMode, setViewMode] = useState<'folders' | 'leads'>('folders')
  const [currentPage, setCurrentPage] = useState(0)
  const LEADS_PER_PAGE = 50

  // Folder state
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null)
  const [editFolderDialogOpen, setEditFolderDialogOpen] = useState(false)
  const [editFolderId, setEditFolderId] = useState<string | null>(null)
  const [editFolderName, setEditFolderName] = useState('')

  // Add lead state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creatingLead, setCreatingLead] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', companyName: '', phone: '', email: '',
    city: '', state: '', industry: '', source: 'MANUAL',
  })

  // Edit lead state
  const [editLeadDialogOpen, setEditLeadDialogOpen] = useState(false)
  const [editLeadId, setEditLeadId] = useState<string | null>(null)
  const [editLeadForm, setEditLeadForm] = useState<any>({})
  const [savingLead, setSavingLead] = useState(false)

  // Assignment state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignDestination, setAssignDestination] = useState<'rep-tracker' | null>(null)

  // Folder assign state
  const [folderAssignDialogOpen, setFolderAssignDialogOpen] = useState(false)
  const [assigningFolder, setAssigningFolder] = useState(false)

  // Expanded lead row state
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  const [expandedLeadEvents, setExpandedLeadEvents] = useState<Record<string, any[]>>({})
  const [expandedLeadData, setExpandedLeadData] = useState<Record<string, any>>({})
  const [expandedLeadNotes, setExpandedLeadNotes] = useState<Record<string, string>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})

  // Refresh
  const [refreshing, setRefreshing] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Data fetching ───

  useEffect(() => {
    fetchLeads()
    fetchReps()
    fetchFolders()

    refreshIntervalRef.current = setInterval(() => {
      fetchLeads()
    }, 30000)

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [])

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads?limit=10000')
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

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchLeads()
    setRefreshing(false)
  }

  const fetchLeadEvents = async (leadId: string) => {
    if (expandedLeadEvents[leadId]?.length > 0) return
    try {
      const res = await fetch(`/api/leads/${leadId}`)
      if (res.ok) {
        const data = await res.json()
        setExpandedLeadEvents(prev => ({ ...prev, [leadId]: data.lead?.events || [] }))
        setExpandedLeadData(prev => ({ ...prev, [leadId]: data.lead }))
      } else {
        setExpandedLeadEvents(prev => ({ ...prev, [leadId]: [] }))
      }
    } catch {
      setExpandedLeadEvents(prev => ({ ...prev, [leadId]: [] }))
    }
  }

  const saveLeadNotes = async (leadId: string) => {
    const text = expandedLeadNotes[leadId]?.trim()
    if (!text) return
    setSavingNotes(prev => ({ ...prev, [leadId]: true }))
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: text }),
      })
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, notes: text } : l))
        setExpandedLeadData(prev => ({ ...prev, [leadId]: { ...prev[leadId], notes: text } }))
      }
    } catch (err) {
      console.error('Failed to save notes:', err)
    } finally {
      setSavingNotes(prev => ({ ...prev, [leadId]: false }))
    }
  }

  // ─── Folder handlers ───

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

  // ─── Lead CRUD handlers ───

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
    if (creatingLead) return
    setCreatingLead(true)
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
          firstName: '', lastName: '', companyName: '', phone: '', email: '',
          city: '', state: '', industry: '', source: 'MANUAL',
        })
        fetchLeads()
      } else {
        alert('Failed to create lead')
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      alert('Failed to create lead')
    } finally {
      setCreatingLead(false)
    }
  }

  const handleDeleteLead = async (leadId: string, firstName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${firstName}? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' })
      if (res.ok) {
        alert('Lead deleted successfully')
        setSelectedLeads(new Set([...selectedLeads].filter(id => id !== leadId)))
        setCurrentPage(0)
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

  // ─── Bulk action handlers ───

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
        setCurrentPage(0)
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
        setCurrentPage(0)
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

  const handleClearNames = async () => {
    if (selectedLeads.size === 0) return
    const count = selectedLeads.size
    if (!confirm(`Clear first & last names for ${count} selected lead${count !== 1 ? 's' : ''}? This will remove their names so messaging uses generic greetings instead.`)) return
    try {
      const res = await fetch('/api/admin/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_names', leadIds: Array.from(selectedLeads) }),
      })
      if (res.ok) {
        const data = await res.json()
        alert(`Cleared names for ${data.updated} leads`)
        setSelectedLeads(new Set())
        setCurrentPage(0)
        fetchLeads()
      } else {
        alert('Failed to clear names')
      }
    } catch (error) {
      console.error('Error clearing names:', error)
      alert('Failed to clear names')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedLeads.size === 0) {
      alert('No leads selected')
      return
    }
    const count = selectedLeads.size
    if (!confirm(`Are you sure you want to permanently delete ${count} selected lead${count !== 1 ? 's' : ''}? This cannot be undone.`)) return
    try {
      const res = await fetch('/api/leads/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedLeads) })
      })
      if (res.ok) {
        const data = await res.json()
        alert(`Deleted ${data.deletedCount || count} leads successfully`)
        setSelectedLeads(new Set())
        setCurrentPage(0)
        fetchLeads()
      } else {
        alert('Failed to delete leads')
      }
    } catch (error) {
      console.error('Error deleting leads:', error)
      alert('Failed to delete leads')
    }
  }

  // ─── Filtering & pagination ───

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
        ? !lead.assignedTo
        : lead.assignedTo?.id === repFilter

    const matchesContacted = (() => {
      if (contactedFilter === 'all') return true
      const lastContacted = lead.lastContactedAt ? new Date(lead.lastContactedAt) : null
      const now = new Date()
      if (contactedFilter === 'never') return !lastContacted
      if (!lastContacted) return false
      if (contactedFilter === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return lastContacted >= startOfDay
      }
      if (contactedFilter === 'this_week') {
        const dayOfWeek = now.getDay()
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
        return lastContacted >= startOfWeek
      }
      if (contactedFilter === '7days') {
        return lastContacted >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }
      if (contactedFilter === '30days') {
        return lastContacted >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
      return true
    })()

    return matchesSearch && matchesStatus && matchesRep && matchesContacted
  })

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

  // ===== FOLDER VIEW =====
  if (!activeFolder && viewMode === 'folders') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 dark:text-gray-400">{leads.length} total leads in {folders.length} folders</p>
          </div>
          <div className="flex gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={() => setViewMode('folders')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-slate-700"
              >
                <LayoutGrid size={16} /> Folders
              </button>
              <button
                onClick={() => { setViewMode('leads'); setCurrentPage(0); setStatusFilter('all'); setSearchTerm('') }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <List size={16} /> All Leads
              </button>
            </div>
            <Link href="/admin/leads?tab=import">
              <Button variant="outline">
                <Filter size={18} className="mr-2" />
                Import
              </Button>
            </Link>
            <NewFolderDialog
              open={newFolderDialogOpen}
              onOpenChange={setNewFolderDialogOpen}
              folderName={newFolderName}
              onFolderNameChange={setNewFolderName}
              creating={creatingFolder}
              onCreateFolder={handleCreateFolder}
            />
            <EditFolderDialog
              open={editFolderDialogOpen}
              onOpenChange={setEditFolderDialogOpen}
              folderName={editFolderName}
              onFolderNameChange={setEditFolderName}
              onEditFolder={handleEditFolder}
              onCloseFolderMenu={() => setFolderMenuOpen(null)}
            />
          </div>
        </div>

        <LeadsGrid
          loading={loading}
          leads={leads}
          folders={folders}
          unfolderedCount={unfolderedCount}
          folderMenuOpen={folderMenuOpen}
          onFolderMenuToggle={setFolderMenuOpen}
          onFolderClick={(id) => { setActiveFolder(id); setSelectedLeads(new Set()); setStatusFilter('all') }}
          onUnfolderedClick={() => { setActiveFolder('unfoldered'); setSelectedLeads(new Set()); setStatusFilter('all') }}
          onEditFolder={(id, name) => {
            setEditFolderId(id)
            setEditFolderName(name)
            setEditFolderDialogOpen(true)
            setFolderMenuOpen(null)
          }}
          onAssignFolder={handleAssignFolder}
          onDeleteFolder={(id, name) => { setFolderMenuOpen(null); handleDeleteFolder(id, name) }}
          onNewFolderClick={() => setNewFolderDialogOpen(true)}
        />
      </div>
    )
  }

  // ===== LEAD LIST VIEW =====
  const isAllLeadsView = !activeFolder && viewMode === 'leads'

  return (
    <div className="space-y-6">
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isAllLeadsView ? 'All Leads' : (activeFolderData?.name || 'Unorganized')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{stats.total} leads</p>
          </div>
          {isAllLeadsView && (
            <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden ml-4">
              <button
                onClick={() => { setViewMode('folders'); setSelectedLeads(new Set()) }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-r border-gray-200 dark:border-slate-700"
              >
                <LayoutGrid size={16} /> Folders
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100"
              >
                <List size={16} /> All Leads
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" onClick={() => setFolderAssignDialogOpen(true)} disabled={selectedLeads.size === 0}>
            <FolderPlus size={18} className="mr-2" />
            Add to Folder {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
          <Button variant="outline" onClick={handleClearNames} disabled={selectedLeads.size === 0}>
            <Eraser size={18} className="mr-2" />
            Clear Names {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
          <Button variant="outline" onClick={() => handleBulkAssign(null)} disabled={selectedLeads.size === 0 || assigning}>
            <UserMinus size={18} className="mr-2" />
            Unassign {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
          <Button variant="outline" onClick={() => setAssignDialogOpen(true)} disabled={selectedLeads.size === 0}>
            <UserPlus size={18} className="mr-2" />
            Assignment {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
          <Button variant="destructive" onClick={handleDeleteSelected} disabled={selectedLeads.size === 0}>
            Delete {selectedLeads.size > 0 && `(${selectedLeads.size})`}
          </Button>
          <AddLeadDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            formData={formData}
            onFormDataChange={setFormData}
            creating={creatingLead}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      {/* Dialogs */}
      <AssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        selectedCount={selectedLeads.size}
        activeReps={activeReps}
        assigning={assigning}
        onBulkAssign={handleBulkAssign}
        onResetDestination={() => setAssignDestination(null)}
      />

      <FolderAssignDialog
        open={folderAssignDialogOpen}
        onOpenChange={setFolderAssignDialogOpen}
        selectedCount={selectedLeads.size}
        leads={leads}
        folders={folders}
        assigningFolder={assigningFolder}
        onAssignToFolder={handleAssignToFolder}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard label="Total Leads" value={stats.total} variant="default" onClick={() => { setStatusFilter('all'); setSelectedLeads(new Set()); setCurrentPage(0) }} active={statusFilter === 'all'} />
        <StatCard label="New" value={stats.new} variant="default" onClick={() => { setStatusFilter('NEW'); setSelectedLeads(new Set()); setCurrentPage(0) }} active={statusFilter === 'NEW'} />
        <StatCard label="Hot Leads" value={stats.hot} variant="danger" onClick={() => { setStatusFilter('HOT_LEAD'); setSelectedLeads(new Set()); setCurrentPage(0) }} active={statusFilter === 'HOT_LEAD'} />
        <StatCard label="Qualified" value={stats.qualified} variant="success" onClick={() => { setStatusFilter('QUALIFIED'); setSelectedLeads(new Set()); setCurrentPage(0) }} active={statusFilter === 'QUALIFIED'} />
        <StatCard label="Building" value={stats.building} variant="warning" onClick={() => { setStatusFilter('BUILDING'); setSelectedLeads(new Set()); setCurrentPage(0) }} active={statusFilter === 'BUILDING'} />
      </div>

      {/* Search & Filters */}
      <LeadFilters
        searchTerm={searchTerm}
        onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(0) }}
        repFilter={repFilter}
        onRepFilterChange={(v) => { setRepFilter(v); setSelectedLeads(new Set()); setCurrentPage(0) }}
        contactedFilter={contactedFilter}
        onContactedFilterChange={(v) => { setContactedFilter(v); setSelectedLeads(new Set()); setCurrentPage(0) }}
        activeReps={activeReps}
      />

      {/* Leads Table */}
      <LeadsTable
        loading={loading}
        filteredLeads={filteredLeads}
        paginatedLeads={paginatedLeads}
        selectedLeads={selectedLeads}
        onSelectionChange={setSelectedLeads}
        onSelectLead={handleSelectLead}
        expandedLead={expandedLead}
        onExpandLead={setExpandedLead}
        expandedLeadEvents={expandedLeadEvents}
        expandedLeadData={expandedLeadData}
        expandedLeadNotes={expandedLeadNotes}
        onExpandedLeadNotesChange={(id, val) => setExpandedLeadNotes(prev => ({ ...prev, [id]: val }))}
        savingNotes={savingNotes}
        onSaveNotes={saveLeadNotes}
        onFetchLeadEvents={fetchLeadEvents}
        onOpenAddDialog={() => setDialogOpen(true)}
        onOpenEditDialog={openEditLeadDialog}
        onDeleteLead={handleDeleteLead}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
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
            <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
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
      <EditLeadDialog
        open={editLeadDialogOpen}
        onOpenChange={setEditLeadDialogOpen}
        editLeadForm={editLeadForm}
        onEditLeadFormChange={setEditLeadForm}
        saving={savingLead}
        onSave={handleSaveLeadEdit}
      />
    </div>
  )
}
