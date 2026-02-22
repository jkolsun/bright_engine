'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type SettingsData = Record<string, any>

interface SettingsContextValue {
  rawSettings: SettingsData
  settingsLoaded: boolean
  loadingSettings: boolean
  saveSetting: (key: string, value: any) => Promise<void>
  savingKey: string | null
  savedKey: string | null
  reloadSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettingsContext() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider')
  return ctx
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [rawSettings, setRawSettings] = useState<SettingsData>({})
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const loadAllSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) return
      const data = await res.json()
      setRawSettings(data.settings || {})
      setSettingsLoaded(true)
    } catch (e) {
      console.error('Failed to load settings:', e)
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  useEffect(() => {
    loadAllSettings()
  }, [loadAllSettings])

  const saveSetting = useCallback(async (key: string, value: any) => {
    setSavingKey(key)
    setSavedKey(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        setSavedKey(key)
        // Update raw settings in memory
        setRawSettings(prev => ({ ...prev, [key]: value }))
        setTimeout(() => setSavedKey(null), 2000)
      }
    } catch (e) {
      console.error('Failed to save:', e)
    } finally {
      setSavingKey(null)
    }
  }, [])

  return (
    <SettingsContext.Provider value={{
      rawSettings,
      settingsLoaded,
      loadingSettings,
      saveSetting,
      savingKey,
      savedKey,
      reloadSettings: loadAllSettings,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}
