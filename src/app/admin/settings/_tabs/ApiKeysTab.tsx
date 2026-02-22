'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2, AlertTriangle, RefreshCw, Loader2,
  Save, Trash2, Phone, Brain, DollarSign,
  ExternalLink, Search, ChevronDown, Pencil, X,
  MessageSquare, Zap,
} from 'lucide-react'

// ── Types ──

type ServiceStatus = {
  key: string
  label: string
  configured: boolean
  connected: boolean | null
  detail: string
}

// ═══════════════════════════════════════════════════════════
//  API KEYS TAB — self-contained, does NOT use SettingsContext
// ═══════════════════════════════════════════════════════════

export default function ApiKeysTab() {
  // API status state
  const [services, setServices] = useState<ServiceStatus[] | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  // API key management state
  const [apiKeyData, setApiKeyData] = useState<Record<string, Record<string, { masked: string; hasValue: boolean; source: 'db' | 'env' | 'none' }>> | null>(null)
  const [apiKeyServiceConfig, setApiKeyServiceConfig] = useState<Array<{ id: string; label: string; keys: Array<{ name: string; label: string }> }>>([])
  const [expandedService, setExpandedService] = useState<string | null>(null)
  const [editingKeyField, setEditingKeyField] = useState<{ service: string; keyName: string } | null>(null)
  const [keyInputValue, setKeyInputValue] = useState('')
  const [savingApiKey, setSavingApiKey] = useState(false)

  // Derived counts
  const connectedCount = services?.filter((s) => s.connected === true).length ?? 0
  const totalCount = services?.length ?? 0

  // ── API status check ──
  const checkApiStatus = useCallback(async () => {
    setApiLoading(true)
    try {
      const res = await fetch('/api/settings/api-status')
      if (res.ok) {
        const data = await res.json()
        setServices(data.services)
        setLastChecked(new Date().toLocaleTimeString())
      }
    } catch {
      /* user can retry */
    } finally {
      setApiLoading(false)
    }
  }, [])

  const loadApiKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/api-keys')
      if (res.ok) {
        const data = await res.json()
        setApiKeyData(data.keys)
        setApiKeyServiceConfig(data.services)
      }
    } catch {
      /* retry manually */
    }
  }, [])

  // Load on mount
  useEffect(() => {
    checkApiStatus()
    loadApiKeys()
  }, [checkApiStatus, loadApiKeys])

  const handleSaveApiKey = async (serviceId: string, keyName: string) => {
    if (!keyInputValue.trim()) return
    setSavingApiKey(true)
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceId, keys: { [keyName]: keyInputValue.trim() } }),
      })
      if (res.ok) {
        setEditingKeyField(null)
        setKeyInputValue('')
        await loadApiKeys()
        checkApiStatus()
      }
    } catch {
      /* user can retry */
    } finally {
      setSavingApiKey(false)
    }
  }

  const handleRemoveApiKey = async (serviceId: string, keyName: string) => {
    setSavingApiKey(true)
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceId, keyName }),
      })
      if (res.ok) {
        await loadApiKeys()
        checkApiStatus()
      }
    } catch {
      /* user can retry */
    } finally {
      setSavingApiKey(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Connection Status Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">API Keys & Services</h3>
            {services && (
              <p className="text-sm text-gray-500 mt-0.5">
                {connectedCount}/{totalCount} services connected
                {lastChecked && <span className="ml-2 text-gray-400">&middot; checked {lastChecked}</span>}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              checkApiStatus()
              loadApiKeys()
            }}
            disabled={apiLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
          >
            {apiLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {apiLoading ? 'Checking...' : 'Test All'}
          </button>
        </div>
      </Card>

      {/* Service Cards */}
      {apiKeyServiceConfig.map((svc) => {
        const serviceStatus = services?.find((s) => s.key === svc.id)
        const isExpanded = expandedService === svc.id
        const serviceKeys = apiKeyData?.[svc.id] || {}
        const hasAnyKey = Object.values(serviceKeys).some((k) => k.hasValue)

        const serviceIcon =
          svc.id === 'anthropic' ? <Brain size={18} /> :
          svc.id === 'stripe' ? <DollarSign size={18} /> :
          svc.id === 'twilio' ? <Phone size={18} /> :
          svc.id === 'resend' ? <MessageSquare size={18} /> :
          svc.id === 'instantly' ? <Zap size={18} /> :
          svc.id === 'serpapi' || svc.id === 'serper' ? <Search size={18} /> :
          <ExternalLink size={18} />

        return (
          <Card key={svc.id} className="overflow-hidden">
            {/* Service Header */}
            <button
              onClick={() => setExpandedService(isExpanded ? null : svc.id)}
              className={`w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors ${isExpanded ? 'border-b' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded ${
                    serviceStatus?.connected === true
                      ? 'text-green-600 bg-green-50'
                      : hasAnyKey
                      ? 'text-amber-600 bg-amber-50'
                      : 'text-gray-400 bg-gray-100'
                  }`}
                >
                  {serviceIcon}
                </div>
                <div>
                  <span className="font-medium text-gray-900">{svc.label}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {serviceStatus?.connected === true ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Connected
                      </span>
                    ) : hasAnyKey ? (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle size={10} /> Key set
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Not configured</span>
                    )}
                    {serviceStatus?.detail && serviceStatus.connected !== true && (
                      <span className="text-xs text-gray-400 hidden sm:inline">&middot; {serviceStatus.detail}</span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded Key List */}
            {isExpanded && (
              <div className="p-4 bg-gray-50/50 space-y-3">
                {svc.keys.map((keyDef) => {
                  const keyInfo = serviceKeys[keyDef.name]
                  const isEditing = editingKeyField?.service === svc.id && editingKeyField?.keyName === keyDef.name

                  return (
                    <div key={keyDef.name} className="bg-white rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-700">{keyDef.label}</div>
                          <div className="text-xs text-gray-400 font-mono">{keyDef.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {keyInfo?.hasValue && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                keyInfo.source === 'db' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {keyInfo.source === 'db' ? 'DB' : 'ENV'}
                            </span>
                          )}
                          {!isEditing && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingKeyField({ service: svc.id, keyName: keyDef.name })
                                  setKeyInputValue('')
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                                title="Edit key"
                              >
                                <Pencil size={14} />
                              </button>
                              {keyInfo?.source === 'db' && (
                                <button
                                  onClick={() => handleRemoveApiKey(svc.id, keyDef.name)}
                                  disabled={savingApiKey}
                                  className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                                  title="Remove DB override (fall back to env)"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Current value (masked) */}
                      {!isEditing && (
                        <div className="mt-1.5">
                          {keyInfo?.hasValue ? (
                            <span className="text-sm font-mono text-gray-500">{keyInfo.masked}</span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Not set</span>
                          )}
                        </div>
                      )}

                      {/* Edit mode */}
                      {isEditing && (
                        <div className="mt-2 flex gap-2">
                          <Input
                            type="password"
                            value={keyInputValue}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyInputValue(e.target.value)}
                            placeholder={`Enter ${keyDef.label.toLowerCase()}...`}
                            className="text-sm font-mono flex-1"
                            autoFocus
                            onKeyDown={(e: React.KeyboardEvent) => {
                              if (e.key === 'Enter') handleSaveApiKey(svc.id, keyDef.name)
                              if (e.key === 'Escape') {
                                setEditingKeyField(null)
                                setKeyInputValue('')
                              }
                            }}
                          />
                          <button
                            onClick={() => handleSaveApiKey(svc.id, keyDef.name)}
                            disabled={savingApiKey || !keyInputValue.trim()}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {savingApiKey ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingKeyField(null)
                              setKeyInputValue('')
                            }}
                            className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )
      })}

      {/* Loading state */}
      {!apiKeyData && (
        <Card className="p-8">
          <div className="flex items-center justify-center text-gray-500 gap-2">
            <Loader2 size={20} className="animate-spin" />
            <span>Loading API keys...</span>
          </div>
        </Card>
      )}

      <p className="text-xs text-gray-400 text-center">
        DB overrides take priority over Railway environment variables. Remove a DB key to fall back to the env var.
      </p>
    </div>
  )
}
