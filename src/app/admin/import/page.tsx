'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload, X, AlertTriangle, Loader2,
  CheckCircle, XCircle, Clock,
  Plus, History,
  Info, Search, Eye, Brain, Download, ChevronRight, ChevronDown, ChevronUp, ArrowLeft,
  UserPlus, Trash2, MoveUp, MoveDown, ListOrdered, Play
} from 'lucide-react'

type ProcessOptions = {
  enrichment: boolean
  preview: boolean
  personalization: boolean
}

type LeadEntry = {
  id: string
  name: string
  company: string
  status: 'pending' | 'processing' | 'done' | 'error'
  enrichment?: { success: boolean; error?: string } | null
  preview?: { success: boolean; error?: string } | null
  personalization?: { success: boolean; firstLine?: string; error?: string } | null
}

type ImportBatchUI = {
  id: string
  batchName: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  totalLeads: number
  processedLeads: number
  failedLeads: number
  jobId: string | null
  position: number
  createdAt: string
  completedAt: string | null
  redisStatus?: string
}

const PROCESS_INFO: Record<keyof ProcessOptions, { icon: React.ReactNode; title: string; description: string }> = {
  enrichment: {
    icon: <Search size={18} />,
    title: 'Enrichment',
    description: 'Looks up each lead on Google Maps via SerpAPI to find their rating, review count, website, and other business details. Helps qualify leads and personalize outreach.',
  },
  preview: {
    icon: <Eye size={18} />,
    title: 'Preview Generation',
    description: 'Generates a custom website preview for each lead based on their industry and business info. Creates a shareable preview URL that reps can text or email to prospects.',
  },
  personalization: {
    icon: <Brain size={18} />,
    title: 'AI Personalization',
    description: 'Uses Claude AI to write a custom call script and first-line opener for each lead. Combines web research with business data for relevant talking points.',
  },
}

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'configure' | 'feed'>('upload')
  const [uploading, setUploading] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  // Processing options (toggles)
  const [processOptions, setProcessOptions] = useState<ProcessOptions>({
    enrichment: true,
    preview: true,
    personalization: true,
  })
  const [showInfo, setShowInfo] = useState<string | null>(null)
  const [showInvalidDetail, setShowInvalidDetail] = useState(false)

  // Live feed state
  const [feedLeads, setFeedLeads] = useState<LeadEntry[]>([])
  const [feedDone, setFeedDone] = useState(false)
  const [feedStats, setFeedStats] = useState({ enriched: 0, previews: 0, personalized: 0, errors: 0 })
  const feedRef = useRef<HTMLDivElement>(null)
  const processingRef = useRef(false)

  // Background processing state
  const [importJobId, setImportJobId] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Batch settings state
  const [batchName, setBatchName] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [assignTo, setAssignTo] = useState<string>('')
  const [folders, setFolders] = useState<any[]>([])
  const [reps, setReps] = useState<any[]>([])
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)

  // Abandoned staging leads state
  const [abandonedLeads, setAbandonedLeads] = useState<{ count: number; leads: any[] } | null>(null)
  const [deletingAbandoned, setDeletingAbandoned] = useState(false)

  // Queue state
  const [queueBatches, setQueueBatches] = useState<ImportBatchUI[]>([])
  const queuePollingRef = useRef<NodeJS.Timeout | null>(null)
  const autoStartingRef = useRef(false)

  // Rate limit state
  const [rateLimitHit, setRateLimitHit] = useState(false)
  const [rateLimitMessage, setRateLimitMessage] = useState('')

  // Import history state
  const [importHistory, setImportHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Import detail view state
  const [viewingImport, setViewingImport] = useState<string | null>(null)
  const [importDetail, setImportDetail] = useState<{ import: any; leads: any[] } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchImportHistory = async () => {
    try {
      const res = await fetch('/api/imports')
      const data = await res.json()
      setImportHistory(data.imports || [])
    } catch { /* ignore */ }
    finally { setLoadingHistory(false) }
  }

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders')
      const data = await res.json()
      setFolders(data.folders || [])
    } catch { /* ignore */ }
  }

  const fetchReps = async () => {
    try {
      const res = await fetch('/api/users?role=REP')
      const data = await res.json()
      setReps((data.users || []).filter((u: any) => u.status === 'ACTIVE'))
    } catch { /* ignore */ }
  }

  const fetchAbandonedLeads = async () => {
    try {
      const res = await fetch('/api/leads/staging')
      if (!res.ok) return
      const data = await res.json()
      if (data.count > 0) {
        setAbandonedLeads({ count: data.count, leads: data.leads })
      } else {
        setAbandonedLeads(null)
      }
    } catch { /* ignore */ }
  }

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/import-queue')
      if (!res.ok) return
      const data = await res.json()
      const batches = (data.batches || []) as ImportBatchUI[]
      // Show all non-FAILED batches in the queue panel
      const active = batches.filter(b =>
        b.status === 'PENDING' || b.status === 'PROCESSING' || b.status === 'COMPLETED'
      )
      setQueueBatches(active)
      return active
    } catch { return [] as ImportBatchUI[] }
  }, [])

  const autoStartNextBatch = useCallback(async (batches: ImportBatchUI[]) => {
    if (autoStartingRef.current) return
    const hasProcessing = batches.some(b => b.status === 'PROCESSING')
    if (hasProcessing) return
    const firstPending = batches.find(b => b.status === 'PENDING')
    if (!firstPending) return

    autoStartingRef.current = true
    try {
      const res = await fetch(`/api/import-queue/${firstPending.id}/start`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setQueueBatches(prev => prev.map(b =>
          b.id === firstPending.id ? { ...b, status: 'PROCESSING' as const, jobId: data.jobId } : b
        ))
      }
    } catch { /* ignore */ }
    finally { autoStartingRef.current = false }
  }, [])

  useEffect(() => {
    fetchImportHistory()
    fetchFolders()
    fetchReps()
    fetchAbandonedLeads()
    fetchQueue().then(batches => {
      if (batches && batches.length > 0) autoStartNextBatch(batches)
    })
  }, [])

  // Queue polling: 3s interval when any batch is PROCESSING
  useEffect(() => {
    const hasProcessing = queueBatches.some(b => b.status === 'PROCESSING')

    if (hasProcessing && !queuePollingRef.current) {
      queuePollingRef.current = setInterval(async () => {
        const batches = await fetchQueue()
        if (!batches) return

        // Check for completed batches (worker set DB status or Redis status is completed)
        const justCompleted = batches.some(
          (b: any) => b.status === 'PROCESSING' && b.redisStatus === 'completed'
        )
        if (justCompleted) {
          fetchImportHistory()
          fetchAbandonedLeads()
          // Re-fetch to get updated list after completion
          const updated = await fetchQueue()
          if (updated) autoStartNextBatch(updated)
        } else {
          autoStartNextBatch(batches)
        }
      }, 3000)
    } else if (!hasProcessing && queuePollingRef.current) {
      clearInterval(queuePollingRef.current)
      queuePollingRef.current = null
    }

    return () => {
      if (queuePollingRef.current) {
        clearInterval(queuePollingRef.current)
        queuePollingRef.current = null
      }
    }
  }, [queueBatches, fetchQueue, autoStartNextBatch])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedFolderId(data.folder.id)
        setNewFolderName('')
        setShowNewFolderInput(false)
        fetchFolders()
      }
    } catch { /* ignore */ }
    finally { setCreatingFolder(false) }
  }

  // Fetch import detail
  const viewImportDetail = async (importId: string) => {
    setViewingImport(importId)
    setLoadingDetail(true)
    setImportDetail(null)
    try {
      const res = await fetch(`/api/imports/${importId}`)
      if (res.ok) {
        const data = await res.json()
        setImportDetail(data)
      }
    } catch { /* ignore */ }
    finally { setLoadingDetail(false) }
  }

  // Download leads as CSV
  const downloadCSV = (leads: any[]) => {
    if (!leads.length) return
    const headers = [
      'First Name', 'Last Name', 'Company', 'Email', 'Phone', 'City', 'State',
      'Industry', 'Website', 'Status', 'Rating', 'Reviews', 'Preview URL',
      'Personalization Line', 'Personalization Hook', 'Personalization Tier',
    ]
    const rows = leads.map(l => {
      let persData: any = null
      try {
        persData = l.personalization ? JSON.parse(l.personalization) : null
      } catch { /* ignore */ }
      return [
        l.firstName || '',
        l.lastName || '',
        l.companyName || '',
        l.email || '',
        l.phone || '',
        l.city || '',
        l.state || '',
        l.industry || '',
        l.website || '',
        l.status || '',
        l.enrichedRating ?? '',
        l.enrichedReviews ?? '',
        l.previewUrl || '',
        persData?.firstLine || '',
        persData?.hook || '',
        persData?.tier || '',
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Poll for background import progress
  const pollImportProgress = useCallback((jobId: string, leads: LeadEntry[]) => {
    if (pollingRef.current) clearInterval(pollingRef.current)

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/leads/import/status?jobId=${jobId}`)
        if (!res.ok) return

        const data = await res.json()
        const processed = data.processed || 0
        const results = data.results || {}

        // Update feed leads based on server progress
        setFeedLeads(prev => prev.map((lead, idx) => {
          if (idx < processed) {
            const result = results[lead.id]
            if (result) {
              return {
                ...lead,
                status: 'done' as const,
                enrichment: result.enrichment !== undefined ? { success: result.enrichment } : null,
                preview: result.preview !== undefined ? { success: result.preview } : null,
                personalization: result.personalization !== undefined ? { success: result.personalization } : null,
              }
            }
            return { ...lead, status: 'done' as const }
          } else if (idx === processed) {
            return { ...lead, status: 'processing' as const }
          }
          return lead
        }))

        // Update stats
        let enriched = 0, previews = 0, personalized = 0, errors = 0
        for (const r of Object.values(results) as any[]) {
          if (r.enrichment === true) enriched++
          if (r.enrichment === false) errors++
          if (r.preview === true) previews++
          if (r.preview === false) errors++
          if (r.personalization === true) personalized++
          if (r.personalization === false) errors++
        }
        errors += data.failed || 0
        setFeedStats({ enriched, previews, personalized, errors })

        // Auto-scroll to current item
        const currentIdx = processed < leads.length ? processed : leads.length - 1
        setTimeout(() => {
          feedRef.current?.querySelector(`[data-lead-index="${currentIdx}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 100)

        // Check for rate limit
        if (data.rateLimitHit && !rateLimitHit) {
          setRateLimitHit(true)
          setRateLimitMessage(data.rateLimitMessage || 'SerpAPI daily limit reached.')
        }

        // Check if done
        if (data.status === 'completed') {
          setFeedDone(true)
          processingRef.current = false
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
        }
      } catch {
        // Network error, keep polling
      }
    }, 2000)
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      if (queuePollingRef.current) {
        clearInterval(queuePollingRef.current)
        queuePollingRef.current = null
      }
    }
  }, [])

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      // Pre-populate batch name from filename (minus extension)
      const fileBaseName = file.name.replace(/\.[^/.]+$/, '')
      setBatchName(fileBaseName)

      const res = await fetch('/api/leads/import-create', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        if (data.created.length === 0) {
          alert(`All ${data.skipped || 0} leads were already in the database (duplicates).`)
          return
        }

        // Initialize feed leads and go to configure step
        const leads: LeadEntry[] = data.created.map((l: any) => ({
          id: l.id,
          name: l.name || l.company || 'Unknown',
          company: l.company,
          status: 'pending' as const,
        }))

        setFeedLeads(leads)
        setFeedDone(false)
        setFeedStats({ enriched: 0, previews: 0, personalized: 0, errors: 0 })
        setRateLimitHit(false)
        setRateLimitMessage('')
        setImportResult({
          created: data.created.length,
          skipped: data.skipped,
          total: data.total,
          totalCsvRows: data.totalCsvRows,
          totalValid: data.totalValid,
          totalInvalid: data.totalInvalid,
          validationErrors: data.validationErrors || [],
          invalidRows: data.invalidRows || [],
        })
        setStep('configure')
      } else {
        alert(`Import failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const applyBatchSettings = async (graduate: boolean = false) => {
    const leadIds = feedLeads.map(l => l.id)
    try {
      const res = await fetch('/api/leads/import-create/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds,
          batchName: batchName.trim(),
          folderId: selectedFolderId || undefined,
          assignTo: assignTo || undefined,
          graduate,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        console.error('Batch update failed:', data.error)
        return false
      }
      return true
    } catch (err) {
      console.error('Batch update error:', err)
      return false
    }
  }

  const handleSkipProcessing = async () => {
    if (!batchName.trim()) {
      alert('Please enter a batch name before proceeding.')
      return
    }
    // Apply batch settings and graduate all leads immediately
    const ok = await applyBatchSettings(true)
    if (ok) {
      setStep('upload')
      setFeedLeads([])
      fetchImportHistory()
      fetchAbandonedLeads()
    } else {
      alert('Failed to apply batch settings. Please try again.')
    }
  }

  const handleResumeAbandoned = () => {
    if (!abandonedLeads) return
    // Build feedLeads array from abandoned staging leads
    const leads: LeadEntry[] = abandonedLeads.leads.map((l: any) => ({
      id: l.id,
      name: l.firstName || l.companyName || 'Unknown',
      company: l.companyName || '',
      status: 'pending' as const,
    }))
    setFeedLeads(leads)
    setFeedDone(false)
    setFeedStats({ enriched: 0, previews: 0, personalized: 0, errors: 0 })
    setRateLimitHit(false)
    setRateLimitMessage('')
    setImportResult({ created: abandonedLeads.count, skipped: 0 })
    setBatchName('')
    setStep('configure')
  }

  const handleDeleteAbandoned = async () => {
    if (!abandonedLeads) return
    if (!window.confirm(`Delete ${abandonedLeads.count} unprocessed staging leads? This cannot be undone.`)) return
    setDeletingAbandoned(true)
    try {
      const res = await fetch('/api/leads/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IMPORT_STAGING' }),
      })
      if (res.ok) {
        setAbandonedLeads(null)
      } else {
        alert('Failed to delete staging leads. Please try again.')
      }
    } catch {
      alert('Failed to delete staging leads. Please try again.')
    } finally {
      setDeletingAbandoned(false)
    }
  }

  const addToQueue = async () => {
    if (!batchName.trim()) {
      alert('Please enter a batch name before proceeding.')
      return
    }

    // Call 1: Apply batch settings (no graduation)
    const batchOk = await applyBatchSettings(false)
    if (!batchOk) {
      alert('Failed to apply batch settings. Please try again.')
      return
    }

    // Call 2: Create ImportBatch in queue
    try {
      const res = await fetch('/api/import-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchName: batchName.trim(),
          leadIds: feedLeads.map(l => l.id),
          folderId: selectedFolderId || undefined,
          assignToId: assignTo || undefined,
          options: processOptions,
        }),
      })
      if (!res.ok) {
        alert('Failed to add to queue. Please try again.')
        return
      }
    } catch {
      alert('Failed to add to queue. Please try again.')
      return
    }

    // Reset to upload step
    setStep('upload')
    setFeedLeads([])
    setImportResult(null)
    setBatchName('')
    setSelectedFolderId('')
    setAssignTo('')
    setProcessOptions({ enrichment: true, preview: true, personalization: true })

    // Refresh queue and auto-start
    const batches = await fetchQueue()
    if (batches) autoStartNextBatch(batches)
    fetchAbandonedLeads()
  }

  const handleProcessNow = async () => {
    if (!batchName.trim()) {
      alert('Please enter a batch name before proceeding.')
      return
    }

    // Step 1: Graduate leads immediately (status → NEW)
    const ok = await applyBatchSettings(true)
    if (!ok) {
      alert('Failed to save leads. Please try again.')
      return
    }

    // Step 2: If ALL processing toggles are OFF, just go back to upload (same as Skip Processing)
    if (!processOptions.enrichment && !processOptions.preview && !processOptions.personalization) {
      setStep('upload')
      setFeedLeads([])
      setImportResult(null)
      setBatchName('')
      setSelectedFolderId('')
      setAssignTo('')
      fetchImportHistory()
      fetchAbandonedLeads()
      return
    }

    // Step 3: Kick off background processing — leads are already NEW so failures don't matter
    try {
      const queueRes = await fetch('/api/import-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchName: batchName.trim(),
          leadIds: feedLeads.map(l => l.id),
          folderId: selectedFolderId || undefined,
          assignToId: assignTo || undefined,
          options: processOptions,
        }),
      })

      if (queueRes.ok) {
        const queueData = await queueRes.json()
        const batchId = queueData.batch?.id

        if (batchId) {
          const startRes = await fetch(`/api/import-queue/${batchId}/start`, { method: 'POST' })
          if (startRes.ok) {
            const startData = await startRes.json()
            setImportJobId(startData.jobId)
            setStep('feed')
            pollImportProgress(startData.jobId, feedLeads)
            setBatchName('')
            setSelectedFolderId('')
            setAssignTo('')
            setProcessOptions({ enrichment: true, preview: true, personalization: true })
            return
          }
        }
      }
    } catch (err) {
      console.error('Process now queue error:', err)
    }

    // If queue/start failed, leads are still graduated — just go back to upload
    setStep('upload')
    setFeedLeads([])
    setImportResult(null)
    setBatchName('')
    setSelectedFolderId('')
    setAssignTo('')
    fetchImportHistory()
    fetchAbandonedLeads()
  }

  const viewBatchFeed = async (batch: ImportBatchUI) => {
    if (batch.status !== 'PROCESSING' || !batch.jobId) return

    try {
      const res = await fetch(`/api/import-queue/${batch.id}`)
      if (!res.ok) return
      const data = await res.json()
      const leads: LeadEntry[] = (data.leads || []).map((l: any) => ({
        id: l.id,
        name: l.firstName || l.companyName || 'Unknown',
        company: l.companyName || '',
        status: 'pending' as const,
      }))
      setFeedLeads(leads)
      setFeedDone(false)
      setFeedStats({ enriched: 0, previews: 0, personalized: 0, errors: 0 })
      setRateLimitHit(false)
      setRateLimitMessage('')
      setImportJobId(batch.jobId)
      setImportResult({ created: batch.totalLeads, skipped: 0 })
      const batchOptions = (data.batch?.options as any) || {}
      setProcessOptions({
        enrichment: batchOptions.enrichment ?? true,
        preview: batchOptions.preview ?? true,
        personalization: batchOptions.personalization ?? true,
      })
      setStep('feed')
      pollImportProgress(batch.jobId, leads)
    } catch { /* ignore */ }
  }

  const handleRestartBatch = async (batch: ImportBatchUI) => {
    if (!window.confirm(`Restart "${batch.batchName}"? This will kill the stuck job and reprocess all ${batch.totalLeads} leads.`)) return
    try {
      const res = await fetch(`/api/import-queue/${batch.id}/start`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setQueueBatches(prev => prev.map(b =>
          b.id === batch.id ? { ...b, status: 'PROCESSING' as const, jobId: data.jobId, processedLeads: 0, failedLeads: 0 } : b
        ))
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Failed to restart batch')
      }
    } catch { alert('Failed to restart batch') }
  }

  const handleReEnrich = async (batch: ImportBatchUI) => {
    if (!window.confirm(`Re-enrich ${batch.totalLeads} leads from "${batch.batchName}"? This will only run enrichment — previews and personalization are already done.`)) return
    try {
      const res = await fetch(`/api/import-queue/${batch.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: { enrichment: true, preview: false, personalization: false } }),
      })
      if (res.ok) {
        const data = await res.json()
        setQueueBatches(prev => prev.map(b =>
          b.id === batch.id ? { ...b, status: 'PROCESSING' as const, jobId: data.jobId, processedLeads: 0, failedLeads: 0 } : b
        ))
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Failed to start re-enrichment')
      }
    } catch { alert('Failed to start re-enrichment') }
  }

  const handleCancelBatch = async (batch: ImportBatchUI) => {
    const msg = batch.status === 'PENDING'
      ? `Cancel "${batch.batchName}"? This will delete ${batch.totalLeads} staging leads.`
      : batch.status === 'PROCESSING'
      ? `Stop and remove "${batch.batchName}"? The processing job will be cancelled.`
      : `Remove "${batch.batchName}" from the queue?`
    if (!window.confirm(msg)) return
    try {
      const res = await fetch(`/api/import-queue/${batch.id}`, { method: 'DELETE' })
      if (res.ok) {
        setQueueBatches(prev => prev.filter(b => b.id !== batch.id))
        fetchAbandonedLeads()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Failed to remove batch')
      }
    } catch { /* ignore */ }
  }

  const handleReorderBatch = async (batch: ImportBatchUI, direction: 'up' | 'down') => {
    const sorted = [...queueBatches].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex(b => b.id === batch.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const target = sorted[swapIdx]
    if (target.status !== 'PENDING') return // Can't swap with PROCESSING

    try {
      await fetch(`/api/import-queue/${batch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: target.position }),
      })
      fetchQueue()
    } catch { /* ignore */ }
  }

  const toggleOption = (key: keyof ProcessOptions) => {
    setProcessOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const completedCount = feedLeads.filter(l => l.status === 'done' || l.status === 'error').length
  const progressPercent = feedLeads.length > 0 ? Math.round((completedCount / feedLeads.length) * 100) : 0

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Lead Import & Enrichment Pipeline</h1>
        <p className="text-gray-500 mt-1">Upload Apollo CSV, choose processing steps, and watch the live feed</p>
      </div>

      {/* ── STEP 1: UPLOAD ────────────────────────────────────────── */}
      {step === 'upload' && !viewingImport && (
        <div className="max-w-4xl mx-auto">
          {/* Abandoned Staging Leads Banner */}
          {abandonedLeads && abandonedLeads.count > 0 && (
            <Card className="p-6 mb-6 border-l-4 border-amber-400 bg-amber-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {abandonedLeads.count} unprocessed lead{abandonedLeads.count !== 1 ? 's' : ''} from a previous upload
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    These leads were uploaded but never processed. They&apos;re blocking re-import of duplicates.
                  </p>
                  <div className="flex gap-3 mt-4">
                    <Button onClick={handleResumeAbandoned}>
                      Resume Processing
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={handleDeleteAbandoned}
                      disabled={deletingAbandoned}
                    >
                      {deletingAbandoned ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                      Delete All
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Upload Zone */}
          <Card className="p-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload size={48} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Lead CSV</h3>
              <p className="text-gray-600 mb-6">or click to browse</p>

              <label className="inline-block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                  disabled={uploading}
                  className="hidden"
                />
                <span className="cursor-pointer inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-lg font-semibold">
                  {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                  {uploading ? 'Uploading...' : 'Upload CSV'}
                </span>
              </label>

              <div className="mt-12 pt-8 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Accepted CSV Formats</h4>
                <div className="text-left bg-gray-50 p-6 rounded-lg">
                  <code className="text-sm text-gray-700 block space-y-1">
                    <div>First Name, Last Name, Title, Company Name, Email</div>
                    <div>Industry, Keywords, Website, City, State, Company Phone</div>
                  </code>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">Also accepts minimal format:</p>
                    <code className="text-sm text-gray-700">Company Name, Phone, Industry, City, State</code>
                    <p className="text-xs text-gray-400 mt-1">First Name and Email are optional.</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Queue Panel */}
          {queueBatches.length > 0 && (
            <Card className="p-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <ListOrdered size={20} className="text-blue-500" />
                <h4 className="font-semibold text-gray-900">Queue ({queueBatches.length} batch{queueBatches.length !== 1 ? 'es' : ''})</h4>
              </div>
              <div className="space-y-2">
                {[...queueBatches].sort((a, b) => a.position - b.position).map((batch, displayIdx) => {
                  const isProcessing = batch.status === 'PROCESSING'
                  const progressPct = batch.totalLeads > 0 ? Math.round((batch.processedLeads / batch.totalLeads) * 100) : 0
                  return (
                    <div
                      key={batch.id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                        isProcessing
                          ? 'border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100'
                          : 'border-gray-200 bg-white'
                      }`}
                      onClick={() => isProcessing && viewBatchFeed(batch)}
                    >
                      <span className="text-sm font-mono text-gray-400 w-6">{displayIdx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm truncate">{batch.batchName}</span>
                          <span className="text-xs text-gray-500">{batch.totalLeads} leads</span>
                        </div>
                        {isProcessing && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="text-xs text-blue-600 font-medium">{batch.processedLeads}/{batch.totalLeads}</span>
                          </div>
                        )}
                      </div>
                      {isProcessing && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Loader2 size={16} className="text-blue-500 animate-spin" />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRestartBatch(batch) }}
                            className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                          >
                            Restart
                          </button>
                        </div>
                      )}
                      {batch.status === 'COMPLETED' && batch.failedLeads > 0 && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-amber-600">{batch.failedLeads} failed</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReEnrich(batch) }}
                            className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors"
                          >
                            Re-enrich
                          </button>
                        </div>
                      )}
                      {batch.status === 'COMPLETED' && batch.failedLeads === 0 && (
                        <span className="text-xs text-green-600 flex-shrink-0">Done</span>
                      )}
                      {batch.status === 'PENDING' && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs text-gray-500 mr-1">Pending</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReorderBatch(batch, 'up') }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            title="Move up"
                          >
                            <MoveUp size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReorderBatch(batch, 'down') }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            title="Move down"
                          >
                            <MoveDown size={14} />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancelBatch(batch) }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded flex-shrink-0"
                        title="Remove from queue"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Import History */}
          <Card className="p-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <History size={20} className="text-gray-500" />
              <h4 className="font-semibold text-gray-900">Import History</h4>
            </div>
            {loadingHistory ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading history...</div>
            ) : importHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No imports yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Enriched</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Previews</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Skipped</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importHistory.map((imp) => {
                      const meta = (imp.metadata as any) || {}
                      const created = meta.created || meta.totalProcessed || 0
                      const enriched = meta.enriched || 0
                      const previews = meta.previews || 0
                      const skipped = meta.skipped || 0
                      const total = created + skipped
                      const successRate = total > 0 ? Math.round((created / total) * 100) : 100

                      return (
                        <tr
                          key={imp.id}
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => viewImportDetail(imp.id)}
                        >
                          <td className="py-3 px-4">
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(imp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(imp.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="py-3 px-4 w-48">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all"
                                  style={{ width: `${successRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-600 w-10 text-right">{successRate}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-semibold text-gray-900">{created}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm text-green-600 font-medium">{enriched}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm text-purple-600 font-medium">{previews}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm text-gray-500">{skipped}</span>
                          </td>
                          <td className="py-3 px-1">
                            <ChevronRight size={16} className="text-gray-400" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── IMPORT DETAIL VIEW ────────────────────────────────────── */}
      {step === 'upload' && viewingImport && (
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => { setViewingImport(null); setImportDetail(null) }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Import History
          </button>

          {loadingDetail ? (
            <Card className="p-12">
              <div className="flex items-center justify-center gap-3 text-gray-500">
                <Loader2 size={24} className="animate-spin" />
                <span>Loading import details...</span>
              </div>
            </Card>
          ) : importDetail ? (
            <>
              {/* Import Summary */}
              <Card className="p-6 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Import from {new Date(importDetail.import.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{importDetail.import.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => downloadCSV(importDetail.leads)}
                    disabled={importDetail.leads.length === 0}
                  >
                    <Download size={16} className="mr-2" />
                    Download CSV
                  </Button>
                </div>

                {/* Stats — computed from actual lead data, not metadata */}
                {(() => {
                  const leads = importDetail.leads
                  const enriched = leads.filter((l: any) => l.enrichedRating != null || l.enrichedAddress).length
                  const previews = leads.filter((l: any) => l.previewUrl).length
                  const personalized = leads.filter((l: any) => l.personalization).length
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-xl font-bold text-blue-600">{leads.length}</p>
                        <p className="text-xs text-gray-600">Created</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xl font-bold text-green-600">{enriched}</p>
                        <p className="text-xs text-gray-600">Enriched</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-xl font-bold text-purple-600">{previews}</p>
                        <p className="text-xs text-gray-600">Previews</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <p className="text-xl font-bold text-amber-600">{personalized}</p>
                        <p className="text-xs text-gray-600">Personalized</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xl font-bold text-gray-600">{leads.length - enriched}</p>
                        <p className="text-xs text-gray-600">Not Enriched</p>
                      </div>
                    </div>
                  )
                })()}
              </Card>

              {/* Leads Table */}
              <Card className="p-0 overflow-hidden">
                {importDetail.leads.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No lead data stored for this import. Older imports may not have lead tracking.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Name</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Company</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Location</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Personalization</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Rating</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Preview</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importDetail.leads.map((lead: any) => (
                          <tr key={lead.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="text-sm font-medium text-gray-900">
                                {lead.firstName} {lead.lastName}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700">{lead.companyName || '—'}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{lead.email || '—'}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{lead.phone || '—'}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                            </td>
                            <td className="py-3 px-4">
                              {(() => {
                                try {
                                  const p = typeof lead.personalization === 'string' ? JSON.parse(lead.personalization) : lead.personalization
                                  if (p?.firstLine) {
                                    return (
                                      <div className="max-w-[280px]">
                                        <p className="text-sm text-gray-900 leading-snug line-clamp-2">{p.firstLine}</p>
                                        {p.tier && (
                                          <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            p.tier === 'S' ? 'bg-yellow-100 text-yellow-700' :
                                            p.tier === 'A' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-600'
                                          }`}>
                                            Tier {p.tier}
                                          </span>
                                        )}
                                      </div>
                                    )
                                  }
                                  return <span className="text-gray-300">—</span>
                                } catch {
                                  return <span className="text-gray-300">—</span>
                                }
                              })()}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-xs">{lead.status}</Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {lead.enrichedRating ? (
                                <span className="text-sm font-medium text-yellow-600">{lead.enrichedRating}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {lead.previewUrl ? (
                                <a
                                  href={lead.previewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <Eye size={16} className="inline" />
                                </a>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="p-12">
              <div className="text-center text-gray-400">Failed to load import details.</div>
            </Card>
          )}
        </div>
      )}

      {/* ── STEP 2: CONFIGURE PROCESSING ──────────────────────────── */}
      {step === 'configure' && (
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Import Summary */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {importResult?.created} leads ready to process
                </h3>
                <p className="text-sm text-gray-500">
                  {importResult?.totalCsvRows
                    ? `from ${importResult.totalCsvRows} CSV rows — ${importResult.totalInvalid || 0} invalid, ${importResult.skipped || 0} duplicates. `
                    : importResult?.skipped > 0 ? `${importResult.skipped} duplicates skipped. ` : ''}
                  Choose which processing steps to run below.
                </p>
              </div>
            </div>
          </Card>

          {/* Validation Report — only when there are invalid rows */}
          {importResult?.totalInvalid > 0 && (
            <Card className="p-6 border-l-4 border-amber-400 bg-amber-50/50">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {importResult.totalInvalid} rows couldn&apos;t be imported
                  </h4>
                  <p className="text-xs text-gray-500">out of {importResult.totalCsvRows} total CSV rows</p>
                </div>
              </div>

              {/* Summary bar */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 text-center py-2 rounded-lg bg-green-50">
                  <div className="text-lg font-bold text-green-700">{importResult.totalValid}</div>
                  <div className="text-xs text-green-600">valid</div>
                </div>
                <div className="flex-1 text-center py-2 rounded-lg bg-red-50">
                  <div className="text-lg font-bold text-red-700">{importResult.totalInvalid}</div>
                  <div className="text-xs text-red-600">invalid</div>
                </div>
                <div className="flex-1 text-center py-2 rounded-lg bg-gray-100">
                  <div className="text-lg font-bold text-gray-600">{importResult.skipped}</div>
                  <div className="text-xs text-gray-500">duplicates</div>
                </div>
              </div>

              {/* Error breakdown */}
              {importResult.validationErrors?.length > 0 && (
                <div className="space-y-2 mb-3">
                  {importResult.validationErrors.map((err: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 shrink-0">
                        {err.count}
                      </span>
                      <div>
                        <span className="text-gray-700">{err.reason}</span>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Rows: {err.rows.slice(0, 10).join(', ')}
                          {err.rows.length > 10 && ` +${err.rows.length - 10} more`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Expandable detail table */}
              {importResult.invalidRows?.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowInvalidDetail(!showInvalidDetail)}
                    className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
                  >
                    {showInvalidDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showInvalidDetail ? 'Hide affected rows' : 'Show affected rows'}
                  </button>

                  {showInvalidDetail && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-amber-200">
                            <th className="text-left py-2 px-2 font-semibold text-gray-500">Row</th>
                            <th className="text-left py-2 px-2 font-semibold text-gray-500">First Name</th>
                            <th className="text-left py-2 px-2 font-semibold text-gray-500">Company</th>
                            <th className="text-left py-2 px-2 font-semibold text-gray-500">Errors</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {importResult.invalidRows.map((row: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-2 text-gray-500 font-mono">{row.row}</td>
                              <td className="py-1.5 px-2 text-gray-700">{row.firstName || '—'}</td>
                              <td className="py-1.5 px-2 text-gray-700">{row.companyName || '—'}</td>
                              <td className="py-1.5 px-2">
                                <div className="flex flex-wrap gap-1">
                                  {row.errors.map((e: string, ei: number) => (
                                    <span key={ei} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                                      {e}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Batch Settings */}
          <Card className="p-6">
            <h4 className="font-semibold text-gray-900 mb-1">Batch Settings</h4>
            <p className="text-sm text-gray-500 mb-4">Name this import and optionally assign a folder and rep</p>
            <div className="space-y-4">
              {/* Batch Name */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Batch Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g., GBP Roofing Batch 1, Apollo Legal Dallas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Folder */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Folder</label>
                <div className="flex gap-2">
                  <select
                    value={selectedFolderId}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowNewFolderInput(true)
                        setSelectedFolderId('')
                      } else {
                        setSelectedFolderId(e.target.value)
                        setShowNewFolderInput(false)
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">No folder</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                    <option value="__new__">+ Create new folder</option>
                  </select>
                </div>
                {showNewFolderInput && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="New folder name..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                    <Button size="sm" onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}>
                      {creatingFolder ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowNewFolderInput(false); setNewFolderName('') }}>
                      <X size={16} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Rep Assignment */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Assign to Rep</label>
                <select
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">No assignment</option>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Processing Options */}
          <Card className="p-6">
            <h4 className="font-semibold text-gray-900 mb-1">Processing Steps</h4>
            <p className="text-sm text-gray-500 mb-4">Toggle the steps you want to run on each lead</p>
            <div className="space-y-3">
              {(Object.keys(PROCESS_INFO) as (keyof ProcessOptions)[]).map((key) => {
                const info = PROCESS_INFO[key]
                const enabled = processOptions[key]
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                          {info.icon}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{info.title}</span>
                        <button
                          onClick={() => setShowInfo(showInfo === key ? null : key)}
                          className="p-1 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          title="What does this do?"
                        >
                          <Info size={16} />
                        </button>
                      </div>
                      <button
                        onClick={() => toggleOption(key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    {showInfo === key && (
                      <div className="mt-1 ml-12 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">{info.description}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {!processOptions.enrichment && !processOptions.preview && !processOptions.personalization && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">No processing steps selected. Leads are already saved and can be processed later.</p>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleSkipProcessing}>
              Skip Processing
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={addToQueue}>
                <ListOrdered size={18} className="mr-1" />
                Add to Queue
              </Button>
              <Button onClick={handleProcessNow} className="px-8 bg-teal-600 hover:bg-teal-700">
                <Play size={18} className="mr-1" />
                Process Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: LIVE PROCESSING FEED ──────────────────────────── */}
      {step === 'feed' && (
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Back to Queue */}
          <button
            onClick={() => {
              setStep('upload')
              setFeedLeads([])
              setFeedDone(false)
              setFeedStats({ enriched: 0, previews: 0, personalized: 0, errors: 0 })
              setRateLimitHit(false)
              setRateLimitMessage('')
              if (pollingRef.current) {
                clearInterval(pollingRef.current)
                pollingRef.current = null
              }
              fetchQueue()
              fetchImportHistory()
              fetchAbandonedLeads()
            }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Queue
          </button>
          {/* Progress Header */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {feedDone ? 'Processing Complete' : 'Processing Leads...'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {completedCount} of {feedLeads.length} leads processed
                  {importResult?.skipped > 0 && ` (${importResult.skipped} skipped as duplicates)`}
                </p>
              </div>
              {!feedDone && <Loader2 size={28} className="text-blue-600 animate-spin" />}
              {feedDone && <CheckCircle size={28} className="text-green-600" />}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{feedLeads.length}</p>
                <p className="text-xs text-gray-600">Created</p>
              </div>
              {processOptions.enrichment && (
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{feedStats.enriched}</p>
                  <p className="text-xs text-gray-600">Enriched</p>
                </div>
              )}
              {processOptions.preview && (
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{feedStats.previews}</p>
                  <p className="text-xs text-gray-600">Previews</p>
                </div>
              )}
              {processOptions.personalization && (
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{feedStats.personalized}</p>
                  <p className="text-xs text-gray-600">Personalized</p>
                </div>
              )}
              {feedStats.errors > 0 && (
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{feedStats.errors}</p>
                  <p className="text-xs text-gray-600">Errors</p>
                </div>
              )}
            </div>
          </Card>

          {/* Rate Limit Banner */}
          {rateLimitHit && (
            <Card className="p-4 border-l-4 border-amber-400 bg-amber-50">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900 text-sm">SerpAPI daily limit reached</h4>
                  <p className="text-sm text-amber-800 mt-1">Enrichment skipped for remaining leads. Preview and personalization continue.</p>
                  <p className="text-xs text-amber-600 mt-1">You can reprocess these leads tomorrow from the import history.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Live Feed */}
          <Card className="p-4">
            <div ref={feedRef} className="max-h-[500px] overflow-y-auto space-y-1">
              {feedLeads.map((lead, idx) => (
                <div
                  key={lead.id}
                  data-lead-index={idx}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                    lead.status === 'processing'
                      ? 'bg-blue-50 border border-blue-200'
                      : lead.status === 'done'
                      ? 'bg-white'
                      : lead.status === 'error'
                      ? 'bg-red-50'
                      : 'bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex-shrink-0 w-5">
                    {lead.status === 'pending' && <Clock size={16} className="text-gray-300" />}
                    {lead.status === 'processing' && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                    {lead.status === 'done' && <CheckCircle size={16} className="text-green-500" />}
                    {lead.status === 'error' && <XCircle size={16} className="text-red-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900">{lead.name || 'Unknown'}</span>
                    {lead.company && <span className="text-gray-400 ml-2">{lead.company}</span>}
                  </div>

                  {lead.status === 'done' && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {lead.enrichment !== undefined && lead.enrichment !== null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${lead.enrichment.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {lead.enrichment.success ? 'Enriched' : 'E-fail'}
                        </span>
                      )}
                      {lead.preview !== undefined && lead.preview !== null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${lead.preview.success ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-600'}`}>
                          {lead.preview.success ? 'Preview' : 'P-fail'}
                        </span>
                      )}
                      {lead.personalization !== undefined && lead.personalization !== null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${lead.personalization.success ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                          {lead.personalization.success ? 'AI' : 'AI-fail'}
                        </span>
                      )}
                    </div>
                  )}

                  {lead.status === 'processing' && (
                    <span className="text-xs text-blue-600 font-medium flex-shrink-0">Processing...</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Done Actions */}
          {feedDone && (
            <Card className="p-6">
              <div className="flex gap-3">
                <Button onClick={() => {
                  setStep('upload')
                  setFeedLeads([])
                  setFeedDone(false)
                  setFeedStats({ enriched: 0, previews: 0, personalized: 0, errors: 0 })
                  setRateLimitHit(false)
                  setRateLimitMessage('')
                  if (pollingRef.current) {
                    clearInterval(pollingRef.current)
                    pollingRef.current = null
                  }
                  fetchQueue()
                  fetchImportHistory()
                  fetchAbandonedLeads()
                }}>
                  Back to Queue
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

    </div>
  )
}