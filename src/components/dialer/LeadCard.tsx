'use client'
import { useState, useEffect, useRef } from 'react'
import { useDialer } from './DialerProvider'
import { LeadInfo } from './LeadInfo'
import { QuickStats } from './QuickStats'
import { LiveFeed } from './LiveFeed'
import { PreviewButton } from './PreviewButton'
import { DispositionTree } from './DispositionTree'
import { CallNotes } from './CallNotes'
import { UpsellTags } from './UpsellTags'
import { Phone, Search, Plus, Link, UserPlus } from 'lucide-react'

const DISPOSITION_COLORS: Record<string, string> = {
  WANTS_TO_MOVE_FORWARD: 'bg-green-100 text-green-700',
  CALLBACK: 'bg-teal-100 text-teal-700',
  WANTS_CHANGES: 'bg-blue-100 text-blue-700',
  WILL_LOOK_LATER: 'bg-amber-100 text-amber-700',
  NOT_INTERESTED: 'bg-gray-100 text-gray-600',
  VOICEMAIL: 'bg-gray-100 text-gray-600',
  NO_ANSWER: 'bg-gray-100 text-gray-600',
  DNC: 'bg-red-100 text-red-700',
  WRONG_NUMBER: 'bg-red-100 text-red-700',
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  HOT_LEAD: 'bg-red-100 text-red-700',
  QUALIFIED: 'bg-green-100 text-green-700',
  NURTURE: 'bg-amber-100 text-amber-700',
}

