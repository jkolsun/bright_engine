'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { BulkSelectDropdown } from '@/components/ui/BulkSelectDropdown'

const DISPOSITION_BADGE: Record<string, { label: string; className: string }> = {
  WANTS_TO_MOVE_FORWARD: { label: 'Moving Forward', className: 'bg-green-100 text-green-700' },
  INTERESTED_VERBAL: { label: 'Interested', className: 'bg-green-100 text-green-700' },
  CALLBACK: { label: 'Callback', className: 'bg-teal-100 text-teal-700' },
  WANTS_CHANGES: { label: 'Wants Changes', className: 'bg-teal-100 text-teal-700' },
  WILL_LOOK_LATER: { label: 'Will Look Later', className: 'bg-blue-100 text-blue-700' },
  NOT_INTERESTED: { label: 'Not Interested', className: 'bg-gray-100 text-gray-600' },
  DNC: { label: 'DNC', className: 'bg-red-100 text-red-700' },
  WRONG_NUMBER: { label: 'Wrong Number', className: 'bg-red-100 text-red-600' },
  DISCONNECTED: { label: 'Disconnected', className: 'bg-red-100 text-red-600' },
  NO_ANSWER: { label: 'No Answer', className: 'bg-amber-100 text-amber-700' },
  VOICEMAIL: { label: 'Voicemail', className: 'bg-purple-100 text-purple-700' },
}

const DISPOSITION_OPTIONS = [
  { value: '', label: 'All Dispositions' },
  { value: 'WANTS_TO_MOVE_FORWARD', label: 'Wants to Move Forward' },
  { value: 'CALLBACK', label: 'Callback' },
  { value: 'WANTS_CHANGES', label: 'Wants Changes' },
  { value: 'WILL_LOOK_LATER', label: 'Will Look Later' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'VOICEMAIL', label: 'Voicemail' },
  { value: 'NO_ANSWER', label: 'No Answer' },
  { value: 'DNC', label: 'DNC' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number' },
  { value: 'DISCONNECTED', label: 'Disconnected' },
  { value: 'INTERESTED_VERBAL', label: 'Interested Verbal' },
]

const TEMP_OPTIONS = [
  { value: '', label: 'All Temperatures' },
  { value: 'HOT', label: 'Hot' },
  { value: 'WARM', label: 'Warm' },
  { value: 'COLD', label: 'Cold' },
]

interface LeadBankEntry {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string
  phone: string
  email: string | null
  city: string | null
  state: string | null
  status: string
  priority: string | null
  engagementScore: number | null
  engagementLevel: string | null
  previewUrl: string | null
  previewId: string | null
  lastCall: {
    id: string
    dispositionResult: string
    startedAt: string
    duration: number | null
    notes: string | null
    repId: string
    repName: string | null
  }
}

function getDefaultStartDate(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  return monday.toISOString().split('T')[0]
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
  }
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
}

