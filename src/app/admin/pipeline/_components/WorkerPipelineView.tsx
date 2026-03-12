'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckCircle, Loader2, XCircle, Clock,
} from 'lucide-react'
import { WORKER_STEPS, WORKER_CONFIG, formatDuration } from '../_lib/constants'

export default function WorkerPipelineView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/build-queue?view=worker')
      if (res.ok) setData(await res.json())
    } catch (err) {
      console.error('Failed to load worker pipeline:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const interval = setInterval(loadData, 3000)
    return () => clearInterval(interval)
  }, [loadData])

  if (loading) return <Card className="p-8 text-center text-gray-500 dark:text-gray-400">Loading worker pipeline...</Card>

  const summary = data?.summary || { inProgress: 0, failed: 0, completedToday: 0, avgBuildTimeMs: 0 }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Loader2 size={18} className="text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{summary.inProgress}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <XCircle size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{summary.failed}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{summary.completedToday}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completed Today</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatDuration(summary.avgBuildTimeMs)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Build Time</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pipeline legend */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-300">Pipeline:</span>
        {WORKER_STEPS.map((step, idx) => (
          <span key={step} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-full ${WORKER_CONFIG[step].color}`} />
            {WORKER_CONFIG[step].label}
            {idx < WORKER_STEPS.length - 1 && <span className="text-gray-300 dark:text-gray-600 ml-2">&rarr;</span>}
          </span>
        ))}
      </div>

      {/* Active builds */}
      {data?.activeBuilds?.length > 0 ? (
        <div className="space-y-2 mb-6">
          {data.activeBuilds.map((build: any) => (
            <Card key={build.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <Link href={`/admin/leads/${build.id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600">
                      {build.firstName} {build.lastName || ''}
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{build.companyName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                    {WORKER_CONFIG[build.buildStep]?.label || build.buildStep}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-gray-500 dark:text-gray-400 mb-6">No active worker builds</Card>
      )}

      {/* Failed builds */}
      {data?.failedBuilds?.length > 0 && (
        <>
          <h3 className="text-base font-semibold text-red-700 dark:text-red-400 mb-2">Failed Builds</h3>
          <div className="space-y-2">
            {data.failedBuilds.map((build: any) => (
              <Card key={build.id} className="p-4 border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div>
                    <Link href={`/admin/leads/${build.id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600">
                      {build.firstName} {build.lastName || ''}
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{build.companyName}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                      Failed at {WORKER_CONFIG[build.buildStep]?.label || build.buildStep}
                    </Badge>
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1 max-w-xs truncate">{build.buildError}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
