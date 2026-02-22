'use client'
import { useState, useCallback, useEffect } from 'react'
import type { QueueLead, CallbackItem } from '@/types/dialer'

export type QueueTab = 'leads' | 'callbacks' | 'missed'

export function useDialerQueue() {
  const [activeTab, setActiveTab] = useState<QueueTab>('leads')
  const [leads, setLeads] = useState<QueueLead[]>([])
  const [callbacks, setCallbacks] = useState<CallbackItem[]>([])
  const [missed, setMissed] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dialer/queue')
      const data = await res.json()
      setLeads(data.leads || [])
    } catch {} finally { setLoading(false) }
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
    await Promise.all([fetchLeads(), fetchCallbacks(), fetchMissed()])
  }, [fetchLeads, fetchCallbacks, fetchMissed])

  // Filter leads by search
  const filteredLeads = leads.filter(l => {
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

  const selectedLead = leads.find(l => l.id === selectedLeadId) || null

  // Navigate queue
  const selectNext = useCallback(() => {
    const idx = filteredLeads.findIndex(l => l.id === selectedLeadId)
    if (idx < filteredLeads.length - 1) setSelectedLeadId(filteredLeads[idx + 1].id)
  }, [filteredLeads, selectedLeadId])

  const selectPrev = useCallback(() => {
    const idx = filteredLeads.findIndex(l => l.id === selectedLeadId)
    if (idx > 0) setSelectedLeadId(filteredLeads[idx - 1].id)
  }, [filteredLeads, selectedLeadId])

  return {
    activeTab, setActiveTab,
    leads: filteredLeads, callbacks, missed, loading,
    selectedLeadId, setSelectedLeadId, selectedLead,
    searchQuery, setSearchQuery,
    refresh, fetchLeads, fetchCallbacks, fetchMissed,
    selectNext, selectPrev,
  }
}
