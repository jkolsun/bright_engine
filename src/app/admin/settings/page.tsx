'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Building, Target, Zap, Users, Key, Clock, DollarSign
} from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'sequences' | 'personalization' | 'targets' | 'team' | 'api'>('company')

  const tabs = [
    { id: 'company', label: 'Company', icon: <Building size={16} /> },
    { id: 'sequences', label: 'Sequences', icon: <Zap size={16} /> },
    { id: 'personalization', label: 'Personalization', icon: <Target size={16} /> },
    { id: 'targets', label: 'Targets', icon: <DollarSign size={16} /> },
    { id: 'team', label: 'Team', icon: <Users size={16} /> },
    { id: 'api', label: 'API Keys', icon: <Key size={16} /> },
  ] as const

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your system configuration</p>
        </div>
      </div>

      {/* Tabs */}
      <Card className="p-1">
        <div className="flex gap-1 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Content */}
      <Card className="p-12">
        <div className="text-center space-y-4">
          <div className="inline-block p-4 bg-blue-100 rounded-full">
            <Clock size={32} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {tabs.find(t => t.id === activeTab)?.label} Settings
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Settings management is coming soon. This feature is currently in development.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your administrator for configuration changes.
          </p>
          <Button variant="outline" className="mt-6">
            Contact Support
          </Button>
        </div>
      </Card>
    </div>
  )
}
