'use client'
import { useState, useCallback, useMemo } from 'react'
import type { QueueLead, CallbackItem } from '@/types/dialer'

export type QueueTab = 'fresh' | 'retry' | 'scheduled' | 'missed' | 'called'

export function useDialerQueue() {
  const [activeTab, setActiveTab] = useState<QueueTab>('fresh')
  const [freshLeads, setFreshLeads] = useState<QueueLead[]>([])
  const [retryLeads, setRetryLeads] = useState<QueueLead[]>([])
  const [calledLeads, setCalledLeads] = useState<QueueLead[]>([])
  const [callbacks, setCallbacks] = useState<CallbackItem[]>([])
  const [missed, setMissed] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchFresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dialer/queue?tab=fresh')
      const data = await res.json()
      setFreshLeads(data.leads || [])
    } catch {} finally { setLoading(false) }
  }, [])

  const fetchRetry = useCallback(async () => {
    try {
      const res = await fetch('/api/dialer/queue?tab=retry')
      const data = await res.json()
      setRetryLeads(data.leads || [])
    } catch {}
  }, [])

  const fetchCalled = useCallback(async () => {
    try {
      const res = await fetch('/api/dialer/queue?tab=called')
      const data = await res.json()
      setCalledLeads(data.leads || [])
    } catch {}
  }, [])

  const fetchCallbacks = useCallback(async () => {
    try {
      const res = await fetch('/api/dialer/queue/callbacks')
      const data = await res.json()
      setCallbacks(data.callbacks || [])
    } catch {}
  }, [])

  const fetchMissed = useCallback(async () => {
    try {
      const res = await fetch('/api/dialer/queue/missed')
      const data = await res.json()
      setMissed(data.missed || [])
    } catch {}
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([fetchFresh(), fetchRetry(), fetchCallbacks(), fetchMissed(), fetchCalled()])
  }, [fetchFresh, fetchRetry, fetchCallbacks, fetchMissed, fetchCalled])

  // Get the raw lead array for the active tab
  const activeLeadList = useMemo(() => {
    switch (activeTab) {
      case 'fresh': return freshLeads
      case 'retry': return retryLeads
      case 'called': return calledLeads
      default: return []
    }
  }, [activeTab, freshLeads, retryLeads, calledLeads])

  // Filter leads by search (applies to fresh, retry, called tabs)
  const filteredLeads = useMemo(() => {
    return activeLeadList.filter(l => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        l.companyName?.toLowerCase().includes(q) ||
        l.firstName?.toLowerCase().includes(q) ||
        l.lastName?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.industry?.toLowerCase().includes(q)
      )
    })
  }, [activeLeadList, searchQuery])

  // Expose as `leads` for backward compatibility (always the filtered active list)
  const leads = filteredLeads

  // Search across all arrays for the selected lead
  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null
    return (
      freshLeads.find(l => l.id === selectedLeadId) ||
      retryLeads.find(l => l.id === selectedLeadId) ||
      calledLeads.find(l => l.id === selectedLeadId) ||
      null
    )
  }, [selectedLeadId, freshLeads, retryLeads, calledLeads])

  // Navigate within active tab's filtered list
  const selectNext = useCallback(() => {
    const idx = filteredLeads.findIndex(l => l.id === selectedLeadId)
    if (idx < filteredLeads.length - 1) setSelectedLeadId(filteredLeads[idx + 1].id)
  }, [filteredLeads, selectedLeadId])

  const selectPrev = useCallback(() => {
    const idx = filteredLeads.findIndex(l => l.id === selectedLeadId)
    if (idx > 0) setSelectedLeadId(filteredLeads[idx - 1].id)
  }, [filteredLeads, selectedLeadId])

  // Remove a callback from local state (used after DELETE)
  const removeCallback = useCallback((callbackId: string) => {
    setCallbacks(prev => prev.filter(cb => cb.id !== callbackId))
  }, [])

  return {
    activeTab, setActiveTab,
    leads, freshLeads, retryLeads, calledLeads,
    callbacks, missed, loading,
    selectedLeadId, setSelectedLeadId, selectedLead,
    searchQuery, setSearchQuery,
    refresh, fetchFresh, fetchRetry, fetchCalled, fetchCallbacks, fetchMissed,
    selectNext, selectPrev, removeCallback,
  }
}
