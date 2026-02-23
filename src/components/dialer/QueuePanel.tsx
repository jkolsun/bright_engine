'use client'
import { useState } from 'react'
import { useDialer } from './DialerProvider'
import { Phone, RefreshCw, Clock, PhoneMissed, CheckCircle, Search, X } from 'lucide-react'

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
}

export function QueuePanel() {
  const { queue } = useDialer()
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const tabs = [
    { key: 'fresh' as const, label: 'Fresh', icon: Phone, count: queue.freshLeads.length, badgeClass: '' },
    { key: 'retry' as const, label: 'Retry', icon: RefreshCw, count: queue.retryLeads.length, badgeClass: '' },
    { key: 'scheduled' as const, label: 'Scheduled', icon: Clock, count: queue.callbacks.length, badgeClass: '' },
    { key: 'missed' as const, label: 'Missed', icon: PhoneMissed, count: queue.missed.length, badgeClass: queue.missed.length > 0 ? 'bg-red-500 text-white' : '' },
    { key: 'called' as const, label: 'Called', icon: CheckCircle, count: queue.calledLeads.length, badgeClass: 'bg-gray-200 text-gray-500' },
  ]

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

  const showSearch = queue.activeTab === 'fresh' || queue.activeTab === 'retry'

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-1 pt-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => queue.setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium rounded-t-lg transition-colors ${
              queue.activeTab === tab.key ? 'bg-white text-teal-600 border-b-2 border-teal-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            <span className="hidden xl:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full ${tab.badgeClass || 'bg-gray-100'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      {showSearch && (
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={queue.searchQuery}
              onChange={(e) => queue.setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {/* Fresh / Retry / Called tabs — render leads */}
        {(queue.activeTab === 'fresh' || queue.activeTab === 'retry' || queue.activeTab === 'called') && queue.leads.map((lead: any) => (
          <button
            key={lead.id}
            onClick={() => queue.setSelectedLeadId(lead.id)}
            className={`w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-white transition-colors ${
              queue.selectedLeadId === lead.id ? 'bg-white border-l-2 border-l-teal-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 truncate">{lead.companyName}</span>
              {queue.activeTab === 'called' && lead.lastDisposition ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
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
        ))}

        {/* Scheduled tab — callbacks with delete */}
        {queue.activeTab === 'scheduled' && queue.callbacks.map(cb => (
          <div
            key={cb.id}
            className="flex items-center w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-white"
          >
            <button
              onClick={() => { if (cb.lead) queue.setSelectedLeadId(cb.lead.id) }}
              className="flex-1 text-left min-w-0"
            >
              <div className="text-sm font-medium text-gray-900 truncate">{cb.lead?.companyName || 'Unknown'}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {new Date(cb.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
              {cb.notes && <div className="text-xs text-gray-400 mt-0.5 truncate">{cb.notes}</div>}
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
        ))}

        {/* Missed tab */}
        {queue.activeTab === 'missed' && queue.missed.map((m: any) => (
          <button
            key={m.id}
            onClick={() => { if (m.lead) queue.setSelectedLeadId(m.lead.id) }}
            className="w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-white"
          >
            <div className="text-sm font-medium text-gray-900">{m.lead?.companyName || m.phoneNumberUsed || 'Unknown'}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {new Date(m.startedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
          </button>
        ))}

        {queue.loading && <div className="text-center py-4 text-xs text-gray-400">Loading...</div>}
      </div>
    </div>
  )
}
