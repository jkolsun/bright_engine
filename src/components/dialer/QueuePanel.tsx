'use client'
import { useState, useRef, useEffect } from 'react'
import { useDialer } from './DialerProvider'
import { Phone, RefreshCw, Clock, PhoneMissed, CheckCircle, Search, X, ChevronDown, PanelLeftClose } from 'lucide-react'

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

// Disposition sub-filter groups for Called tab
const CALLED_PILLS = [
  { key: null, label: 'All' },
  { key: 'interested', label: 'Interested', dispositions: ['WANTS_TO_MOVE_FORWARD', 'INTERESTED_VERBAL', 'CALLBACK', 'WANTS_CHANGES', 'WILL_LOOK_LATER'] },
  { key: 'not_reached', label: 'Not Reached', dispositions: ['NO_ANSWER', 'VOICEMAIL'] },
  { key: 'rejected', label: 'Rejected', dispositions: ['NOT_INTERESTED', 'DNC', 'WRONG_NUMBER', 'DISCONNECTED'] },
]

export function QueuePanel({ onCollapse }: { onCollapse?: () => void }) {
  const { queue } = useDialer()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [dispoFilter, setDispoFilter] = useState<string | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filters = [
    { key: 'fresh' as const, label: 'Fresh Leads', icon: Phone, count: queue.freshLeads.length, color: 'text-teal-600', bg: 'bg-teal-50' },
    { key: 'retry' as const, label: 'Retry', icon: RefreshCw, count: queue.retryLeads.length, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'scheduled' as const, label: 'Scheduled', icon: Clock, count: queue.callbacks.length, color: 'text-purple-600', bg: 'bg-purple-50' },
    { key: 'missed' as const, label: 'Missed', icon: PhoneMissed, count: queue.missed.length, color: 'text-red-600', bg: 'bg-red-50' },
    { key: 'called' as const, label: 'Called', icon: CheckCircle, count: queue.calledLeads.length, color: 'text-gray-600', bg: 'bg-gray-100' },
  ]

  const active = filters.find(f => f.key === queue.activeTab) || filters[0]

  const handleFilterSelect = (key: typeof queue.activeTab) => {
    queue.setActiveTab(key)
    queue.setSearchQuery('') // Clear search when switching tabs
    setDispoFilter(null)     // Clear sub-filter when switching tabs
    setFilterOpen(false)
  }

  // Apply disposition sub-filter on top of search-filtered leads
  const displayLeads = queue.activeTab === 'called' && dispoFilter
    ? queue.leads.filter((l: any) => {
        const pill = CALLED_PILLS.find(p => p.key === dispoFilter)
        return pill?.dispositions?.includes(l.lastDisposition)
      })
    : queue.leads

  const handleCancelCallback = async (callbackId: string) => {
    setCancellingId(callbackId)
    try {
      const res = await fetch(`/api/dialer/callback/${callbackId}`, { method: 'DELETE' })
      if (res.ok) {
        queue.removeCallback(callbackId)
      }
    } catch (err) {
      console.error('[QueuePanel] Cancel callback error:', err)
    } finally {
      setCancellingId(null)
    }
  }

  // Show search on all lead-based tabs (fresh, retry, called)
  const showSearch = ['fresh', 'retry', 'called'].includes(queue.activeTab)

  return (
    <div className="flex flex-col h-full">
      {/* Header: Filter Dropdown + Collapse */}
      <div className="px-3 pt-3 pb-2" ref={filterRef}>
        <div className="relative flex items-center gap-1.5">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex-1 flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2">
              <active.icon className={`w-4 h-4 ${active.color}`} />
              <span className="text-sm font-medium text-gray-900">{active.label}</span>
              {active.count > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${active.bg} ${active.color}`}>
                  {active.count}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
              title="Collapse queue"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}

          {filterOpen && (
            <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              {filters.map(f => (
                <button
                  key={f.key}
                  onClick={() => handleFilterSelect(f.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                    queue.activeTab === f.key
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <f.icon className={`w-4 h-4 ${queue.activeTab === f.key ? 'text-teal-600' : f.color}`} />
                    <span className="font-medium">{f.label}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                    queue.activeTab === f.key
                      ? 'bg-teal-100 text-teal-700'
                      : f.key === 'missed' && f.count > 0
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={queue.searchQuery}
              onChange={(e) => queue.setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
            {queue.searchQuery && (
              <button
                onClick={() => queue.setSearchQuery('')}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Disposition sub-filters for Called tab */}
      {queue.activeTab === 'called' && queue.leads.length > 0 && (
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
          {CALLED_PILLS.map(pill => {
            const count = pill.key === null
              ? queue.leads.length
              : queue.leads.filter((l: any) => pill.dispositions?.includes(l.lastDisposition)).length
            return (
              <button
                key={pill.key ?? 'all'}
                onClick={() => setDispoFilter(pill.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                  dispoFilter === pill.key
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {pill.label}
                <span className={`px-1 py-0.5 rounded-full text-[9px] ${
                  dispoFilter === pill.key ? 'bg-teal-600 text-teal-100' : 'bg-gray-200 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {/* Fresh / Retry / Called tabs — render leads */}
        {['fresh', 'retry', 'called'].includes(queue.activeTab) && (
          <>
            {/* Recent Calls pin — only on Fresh tab */}
            {queue.activeTab === 'fresh' && queue.recentLeads.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Recent Calls</span>
                </div>
                {queue.recentLeads.map((lead: any) => (
                  <button
                    key={`recent-${lead.id}`}
                    onClick={() => queue.setSelectedLeadId(lead.id)}
                    className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-amber-50/40 transition-colors ${
                      queue.selectedLeadId === lead.id ? 'bg-amber-50/60 border-l-2 border-l-amber-400' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 truncate">{lead.companyName}</span>
                      {lead.lastDisposition && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ml-2 ${
                          DISPOSITION_BADGE[lead.lastDisposition]?.className || 'bg-gray-100 text-gray-500'
                        }`}>
                          {DISPOSITION_BADGE[lead.lastDisposition]?.label || lead.lastDisposition}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {lead.firstName || lead.contactName || 'Unknown'} &middot; {lead.phone?.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-****')}
                    </div>
                  </button>
                ))}
                <div className="border-t-2 border-gray-200 mx-3 my-1" />
              </>
            )}

            {/* Standard lead list */}
            {displayLeads.length > 0 ? (
              displayLeads.map((lead: any) => (
                <button
                  key={lead.id}
                  onClick={() => queue.setSelectedLeadId(lead.id)}
                  className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-white transition-colors ${
                    queue.selectedLeadId === lead.id ? 'bg-teal-50/40 border-l-2 border-l-teal-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 truncate">{lead.companyName}</span>
                    {(queue.activeTab === 'called' || queue.activeTab === 'retry') && lead.lastDisposition ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ml-2 ${
                        DISPOSITION_BADGE[lead.lastDisposition]?.className || 'bg-gray-100 text-gray-500'
                      }`}>
                        {DISPOSITION_BADGE[lead.lastDisposition]?.label || lead.lastDisposition}
                      </span>
                    ) : (
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        lead.priority === 'HOT' ? 'bg-red-500' : lead.priority === 'HIGH' ? 'bg-orange-500' : lead.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {lead.firstName || lead.contactName || 'Unknown'} &middot; {lead.phone?.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-****')}
                  </div>
                  {lead._count?.dialerCalls !== undefined && lead._count.dialerCalls > 0 && (
                    <div className="text-[10px] text-gray-400 mt-0.5">{lead._count.dialerCalls} calls</div>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8 px-4">
                <p className="text-xs text-gray-400">
                  {queue.searchQuery
                    ? 'No leads match your search'
                    : dispoFilter
                      ? 'No leads in this filter'
                      : queue.activeTab === 'fresh'
                        ? (queue.recentLeads.length > 0 ? 'All remaining leads have been called' : 'No fresh leads available')
                        : queue.activeTab === 'retry'
                          ? 'No leads ready for retry'
                          : 'No called leads yet'}
                </p>
              </div>
            )}
          </>
        )}

        {/* Scheduled tab — callbacks with delete */}
        {queue.activeTab === 'scheduled' && (
          queue.callbacks.length > 0 ? (
            queue.callbacks.map(cb => (
              <div
                key={cb.id}
                className="flex items-center w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-white"
              >
                <button
                  onClick={() => { if (cb.lead) queue.setSelectedLeadId(cb.lead.id) }}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="text-sm font-medium text-gray-900 truncate">{cb.lead?.companyName || 'Unknown'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {cb.notes?.startsWith('[ALL_DAY]')
                      ? `${new Date(cb.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} — All Day`
                      : new Date(cb.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                  {cb.notes && cb.notes.replace('[ALL_DAY]', '').trim() && (
                    <div className="text-xs text-gray-400 mt-0.5 truncate">{cb.notes.replace('[ALL_DAY]', '').trim()}</div>
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCancelCallback(cb.id) }}
                  disabled={cancellingId === cb.id}
                  className="ml-2 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Cancel callback"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 px-4">
              <p className="text-xs text-gray-400">No scheduled callbacks</p>
            </div>
          )
        )}

        {/* Missed tab */}
        {queue.activeTab === 'missed' && (
          queue.missed.length > 0 ? (
            queue.missed.map((m: any) => (
              <button
                key={m.id}
                onClick={() => { if (m.lead) queue.setSelectedLeadId(m.lead.id) }}
                className="w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-white"
              >
                <div className="text-sm font-medium text-gray-900">{m.lead?.companyName || m.phoneNumberUsed || 'Unknown'}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(m.startedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 px-4">
              <p className="text-xs text-gray-400">No missed calls</p>
            </div>
          )
        )}

        {queue.loading && <div className="text-center py-4 text-xs text-gray-400">Loading...</div>}
      </div>
    </div>
  )
}
