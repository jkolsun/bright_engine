'use client'
import { useDialer } from './DialerProvider'
import { Phone, Clock, PhoneMissed, Search } from 'lucide-react'

export function QueuePanel() {
  const { queue } = useDialer()

  const tabs = [
    { key: 'leads' as const, label: 'My Leads', icon: Phone, count: queue.leads.length },
    { key: 'callbacks' as const, label: 'Scheduled', icon: Clock, count: queue.callbacks.length },
    { key: 'missed' as const, label: 'Missed', icon: PhoneMissed, count: queue.missed.length },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-2 pt-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => queue.setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium rounded-t-lg transition-colors ${
              queue.activeTab === tab.key ? 'bg-white text-teal-600 border-b-2 border-teal-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-gray-100 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      {queue.activeTab === 'leads' && (
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
        {queue.activeTab === 'leads' && queue.leads.map(lead => (
          <button
            key={lead.id}
            onClick={() => queue.setSelectedLeadId(lead.id)}
            className={`w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-white transition-colors ${
              queue.selectedLeadId === lead.id ? 'bg-white border-l-2 border-l-teal-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 truncate">{lead.companyName}</span>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                lead.priority === 'HOT' ? 'bg-red-500' : lead.priority === 'HIGH' ? 'bg-orange-500' : lead.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-gray-300'
              }`} />
            </div>
            <div className="text-xs text-gray-500 mt-0.5 truncate">
              {lead.firstName || lead.contactName || 'Unknown'} &middot; {lead.phone?.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-****')}
            </div>
            {lead._count?.dialerCalls !== undefined && lead._count.dialerCalls > 0 && (
              <div className="text-[10px] text-gray-400 mt-0.5">{lead._count.dialerCalls} calls</div>
            )}
          </button>
        ))}

        {queue.activeTab === 'callbacks' && queue.callbacks.map(cb => (
          <button
            key={cb.id}
            onClick={() => { if (cb.lead) queue.setSelectedLeadId(cb.lead.id) }}
            className="w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-white"
          >
            <div className="text-sm font-medium text-gray-900">{cb.lead?.companyName || 'Unknown'}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {new Date(cb.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
            {cb.notes && <div className="text-xs text-gray-400 mt-0.5 truncate">{cb.notes}</div>}
          </button>
        ))}

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
