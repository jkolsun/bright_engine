'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { DollarSign, Wallet } from 'lucide-react'
import RevenueTab from './_tabs/RevenueTab'
import PayoutsTab from './_tabs/PayoutsTab'

type TabId = 'revenue' | 'payouts'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'revenue', label: 'Revenue', icon: <DollarSign size={16} /> },
  { id: 'payouts', label: 'Payouts', icon: <Wallet size={16} /> },
]

export default function FinancePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = (searchParams.get('tab') as TabId) || 'revenue'
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some(t => t.id === initialTab) ? initialTab : 'revenue'
  )

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    router.replace(`/admin/finance?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Finance</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Revenue overview and commission payouts</p>
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
      {activeTab === 'revenue' && <RevenueTab />}
      {activeTab === 'payouts' && <PayoutsTab />}
    </div>
  )
}
