'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, X, AlertTriangle, Loader2, CheckCircle, XCircle, Clock,
  Plus, ChevronDown, ChevronUp, ChevronRight, Info, Eye, Brain,
  Download, Play, Square, Star, MapPin, Phone, Building2, Filter,
  Save, Trash2, Globe, Zap, ArrowLeft, ArrowRight, RefreshCw,
} from 'lucide-react'
import usCitiesData from '@/data/us-cities.json'

// ============================================================
// Types
// ============================================================

type ViewState = 'configure' | 'running' | 'results' | 'importing'

type SearchTerm = { term: string; industry: string }

type ScrapedLead = {
  companyName: string
  phone: string
  city: string
  state: string
  industry: string
  rating: number
  reviews: number
  hasPhotos: boolean
  hasHours: boolean
  address: string
  categories: string[]
  gpsCoordinates: { latitude: number; longitude: number } | null
  type: string
  qualityScore: number
  searchQuery: string
}

type CreditInfo = {
  configured: boolean
  connected?: boolean
  account?: {
    totalSearchesLeft: number
    searchesPerMonth: number
    thisMonthUsage: number
    planName: string
    lastHourSearches: number
    rateLimit: number
  }
  daily?: {
    todayUsage: number
    dailyLimit: number
    dailyRemaining: number | null
    limitReached: boolean
  }
}

type ScraperProgress = {
  status: 'running' | 'completed' | 'failed' | 'stopped'
  queriesUsed: number
  totalQueries: number
  leadsFound: number
  resultsScanned: number
  skipped: {
    website: number
    noPhone: number
    lowReviews: number
    lowRating: number
    noPhotos: number
    noHours: number
  }
  qualifiedLeads: ScrapedLead[]
  stopReason?: string
  error?: string
}

type DedupStatus = null | 'bright' | 'scrape'

const INDUSTRY_OPTIONS = [
  'ROOFING', 'LANDSCAPING', 'PAINTING', 'HVAC', 'PLUMBING', 'CLEANING',
  'ELECTRICAL', 'PEST_CONTROL', 'GENERAL_CONTRACTING', 'RESTORATION',
  'LAW', 'REAL_ESTATE', 'HEALTHCARE', 'OTHER',
]

const COMMON_TERMS: SearchTerm[] = [
  { term: 'roofer', industry: 'ROOFING' },
  { term: 'roofing company', industry: 'ROOFING' },
  { term: 'tree service', industry: 'LANDSCAPING' },
  { term: 'tree removal', industry: 'LANDSCAPING' },
  { term: 'painter', industry: 'PAINTING' },
  { term: 'painting company', industry: 'PAINTING' },
  { term: 'hvac company', industry: 'HVAC' },
  { term: 'plumber', industry: 'PLUMBING' },
  { term: 'fence company', industry: 'GENERAL_CONTRACTING' },
  { term: 'concrete company', industry: 'GENERAL_CONTRACTING' },
  { term: 'pressure washing', industry: 'CLEANING' },
  { term: 'junk removal', industry: 'CLEANING' },
  { term: 'garage door repair', industry: 'GENERAL_CONTRACTING' },
  { term: 'landscaping company', industry: 'LANDSCAPING' },
  { term: 'handyman service', industry: 'GENERAL_CONTRACTING' },
  { term: 'pest control', industry: 'PEST_CONTROL' },
  { term: 'gutter installation', industry: 'GENERAL_CONTRACTING' },
  { term: 'air conditioning repair', industry: 'HVAC' },
  { term: 'house painting', industry: 'PAINTING' },
  { term: 'lawn care service', industry: 'LANDSCAPING' },
]

const INDUSTRY_COLORS: Record<string, string> = {
  ROOFING: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  LANDSCAPING: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  PAINTING: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  HVAC: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
  PLUMBING: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400',
  CLEANING: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  ELECTRICAL: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
  PEST_CONTROL: 'bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-400',
  GENERAL_CONTRACTING: 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-gray-300',
  RESTORATION: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  OTHER: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300',
}

// ============================================================
// Main Page Component
// ============================================================

