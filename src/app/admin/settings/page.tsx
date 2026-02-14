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
      {activeTab === 'team' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Team Management</h3>
            <Button onClick={() => window.location.href = '/admin/settings/reps'}>
              Manage Reps →
            </Button>
          </div>
          <p className="text-gray-600">Add, edit, and manage your sales reps from the Reps page.</p>
        </Card>
      )}

      {activeTab === 'api' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">API Configuration</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-gray-50 rounded text-sm">
              <span className="text-gray-600">Stripe</span>
              <span className="text-gray-900">Configured via Railway env vars</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded text-sm">
              <span className="text-gray-600">Twilio</span>
              <span className="text-gray-900">Configured via Railway env vars</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded text-sm">
              <span className="text-gray-600">SerpAPI</span>
              <span className="text-gray-900">Used during import enrichment</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded text-sm">
              <span className="text-gray-600">Anthropic</span>
              <span className="text-gray-900">Used for personalization + scripts</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">All API keys are managed via Railway environment variables for security.</p>
        </Card>
      )}

      {activeTab !== 'team' && activeTab !== 'api' && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="inline-block p-4 bg-blue-100 rounded-full">
              <Clock size={32} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {tabs.find(t => t.id === activeTab)?.label} Settings
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              This section is in development. Contact Andrew for configuration changes.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