const formatPhoneDisplay = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')
  const last10 = digits.length > 10 ? digits.slice(-10) : digits
  if (last10.length === 10) return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`
  return phone
}

function ManualCallPanel() {
  const { manualDialState, linkManualDial, createLeadFromManualDialFn } = useDialer()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedResult, setSelectedResult] = useState<any>(null)
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newContactName, setNewContactName] = useState('')
  const [linking, setLinking] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchQuery.length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/leads?search=${encodeURIComponent(searchQuery)}&limit=10`)
        const data = await res.json()
        setSearchResults(data.leads || [])
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  const handleLinkCall = async () => {
    if (!selectedResult) return
    setLinking(true)
    try {
      await linkManualDial(selectedResult.id)
    } catch (err: any) {
      console.error('[ManualCallPanel] Link failed:', err.message)
    } finally {
      setLinking(false)
    }
  }

  const handleLinkAsSecondary = async () => {
    if (!selectedResult) return
    if (selectedResult.secondaryPhone && selectedResult.secondaryPhone !== manualDialState?.phone) {
      if (!window.confirm(`This lead already has a secondary phone (${selectedResult.secondaryPhone}). Replace it with ${manualDialState?.phone}?`)) return
    }
    setLinking(true)
    try {
      await linkManualDial(selectedResult.id, { saveAsSecondary: true })
    } catch (err: any) {
      console.error('[ManualCallPanel] Link as secondary failed:', err.message)
    } finally {
      setLinking(false)
    }
  }

  const handleCreateNew = async () => {
    if (!newCompanyName.trim()) return
    setLinking(true)
    try {
      await createLeadFromManualDialFn(newCompanyName.trim(), newContactName.trim() || undefined)
    } catch (err: any) {
      console.error('[ManualCallPanel] Create failed:', err.message)
    } finally {
      setLinking(false)
    }
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-4 h-4 text-teal-600" />
          <h2 className="text-base font-bold text-gray-900">Manual Call</h2>
          {manualDialState?.phone && (
            <span className="text-sm text-gray-500">{formatPhoneDisplay(manualDialState.phone)}</span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company, name, or phone..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedResult(null) }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        {/* Search results */}
        {searchLoading && <p className="text-xs text-gray-400 py-2">Searching...</p>}
        {!searchLoading && searchResults.length > 0 && (
          <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg mb-3">
            {searchResults.map((r: any) => (
              <button
                key={r.id}
                onClick={() => setSelectedResult(r)}
                className={`w-full text-left px-3 py-2 text-sm border-b border-gray-50 transition-colors ${
                  selectedResult?.id === r.id ? 'bg-teal-50 border-l-2 border-l-teal-500' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 truncate">{r.companyName}</span>
                  {r.status && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {r.firstName || 'Unknown'} {r.phone ? `· ${r.phone}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
        {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
          <p className="text-xs text-gray-400 py-2">No leads found</p>
        )}

        {/* Link actions for selected result */}
        {selectedResult && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleLinkCall}
              disabled={linking}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
            >
              <Link className="w-3.5 h-3.5" />
              {linking ? 'Linking...' : 'Link Call'}
            </button>
            <button
              onClick={handleLinkAsSecondary}
              disabled={linking}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {linking ? 'Linking...' : 'Link & Save as 2nd'}
            </button>
          </div>
        )}

        {/* Create new lead */}
        <div className="border-t border-gray-100 pt-3">
          {!showCreateNew ? (
            <button
              onClick={() => setShowCreateNew(true)}
              className="flex items-center gap-1.5 text-sm text-teal-600 font-medium hover:text-teal-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Create New Lead
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Company name (required)"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
              <input
                type="text"
                placeholder="Contact name (optional)"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateNew}
                  disabled={linking || !newCompanyName.trim()}
                  className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {linking ? 'Creating...' : 'Create & Link'}
                </button>
                <button
                  onClick={() => { setShowCreateNew(false); setNewCompanyName(''); setNewContactName('') }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function LeadCard() {
  const { queue, currentCall, manualDialState } = useDialer()
  const lead = queue.selectedLead
  const [callHistory, setCallHistory] = useState<{ calls: any[]; nextCallback: any } | null>(null)

  // Fetch call history when lead changes
  useEffect(() => {
    if (!lead?.id) { setCallHistory(null); return }
    fetch(`/api/dialer/call/history?leadId=${lead.id}`)
      .then(r => r.ok ? r.json() : { calls: [], nextCallback: null })
      .then(setCallHistory)
      .catch(() => setCallHistory(null))
  }, [lead?.id])

  // Manual dial mode — show link panel instead of empty state
  const isManualDialMode = manualDialState?.active && !lead
  if (isManualDialMode) {
    return <ManualCallPanel />
  }

  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select a lead from the queue to get started
      </div>
    )
  }

  // Show disposition during active call AND after call ends
  const isOnCall = !!currentCall && ['INITIATED', 'RINGING', 'CONNECTED'].includes(currentCall.status)
  const callEnded = !!currentCall && ['COMPLETED', 'VOICEMAIL', 'NO_ANSWER', 'BUSY', 'FAILED'].includes(currentCall.status)
  const showDisposition = isOnCall || callEnded

  const lastCall = callHistory?.calls?.[0]

  return (
    <div className="p-6 lg:p-8 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto space-y-5">
        <LeadInfo lead={lead} />
        <QuickStats lead={lead} />

        {/* Last Call summary — shows when lead has previous calls */}
        {lastCall && (
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl border border-slate-200/80 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200/60 flex items-center justify-center">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Last Call</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">
                      {new Date(lastCall.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {lastCall.rep?.name && <span className="text-xs text-slate-400">by {lastCall.rep.name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {lastCall.connectedAt && lastCall.duration && (
                  <span className="text-sm font-mono text-slate-500">{Math.floor(lastCall.duration / 60)}:{String(lastCall.duration % 60).padStart(2, '0')}</span>
                )}
                {lastCall.dispositionResult && (
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${DISPOSITION_COLORS[lastCall.dispositionResult] || 'bg-gray-100 text-gray-600'}`}>
                    {lastCall.dispositionResult.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
            {callHistory?.nextCallback && (
              <p className="text-xs text-teal-600 font-medium mt-2 ml-11">
                Callback scheduled: {callHistory.nextCallback.notes?.startsWith('[ALL_DAY]')
                  ? `${new Date(callHistory.nextCallback.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — All Day`
                  : new Date(callHistory.nextCallback.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <PreviewButton lead={lead} />
          <UpsellTags leadId={lead.id} />
        </div>

        {/* Notes — ALWAYS visible (before, during, after call) */}
        <CallNotes />

        {/* Disposition — visible during and after call */}
        {showDisposition && <DispositionTree />}

        {/* Live Feed — always visible */}
        <LiveFeed />
      </div>
    </div>
  )
}