export default function ScraperPage() {
  const [view, setView] = useState<ViewState>('configure')

  // Credit info
  const [credits, setCredits] = useState<CreditInfo | null>(null)
  const [loadingCredits, setLoadingCredits] = useState(true)

  // Configure state
  const [scrapeName, setScrapeName] = useState('')
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([])
  const [termInput, setTermInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set())
  const [cityTab, setCityTab] = useState<'states' | 'regions' | 'population' | 'lists' | 'manual'>('states')
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set())
  const [minReviews, setMinReviews] = useState(5)
  const [minRating, setMinRating] = useState(3.5)
  const [targetLeads, setTargetLeads] = useState(400)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [hasPhotos, setHasPhotos] = useState<'any' | 'yes' | 'no'>('any')
  const [hasHours, setHasHours] = useState<'any' | 'yes' | 'no'>('any')
  const [minCategories, setMinCategories] = useState(0)
  const [maxDistance, setMaxDistance] = useState(0)
  const [manualCityInput, setManualCityInput] = useState('')

  // Running state
  const [runId, setRunId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ScraperProgress | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Results state
  const [results, setResults] = useState<ScrapedLead[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [dedupStatuses, setDedupStatuses] = useState<DedupStatus[]>([])
  const [resultFilter, setResultFilter] = useState<'all' | 'new' | 'dupes'>('all')
  const [industryFilter, setIndustryFilter] = useState<string>('all')
  const [editingName, setEditingName] = useState(false)

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importBatchName, setImportBatchName] = useState('')
  const [importFolderId, setImportFolderId] = useState('')
  const [importAssignToId, setImportAssignToId] = useState('')
  const [importOptions, setImportOptions] = useState({ enrichment: true, preview: true, personalization: true })
  const [importing, setImporting] = useState(false)
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([])
  const [reps, setReps] = useState<Array<{ id: string; firstName: string; lastName: string }>>([])

  // Import processing feed
  const [importJobId, setImportJobId] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState<any>(null)
  const importPollingRef = useRef<NodeJS.Timeout | null>(null)

  // City lists
  const [cityLists, setCityLists] = useState<Array<{ id: string; name: string; cities: string[] }>>([])
  const [newListName, setNewListName] = useState('')

  // Saved configs
  const [savedConfigs, setSavedConfigs] = useState<any[]>([])
  const [showSavedConfigs, setShowSavedConfigs] = useState(false)

  // Dedup modal
  const [showDedupModal, setShowDedupModal] = useState(false)
  const [dedupOverlaps, setDedupOverlaps] = useState<Array<{ city: string; count: number }>>([])

  // ============================================================
  // Data Fetching
  // ============================================================

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper/credits')
      if (res.ok) setCredits(await res.json())
    } catch { /* non-fatal */ }
    setLoadingCredits(false)
  }, [])

  const fetchCityLists = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper/city-lists')
      if (res.ok) {
        const data = await res.json()
        setCityLists(data.lists || [])
      }
    } catch { /* non-fatal */ }
  }, [])

  const fetchSavedConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper/configs')
      if (res.ok) {
        const data = await res.json()
        setSavedConfigs(data.configs || [])
      }
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => {
    fetchCredits()
    fetchCityLists()
    fetchSavedConfigs()
    // Refresh credits every 30s so the display stays live
    const interval = setInterval(fetchCredits, 30_000)
    return () => clearInterval(interval)
  }, [fetchCredits, fetchCityLists, fetchSavedConfigs])

  // ============================================================
  // Scraper Control
  // ============================================================

  const startScraping = async () => {
    // Pre-scrape dedup check
    const citiesArr = Array.from(selectedCities)
    try {
      const res = await fetch('/api/scraper/dedup-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cities: citiesArr }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.overlaps && data.overlaps.length > 0) {
          setDedupOverlaps(data.overlaps)
          setShowDedupModal(true)
          return
        }
      }
    } catch { /* non-fatal, proceed */ }

    await doStartScraping()
  }

  const doStartScraping = async () => {
    setShowDedupModal(false)
    const citiesArr = Array.from(selectedCities)

    try {
      const res = await fetch('/api/scraper/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scrapeName || undefined,
          searchTerms,
          cities: citiesArr,
          filters: {
            minReviews,
            minRating,
            targetLeads,
            hasPhotos: hasPhotos !== 'any' ? hasPhotos : undefined,
            hasHours: hasHours !== 'any' ? hasHours : undefined,
            minCategories: minCategories > 0 ? minCategories : undefined,
            maxDistance: maxDistance > 0 ? maxDistance : undefined,
          },
          cityMode: 'major',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to start scraper')
        return
      }

      const data = await res.json()
      setRunId(data.runId)
      setView('running')
      startPolling(data.runId)
    } catch (err) {
      alert('Failed to start scraper')
    }
  }

  const startPolling = (id: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/scraper/status?runId=${id}`)
        if (res.ok) {
          const data: ScraperProgress = await res.json()
          setProgress(data)

          if (data.status === 'completed' || data.status === 'stopped' || data.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current)
            // Fetch full results
            await fetchResults(id)
          }
        }
      } catch { /* non-fatal */ }
    }, 2000)
  }

  const stopScraping = async () => {
    if (!runId) return
    try {
      await fetch('/api/scraper/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      })
    } catch { /* non-fatal */ }
  }

  const fetchResults = async (id: string) => {
    try {
      const res = await fetch(`/api/scraper/results?runId=${id}`)
      if (res.ok) {
        const data = await res.json()
        const leads = data.leads || []
        setResults(leads)

        // Select all by default
        const allIndices = new Set<number>(leads.map((_: any, i: number) => i))
        setSelectedIndices(allIndices)

        // Run post-scrape dedup, then deselect dupes
        const phones = leads.map((l: any) => l.phone).filter(Boolean)
        if (phones.length > 0) {
          try {
            const dedupRes = await fetch('/api/scraper/dedup-results', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phones }),
            })
            if (dedupRes.ok) {
              const dedupData = await dedupRes.json()
              const matches = dedupData.matches || {}
              const seenPhones = new Set<string>()
              const statuses: DedupStatus[] = leads.map((lead: any) => {
                const normalized = lead.phone.replace(/\D/g, '').slice(-10)
                if (matches[normalized]) return 'bright' as DedupStatus
                if (seenPhones.has(normalized)) return 'scrape' as DedupStatus
                seenPhones.add(normalized)
                return null
              })
              setDedupStatuses(statuses)

              // Deselect dupes — only keep new leads selected
              const newIndices = new Set<number>()
              statuses.forEach((s, i) => { if (s === null) newIndices.add(i) })
              setSelectedIndices(newIndices)
            } else {
              setDedupStatuses(leads.map(() => null))
            }
          } catch {
            setDedupStatuses(leads.map(() => null))
          }
        } else {
          setDedupStatuses(leads.map(() => null))
        }

        setView('results')
        fetchCredits() // Refresh credits after scrape
      }
    } catch { /* non-fatal */ }
  }

  const runPostScrapeDedup = async (leads: ScrapedLead[]) => {
    const phones = leads.map(l => l.phone).filter(Boolean)
    if (phones.length === 0) {
      setDedupStatuses(leads.map(() => null))
      return
    }

    try {
      const res = await fetch('/api/scraper/dedup-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones }),
      })

      if (!res.ok) {
        setDedupStatuses(leads.map(() => null))
        return
      }

      const data = await res.json()
      const matches = data.matches || {}

      // Mark dedup statuses
      const seenPhones = new Set<string>()
      const statuses: DedupStatus[] = leads.map(lead => {
        const normalized = lead.phone.replace(/\D/g, '').slice(-10)
        if (matches[normalized]) return 'bright'
        if (seenPhones.has(normalized)) return 'scrape'
        seenPhones.add(normalized)
        return null
      })

      setDedupStatuses(statuses)
    } catch {
      setDedupStatuses(leads.map(() => null))
    }
  }

  // ============================================================
  // Import
  // ============================================================

  const openImportModal = async () => {
    setImportBatchName(scrapeName || `GBP Scrape ${new Date().toLocaleDateString()}`)

    // Fetch folders and reps
    try {
      const [foldersRes, repsRes] = await Promise.all([
        fetch('/api/folders'),
        fetch('/api/reps'),
      ])
      if (foldersRes.ok) {
        const data = await foldersRes.json()
        setFolders(data.folders || data || [])
      }
      if (repsRes.ok) {
        const data = await repsRes.json()
        setReps(data.reps || [])
      }
    } catch { /* non-fatal */ }

    setShowImportModal(true)
  }

  const doImport = async (skipProcessing = false) => {
    if (!importBatchName.trim()) return
    setImporting(true)

    const selectedLeads = results
      .filter((_, i) => selectedIndices.has(i))
      .map(l => ({
        companyName: l.companyName,
        phone: l.phone,
        city: l.city,
        state: l.state,
        industry: l.industry,
        rating: l.rating,
        reviews: l.reviews,
        address: l.address,
      }))

    try {
      const res = await fetch('/api/scraper/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          selectedLeads,
          batchName: importBatchName.trim(),
          folderId: importFolderId || undefined,
          assignToId: importAssignToId || undefined,
          processOptions: skipProcessing ? undefined : importOptions,
          skipProcessing,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Import failed')
        setImporting(false)
        return
      }

      const data = await res.json()
      setShowImportModal(false)
      setImporting(false)

      if (data.importJobId) {
        setImportJobId(data.importJobId)
        setView('importing')
        startImportPolling(data.importJobId)
      } else {
        // Skip processing — just show success
        alert(`Imported ${data.created?.length || 0} leads (${data.skipped || 0} skipped as duplicates)`)
        setView('configure')
      }
    } catch {
      alert('Import failed')
      setImporting(false)
    }
  }

  const startImportPolling = (jobId: string) => {
    if (importPollingRef.current) clearInterval(importPollingRef.current)
    importPollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/leads/import/status?jobId=${jobId}`)
        if (res.ok) {
          const data = await res.json()
          setImportProgress(data)
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'error') {
            if (importPollingRef.current) clearInterval(importPollingRef.current)
          }
        }
      } catch { /* non-fatal */ }
    }, 2000)
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (importPollingRef.current) clearInterval(importPollingRef.current)
    }
  }, [])

  // ============================================================
  // City Management
  // ============================================================

  const toggleCity = (cityStr: string) => {
    setSelectedCities(prev => {
      const next = new Set(prev)
      if (next.has(cityStr)) next.delete(cityStr)
      else next.add(cityStr)
      return next
    })
  }

  const addCitiesFromState = (stateAbbr: string) => {
    const stateData = (usCitiesData.states as any)[stateAbbr]
    if (!stateData) return
    setSelectedCities(prev => {
      const next = new Set(prev)
      for (const city of stateData.cities) {
        next.add(`${city} ${stateAbbr}`)
      }
      return next
    })
  }

  const removeCitiesFromState = (stateAbbr: string) => {
    const stateData = (usCitiesData.states as any)[stateAbbr]
    if (!stateData) return
    setSelectedCities(prev => {
      const next = new Set(prev)
      for (const city of stateData.cities) {
        next.delete(`${city} ${stateAbbr}`)
      }
      return next
    })
  }

  const addRegionCities = (regionName: string) => {
    const states = (usCitiesData.regions as any)[regionName] || []
    for (const st of states) addCitiesFromState(st)
  }

  const addPopulationTier = (tier: string) => {
    const cities = (usCitiesData.populationTiers as any)[tier] || []
    setSelectedCities(prev => {
      const next = new Set(prev)
      for (const c of cities) next.add(c)
      return next
    })
  }

  // ============================================================
  // Search Terms
  // ============================================================

  const addTerm = (term: string, industry?: string) => {
    const trimmed = term.trim().toLowerCase()
    if (!trimmed) return
    if (searchTerms.some(t => t.term === trimmed)) return

    const defaultIndustry = COMMON_TERMS.find(ct => ct.term === trimmed)?.industry || industry || 'GENERAL_CONTRACTING'
    setSearchTerms(prev => [...prev, { term: trimmed, industry: defaultIndustry }])
    setTermInput('')
    setShowSuggestions(false)
  }

  const removeTerm = (index: number) => {
    setSearchTerms(prev => prev.filter((_, i) => i !== index))
  }

  const updateTermIndustry = (index: number, industry: string) => {
    setSearchTerms(prev => prev.map((t, i) => i === index ? { ...t, industry } : t))
  }

  // ============================================================
  // Saved Configs
  // ============================================================

  const saveConfig = async () => {
    const name = prompt('Config name:')
    if (!name?.trim()) return

    try {
      const res = await fetch('/api/scraper/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          searchTerms,
          cities: Array.from(selectedCities),
          minReviews,
          minRating,
          targetLeads,
        }),
      })
      if (res.ok) {
        fetchSavedConfigs()
      }
    } catch { /* non-fatal */ }
  }

  const loadConfig = (config: any) => {
    setSearchTerms(config.searchTerms || [])
    setSelectedCities(new Set(config.cities || []))
    setMinReviews(config.minReviews ?? 5)
    setMinRating(config.minRating ?? 3.5)
    setTargetLeads(config.targetLeads ?? 400)
    setScrapeName(config.name || '')
    setShowSavedConfigs(false)
  }

  const deleteConfig = async (id: string) => {
    try {
      await fetch(`/api/scraper/configs/${id}`, { method: 'DELETE' })
      fetchSavedConfigs()
    } catch { /* non-fatal */ }
  }

  // ============================================================
  // Computed values
  // ============================================================

  const totalQueries = searchTerms.length * selectedCities.size
  const estimatedCost = (totalQueries * 0.002).toFixed(2)
  const exceedsDailyLimit = !!(credits?.daily?.dailyLimit && credits.daily.dailyLimit > 0 && totalQueries > (credits.daily.dailyRemaining || 0))
  const exceedsMonthlyBalance = !!(credits?.account && totalQueries > credits.account.totalSearchesLeft)
  const canStart = searchTerms.length > 0 && selectedCities.size > 0 && credits?.configured && !credits?.daily?.limitReached && !exceedsDailyLimit && !exceedsMonthlyBalance

  const filteredResults = results.filter((lead, i) => {
    if (resultFilter === 'new' && dedupStatuses[i] !== null) return false
    if (resultFilter === 'dupes' && dedupStatuses[i] === null) return false
    if (industryFilter !== 'all' && lead.industry !== industryFilter) return false
    return true
  })

  const selectedCount = Array.from(selectedIndices).filter(i => {
    if (resultFilter !== 'all') {
      const lead = results[i]
      if (!lead) return false
      if (resultFilter === 'new' && dedupStatuses[i] !== null) return false
      if (resultFilter === 'dupes' && dedupStatuses[i] === null) return false
      if (industryFilter !== 'all' && lead.industry !== industryFilter) return false
    }
    return true
  }).length

  const totalSelected = selectedIndices.size
  const dupesCount = dedupStatuses.filter(s => s !== null).length
  const newCount = dedupStatuses.filter(s => s === null).length
  const avgQuality = results.length > 0
    ? Math.round(results.reduce((sum, l) => sum + l.qualityScore, 0) / results.length)
    : 0

  // Count selected cities per state
  const getStateCityCount = (stateAbbr: string) => {
    const stateData = (usCitiesData.states as any)[stateAbbr]
    if (!stateData) return { selected: 0, total: 0 }
    const total = stateData.cities.length
    const selected = stateData.cities.filter((c: string) => selectedCities.has(`${c} ${stateAbbr}`)).length
    return { selected, total }
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100 flex items-center gap-2">
            <Globe className="text-teal-600" size={28} />
            GBP Lead Scraper
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Find businesses without websites on Google Maps
          </p>
        </div>
        {view !== 'configure' && view !== 'importing' && (
          <Button
            variant="outline"
            onClick={() => {
              if (pollingRef.current) clearInterval(pollingRef.current)
              if (importPollingRef.current) clearInterval(importPollingRef.current)
              setView('configure')
              setProgress(null)
              setResults([])
              setRunId(null)
              setDedupStatuses([])
              setSelectedIndices(new Set())
              setResultFilter('all')
              setIndustryFilter('all')
              setImportProgress(null)
              setImportJobId(null)
            }}
          >
            <ArrowLeft size={16} className="mr-1" /> New Scrape
          </Button>
        )}
      </div>

      {/* SerpAPI Credit Cards */}
      {(view === 'configure' || view === 'results') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account Balance Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-gray-400">SerpAPI Account</span>
              {loadingCredits ? (
                <Loader2 size={14} className="animate-spin text-slate-400 dark:text-gray-500" />
              ) : credits?.configured ? (
                <Badge className={credits.connected ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}>
                  {credits.connected ? 'Connected' : 'Error'}
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400">Not Configured</Badge>
              )}
            </div>
            {credits?.account ? (
              <>
                <div className="text-lg font-bold text-slate-900 dark:text-gray-100">
                  {credits.account.totalSearchesLeft.toLocaleString()} / {credits.account.searchesPerMonth.toLocaleString()}
                  <span className="text-sm font-normal text-slate-500 dark:text-gray-400 ml-1">remaining</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/50 rounded-full mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      credits.account.totalSearchesLeft / credits.account.searchesPerMonth > 0.3
                        ? 'bg-green-500'
                        : credits.account.totalSearchesLeft / credits.account.searchesPerMonth > 0.1
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (credits.account.totalSearchesLeft / credits.account.searchesPerMonth) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">{credits.account.planName} — {credits.account.thisMonthUsage.toLocaleString()} used this month</p>
              </>
            ) : !loadingCredits && !credits?.configured ? (
              <p className="text-sm text-slate-500 dark:text-gray-400">Configure SerpAPI in <a href="/admin/settings" className="text-teal-600 hover:underline">Settings</a></p>
            ) : null}
          </Card>

          {/* Daily Limit Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-gray-400">Daily Limit</span>
              {credits?.daily?.limitReached && (
                <Badge className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">Limit Reached</Badge>
              )}
            </div>
            {credits?.daily ? (
              <>
                <div className="text-lg font-bold text-slate-900 dark:text-gray-100">
                  Today: {credits.daily.todayUsage.toLocaleString()}
                  {credits.daily.dailyLimit > 0 ? (
                    <span> / {credits.daily.dailyLimit.toLocaleString()} used</span>
                  ) : (
                    <span className="text-sm font-normal text-slate-500 dark:text-gray-400 ml-1">used (no daily limit)</span>
                  )}
                </div>
                {credits.daily.dailyLimit > 0 && (
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/50 rounded-full mt-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        credits.daily.limitReached
                          ? 'bg-red-500'
                          : credits.daily.dailyLimit - credits.daily.todayUsage < 50
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (credits.daily.todayUsage / credits.daily.dailyLimit) * 100)}%` }}
                    />
                  </div>
                )}
                {credits.daily.dailyLimit === 0 && (
                  <p className="text-xs text-slate-400 dark:text-gray-500 mt-2 flex items-center gap-1">
                    <Info size={12} /> Set SERPAPI_DAILY_LIMIT in Railway env vars to cap daily usage
                  </p>
                )}
              </>
            ) : null}
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONFIGURE VIEW */}
      {/* ============================================================ */}
      {view === 'configure' && (
        <>
          {/* Saved Configs + Scrape Name */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder={`Scrape ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              value={scrapeName}
              onChange={e => setScrapeName(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
            />
            <Button variant="outline" size="sm" onClick={() => setShowSavedConfigs(!showSavedConfigs)}>
              <Save size={14} className="mr-1" /> Saved
            </Button>
            <Button variant="outline" size="sm" onClick={saveConfig} disabled={searchTerms.length === 0}>
              <Plus size={14} className="mr-1" /> Save Current
            </Button>
          </div>

          {/* Saved Configs Dropdown */}
          {showSavedConfigs && savedConfigs.length > 0 && (
            <Card className="p-3">
              <div className="space-y-2">
                {savedConfigs.map((config: any) => (
                  <div key={config.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                    <div>
                      <span className="font-medium text-sm">{config.name}</span>
                      <span className="text-xs text-slate-400 dark:text-gray-500 ml-2">
                        {(config.searchTerms as any[])?.length || 0} terms, {(config.cities as any[])?.length || 0} cities
                      </span>
                      {config.lastRunAt && (
                        <span className="text-xs text-slate-400 dark:text-gray-500 ml-2">
                          Last run: {new Date(config.lastRunAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => loadConfig(config)}>Load</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteConfig(config.id)}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quality Filters */}
          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <Filter size={18} /> Quality Filters
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Min Reviews</label>
                <input
                  type="number"
                  value={minReviews}
                  onChange={e => setMinReviews(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
                  min={0}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Min Rating</label>
                <input
                  type="number"
                  value={minRating}
                  onChange={e => setMinRating(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
                  min={0}
                  max={5}
                  step={0.5}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Target Leads</label>
                <input
                  type="number"
                  value={targetLeads}
                  onChange={e => setTargetLeads(parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
                  min={10}
                />
              </div>
            </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="mt-3 text-sm text-teal-600 hover:text-teal-700 dark:hover:text-teal-400 flex items-center gap-1"
            >
              {showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showAdvancedFilters ? 'Hide' : 'More'} Filters
            </button>

            {showAdvancedFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Has Photos</label>
                  <select
                    value={hasPhotos}
                    onChange={e => setHasPhotos(e.target.value as 'any' | 'yes' | 'no')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
                  >
                    <option value="any">Any</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Has Hours</label>
                  <select
                    value={hasHours}
                    onChange={e => setHasHours(e.target.value as 'any' | 'yes' | 'no')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
                  >
                    <option value="any">Any</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Min Categories</label>
                  <input
                    type="number"
                    value={minCategories}
                    onChange={e => setMinCategories(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Max Distance (mi)</label>
                  <input
                    type="number"
                    value={maxDistance}
                    onChange={e => setMaxDistance(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
                    min={0}
                    placeholder="0 = no limit"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Search Terms */}
          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <Search size={18} /> Search Terms
            </h3>

            {/* Term input */}
            <div className="relative">
              <input
                type="text"
                placeholder='Type a search term and press Enter (e.g., "roofer")'
                value={termInput}
                onChange={e => {
                  setTermInput(e.target.value)
                  setShowSuggestions(e.target.value.length > 0)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    // Handle comma-separated paste
                    const parts = termInput.split(',').map(s => s.trim()).filter(Boolean)
                    for (const p of parts) addTerm(p)
                  }
                  if (e.key === 'Backspace' && !termInput && searchTerms.length > 0) {
                    removeTerm(searchTerms.length - 1)
                  }
                }}
                onFocus={() => termInput.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
              />

              {/* Suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                  {COMMON_TERMS
                    .filter(ct => ct.term.includes(termInput.toLowerCase()) && !searchTerms.some(t => t.term === ct.term))
                    .slice(0, 8)
                    .map(ct => (
                      <button
                        key={ct.term}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                        onMouseDown={() => addTerm(ct.term, ct.industry)}
                      >
                        <span>{ct.term}</span>
                        <Badge className={`${INDUSTRY_COLORS[ct.industry] || 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300'} text-xs`}>
                          {ct.industry}
                        </Badge>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Tags */}
            {searchTerms.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {searchTerms.map((term, i) => (
                  <div key={i} className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                    <span className="text-sm">{term.term}</span>
                    <select
                      value={term.industry}
                      onChange={e => updateTermIndustry(i, e.target.value)}
                      className="text-xs border-none bg-transparent text-slate-500 dark:text-gray-400 cursor-pointer"
                    >
                      {INDUSTRY_OPTIONS.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                    <button onClick={() => removeTerm(i)} className="text-slate-400 dark:text-gray-500 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* City Builder */}
          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <MapPin size={18} /> Cities
              <Badge className="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 ml-auto">{selectedCities.size} selected</Badge>
            </h3>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4 overflow-x-auto">
              {(['states', 'regions', 'population', 'lists', 'manual'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setCityTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                    cityTab === tab ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab === 'states' ? 'States' : tab === 'regions' ? 'Regions' : tab === 'population' ? 'Population' : tab === 'lists' ? 'My Lists' : 'Manual'}
                </button>
              ))}
            </div>

            {/* States Tab */}
            {cityTab === 'states' && (
              <div className="space-y-1 max-h-80 overflow-auto">
                {Object.entries(usCitiesData.states)
                  .sort(([, a], [, b]) => (a as any).name.localeCompare((b as any).name))
                  .map(([abbr, stateData]: [string, any]) => {
                    const { selected, total } = getStateCityCount(abbr)
                    const isExpanded = expandedStates.has(abbr)

                    return (
                      <div key={abbr} className="border border-slate-100 dark:border-slate-700 rounded">
                        <div className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                          <button
                            onClick={() => setExpandedStates(prev => {
                              const next = new Set(prev)
                              if (next.has(abbr)) next.delete(abbr)
                              else next.add(abbr)
                              return next
                            })}
                            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {stateData.name}
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 dark:text-gray-500">{selected}/{total}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-6"
                              onClick={() => selected === total ? removeCitiesFromState(abbr) : addCitiesFromState(abbr)}
                            >
                              {selected === total ? 'Deselect' : 'Select'}
                            </Button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-3 pb-2 flex flex-wrap gap-1">
                            {stateData.cities.map((city: string) => {
                              const cityStr = `${city} ${abbr}`
                              const isSelected = selectedCities.has(cityStr)
                              return (
                                <button
                                  key={city}
                                  onClick={() => toggleCity(cityStr)}
                                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                                    isSelected
                                      ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 border border-teal-300'
                                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {city}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Regions Tab */}
            {cityTab === 'regions' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(usCitiesData.regions).map(([region, states]) => (
                  <div key={region} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{region}</span>
                      <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => addRegionCities(region)}>
                        Add All
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-gray-500">{(states as string[]).join(', ')}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Population Tab */}
            {cityTab === 'population' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['top50', 'top100', 'top200', 'top500'].map(tier => (
                  <Button
                    key={tier}
                    variant="outline"
                    onClick={() => addPopulationTier(tier)}
                    className="h-auto py-3 flex-col"
                  >
                    <span className="font-bold text-lg">{tier.replace('top', 'Top ')}</span>
                    <span className="text-xs text-slate-400 dark:text-gray-500">
                      {((usCitiesData.populationTiers as any)[tier] || []).length} cities
                    </span>
                  </Button>
                ))}
              </div>
            )}

            {/* My Lists Tab */}
            {cityTab === 'lists' && (
              <div className="space-y-3">
                {cityLists.map(list => (
                  <div key={list.id} className="flex items-center justify-between p-2 border border-slate-200 dark:border-slate-700 rounded">
                    <div>
                      <span className="font-medium text-sm">{list.name}</span>
                      <span className="text-xs text-slate-400 dark:text-gray-500 ml-2">{(list.cities as string[]).length} cities</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedCities(prev => {
                          const next = new Set(prev)
                          for (const c of list.cities as string[]) next.add(c)
                          return next
                        })
                      }}>Load</Button>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        await fetch(`/api/scraper/city-lists/${list.id}`, { method: 'DELETE' })
                        fetchCityLists()
                      }}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="List name"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
                  />
                  <Button
                    size="sm"
                    disabled={!newListName.trim() || selectedCities.size === 0}
                    onClick={async () => {
                      await fetch('/api/scraper/city-lists', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newListName.trim(), cities: Array.from(selectedCities) }),
                      })
                      setNewListName('')
                      fetchCityLists()
                    }}
                  >
                    Save Current
                  </Button>
                </div>
              </div>
            )}

            {/* Manual Tab */}
            {cityTab === 'manual' && (
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder='Type "Savannah GA" and press Enter'
                    value={manualCityInput}
                    onChange={e => setManualCityInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && manualCityInput.trim()) {
                        const val = manualCityInput.trim()
                        setSelectedCities(prev => new Set([...prev, val]))
                        setManualCityInput('')
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
                  />
                </div>
              </div>
            )}

            {/* Selected cities tags */}
            {selectedCities.size > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 dark:text-gray-400">{selectedCities.size} cities selected</span>
                  <button onClick={() => setSelectedCities(new Set())} className="text-xs text-red-500 hover:underline">
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-auto">
                  {Array.from(selectedCities).slice(0, 25).map(city => (
                    <span key={city} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 rounded text-xs">
                      {city}
                      <button onClick={() => toggleCity(city)}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {selectedCities.size > 25 && (
                    <span className="text-xs text-slate-400 dark:text-gray-500 px-2 py-0.5">+{selectedCities.size - 25} more</span>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Sticky Bottom Bar */}
          <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 -mx-4 md:-mx-8 px-4 md:px-8 flex items-center justify-between shadow-lg z-10">
            <div className="text-sm text-slate-600 dark:text-gray-400">
              <span className="font-medium">{searchTerms.length} terms</span>
              <span className="text-slate-400 dark:text-gray-500 mx-1">×</span>
              <span className="font-medium">{selectedCities.size} cities</span>
              <span className="text-slate-400 dark:text-gray-500 mx-1">=</span>
              <span className="font-bold text-teal-600">~{totalQueries.toLocaleString()} credits</span>
              <span className="text-slate-400 dark:text-gray-500 ml-1">(${estimatedCost})</span>
              {credits?.daily?.dailyLimit && credits.daily.dailyLimit > 0 && totalQueries > (credits.daily.dailyRemaining || 0) && (
                <span className="text-red-500 ml-2 font-medium">Exceeds daily limit!</span>
              )}
              {credits?.account && totalQueries > credits.account.totalSearchesLeft && (
                <span className="text-red-500 ml-2 font-medium">Exceeds monthly balance!</span>
              )}
            </div>
            <Button
              onClick={startScraping}
              disabled={!canStart}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Play size={16} className="mr-1" /> Start Scraping
            </Button>
          </div>

          {/* Dedup Modal */}
          {showDedupModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-lg p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                  <AlertTriangle className="text-yellow-500" size={20} />
                  Overlap Detected
                </h3>
                <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">
                  You already have leads in some of these cities:
                </p>
                <div className="max-h-48 overflow-auto border border-slate-200 dark:border-slate-700 rounded mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="text-left px-3 py-2">City</th>
                        <th className="text-right px-3 py-2">Existing Leads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dedupOverlaps.map(o => (
                        <tr key={o.city} className="border-t border-slate-100 dark:border-slate-700">
                          <td className="px-3 py-2">{o.city}</td>
                          <td className="px-3 py-2 text-right font-medium">{o.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowDedupModal(false)}>
                    <ArrowLeft size={14} className="mr-1" /> Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const overlapCities = new Set(dedupOverlaps.map(o => o.city))
                      setSelectedCities(prev => {
                        const next = new Set(prev)
                        for (const c of overlapCities) next.delete(c)
                        return next
                      })
                      setShowDedupModal(false)
                    }}
                  >
                    Exclude {dedupOverlaps.length} Cities
                  </Button>
                  <Button onClick={doStartScraping} className="bg-teal-600 text-white">
                    Continue <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* RUNNING VIEW */}
      {/* ============================================================ */}
      {view === 'running' && progress && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 dark:text-gray-200">Scraping in Progress</h3>
              <Button variant="outline" size="sm" onClick={stopScraping}>
                <Square size={14} className="mr-1" /> Stop
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-slate-500 dark:text-gray-400 mb-1">
                <span>Queries: {progress.queriesUsed} / {progress.totalQueries}</span>
                <span>{progress.totalQueries > 0 ? Math.round((progress.queriesUsed / progress.totalQueries) * 100) : 0}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800/50 rounded-full">
                <div
                  className="h-3 bg-teal-500 rounded-full transition-all"
                  style={{ width: `${progress.totalQueries > 0 ? Math.min(100, (progress.queriesUsed / progress.totalQueries) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{progress.leadsFound}</div>
                <div className="text-xs text-green-600">Leads Found</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{progress.resultsScanned}</div>
                <div className="text-xs text-blue-600">Results Scanned</div>
              </div>
              <div className="text-center p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg">
                <div className="text-2xl font-bold text-teal-700 dark:text-teal-400">{progress.queriesUsed}</div>
                <div className="text-xs text-teal-600">Credits Used</div>
              </div>
            </div>
          </Card>

          {/* Skip Breakdown */}
          <Card className="p-4">
            <h4 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-3">Filter Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                <span className="text-slate-500 dark:text-gray-400">Has Website</span>
                <span className="font-medium text-red-600">{progress.skipped.website}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                <span className="text-slate-500 dark:text-gray-400">No Phone</span>
                <span className="font-medium text-red-600">{progress.skipped.noPhone}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                <span className="text-slate-500 dark:text-gray-400">Low Reviews</span>
                <span className="font-medium text-orange-600">{progress.skipped.lowReviews}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                <span className="text-slate-500 dark:text-gray-400">Low Rating</span>
                <span className="font-medium text-orange-600">{progress.skipped.lowRating}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                <span className="text-slate-500 dark:text-gray-400">No Photos</span>
                <span className="font-medium text-orange-600">{progress.skipped.noPhotos}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                <span className="text-slate-500 dark:text-gray-400">No Hours</span>
                <span className="font-medium text-orange-600">{progress.skipped.noHours}</span>
              </div>
            </div>
          </Card>

          {/* Live Feed */}
          {progress.qualifiedLeads.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-3">Recent Qualified Leads</h4>
              <div className="space-y-2">
                {progress.qualifiedLeads.slice(-10).reverse().map((lead, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-slate-400 dark:text-gray-500" />
                      <span className="font-medium">{lead.companyName}</span>
                      <span className="text-slate-400 dark:text-gray-500">{lead.city}, {lead.state}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${INDUSTRY_COLORS[lead.industry] || 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300'} text-xs`}>
                        {lead.industry}
                      </Badge>
                      <span className="text-yellow-600 flex items-center gap-0.5">
                        <Star size={12} fill="currentColor" /> {lead.rating}
                      </span>
                      <Badge className="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 text-xs">{lead.qualityScore}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Stop reason warning */}
          {progress.stopReason && (
            <Card className="p-4 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <AlertTriangle size={18} />
                <span className="font-medium">
                  {progress.stopReason === 'DAILY_LIMIT_REACHED'
                    ? `Scrape stopped — daily SerpAPI limit reached. ${progress.leadsFound} leads collected before limit hit.`
                    : `Scrape stopped by user. ${progress.leadsFound} leads collected.`}
                </span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* RESULTS VIEW */}
      {/* ============================================================ */}
      {view === 'results' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-3 text-center">
              <div className="text-xl font-bold text-slate-700 dark:text-gray-300">{results.length}</div>
              <div className="text-xs text-slate-500 dark:text-gray-400">Total</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xl font-bold text-green-600">{newCount}</div>
              <div className="text-xs text-slate-500 dark:text-gray-400">New</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xl font-bold text-red-600">{dupesCount}</div>
              <div className="text-xs text-slate-500 dark:text-gray-400">Dupes</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xl font-bold text-teal-600">{totalSelected}</div>
              <div className="text-xs text-slate-500 dark:text-gray-400">Selected</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xl font-bold text-yellow-600">{avgQuality}</div>
              <div className="text-xs text-slate-500 dark:text-gray-400">Avg Quality</div>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['all', 'new', 'dupes'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setResultFilter(f)}
                  className={`px-3 py-1 rounded text-sm ${
                    resultFilter === f ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 font-medium' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'new' ? 'New Only' : 'Dupes'}
                </button>
              ))}
              <select
                value={industryFilter}
                onChange={e => setIndustryFilter(e.target.value)}
                className="text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1 dark:bg-slate-800 dark:text-gray-100"
              >
                <option value="all">All Industries</option>
                {[...new Set(results.map(r => r.industry))].map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                const newIndices = new Set<number>()
                results.forEach((_, i) => { if (dedupStatuses[i] === null) newIndices.add(i) })
                setSelectedIndices(newIndices)
              }}>
                Select New
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setSelectedIndices(prev => {
                  const next = new Set(prev)
                  dedupStatuses.forEach((s, i) => { if (s !== null) next.delete(i) })
                  return next
                })
              }}>
                Remove Dupes
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                const selectedLeads = results.filter((_, i) => selectedIndices.has(i))
                const headers = ['companyName', 'phone', 'city', 'state', 'industry', 'rating', 'reviews', 'qualityScore', 'address']
                const escapeCSV = (val: string) => {
                  if (val.includes(',') || val.includes('"') || val.includes('\n')) return `"${val.replace(/"/g, '""')}"`
                  return val
                }
                const rows = selectedLeads.map(lead => headers.map(h => escapeCSV(String((lead as any)[h] ?? ''))).join(','))
                const csv = [headers.join(','), ...rows].join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `scraper-results-${selectedLeads.length}-leads.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}>
                <Download size={14} className="mr-1" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Results Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="w-8 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={filteredResults.length > 0 && filteredResults.every(lead => selectedIndices.has(results.indexOf(lead)))}
                        onChange={e => {
                          setSelectedIndices(prev => {
                            const next = new Set(prev)
                            for (const lead of filteredResults) {
                              const idx = results.indexOf(lead)
                              if (idx >= 0) {
                                if (e.target.checked) next.add(idx)
                                else next.delete(idx)
                              }
                            }
                            return next
                          })
                        }}
                      />
                    </th>
                    <th className="text-left px-3 py-2">Business</th>
                    <th className="text-left px-3 py-2">City</th>
                    <th className="text-left px-3 py-2">Industry</th>
                    <th className="text-center px-3 py-2">Rating</th>
                    <th className="text-center px-3 py-2">Reviews</th>
                    <th className="text-center px-3 py-2">Quality</th>
                    <th className="w-8 px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((lead) => {
                    const origIndex = results.indexOf(lead)
                    const dedup = dedupStatuses[origIndex]
                    const isSelected = selectedIndices.has(origIndex)

                    return (
                      <tr
                        key={origIndex}
                        className={`border-t border-slate-100 dark:border-slate-700 ${
                          dedup === 'bright' ? 'bg-red-50 dark:bg-red-950/30' :
                          dedup === 'scrape' ? 'bg-yellow-50 dark:bg-yellow-950/30' :
                          isSelected ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50 opacity-60'
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedIndices(prev => {
                                const next = new Set(prev)
                                if (next.has(origIndex)) next.delete(origIndex)
                                else next.add(origIndex)
                                return next
                              })
                            }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{lead.companyName}</div>
                          <div className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1">
                            <Phone size={10} /> {lead.phone}
                          </div>
                          {dedup === 'bright' && (
                            <div className="text-xs text-red-600 mt-0.5">In Bright already</div>
                          )}
                          {dedup === 'scrape' && (
                            <div className="text-xs text-yellow-600 mt-0.5">Duplicate in this scrape</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-gray-400">{lead.city}, {lead.state}</td>
                        <td className="px-3 py-2">
                          <Badge className={`${INDUSTRY_COLORS[lead.industry] || 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300'} text-xs`}>
                            {lead.industry}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-yellow-600 flex items-center justify-center gap-0.5">
                            <Star size={12} fill="currentColor" /> {lead.rating}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600 dark:text-gray-400">{lead.reviews}</td>
                        <td className="px-3 py-2 text-center">
                          <Badge className={`text-xs ${
                            lead.qualityScore >= 70 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                            lead.qualityScore >= 40 ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' :
                            'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                          }`}>
                            {lead.qualityScore}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => {
                              setResults(prev => prev.filter((_, i) => i !== origIndex))
                              setDedupStatuses(prev => prev.filter((_, i) => i !== origIndex))
                              setSelectedIndices(prev => {
                                const next = new Set<number>()
                                for (const idx of prev) {
                                  if (idx < origIndex) next.add(idx)
                                  else if (idx > origIndex) next.add(idx - 1)
                                }
                                return next
                              })
                            }}
                            className="text-slate-400 dark:text-gray-500 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Import Button */}
          <div className="flex justify-end">
            <Button
              onClick={openImportModal}
              disabled={totalSelected === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Import {totalSelected} to Bright <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>

          {/* Import Modal */}
          {showImportModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-lg p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100 mb-4">Import to Bright</h3>

                <div className="space-y-4">
                  {/* Batch Name */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-gray-300 block mb-1">Batch Name *</label>
                    <input
                      type="text"
                      value={importBatchName}
                      onChange={e => setImportBatchName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
                    />
                  </div>

                  {/* Folder */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-gray-300 block mb-1">Folder</label>
                    <select
                      value={importFolderId}
                      onChange={e => setImportFolderId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
                    >
                      <option value="">No folder</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assign to Rep */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-gray-300 block mb-1">Assign to Rep</label>
                    <select
                      value={importAssignToId}
                      onChange={e => setImportAssignToId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-gray-100"
                    >
                      <option value="">No assignment</option>
                      {reps.map(r => (
                        <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Processing Toggles */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-gray-300 block">Processing Steps</label>
                    {[
                      { key: 'enrichment' as const, icon: <Search size={16} />, title: 'Enrichment', desc: 'Looks up each lead on Google Maps via SerpAPI for rating, reviews, photos, services.' },
                      { key: 'preview' as const, icon: <Eye size={16} />, title: 'Preview Generation', desc: 'Generates a custom website preview for each lead.' },
                      { key: 'personalization' as const, icon: <Brain size={16} />, title: 'AI Personalization', desc: 'Uses Claude AI to write custom call scripts.' },
                    ].map(opt => (
                      <div key={opt.key} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-gray-400">{opt.icon}</span>
                          <span className="text-sm font-medium">{opt.title}</span>
                        </div>
                        <button
                          onClick={() => setImportOptions(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                          className={`w-10 h-5 rounded-full transition-colors ${
                            importOptions[opt.key] ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'
                          } relative`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                            importOptions[opt.key] ? 'left-5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
                  <Button
                    variant="outline"
                    onClick={() => doImport(true)}
                    disabled={importing || !importBatchName.trim()}
                  >
                    {importing ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                    Import Only
                  </Button>
                  <Button
                    onClick={() => doImport(false)}
                    disabled={importing || !importBatchName.trim()}
                    className="bg-teal-600 text-white flex-1"
                  >
                    {importing ? <Loader2 size={14} className="animate-spin mr-1" /> : <Zap size={14} className="mr-1" />}
                    Import & Process
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* IMPORTING / PROCESSING FEED VIEW */}
      {/* ============================================================ */}
      {view === 'importing' && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 dark:text-gray-200 mb-3">Import Processing</h3>

            {importProgress ? (
              <>
                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-slate-500 dark:text-gray-400 mb-1">
                    <span>{importProgress.processed || 0} / {importProgress.total || 0} leads</span>
                    <span>{importProgress.status}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800/50 rounded-full">
                    <div
                      className="h-3 bg-teal-500 rounded-full transition-all"
                      style={{ width: `${importProgress.total > 0 ? (importProgress.processed / importProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Enriched', count: Object.values(importProgress.results || {}).filter((r: any) => r?.enrichment).length, color: 'text-blue-600' },
                    { label: 'Previews', count: Object.values(importProgress.results || {}).filter((r: any) => r?.preview).length, color: 'text-purple-600' },
                    { label: 'Personalized', count: Object.values(importProgress.results || {}).filter((r: any) => r?.personalization).length, color: 'text-green-600' },
                    { label: 'Errors', count: importProgress.failed || 0, color: 'text-red-600' },
                  ].map(s => (
                    <div key={s.label} className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                      <div className={`text-lg font-bold ${s.color}`}>{s.count}</div>
                      <div className="text-xs text-slate-500 dark:text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Completion */}
                {importProgress.status === 'completed' && (
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={() => window.location.href = '/admin/leads'}>
                      View in Leads <ArrowRight size={14} className="ml-1" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (importPollingRef.current) clearInterval(importPollingRef.current)
                        setView('configure')
                        setImportProgress(null)
                        setImportJobId(null)
                      }}
                    >
                      New Scrape
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
                <Loader2 size={16} className="animate-spin" /> Waiting for processing to start...
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
