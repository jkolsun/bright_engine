'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Building, Target, Zap, Users, Key, Clock, DollarSign,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

type ServiceStatus = {
  key: string
  label: string
  configured: boolean
  connected: boolean | null
  detail: string
}

function StatusIcon({ service }: { service: ServiceStatus }) {
  if (!service.configured) {
    return <XCircle size={16} className="text-gray-400 shrink-0" />
  }
  if (service.connected === true) {
    return <CheckCircle2 size={16} className="text-green-500 shrink-0" />
  }
  return <AlertTriangle size={16} className="text-amber-500 shrink-0" />
}

function StatusBadge({ service }: { service: ServiceStatus }) {
  if (!service.configured) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not configured</span>
  }
  if (service.connected === true) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">Connected</span>
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Failed</span>
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'sequences' | 'personalization' | 'targets' | 'team' | 'api'>('company')
  const [services, setServices] = useState<ServiceStatus[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  const checkApiStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/api-status')
      if (res.ok) {
        const data = await res.json()
        setServices(data.services)
        setLastChecked(new Date().toLocaleTimeString())
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'api' && !services && !loading) {
      checkApiStatus()
    }
  }, [activeTab, services, loading, checkApiStatus])

  const tabs = [
    { id: 'company', label: 'Company', icon: <Building size={16} /> },
    { id: 'sequences', label: 'Sequences', icon: <Zap size={16} /> },
    { id: 'personalization', label: 'Personalization', icon: <Target size={16} /> },
    { id: 'targets', label: 'Targets', icon: <DollarSign size={16} /> },
    { id: 'team', label: 'Team', icon: <Users size={16} /> },
    { id: 'api', label: 'API Keys', icon: <Key size={16} /> },
  ] as const

  const connectedCount = services?.filter(s => s.connected === true).length ?? 0
  const totalCount = services?.length ?? 0

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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">API Configuration</h3>
              {services && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {connectedCount}/{totalCount} services connected
                </p>
              )}
            </div>
            <button
              onClick={checkApiStatus}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {loading ? 'Checking...' : 'Recheck'}
            </button>
          </div>

          {/* Loading state */}
          {loading && !services && (
            <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
              <Loader2 size={20} className="animate-spin" />
              <span>Testing API connections...</span>
            </div>
          )}

          {/* Results */}
          {services && (
            <div className="space-y-2">
              {services.map((service) => (
                <div
                  key={service.key}
                  className={`flex items-center justify-between p-3 rounded text-sm ${
                    service.connected === true
                      ? 'bg-green-50 border border-green-100'
                      : service.configured
                      ? 'bg-amber-50 border border-amber-100'
                      : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon service={service} />
                    <span className="font-medium text-gray-900">{service.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 hidden sm:inline">{service.detail}</span>
                    <StatusBadge service={service} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-500">All API keys are managed via Railway environment variables for security.</p>
            {lastChecked && (
              <p className="text-xs text-gray-400">Last checked: {lastChecked}</p>
            )}
          </div>
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
