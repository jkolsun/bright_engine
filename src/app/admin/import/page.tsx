'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload, X, AlertCircle, Loader2,
  CheckCircle, XCircle, Clock,
  FolderPlus, FolderOpen, Plus, History,
  Info, Search, Eye, Brain, Download, ChevronRight, ArrowLeft
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
    description: 'Uses Claude AI to write a custom first-line opener, call script, and email body for each lead. Combines Serper web research with business data for highly relevant messaging.',
  },
}

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'configure' | 'feed' | 'complete'>('upload')
  const [uploading, setUploading] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  // Processing options (toggles)
  const [processOptions, setProcessOptions] = useState<ProcessOptions>({
    enrichment: true,
    preview: true,
    personalization: true,
  })
  const [showInfo, setShowInfo] = useState<string | null>(null)

  // Live feed state
  const [feedLeads, setFeedLeads] = useState<LeadEntry[]>([])
  const [feedDone, setFeedDone] = useState(false)
  const [feedStats, setFeedStats] = useState({ enriched: 0, previews: 0, personalized: 0, errors: 0 })
  const feedRef = useRef<HTMLDivElement>(null)
  const processingRef = useRef(false)

  // Folder state
  const [folders, setFolders] = useState<any[]>([])
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [addingToFolder, setAddingToFolder] = useState(false)
  const [folderSuccess, setFolderSuccess] = useState('')

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

  useEffect(() => {
    fetchImportHistory()
  }, [])

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders')
      const data = await res.json()
      setFolders(data.folders || [])
    } catch { /* ignore */ }
  }

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
        fetchFolders()
      }
    } catch { /* ignore */ }
    finally { setCreatingFolder(false) }
  }

  const handleAddToFolder = async () => {
    if (!selectedFolderId || feedLeads.length === 0) return
    setAddingToFolder(true)
    try {
      const leadIds = feedLeads.filter(l => l.status === 'done').map(l => l.id)
      const assignRes = await fetch('/api/folders/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, folderId: selectedFolderId }),
      })
      if (assignRes.ok) {
        const result = await assignRes.json()
        const folderName = folders.find(f => f.id === selectedFolderId)?.name || 'folder'
        setFolderSuccess(`${result.updated} leads added to "${folderName}"`)
        setFolderDialogOpen(false)
      }
    } catch { /* ignore */ }
    finally { setAddingToFolder(false) }
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
    const headers = ['First Name', 'Last Name', 'Company', 'Email', 'Phone', 'City', 'State', 'Industry', 'Website', 'Status', 'Rating', 'Reviews', 'Preview URL']
    const rows = leads.map(l => [
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
      l.enrichedRating || '',
      l.enrichedReviews || '',
      l.previewUrl || '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Process leads one by one in the live feed
  const processNextLead = useCallback(async (leads: LeadEntry[], index: number, options: ProcessOptions) => {
    if (index >= leads.length) {
      setFeedDone(true)
      processingRef.current = false
      return
    }

    processingRef.current = true
    const lead = leads[index]

    setFeedLeads(prev => prev.map((l, i) => i === index ? { ...l, status: 'processing' } : l))

    setTimeout(() => {
      feedRef.current?.querySelector(`[data-lead-index="${index}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)

    try {
      const anyEnabled = options.enrichment || options.preview || options.personalization
      if (!anyEnabled) {
        setFeedLeads(prev => prev.map((l, i) => i === index ? { ...l, status: 'done' } : l))
      } else {
        const res = await fetch(`/api/leads/${lead.id}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        })

        const data = await res.json()

        if (res.ok) {
          setFeedLeads(prev => prev.map((l, i) => i === index ? {
            ...l,
            status: 'done',
            enrichment: data.results?.enrichment ?? null,
            preview: data.results?.preview ?? null,
            personalization: data.results?.personalization ?? null,
          } : l))

          setFeedStats(prev => ({
            enriched: prev.enriched + (data.results?.enrichment?.success ? 1 : 0),
            previews: prev.previews + (data.results?.preview?.success ? 1 : 0),
            personalized: prev.personalized + (data.results?.personalization?.success ? 1 : 0),
            errors: prev.errors + (
              (data.results?.enrichment?.success === false ? 1 : 0) +
              (data.results?.preview?.success === false ? 1 : 0) +
              (data.results?.personalization?.success === false ? 1 : 0)
            ),
          }))
        } else {
          setFeedLeads(prev => prev.map((l, i) => i === index ? { ...l, status: 'error' } : l))
          setFeedStats(prev => ({ ...prev, errors: prev.errors + 1 }))
        }
      }
    } catch {
      setFeedLeads(prev => prev.map((l, i) => i === index ? { ...l, status: 'error' } : l))
      setFeedStats(prev => ({ ...prev, errors: prev.errors + 1 }))
    }

    processNextLead(leads, index + 1, options)
  }, [])

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/leads/import-create', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        if (data.created.length === 0) {
          setImportResult({ created: 0, skipped: data.skipped })
          setStep('complete')
          return
        }

        // Initialize feed leads and go to configure step
        const leads: LeadEntry[] = data.created.map((l: any) => ({
          id: l.id,
          name: l.name,
          company: l.company,
          status: 'pending' as const,
        }))

        setFeedLeads(leads)
        setFeedDone(false)
        setFeedStats({ enriched: 0, previews: 0, personalized: 0, errors: 0 })
        setImportResult({ created: data.created.length, skipped: data.skipped, total: data.total })
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

  const startProcessing = () => {
    const anyProcessing = processOptions.enrichment || processOptions.preview || processOptions.personalization
    if (!anyProcessing) {
      setFeedDone(true)
    }
    setStep('feed')
    if (anyProcessing) {
      processNextLead(feedLeads, 0, processOptions)
    }
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
          {/* Upload Zone */}
          <Card className="p-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload size={48} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Drop Apollo CSV Here</h3>
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
                <h4 className="font-semibold text-gray-900 mb-4">Expected Apollo Headers</h4>
                <div className="text-left bg-gray-50 p-6 rounded-lg">
                  <code className="text-sm text-gray-700 block space-y-1">
                    <div>First Name, Last Name, Title, Company Name, Email</div>
                    <div>Industry, Keywords, Website, City, State, Company Phone</div>
                  </code>
                </div>
              </div>
            </div>
          </Card>

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

                {/* Stats */}
                {(() => {
                  const meta = (importDetail.import.metadata as any) || {}
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-xl font-bold text-blue-600">{meta.created || importDetail.leads.length}</p>
                        <p className="text-xs text-gray-600">Created</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xl font-bold text-green-600">{meta.enriched || 0}</p>
                        <p className="text-xs text-gray-600">Enriched</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-xl font-bold text-purple-600">{meta.previews || 0}</p>
                        <p className="text-xs text-gray-600">Previews</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <p className="text-xl font-bold text-amber-600">{meta.personalized || 0}</p>
                        <p className="text-xs text-gray-600">Personalized</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xl font-bold text-gray-600">{meta.skipped || 0}</p>
                        <p className="text-xs text-gray-600">Skipped</p>
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
                  {importResult?.created} leads imported
                </h3>
                <p className="text-sm text-gray-500">
                  {importResult?.skipped > 0 && `${importResult.skipped} duplicates skipped. `}
                  Choose which processing steps to run below.
                </p>
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
            <Button variant="outline" onClick={() => {
              setStep('upload')
              setFeedLeads([])
              fetchImportHistory()
            }}>
              Skip Processing
            </Button>
            <Button onClick={startProcessing} className="px-8">
              {processOptions.enrichment || processOptions.preview || processOptions.personalization
                ? `Start Processing ${feedLeads.length} Leads`
                : `Done`}
              <ChevronRight size={18} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: LIVE PROCESSING FEED ──────────────────────────── */}
      {step === 'feed' && (
        <div className="max-w-4xl mx-auto space-y-4">
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
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => {
                    setStep('upload')
                    setFeedLeads([])
                    setFeedDone(false)
                    setFeedStats({ enriched: 0, previews: 0, personalized: 0, errors: 0 })
                    fetchImportHistory()
                  }}>
                    Import More Leads
                  </Button>
                  <Button onClick={() => window.location.href = '/admin/leads'}>
                    View in Leads
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => { setFolderDialogOpen(true); fetchFolders() }}
                >
                  <FolderPlus size={16} className="mr-1" />
                  Add to Folder
                </Button>
              </div>

              {folderSuccess && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <CheckCircle size={20} className="text-green-600 mx-auto mb-1" />
                  <p className="text-sm font-medium text-green-900">{folderSuccess}</p>
                </div>
              )}
            </Card>
          )}

          {/* Folder Dialog */}
          {folderDialogOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setFolderDialogOpen(false)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Add Imported Leads to Folder</h3>
                  <button onClick={() => setFolderDialogOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Create New Folder</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="e.g., January Import, Texas Leads..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                    <Button size="sm" onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}>
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 block mb-2">Or Choose Existing Folder</label>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          selectedFolderId === folder.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <FolderOpen size={18} style={{ color: folder.color }} />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{folder.name}</div>
                          <div className="text-xs text-gray-500">{folder._count?.leads || 0} leads</div>
                        </div>
                      </button>
                    ))}
                    {folders.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No folders yet. Create one above.</p>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleAddToFolder}
                  disabled={!selectedFolderId || addingToFolder}
                >
                  {addingToFolder ? 'Adding...' : 'Add Leads to Folder'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COMPLETE (edge case: all duplicates) ──────────────────── */}
      {step === 'complete' && (
        <div className="max-w-4xl mx-auto">
          <Card className="p-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={48} className="text-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Complete</h3>
              <p className="text-gray-600 mb-8">
                {importResult?.created === 0
                  ? `All ${importResult?.skipped || 0} leads were already in the database (duplicates).`
                  : `Created ${importResult?.created || 0} leads, skipped ${importResult?.skipped || 0} duplicates.`}
              </p>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back to Import
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}