export default function RepLeadBankPage() {
  const [leads, setLeads] = useState<LeadBankEntry[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hotCount, setHotCount] = useState(0)
  const [warmCount, setWarmCount] = useState(0)
  const [coldCount, setColdCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [startDate, setStartDate] = useState(getDefaultStartDate)
  const [endDate, setEndDate] = useState(getToday)
  const [dispositionFilter, setDispositionFilter] = useState('')
  const [tempFilter, setTempFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Action state
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  // Track per-row loading for individual "Add to queue" buttons
  const [addingId, setAddingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (dispositionFilter) params.set('disposition', dispositionFilter)
      if (tempFilter) params.set('temperature', tempFilter)
      if (searchQuery) params.set('search', searchQuery)
      params.set('page', String(page))

      const res = await fetch(`/api/reps/lead-bank?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()

      setLeads(data.leads || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
      setHotCount(data.hotCount || 0)
      setWarmCount(data.warmCount || 0)
      setColdCount(data.coldCount || 0)
    } catch (err) {
      console.error('LeadBank fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, dispositionFilter, tempFilter, searchQuery, page])

  useEffect(() => { fetchData() }, [fetchData])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => { setPage(1) }, [startDate, endDate, dispositionFilter, tempFilter])
  useEffect(() => { setSelectedIds(new Set()) }, [leads])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)))
    }
  }

  const clearFilters = () => {
    setStartDate(getDefaultStartDate())
    setEndDate(getToday())
    setDispositionFilter('')
    setTempFilter('')
    setSearchInput('')
    setSearchQuery('')
    setPage(1)
  }

  const addToQueue = async (leadIds: string[]) => {
    if (leadIds.length === 0) return
    setActionLoading(true)
    setActionMessage(null)

    try {
      const res = await fetch('/api/reps/lead-bank/add-to-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setActionMessage({ type: 'success', text: `${data.assigned} lead${data.assigned > 1 ? 's' : ''} added to your queue` })
      setSelectedIds(new Set())
      fetchData()
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to add leads to queue' })
    } finally {
      setActionLoading(false)
      setAddingId(null)
    }
  }

  useEffect(() => {
    if (actionMessage) {
      const t = setTimeout(() => setActionMessage(null), 3000)
      return () => clearTimeout(t)
    }
  }, [actionMessage])

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lead Bank</h1>
        <p className="text-sm text-gray-500 mt-1">Your call history — filter and re-add leads to your queue</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Disposition</label>
            <select
              value={dispositionFilter}
              onChange={e => setDispositionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[160px]"
            >
              {DISPOSITION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Temperature</label>
            <select
              value={tempFilter}
              onChange={e => setTempFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[140px]"
            >
              {TEMP_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Name, company, phone..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-3 mb-4 text-sm">
        <span className="text-gray-600 font-medium">Showing {total} leads</span>
        <span className="text-gray-300">|</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-gray-600">{hotCount} Hot</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-gray-600">{warmCount} Warm</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-600">{coldCount} Cold</span>
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="pl-4 pr-2 py-3 text-left">
                  <BulkSelectDropdown
                    pageItemIds={leads.map(l => l.id)}
                    allItemIds={leads.map(l => l.id)}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                  />
                </th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Lead Name</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Company</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Phone</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Location</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Last Disposition</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Temp</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Score</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Last Called</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-gray-500">
                    No leads match your filters. Try adjusting the date range or clearing filters.
                  </td>
                </tr>
              ) : (
                leads.map(lead => {
                  const disp = DISPOSITION_BADGE[lead.lastCall.dispositionResult]
                  const priority = lead.priority || 'NORMAL'
                  const tempBadge = priority === 'HOT'
                    ? 'bg-red-100 text-red-700'
                    : priority === 'WARM'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                  const tempLabel = priority === 'HOT' ? 'Hot' : priority === 'WARM' ? 'Warm' : 'Cold'

                  return (
                    <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="pl-4 pr-2 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown'}
                      </td>
                      <td className="px-3 py-3 text-gray-700">{lead.companyName}</td>
                      <td className="px-3 py-3 text-gray-600">{lead.phone}</td>
                      <td className="px-3 py-3 text-gray-600">
                        {[lead.city, lead.state].filter(Boolean).join(', ') || '-'}
                      </td>
                      <td className="px-3 py-3">
                        {disp ? (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${disp.className}`}>
                            {disp.label}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">{lead.lastCall.dispositionResult}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${tempBadge}`}>
                          {tempLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {lead.engagementScore != null ? lead.engagementScore : '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        {formatRelativeTime(lead.lastCall.startedAt)}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => {
                            setAddingId(lead.id)
                            addToQueue([lead.id])
                          }}
                          disabled={addingId === lead.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50"
                        >
                          {addingId === lead.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          Add to queue
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 px-6 py-3 md:bottom-0 bottom-16">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{selectedIds.size} leads selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => addToQueue(Array.from(selectedIds))}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add to my queue
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Toast */}
      {actionMessage && (
        <div className="fixed top-6 right-6 z-[70] animate-fade-in">
          <div className={`rounded-xl shadow-lg p-4 flex items-center gap-3 ${
            actionMessage.type === 'success' ? 'bg-white border border-green-200' : 'bg-white border border-red-200'
          }`}>
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <span className="text-sm font-medium text-gray-900">{actionMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  )
}
