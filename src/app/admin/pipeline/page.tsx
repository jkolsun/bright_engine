'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Hammer, ShieldCheck, Loader2 } from 'lucide-react'

const BuildsTab = dynamic(() => import('./_tabs/BuildsTab'), {
  loading: () => (
    <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400 gap-2">
      <Loader2 size={20} className="animate-spin" />
      <span>Loading build queue…</span>
    </div>
  ),
})

const ApprovalsTab = dynamic(() => import('./_tabs/ApprovalsTab'), {
  loading: () => (
    <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400 gap-2">
      <Loader2 size={20} className="animate-spin" />
      <span>Loading approvals…</span>
    </div>
  ),
})

type TabId = 'builds' | 'approvals'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'builds', label: 'Build Queue', icon: <Hammer size={16} /> },
  { id: 'approvals', label: 'Approvals', icon: <ShieldCheck size={16} /> },
]

export default function PipelinePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = (searchParams.get('tab') as TabId) || 'builds'
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some(t => t.id === initialTab) ? initialTab : 'builds'
  )

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    router.replace(`/admin/pipeline?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Pipeline</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Build queue and approval management</p>
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
      {activeTab === 'builds' && <BuildsTab />}
      {activeTab === 'approvals' && <ApprovalsTab />}
    </div>
  )
}
