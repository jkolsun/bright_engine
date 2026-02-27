'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Loader2, Hammer, MessageSquare } from 'lucide-react'
import { MobileSiteCard, MobileEditCard } from './MobileSiteCard'

export default function MobileDashboardPage() {
  const [buildQueue, setBuildQueue] = useState<any[]>([])
  const [editRequests, setEditRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [buildRes, editsRes] = await Promise.all([
        fetch('/api/build-queue'),
        fetch('/api/edit-requests?limit=20'),
      ])

      if (buildRes.ok) {
        const data = await buildRes.json()
        setBuildQueue(data.leads || [])
      }

      if (editsRes.ok) {
        const data = await editsRes.json()
        // Show actionable edits: new, ai_processing, ready_for_review
        const actionable = (data.editRequests || []).filter(
          (er: any) => ['new', 'ai_processing', 'ready_for_review'].includes(er.status)
        )
        setEditRequests(actionable)
      }

      setError(null)
    } catch (err) {
      setError('Failed to load data')
      console.error('Mobile dashboard fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(), 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Filter build queue by actionable stages
  const actionableLeads = buildQueue.filter((l: any) =>
    ['QA_REVIEW', 'EDITING', 'QA_APPROVED', 'CLIENT_REVIEW'].includes(l.buildStep)
  )
  const liveLeads = buildQueue.filter((l: any) =>
    ['CLIENT_APPROVED', 'LAUNCHING', 'LIVE'].includes(l.buildStep)
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Bright Engine</h1>
            <p className="text-xs text-slate-500">Mobile Dashboard</p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={`text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Pending Edit Requests */}
        {editRequests.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={18} className="text-yellow-400" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                Pending Edits ({editRequests.length})
              </h2>
            </div>
            <div className="space-y-3">
              {editRequests.map((er: any) => (
                <MobileEditCard
                  key={er.id}
                  editRequest={er}
                  onApproved={() => fetchData()}
                />
              ))}
            </div>
          </section>
        )}

        {/* Actionable Build Queue */}
        {actionableLeads.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Hammer size={18} className="text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                Build Queue ({actionableLeads.length})
              </h2>
            </div>
            <div className="space-y-3">
              {actionableLeads.map((lead: any) => (
                <MobileSiteCard
                  key={lead.id}
                  lead={lead}
                  onApproved={() => fetchData()}
                />
              ))}
            </div>
          </section>
        )}

        {/* Live / Launched Sites */}
        {liveLeads.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                Live & Launching ({liveLeads.length})
              </h2>
            </div>
            <div className="space-y-3">
              {liveLeads.map((lead: any) => (
                <MobileSiteCard
                  key={lead.id}
                  lead={lead}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {actionableLeads.length === 0 && editRequests.length === 0 && liveLeads.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">No sites in the pipeline right now.</p>
            <button
              onClick={() => fetchData(true)}
              className="mt-4 text-blue-400 text-sm underline"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
