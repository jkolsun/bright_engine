'use client'

import { Card } from '@/components/ui/card'
import { useState } from 'react'
import { Hammer } from 'lucide-react'
import SiteBuildCard from './SiteBuildCard'

type FilterTab = 'ALL' | 'QA_REVIEW' | 'EDITING' | 'QA_APPROVED' | 'CLIENT_REVIEW' | 'LAUNCHING'

interface SiteBuildViewProps {
  leads: any[]
  counts: Record<string, number>
  loading: boolean
  onRefresh: () => void
  onOpenEditor: (lead: any) => void
}

export default function SiteBuildView({ leads, counts, loading, onRefresh, onOpenEditor }: SiteBuildViewProps) {
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL')

  const filteredLeads = filterTab === 'ALL'
    ? leads
    : leads.filter((l: any) => l.buildStep === filterTab)

  const filterTabs: Array<{ key: FilterTab; label: string; count?: number }> = [
    { key: 'QA_REVIEW', label: 'QA Review', count: counts.QA_REVIEW },
    { key: 'EDITING', label: 'Editing', count: counts.EDITING },
    { key: 'QA_APPROVED', label: 'Awaiting Andrew', count: counts.QA_APPROVED },
    { key: 'CLIENT_REVIEW', label: 'Client Review', count: counts.CLIENT_REVIEW },
    { key: 'LAUNCHING', label: 'Launching', count: counts.LAUNCHING },
    { key: 'ALL', label: 'All', count: leads.length },
  ]

  return (
    <>
      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors flex items-center gap-1.5 ${
              filterTab === tab.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filterTab === tab.key ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Site Build Cards */}
      {loading ? (
        <Card className="p-8 text-center text-gray-500 dark:text-gray-400">Loading build queue...</Card>
      ) : filteredLeads.length > 0 ? (
        <div className="space-y-3">
          {filteredLeads.map((lead: any) => (
            <SiteBuildCard key={lead.id} lead={lead} onRefresh={onRefresh} onOpenEditor={onOpenEditor} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Hammer size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No sites in this stage</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Sites will appear here as leads complete qualification</p>
        </Card>
      )}
    </>
  )
}
