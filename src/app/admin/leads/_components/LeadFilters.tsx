'use client'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export interface LeadFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  repFilter: string
  onRepFilterChange: (value: string) => void
  contactedFilter: string
  onContactedFilterChange: (value: string) => void
  pipelineFilter?: string
  onPipelineFilterChange?: (value: string) => void
  activeReps: any[]
}

export default function LeadFilters({
  searchTerm,
  onSearchChange,
  repFilter,
  onRepFilterChange,
  contactedFilter,
  onContactedFilterChange,
  pipelineFilter,
  onPipelineFilterChange,
  activeReps,
}: LeadFiltersProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            className="pl-10"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          value={repFilter}
          onChange={(e) => onRepFilterChange(e.target.value)}
          className="h-10 px-3 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Reps</option>
          <option value="unassigned">Unassigned</option>
          {activeReps.map((rep) => (
            <option key={rep.id} value={rep.id}>{rep.name}</option>
          ))}
        </select>
        <select
          value={contactedFilter}
          onChange={(e) => onContactedFilterChange(e.target.value)}
          className="h-10 px-3 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Last Contacted</option>
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="never">Never Contacted</option>
        </select>
        {onPipelineFilterChange && (
          <select
            value={pipelineFilter || 'all'}
            onChange={(e) => onPipelineFilterChange(e.target.value)}
            className="h-10 px-3 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Pipeline</option>
            <option value="NEW">New</option>
            <option value="COLD_SENT">Cold Sent</option>
            <option value="WARM">Warm</option>
            <option value="CONTACTED">Contacted</option>
            <option value="OPTED_IN">Opted In</option>
            <option value="MEETING_BOOKED">Meeting Booked</option>
            <option value="CLOSED">Closed</option>
            <option value="COLD_NO_RESPONSE">Cold No Response</option>
            <option value="NOT_INTERESTED">Not Interested</option>
            <option value="OPTED_OUT">Opted Out</option>
            <option value="EXHAUSTED">Exhausted</option>
          </select>
        )}
      </div>
    </Card>
  )
}
