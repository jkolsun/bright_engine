'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle, Rocket, Globe,
  Loader2, ExternalLink, ChevronDown, ChevronUp, Code, RefreshCw,
  AlertTriangle, Clock, Pencil,
} from 'lucide-react'
import { SITE_STEP_CONFIG, formatTimeAgo } from '../_lib/constants'
import EditPanel from './EditPanel'
import LaunchPanel from './LaunchPanel'

interface SiteBuildCardProps {
  lead: any
  onRefresh: () => void
  onOpenEditor: (lead: any) => void
}

export default function SiteBuildCard({ lead, onRefresh, onOpenEditor }: SiteBuildCardProps) {
  const [expanded, setExpanded] = useState<'edit' | 'launch' | null>(null)
  const [approving, setApproving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)

  const step = lead.buildStep || 'QA_REVIEW'
  const config = SITE_STEP_CONFIG[step] || SITE_STEP_CONFIG.QA_REVIEW
  const StepIcon = config.icon

  const handleApprove = async () => {
    setApproving(true)
    try {
      const res = await fetch(`/api/build-queue/${lead.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: lead.buildNotes }),
      })
      if (res.ok) onRefresh()
    } catch (err) {
      console.error('Approve failed:', err)
    } finally {
      setApproving(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await fetch(`/api/build-queue/${lead.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) onRefresh()
    } catch (err) {
      console.error('Publish failed:', err)
    } finally {
      setPublishing(false)
    }
  }

  const handleRebuild = async (confirmOverwrite = false) => {
    setRebuilding(true)
    try {
      const res = await fetch(`/api/build-queue/${lead.id}/rebuild`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmOverwrite }),
      })
      const data = await res.json()

      if (res.status === 409 && data.hasEdits) {
        if (confirm(`WARNING: This site has been manually edited in the Site Editor (${Math.round(data.htmlSize / 1024)}KB of HTML). Rebuilding will PERMANENTLY ERASE all manual edits.\n\nAre you sure you want to rebuild from scratch?`)) {
          setRebuilding(false)
          return handleRebuild(true)
        }
        setRebuilding(false)
        return
      }

      if (res.ok) {
        setTimeout(onRefresh, 2000)
      }
    } catch (err) {
      console.error('Rebuild failed:', err)
    } finally {
      setRebuilding(false)
    }
  }

  const previewUrl = lead.previewUrl || (lead.previewId ? `/preview/${lead.previewId}` : null)
  const showApprove = ['QA_REVIEW', 'EDITING'].includes(step)
  const showEdit = ['QA_REVIEW', 'EDITING'].includes(step)
  const showLaunch = step === 'CLIENT_APPROVED'
  const showPublish = step === 'CLIENT_APPROVED'
  const showRebuild = ['QA_REVIEW', 'EDITING'].includes(step) && (lead.buildReadinessScore || 0) < 70

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
            {lead.logo ? (
              <img src={lead.logo} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <StepIcon size={20} className={config.color} />
            )}
          </div>
          <div>
            <Link href={`/admin/leads/${lead.id}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600">
              {lead.companyName}
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lead.firstName} {lead.lastName || ''} &middot; {(lead.industry || 'General').replace(/_/g, ' ')}
              {lead.city && ` &middot; ${lead.city}${lead.state ? `, ${lead.state}` : ''}`}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <Badge className={`${config.bgColor} ${config.color} text-xs`}>
                {config.label}
              </Badge>
              {lead.buildReadinessScore != null && (
                <span className={`text-xs font-medium ${lead.buildReadinessScore >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                  {lead.buildReadinessScore}/100 ready
                </span>
              )}
              {(() => {
                const hoursSinceUpdate = (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60)
                if (hoursSinceUpdate > 48) {
                  return (
                    <Badge className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 text-xs">
                      <AlertTriangle size={10} className="mr-1" />
                      Stuck — {Math.floor(hoursSinceUpdate / 24)}d+
                    </Badge>
                  )
                }
                if (hoursSinceUpdate > 24) {
                  return (
                    <Badge className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 text-xs">
                      <Clock size={10} className="mr-1" />
                      Stale — {Math.floor(hoursSinceUpdate)}h+
                    </Badge>
                  )
                }
                return null
              })()}
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatTimeAgo(lead.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <ExternalLink size={14} />
              Preview
            </a>
          )}
          {showRebuild && (
            <button
              onClick={() => handleRebuild()}
              disabled={rebuilding}
              className="px-3 py-1.5 text-sm text-amber-600 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-50 flex items-center gap-1.5"
            >
              {rebuilding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Rebuild
            </button>
          )}
          {['QA_REVIEW', 'EDITING', 'QA_APPROVED'].includes(step) && (
            <button
              onClick={() => onOpenEditor(lead)}
              className="px-3 py-1.5 text-sm text-purple-600 border border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 flex items-center gap-1.5"
            >
              <Code size={14} />
              Site Editor
            </button>
          )}
          {showEdit && (
            <button
              onClick={() => setExpanded(expanded === 'edit' ? null : 'edit')}
              className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-1.5"
            >
              <Pencil size={14} />
              Edit
              {expanded === 'edit' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {showApprove && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Approve
            </button>
          )}
          {showLaunch && (
            <button
              onClick={() => setExpanded(expanded === 'launch' ? null : 'launch')}
              className="px-3 py-1.5 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <Rocket size={14} />
              Launch
              {expanded === 'launch' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {showPublish && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {publishing ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              Publish
            </button>
          )}
        </div>
      </div>

      {expanded === 'edit' && <EditPanel leadId={lead.id} onDone={onRefresh} />}
      {expanded === 'launch' && <LaunchPanel leadId={lead.id} onDone={onRefresh} />}
    </Card>
  )
}
