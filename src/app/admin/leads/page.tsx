'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Database, Landmark, Globe, Upload, Loader2 } from 'lucide-react'
import LeadsTab from './_tabs/LeadsTab'

const LeadBankTab = dynamic(() => import('./_tabs/LeadBankTab'), {
  loading: () => (
    <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400 gap-2">
      <Loader2 size={20} className="animate-spin" />
      <span>Loading lead bank…</span>
    </div>
  ),
})

const ScraperTab = dynamic(() => import('./_tabs/ScraperTab'), {
  loading: () => (
    <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400 gap-2">
      <Loader2 size={20} className="animate-spin" />
      <span>Loading scraper\u2026</span>
    </div>
  ),
})

const ImportTab = dynamic(() => import('./_tabs/ImportTab'), {
  loading: () => (
    <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400 gap-2">
      <Loader2 size={20} className="animate-spin" />
      <span>Loading import tools\u2026</span>
    </div>
  ),
})

type TabId = 'database' | 'bank' | 'scraper' | 'import'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'database', label: 'Database', icon: <Database size={16} /> },
  { id: 'bank', label: 'Lead Bank', icon: <Landmark size={16} /> },
  { id: 'scraper', label: 'Scraper', icon: <Globe size={16} /> },
  { id: 'import', label: 'Import', icon: <Upload size={16} /> },
]

const VALID_TAB_IDS = new Set<string>(TABS.map(t => t.id))

function LeadsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = (() => {
    const param = searchParams.get('tab')
    if (param && VALID_TAB_IDS.has(param)) return param as TabId
    return 'database'
  })()
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    router.replace(`/admin/leads?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Leads</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your lead database, bank, scraper, and imports
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'database' && <LeadsTab />}
      {activeTab === 'bank' && <LeadBankTab />}
      {activeTab === 'scraper' && <ScraperTab />}
      {activeTab === 'import' && <ImportTab />}
    </div>
  )
}

export default function LeadsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center text-gray-500 dark:text-gray-400 gap-2">
        <Loader2 size={20} className="animate-spin" />
        <span>Loading\u2026</span>
      </div>
    }>
      <LeadsPageInner />
    </Suspense>
  )
}
