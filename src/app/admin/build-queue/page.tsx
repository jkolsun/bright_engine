'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'

const BUILD_STEPS = ['ENRICHMENT', 'PREVIEW', 'PERSONALIZATION', 'SCRIPTS', 'DISTRIBUTION'] as const

const STEP_CONFIG: Record<string, { label: string; short: string; color: string }> = {
  ENRICHMENT: { label: 'Enrichment', short: 'E', color: 'bg-blue-500' },
  PREVIEW: { label: 'Preview', short: 'P', color: 'bg-purple-500' },
  PERSONALIZATION: { label: 'Personalization', short: 'A', color: 'bg-amber-500' },
  SCRIPTS: { label: 'Scripts', short: 'S', color: 'bg-teal-500' },
  DISTRIBUTION: { label: 'Distribution', short: 'D', color: 'bg-green-500' },
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatElapsed(startedAt: string | null): string {
  if (!startedAt) return '--'
  const elapsed = Date.now() - new Date(startedAt).getTime()
  const secs = Math.floor(elapsed / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  return `${mins}m ${secs % 60}s`
}

function BuildDots({ currentStep, lead }: { currentStep: string | null; lead: any }) {
  const currentIdx = currentStep ? BUILD_STEPS.indexOf(currentStep as any) : -1

  return (
    <div className="flex items-center gap-1.5">
      {BUILD_STEPS.map((step, idx) => {
        const conf = STEP_CONFIG[step]
        const msKey = `build${step.charAt(0) + step.slice(1).toLowerCase()}Ms` as string
        const ms = lead[msKey]
        const isComplete = ms != null && ms > 0
        const isCurrent = idx === currentIdx
        const isPending = idx > currentIdx

        return (
          <div key={step} className="flex items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isComplete
                  ? `${conf.color} text-white`
                  : isCurrent
                  ? `${conf.color} text-white animate-pulse ring-2 ring-offset-1 ring-${conf.color.replace('bg-', '')}`
                  : 'bg-gray-200 text-gray-400'
              }`}
              title={`${conf.label}${isComplete ? ` (${formatDuration(ms)})` : isCurrent ? ' (in progress)' : ''}`}
            >
              {conf.short}
            </div>
            {idx < BUILD_STEPS.length - 1 && (
              <div className={`w-4 h-0.5 ${isComplete ? conf.color : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function BuildQueuePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const res = await fetch('/api/build-queue')
      if (res.ok) {
        setData(await res.json())
      }
    } catch (err) {
      console.error('Failed to load build queue:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 3000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center text-gray-500">Loading build queue...</Card>
      </div>
    )
  }

  const summary = data?.summary || { inProgress: 0, failed: 0, completedToday: 0, avgBuildTimeMs: 0 }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="p-6">
          <Link href="/admin/leads" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft size={16} />
            Back to Leads
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Zap size={28} className="text-amber-500" />
            Build Queue
          </h1>
          <p className="text-gray-600 mt-1">Live view of the 5-stage build pipeline</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Loader2 size={20} className="text-blue-600 animate-spin" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary.inProgress}</p>
                <p className="text-xs text-gray-500">In Progress</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary.failed}</p>
                <p className="text-xs text-gray-500">Failed</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary.completedToday}</p>
                <p className="text-xs text-gray-500">Completed Today</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(summary.avgBuildTimeMs)}</p>
                <p className="text-xs text-gray-500">Avg Build Time</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pipeline Legend */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
          <span className="font-medium text-gray-700">Pipeline:</span>
          {BUILD_STEPS.map((step, idx) => (
            <span key={step} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-full ${STEP_CONFIG[step].color}`} />
              {STEP_CONFIG[step].label}
              {idx < BUILD_STEPS.length - 1 && <span className="text-gray-300 ml-2">&rarr;</span>}
            </span>
          ))}
        </div>

        {/* Active Builds */}
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Active Builds</h2>
        {data?.activeBuilds?.length > 0 ? (
          <div className="space-y-2 mb-8">
            {data.activeBuilds.map((build: any) => (
              <Card key={build.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <Link href={`/admin/leads/${build.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {build.firstName} {build.lastName || ''}
                      </Link>
                      <p className="text-sm text-gray-500">{build.companyName}</p>
                    </div>
                    <BuildDots currentStep={build.buildStep} lead={build} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-blue-600">
                      {STEP_CONFIG[build.buildStep]?.label || build.buildStep}
                    </p>
                    <p className="text-xs text-gray-500">
                      Elapsed: {formatElapsed(build.buildStartedAt)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-gray-500 mb-8">
            No active builds right now
          </Card>
        )}

        {/* Failed Builds */}
        {data?.failedBuilds?.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-red-700 mb-3">Failed Builds</h2>
            <div className="space-y-2">
              {data.failedBuilds.map((build: any) => (
                <Card key={build.id} className="p-4 border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link href={`/admin/leads/${build.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {build.firstName} {build.lastName || ''}
                      </Link>
                      <p className="text-sm text-gray-500">{build.companyName}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-red-100 text-red-700">
                        Failed at {STEP_CONFIG[build.buildStep]?.label || build.buildStep}
                      </Badge>
                      <p className="text-xs text-red-500 mt-1 max-w-xs truncate">{build.buildError}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
