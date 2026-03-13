'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Upload, Instagram, Linkedin, Users2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import Papa from 'papaparse'

// ── Types ──

interface Stats {
  total: number
  withInstagram: number
  withLinkedIn: number
  withBoth: number
  instagramPct: number
  linkedinPct: number
}

interface ImportResult {
  matched: number
  updated: number
  skipped: number
  errors: string[]
}

type SocialFilter = 'all' | 'instagram' | 'linkedin' | 'both' | 'none'

// ── Page ──

export default function SocialEnrichmentPage() {
  // Stats
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // CSV Import
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [importSource, setImportSource] = useState('csv_import')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Leads table
  const [leads, setLeads] = useState<any[]>([])
  const [leadsTotal, setLeadsTotal] = useState(0)
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [socialFilter, setSocialFilter] = useState<SocialFilter>('all')
  const [page, setPage] = useState(0)
  const LIMIT = 50

  // ── Fetch stats ──

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/leads/social-stats')
      if (res.ok) setStats(await res.json())
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // ── Fetch leads ──

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) })
      if (socialFilter !== 'all') params.set('socialFilter', socialFilter)
      const res = await fetch(`/api/leads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || [])
        setLeadsTotal(data.total || 0)
      }
    } finally {
      setLeadsLoading(false)
    }
  }, [socialFilter, page])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchLeads() }, [fetchLeads])

  // ── CSV handling ──

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportResult(null)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setParsedRows(result.data as any[])
        setPreviewRows((result.data as any[]).slice(0, 5))
      },
    })
  }

  const handleImport = async () => {
    if (parsedRows.length === 0) return
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/leads/social-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedRows, source: importSource }),
      })
      if (res.ok) {
        const data = await res.json()
        setImportResult(data.result)
        fetchStats()
        fetchLeads()
      }
    } finally {
      setImporting(false)
    }
  }

  // ── Filter tabs ──

  const filterTabs: { key: SocialFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'instagram', label: 'Has Instagram' },
    { key: 'linkedin', label: 'Has LinkedIn' },
    { key: 'both', label: 'Has Both' },
    { key: 'none', label: 'Not Enriched' },
  ]

  const totalPages = Math.ceil(leadsTotal / LIMIT)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Social Enrichment</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Enrich leads with Instagram and LinkedIn handles for social outreach campaigns.
        </p>
      </div>

      {/* ── Section 1: Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? (
          <div className="col-span-4 flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading stats...
          </div>
        ) : stats ? (
          <>
            <StatCard icon={<Users2 size={20} />} label="Total Leads" value={stats.total.toLocaleString()} color="blue" />
            <StatCard icon={<Instagram size={20} />} label="Instagram" value={`${stats.withInstagram.toLocaleString()} (${stats.instagramPct}%)`} color="pink" />
            <StatCard icon={<Linkedin size={20} />} label="LinkedIn" value={`${stats.withLinkedIn.toLocaleString()} (${stats.linkedinPct}%)`} color="sky" />
            <StatCard icon={<Users2 size={20} />} label="Both" value={stats.withBoth.toLocaleString()} color="emerald" />
          </>
        ) : null}
      </div>

      {/* ── Section 2: CSV Import ── */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Bulk Import Social Handles</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Upload a CSV from PhantomBuster or Expandi to enrich your leads with social handles.
        </p>

        {/* Format instructions */}
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 mb-4 text-xs text-gray-600 dark:text-gray-400 font-mono">
          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">CSV Format:</p>
          <p>Identifier (at least one): <span className="text-blue-600 dark:text-blue-400">leadId</span>, <span className="text-blue-600 dark:text-blue-400">companyName</span>, <span className="text-blue-600 dark:text-blue-400">phone</span></p>
          <p>Social (at least one): <span className="text-blue-600 dark:text-blue-400">instagramHandle</span>, <span className="text-blue-600 dark:text-blue-400">linkedinUrl</span></p>
          <p className="mt-2 text-gray-500">Example: companyName,phone,instagramHandle,linkedinUrl</p>
          <p className="text-gray-500">&quot;Smith Plumbing&quot;,&quot;+12155551234&quot;,&quot;smithplumbing&quot;,&quot;https://linkedin.com/in/johnsmith&quot;</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 text-sm">
            <Upload size={16} className="text-gray-500" />
            <span className="text-gray-700 dark:text-gray-300">Choose CSV file</span>
            <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
          </label>
          <select
            value={importSource}
            onChange={e => setImportSource(e.target.value)}
            className="border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-gray-100"
          >
            <option value="csv_import">CSV Import</option>
            <option value="phantombuster">PhantomBuster Export</option>
            <option value="expandi">Expandi Export</option>
            <option value="manual">Manual</option>
          </select>
          {parsedRows.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {parsedRows.length} rows parsed
            </span>
          )}
        </div>

        {/* Preview table */}
        {previewRows.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-xs border dark:border-slate-700 rounded-lg">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800">
                  {Object.keys(previewRows[0]).map(key => (
                    <th key={key} className="px-3 py-2 text-left text-gray-600 dark:text-gray-400 font-medium">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-t dark:border-slate-700">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300">{String(val || '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 5 && (
              <p className="text-xs text-gray-400 mt-1">Showing 5 of {parsedRows.length} rows</p>
            )}
          </div>
        )}

        {/* Import button */}
        {parsedRows.length > 0 && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? 'Importing...' : `Import ${parsedRows.length} rows`}
          </button>
        )}

        {/* Import result */}
        {importResult && (
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              {importResult.updated} leads updated &middot; {importResult.skipped} skipped &middot; {importResult.errors.length} errors
            </p>
            {importResult.errors.length > 0 && (
              <ul className="mt-2 text-xs text-red-600 dark:text-red-400 list-disc list-inside">
                {importResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}
          </div>
        )}
      </Card>

      {/* ── Section 3: Leads Table ── */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Leads</h2>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setSocialFilter(tab.key); setPage(0) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                socialFilter === tab.key
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {leadsLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading...
          </div>
        ) : leads.length === 0 ? (
          <p className="text-center py-12 text-gray-400 dark:text-gray-500">No leads found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-slate-700 text-left">
                    <th className="pb-3 text-gray-600 dark:text-gray-400 font-medium">Company</th>
                    <th className="pb-3 text-gray-600 dark:text-gray-400 font-medium">Industry</th>
                    <th className="pb-3 text-gray-600 dark:text-gray-400 font-medium">Instagram</th>
                    <th className="pb-3 text-gray-600 dark:text-gray-400 font-medium">LinkedIn</th>
                    <th className="pb-3 text-gray-600 dark:text-gray-400 font-medium">Enriched</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead: any) => (
                    <tr key={lead.id} className="border-b dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="py-3">
                        <a href={`/admin/leads/${lead.id}`} className="text-blue-600 hover:underline font-medium">
                          {lead.companyName || '—'}
                        </a>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{lead.industry || '—'}</td>
                      <td className="py-3">
                        {lead.instagramHandle ? (
                          <a href={`https://instagram.com/${lead.instagramHandle}`} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline">
                            @{lead.instagramHandle}
                          </a>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {lead.linkedinUrl ? (
                          <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">
                            View
                          </a>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {lead.socialEnrichedAt ? new Date(lead.socialEnrichedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, leadsTotal)} of {leadsTotal}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border dark:border-slate-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border dark:border-slate-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

// ── Stat Card Component ──

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
    sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
      </div>
    </Card>
  )
}
