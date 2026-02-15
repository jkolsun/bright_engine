'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { Search, Filter } from 'lucide-react'

export default function AuditLogPage() {
  const [events, setEvents] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAuditLog()
  }, [])

  const loadAuditLog = async () => {
    try {
      const res = await fetch('/api/lead-events?limit=100&orderBy=desc')
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Failed to load audit log:', error)
    } finally {
      setLoading(false)
    }
  }

  const eventTypeColor = (type: string) => {
    switch (type) {
      case 'STAGE_CHANGE':
        return 'bg-blue-100 text-blue-800'
      case 'EMAIL_SENT':
        return 'bg-green-100 text-green-800'
      case 'PREVIEW_VIEWED':
        return 'bg-purple-100 text-purple-800'
      case 'CALL_MADE':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredEvents = events.filter(event => {
    if (filterType !== 'all' && event.eventType !== filterType) return false
    if (searchTerm && !event.metadata?.toString().includes(searchTerm)) return false
    return true
  })

  if (loading) {
    return <div className="p-8 text-center">Loading audit log...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 mt-1">Track all changes and activities in the system</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              className="pl-10"
              placeholder="Search audit log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Events</option>
            <option value="STAGE_CHANGE">Status Changes</option>
            <option value="EMAIL_SENT">Emails</option>
            <option value="PREVIEW_VIEWED">Preview Views</option>
            <option value="CALL_MADE">Calls</option>
          </select>
        </div>
      </Card>

      {/* Events Timeline */}
      <Card className="p-6">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No audit events found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event, index) => (
              <div key={event.id || index} className="flex gap-4 pb-4 border-b last:border-0">
                <div className="w-32 flex-shrink-0">
                  <div className="text-xs text-gray-500">
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={eventTypeColor(event.eventType)}>
                      {event.eventType.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900">
                      Lead ID: {event.leadId}
                    </span>
                  </div>
                  
                  {event.metadata && (
                    <div className="text-sm text-gray-600">
                      <p>Changes: {JSON.stringify(event.metadata)}</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-1">
                    By: {event.actor || 'system'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-sm text-gray-600 mb-1">Total Events</div>
          <div className="text-3xl font-bold text-gray-900">{events.length}</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-gray-600 mb-1">Status Changes</div>
          <div className="text-3xl font-bold text-gray-900">
            {events.filter(e => e.eventType === 'STAGE_CHANGE').length}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-gray-600 mb-1">Admin Actions</div>
          <div className="text-3xl font-bold text-gray-900">
            {events.filter(e => e.actor === 'admin').length}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-gray-600 mb-1">System Events</div>
          <div className="text-3xl font-bold text-gray-900">
            {events.filter(e => e.actor === 'system' || e.actor === 'instantly').length}
          </div>
        </Card>
      </div>
    </div>
  )
}
