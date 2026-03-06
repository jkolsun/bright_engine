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
  WANTS_TO_MOVE_FORWARD: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  CALLBACK: 'bg-teal-100 text-teal-700 dark:text-teal-400',
  WANTS_CHANGES: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  WILL_LOOK_LATER: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  NOT_INTERESTED: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400',
  VOICEMAIL: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400',
  NO_ANSWER: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400',
  DNC: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  WRONG_NUMBER: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  HOT_LEAD: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  QUALIFIED: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  NURTURE: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
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
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-4 h-4 text-teal-600" />
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Manual Call</h2>
          {manualDialState?.phone && (
            <span className="text-sm text-gray-500 dark:text-gray-400">{formatPhoneDisplay(manualDialState.phone)}</span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by company, name, or phone..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedResult(null) }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-800 dark:text-gray-100"
          />
        </div>

        {/* Search results */}
        {searchLoading && <p className="text-xs text-gray-400 dark:text-gray-500 py-2">Searching...</p>}
        {!searchLoading && searchResults.length > 0 && (
          <div className="max-h-48 overflow-y-auto border border-gray-100 dark:border-slate-800 rounded-lg mb-3">
            {searchResults.map((r: any) => (
              <button
                key={r.id}
                onClick={() => setSelectedResult(r)}
                className={`w-full text-left px-3 py-2 text-sm border-b border-gray-50 dark:border-slate-800 transition-colors ${
                  selectedResult?.id === r.id ? 'bg-teal-50 dark:bg-teal-950/30 border-l-2 border-l-teal-500' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{r.companyName}</span>
                  {r.status && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'}`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {r.firstName || 'Unknown'} {r.phone ? `· ${r.phone}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
        {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No leads found</p>
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
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {linking ? 'Linking...' : 'Link & Save as 2nd'}
            </button>
          </div>
        )}

        {/* Create new lead */}
        <div className="border-t border-gray-100 dark:border-slate-800 pt-3">
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
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-800 dark:text-gray-100"
              />
              <input
                type="text"
                placeholder="Contact name (optional)"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-800 dark:text-gray-100"
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
                  className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700"
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

const getFunnelStageColor = (stage: string): string => {
  switch (stage) {
    case 'QUEUED': return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
    case 'TEXTED': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
    case 'CLICKED': return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
    case 'REP_CALLED': return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400'
    case 'OPTED_IN': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
    case 'DRIP_ACTIVE': return 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400'
    case 'HOT': return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
    case 'CLOSED': return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
    case 'OPTED_OUT': return 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
    case 'ARCHIVED': return 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
    default: return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
  }
}

export function LeadCard() {
  const { queue, currentCall, manualDialState, isViewingRecentLead, recentCallId, showRecentLeadBanner } = useDialer()
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
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        Select a lead from the queue to get started
      </div>
    )
  }

  // Show disposition during active call, after call ends, OR when viewing a recent lead
  const isOnCall = !!currentCall && ['INITIATED', 'RINGING', 'CONNECTED'].includes(currentCall.status)
  const callEnded = !!currentCall && ['COMPLETED', 'VOICEMAIL', 'NO_ANSWER', 'BUSY', 'FAILED'].includes(currentCall.status)
  const isRecentWithCall = isViewingRecentLead && !!recentCallId
  const showDisposition = isOnCall || callEnded || isRecentWithCall

  const lastCall = callHistory?.calls?.[0]

  return (
    <div className="p-6 lg:p-8 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto space-y-5">
        {showRecentLeadBanner && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Viewing a recently called lead. Your active call is still running.</span>
            <button
              onClick={() => { if (currentCall?.leadId) queue.setSelectedLeadId(currentCall.leadId) }}
              className="text-xs font-semibold text-amber-600 hover:text-amber-800 whitespace-nowrap ml-3"
            >
              Back to active call →
            </button>
          </div>
        )}
        <LeadInfo lead={lead} />
        <QuickStats lead={lead} />

        {/* SMS Campaign Timeline */}
        {lead.smsCampaignLead && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SMS Funnel Timeline</p>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getFunnelStageColor(lead.smsCampaignLead.funnelStage)}`}>
                {lead.smsCampaignLead.funnelStage.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
              {lead.smsCampaignLead.coldTextSentAt && (
                <p>📤 Text sent: {new Date(lead.smsCampaignLead.coldTextSentAt).toLocaleString()}</p>
              )}
              {lead.smsCampaignLead.previewClickedAt && (
                <p>👁️ Preview clicked: {new Date(lead.smsCampaignLead.previewClickedAt).toLocaleString()}</p>
              )}
              {lead.smsCampaignLead.optedInAt && (
                <p>✅ Opted in: {new Date(lead.smsCampaignLead.optedInAt).toLocaleString()}</p>
              )}
              {lead.smsCampaignLead.dripCurrentStep > 0 && (
                <p>📤 Drip step: {lead.smsCampaignLead.dripCurrentStep} / 5</p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              {['CLICKED', 'REP_CALLED'].includes(lead.smsCampaignLead.funnelStage) && (
                <button
                  onClick={async () => {
                    try {
                      await fetch(`/api/campaigns/${lead.smsCampaignLead!.campaignId}/opt-in`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ campaignLeadId: lead.smsCampaignLead!.id, method: 'verbal_rep_call' }),
                      })
                      queue.refresh()
                    } catch (err) {
                      console.error('[LeadCard] Mark opted in failed:', err)
                    }
                  }}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ Mark Opted In
                </button>
              )}
              {!['OPTED_OUT', 'ARCHIVED', 'CLOSED'].includes(lead.smsCampaignLead.funnelStage) && (
                <button
                  onClick={async () => {
                    try {
                      await fetch(`/api/campaigns/lead/${lead.smsCampaignLead!.id}/archive`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ funnelStage: 'ARCHIVED' }),
                      })
                      queue.refresh()
                    } catch (err) {
                      console.error('[LeadCard] Not interested failed:', err)
                    }
                  }}
                  className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Not Interested
                </button>
              )}
            </div>
          </div>
        )}

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
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${DISPOSITION_COLORS[lastCall.dispositionResult] || 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'}`}>
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
