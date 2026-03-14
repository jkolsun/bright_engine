'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BulkSelectDropdown } from '@/components/ui/BulkSelectDropdown'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatPhone } from '@/lib/utils'
import React from 'react'
import {
  Filter, Plus, Eye, TrendingUp,
  ChevronDown, ChevronRight, Sparkles, Globe, Star, MapPin, Clock, Wrench, MessageSquare,
  Pencil, Trash2, Phone, Mail, Users,
} from 'lucide-react'

/** Safely render any value as a string in JSX — prevents React Error #31 */
function safeRender(value: any, fallback: string = '—'): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value || fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(', ') || fallback
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const BUILD_STEPS_INLINE = ['E', 'P', 'A', 'S', 'D'] as const
const BUILD_STEP_MAP: Record<string, number> = { ENRICHMENT: 0, PREVIEW: 1, PERSONALIZATION: 2, SCRIPTS: 3, DISTRIBUTION: 4 }
const BUILD_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-teal-500', 'bg-green-500']

function BuildDotsInline({ step, completed, error }: { step: string | null; completed: boolean; error: string | null }) {
  if (!step && !completed) return <span className="text-gray-300 text-xs">&mdash;</span>
  if (error) return <span className="text-red-500 text-xs font-medium" title={error}>Failed</span>
  if (completed) return <span className="text-green-600 text-xs font-medium">Done</span>

  const currentIdx = BUILD_STEP_MAP[step || ''] ?? -1
  return (
    <div className="flex items-center gap-0.5 justify-center">
      {BUILD_STEPS_INLINE.map((label, idx) => (
        <div
          key={label}
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
            idx < currentIdx
              ? `${BUILD_COLORS[idx]} text-white`
              : idx === currentIdx
              ? `${BUILD_COLORS[idx]} text-white animate-pulse`
              : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500'
          }`}
          title={['Enrichment', 'Preview', 'Personalization', 'Scripts', 'Distribution'][idx]}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

export interface LeadsTableProps {
  loading: boolean
  filteredLeads: any[]
  paginatedLeads: any[]
  selectedLeads: Set<string>
  onSelectionChange: (selected: Set<string>) => void
  onSelectLead: (leadId: string) => void
  expandedLead: string | null
  onExpandLead: (leadId: string | null) => void
  expandedLeadEvents: Record<string, any[]>
  expandedLeadData: Record<string, any>
  expandedLeadNotes: Record<string, string>
  onExpandedLeadNotesChange: (leadId: string, value: string) => void
  savingNotes: Record<string, boolean>
  onSaveNotes: (leadId: string) => void
  onFetchLeadEvents: (leadId: string) => void
  onOpenAddDialog: () => void
  onOpenEditDialog: (lead: any) => void
  onDeleteLead: (leadId: string, firstName: string) => void
}

export default function LeadsTable({
  loading,
  filteredLeads,
  paginatedLeads,
  selectedLeads,
  onSelectionChange,
  onSelectLead,
  expandedLead,
  onExpandLead,
  expandedLeadEvents,
  expandedLeadData,
  expandedLeadNotes,
  onExpandedLeadNotesChange,
  savingNotes,
  onSaveNotes,
  onFetchLeadEvents,
  onOpenAddDialog,
  onOpenEditDialog,
  onDeleteLead,
}: LeadsTableProps) {
  const router = useRouter()

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading leads...</div>
      </Card>
    )
  }

  if (filteredLeads.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="p-12 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <TrendingUp size={48} className="mx-auto mb-2" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No leads yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Add your first lead or import from CSV</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={onOpenAddDialog}>
              <Plus size={18} className="mr-2" />
              Add Lead
            </Button>
            <Link href="/admin/leads?tab=import">
              <Button variant="outline">
                <Filter size={18} className="mr-2" />
                Import CSV
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto relative">
        <table className="w-max min-w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
            <tr>
              {/* Sticky left: checkbox */}
              <th className="sticky left-0 z-20 bg-gray-50 dark:bg-slate-800/50 text-center p-3 w-12 border-r border-gray-200 dark:border-slate-700">
                <BulkSelectDropdown
                  pageItemIds={paginatedLeads.map(l => l.id)}
                  allItemIds={filteredLeads.map(l => l.id)}
                  selectedIds={selectedLeads}
                  onSelectionChange={onSelectionChange}
                />
              </th>
              {/* Scrollable columns */}
              <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Name</th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Company</th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Phone</th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Email</th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Location</th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Industry</th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Source</th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Website</th>
              <th className="text-center p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Rating</th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Last Contacted</th>
              <th className="text-center p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Reviews</th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Personalization</th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Notes</th>
              <th className="text-center p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Build</th>
              {/* Sticky right: Assigned To, Status, Actions */}
              <th className="sticky right-[200px] z-20 bg-gray-50 dark:bg-slate-800/50 text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-l border-gray-200 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]">Assigned To</th>
              <th className="sticky right-[100px] z-20 bg-gray-50 dark:bg-slate-800/50 text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="sticky right-0 z-20 bg-gray-50 dark:bg-slate-800/50 text-center p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {paginatedLeads.map((lead) => {
              const isSelected = selectedLeads.has(lead.id)
              const isExpanded = expandedLead === lead.id
              const rowBg = isSelected ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-white dark:bg-slate-900'
              const hoverBg = isSelected ? 'hover:bg-blue-100 dark:hover:bg-blue-900/40' : 'hover:bg-gray-50 dark:hover:bg-slate-800'

              let personalizationData: any = null
              try {
                if (lead.personalization) {
                  personalizationData = typeof lead.personalization === 'string'
                    ? JSON.parse(lead.personalization)
                    : lead.personalization
                }
              } catch { /* ignore */ }

              return (
                <React.Fragment key={lead.id}>
                  <tr className={`${hoverBg} ${rowBg} cursor-pointer`} onClick={() => { const next = isExpanded ? null : lead.id; onExpandLead(next); if (next) onFetchLeadEvents(lead.id) }}>
                    {/* Sticky left: checkbox */}
                    <td className={`sticky left-0 z-10 ${rowBg} text-center p-3 border-r border-gray-100 dark:border-slate-800`} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectLead(lead.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    {/* Scrollable data columns */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                        <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{lead.firstName} {lead.lastName}</div>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{lead.companyName || '—'}</td>
                    <td className="p-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{lead.phone ? formatPhone(lead.phone) : '—'}</td>
                    <td className="p-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <div>{lead.email || '—'}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {lead.city || lead.state ? `${lead.city || ''}${lead.city && lead.state ? ', ' : ''}${lead.state || ''}` : '—'}
                    </td>
                    <td className="p-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{lead.industry || '—'}</td>
                    <td className="p-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{lead.source || '—'}</td>
                    <td className="p-3 whitespace-nowrap text-sm">
                      {lead.website ? (
                        <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline max-w-[180px] truncate block" onClick={(e) => e.stopPropagation()}>
                          {lead.website.replace(/^https?:\/\//, '')}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="p-3 whitespace-nowrap text-sm text-center text-gray-700 dark:text-gray-300">
                      {lead.enrichedRating ? (
                        <span className="font-medium">{Number(lead.enrichedRating).toFixed(1)}</span>
                      ) : '—'}
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {lead.lastContactedAt ? formatTimeAgo(new Date(lead.lastContactedAt)) : (
                        <span className="text-gray-400 dark:text-gray-500">Never</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap text-sm text-center text-gray-700 dark:text-gray-300">
                      {lead.enrichedReviews ?? '—'}
                    </td>
                    <td className="p-3 text-sm text-gray-700 max-w-[250px] relative group/pers">
                      {personalizationData?.firstLine ? (
                        <div className="flex items-center gap-1.5">
                          {personalizationData.tier && (
                            <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              personalizationData.tier === 'S' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300' :
                              personalizationData.tier === 'A' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300' :
                              'bg-gray-100 text-gray-600 ring-1 ring-gray-300'
                            }`}>{safeRender(personalizationData.tier)}</span>
                          )}
                          <Sparkles size={13} className="text-purple-500 flex-shrink-0" />
                          <span className="truncate">{safeRender(personalizationData.firstLine)}</span>
                          {/* Hover tooltip showing full personalization */}
                          <div className="hidden group-hover/pers:block absolute left-0 top-full z-50 mt-1 w-80 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-lg shadow-xl p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                              <Sparkles size={14} className="text-purple-500" />
                              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">AI Personalization</span>
                              {personalizationData.tier && (
                                <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  personalizationData.tier === 'S' ? 'bg-yellow-100 text-yellow-800' :
                                  personalizationData.tier === 'A' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-600'
                                }`}>Tier {safeRender(personalizationData.tier)}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">First Line</div>
                              <p className="text-xs text-gray-800 leading-relaxed">{safeRender(personalizationData.firstLine)}</p>
                            </div>
                            {personalizationData.hook && (
                              <div>
                                <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">Hook</div>
                                <p className="text-xs text-gray-700 dark:text-gray-300">{safeRender(personalizationData.hook)}</p>
                              </div>
                            )}
                            {personalizationData.angle && (
                              <div>
                                <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">Angle</div>
                                <p className="text-xs text-gray-700 dark:text-gray-300">{safeRender(personalizationData.angle)}</p>
                              </div>
                            )}
                            {personalizationData.websiteCopy && (
                              <div>
                                <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">Website Copy</div>
                                {typeof personalizationData.websiteCopy === 'object' ? (
                                  <div className="space-y-0.5">
                                    {personalizationData.websiteCopy.heroHeadline && (
                                      <p className="text-xs text-gray-700 font-medium">{String(personalizationData.websiteCopy.heroHeadline)}</p>
                                    )}
                                    {personalizationData.websiteCopy.heroSubheadline && (
                                      <p className="text-xs text-gray-600 italic">{String(personalizationData.websiteCopy.heroSubheadline)}</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-600 italic">{safeRender(personalizationData.websiteCopy)}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-3 text-sm text-gray-700 max-w-[150px]">
                      <div className="truncate" title={safeRender(lead.notes, '')}>{safeRender(lead.notes)}</div>
                    </td>
                    {/* Build Pipeline Dots */}
                    <td className="p-3 text-center">
                      <BuildDotsInline step={lead.buildStep} completed={!!lead.buildCompletedAt} error={lead.buildError} />
                    </td>
                    {/* Sticky right: Assigned To */}
                    <td className={`sticky right-[200px] z-10 ${rowBg} p-3 whitespace-nowrap border-l border-gray-100 dark:border-slate-800 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]`}>
                      <div className="flex flex-col gap-1">
                        {lead.assignedTo && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                            <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-800">
                              {lead.assignedTo.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </span>
                            {lead.assignedTo.name}
                          </span>
                        )}
                        {!lead.assignedTo && (
                          <span className="text-xs text-gray-400">&mdash;</span>
                        )}
                      </div>
                    </td>
                    {/* Sticky right: Status */}
                    <td className={`sticky right-[100px] z-10 ${rowBg} p-3 whitespace-nowrap`}>
                      <div className="flex flex-col gap-1">
                        <Badge variant={
                          lead.status === 'HOT_LEAD' ? 'destructive' :
                          lead.status === 'QUALIFIED' ? 'default' :
                          lead.status === 'BUILDING' ? 'secondary' :
                          lead.status === 'PAID' ? 'default' :
                          'secondary'
                        } className="text-xs">
                          {lead.status}
                        </Badge>
                        {lead.smsCampaign && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 truncate max-w-[120px]" title={lead.smsCampaign.name}>
                              {lead.smsCampaign.name}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              lead.smsCampaign.funnelStage === 'QUEUED' ? 'bg-gray-100 text-gray-600' :
                              lead.smsCampaign.funnelStage === 'TEXTED' ? 'bg-blue-100 text-blue-700' :
                              lead.smsCampaign.funnelStage === 'CLICKED' ? 'bg-orange-100 text-orange-700' :
                              lead.smsCampaign.funnelStage === 'REP_CALLED' ? 'bg-purple-100 text-purple-700' :
                              lead.smsCampaign.funnelStage === 'OPTED_IN' ? 'bg-green-100 text-green-700' :
                              lead.smsCampaign.funnelStage === 'DRIP_ACTIVE' ? 'bg-teal-100 text-teal-700' :
                              lead.smsCampaign.funnelStage === 'HOT' ? 'bg-red-100 text-red-700' :
                              lead.smsCampaign.funnelStage === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {lead.smsCampaign.funnelStage.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Sticky right: Actions */}
                    <td className={`sticky right-0 z-10 ${rowBg} p-3 whitespace-nowrap w-[100px]`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {lead.previewUrl && (
                          <button
                            onClick={() => window.open(lead.previewUrl, '_blank')}
                            title="Preview"
                            className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/admin/messages?leadId=${lead.id}`)}
                          title="Open Chat"
                          className="p-1.5 rounded-md text-teal-600 hover:bg-teal-50 transition-colors"
                        >
                          <MessageSquare size={15} />
                        </button>
                        <button
                          onClick={() => onOpenEditDialog(lead)}
                          title="Edit"
                          className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => onDeleteLead(lead.id, lead.firstName)}
                          title="Delete"
                          className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr className="bg-gray-50/70 dark:bg-slate-800/50">
                      <td colSpan={16} className="p-0">
                        <div className="px-6 py-5 border-t border-b border-gray-200 dark:border-slate-700">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Rep Call Notes — full width */}
                            <div className="col-span-1 md:col-span-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800 p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                  <Phone size={15} className="text-blue-600" />
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Rep Call Notes</h4>
                              </div>
                              {(() => {
                                const calls = (expandedLeadData[lead.id]?.dialerCalls || []).filter((c: any) => c.notes)
                                if (calls.length === 0) return <p className="text-sm text-gray-400 italic">No rep notes yet</p>
                                return (
                                  <div className="space-y-3 max-h-48 overflow-y-auto">
                                    {calls.map((call: any) => (
                                      <div key={call.id} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                        <div className="flex items-center flex-wrap gap-2 text-xs text-gray-600 mb-1">
                                          <span className="font-semibold text-gray-800 dark:text-gray-200">{call.rep?.name || 'Unknown'}</span>
                                          <span className="text-gray-400">{new Date(call.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${call.connectedAt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {call.connectedAt ? 'Connected' : 'Not Connected'}
                                          </span>
                                          {call.dispositionResult && (
                                            <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
                                              ['WANTS_TO_MOVE_FORWARD', 'CALLBACK', 'WANTS_CHANGES'].includes(call.dispositionResult) ? 'bg-green-100 text-green-700' :
                                              ['DNC', 'WRONG_NUMBER'].includes(call.dispositionResult) ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                            }`}>{call.dispositionResult.replace(/_/g, ' ')}</span>
                                          )}
                                          {call.duration != null && <span className="text-gray-400">{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>}
                                        </div>
                                        <p className="text-sm text-gray-500 italic pl-1">&ldquo;{call.notes}&rdquo;</p>
                                      </div>
                                    ))}
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Lead Info */}
                            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                  <Eye size={15} className="text-gray-600 dark:text-gray-400" />
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Lead Info</h4>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Status</span>
                                  <Badge variant={lead.status === 'PAID' ? 'default' : 'secondary'} className="text-xs">{lead.status?.replace(/_/g, ' ') || '—'}</Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Created</span>
                                  <span className="text-gray-800 text-xs">{new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Assigned To</span>
                                  <span className="text-gray-800 text-xs font-medium">{expandedLeadData[lead.id]?.assignedTo?.name || 'Unassigned'}</span>
                                </div>
                                {expandedLeadData[lead.id]?.secondaryPhone && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">2nd Phone</span>
                                    <span className="text-gray-800 text-xs">{expandedLeadData[lead.id].secondaryPhone}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Industry</span>
                                  <span className="text-gray-800 text-xs">{lead.industry || '—'}</span>
                                </div>
                                {lead.priority && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Priority</span>
                                    <Badge variant={lead.priority === 'HOT' ? 'destructive' : lead.priority === 'WARM' ? 'secondary' : 'outline'} className="text-xs">{lead.priority}</Badge>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Alt Contacts */}
                            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                  <Users size={15} className="text-gray-600 dark:text-gray-400" />
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Alt Contacts</h4>
                              </div>
                              <div className="space-y-2 text-sm">
                                {lead.phone && (
                                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <Phone size={13} className="text-gray-400" />
                                    <span>{lead.phone}</span>
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Primary</span>
                                  </div>
                                )}
                                {lead.email && (
                                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <Mail size={13} className="text-gray-400" />
                                    <span className="truncate">{lead.email}</span>
                                  </div>
                                )}
                                {(expandedLeadData[lead.id]?.alternateContacts || []).map((c: any) => (
                                  <div key={c.id} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    {c.type === 'PHONE' ? <Phone size={13} className="text-gray-400" /> : <Mail size={13} className="text-gray-400" />}
                                    <span className="truncate">{c.value}</span>
                                    {c.label && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{c.label}</span>}
                                  </div>
                                ))}
                                {!lead.phone && !lead.email && !(expandedLeadData[lead.id]?.alternateContacts?.length) && (
                                  <p className="text-gray-400 italic">No contacts available</p>
                                )}
                              </div>
                            </div>

                            {/* AI Personalization */}
                            <div className="bg-white dark:bg-slate-900 rounded-lg border border-purple-200 dark:border-purple-800 p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-md bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                                  <Sparkles size={15} className="text-purple-600" />
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">AI Personalization</h4>
                                {personalizationData?.tier && (
                                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                                    personalizationData.tier === 'S' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300' :
                                    personalizationData.tier === 'A' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' :
                                    'bg-gray-100 text-gray-600 ring-1 ring-gray-300'
                                  }`}>Tier {safeRender(personalizationData.tier)}</span>
                                )}
                              </div>
                              {personalizationData ? (
                                <div className="space-y-3">
                                  <div>
                                    <div className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">First Line</div>
                                    <p className="text-sm text-gray-800 leading-relaxed">{safeRender(personalizationData.firstLine)}</p>
                                  </div>
                                  {personalizationData.hook && (
                                    <div>
                                      <div className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Hook</div>
                                      <p className="text-sm text-gray-700 dark:text-gray-300">{safeRender(personalizationData.hook)}</p>
                                    </div>
                                  )}
                                  {personalizationData.angle && (
                                    <div>
                                      <div className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Angle</div>
                                      <p className="text-sm text-gray-700 dark:text-gray-300">{safeRender(personalizationData.angle)}</p>
                                    </div>
                                  )}
                                  {personalizationData.websiteCopy && (
                                    <div>
                                      <div className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Website Copy</div>
                                      {typeof personalizationData.websiteCopy === 'object' ? (
                                        <div className="space-y-1">
                                          {personalizationData.websiteCopy.heroHeadline && (
                                            <p className="text-sm text-gray-700 font-medium">{String(personalizationData.websiteCopy.heroHeadline)}</p>
                                          )}
                                          {personalizationData.websiteCopy.heroSubheadline && (
                                            <p className="text-sm text-gray-600 italic">{String(personalizationData.websiteCopy.heroSubheadline)}</p>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-600 italic">{safeRender(personalizationData.websiteCopy)}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-400 italic">No personalization generated yet</p>
                              )}
                            </div>

                            {/* Editable Notes */}
                            <div className="bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-800 p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                    <Pencil size={15} className="text-amber-600" />
                                  </div>
                                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Notes</h4>
                                </div>
                                <button
                                  onClick={() => onSaveNotes(lead.id)}
                                  disabled={savingNotes[lead.id]}
                                  className="px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 border border-amber-200/60 disabled:opacity-50 transition-all"
                                >
                                  {savingNotes[lead.id] ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                              <textarea
                                rows={3}
                                value={expandedLeadNotes[lead.id] ?? lead.notes ?? ''}
                                onChange={(e) => onExpandedLeadNotesChange(lead.id, e.target.value)}
                                placeholder="Add notes about this lead..."
                                className="w-full text-sm p-2.5 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 placeholder:text-gray-300"
                              />
                            </div>

                            {/* Enrichment Data */}
                            <div className="bg-white dark:bg-slate-900 rounded-lg border border-teal-200 dark:border-teal-800 p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-md bg-teal-100 dark:bg-teal-950/30 flex items-center justify-center">
                                  <Globe size={15} className="text-teal-600" />
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Enrichment Data</h4>
                              </div>
                              {(lead.enrichedRating != null || lead.enrichedAddress || (Array.isArray(lead.enrichedServices) && lead.enrichedServices.length > 0)) ? (
                                <div className="space-y-3">
                                  {lead.enrichedRating != null && (
                                    <div className="flex items-center gap-2">
                                      <Star size={14} className="text-amber-500" />
                                      <span className="text-sm font-medium text-gray-900">{Number(lead.enrichedRating || 0).toFixed(1)}</span>
                                      <span className="text-xs text-gray-500">({lead.enrichedReviews ?? 0} reviews)</span>
                                    </div>
                                  )}
                                  {lead.enrichedAddress && (
                                    <div className="flex items-start gap-2">
                                      <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                      <span className="text-sm text-gray-700 dark:text-gray-300">{safeRender(lead.enrichedAddress)}</span>
                                    </div>
                                  )}
                                  {lead.enrichedServices && Array.isArray(lead.enrichedServices) && lead.enrichedServices.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        <Wrench size={13} className="text-gray-400" />
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Services</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {(lead.enrichedServices as any[]).slice(0, 8).map((svc: any, i: number) => (
                                          <span key={i} className="text-xs bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full">{typeof svc === 'string' ? svc : String(svc)}</span>
                                        ))}
                                        {(lead.enrichedServices as any[]).length > 8 && (
                                          <span className="text-xs text-gray-400">+{(lead.enrichedServices as any[]).length - 8} more</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {lead.enrichedHours && typeof lead.enrichedHours === 'object' && (
                                    <div className="flex items-start gap-2">
                                      <Clock size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div className="text-xs text-gray-600">
                                        {Array.isArray(lead.enrichedHours) ? (
                                          lead.enrichedHours.slice(0, 3).map((h: any, i: number) => (
                                            <div key={i}>{typeof h === 'string' ? h : JSON.stringify(h)}</div>
                                          ))
                                        ) : (
                                          <span>Hours available</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-400 italic">No enrichment data yet</p>
                              )}
                            </div>

                            {/* Call History */}
                            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                  <Clock size={15} className="text-gray-600" />
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Call History</h4>
                              </div>
                              {(() => {
                                const ld = expandedLeadData[lead.id]
                                if (!ld) return <p className="text-sm text-gray-400 italic">Loading...</p>
                                const calls = ld.dialerCalls || []
                                const nextCallback = ld.callbackSchedules?.find((cb: any) => cb.status !== 'COMPLETED')
                                return (
                                  <div className="space-y-2">
                                    {calls.length === 0 ? (
                                      <p className="text-sm text-gray-400 italic">No calls yet</p>
                                    ) : (
                                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {calls.slice(0, 5).map((call: any) => (
                                          <div key={call.id} className="flex items-center flex-wrap gap-2 text-xs text-gray-600 py-1 border-b border-gray-50 last:border-0">
                                            <span className="text-gray-400">{new Date(call.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{call.rep?.name || '—'}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${call.connectedAt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                              {call.connectedAt ? 'Conn' : 'No Ans'}
                                            </span>
                                            {call.dispositionResult && (
                                              <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
                                                ['WANTS_TO_MOVE_FORWARD', 'CALLBACK', 'WANTS_CHANGES'].includes(call.dispositionResult) ? 'bg-green-100 text-green-700' :
                                                ['DNC', 'WRONG_NUMBER'].includes(call.dispositionResult) ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                              }`}>{call.dispositionResult.replace(/_/g, ' ')}</span>
                                            )}
                                            {call.duration != null && <span className="text-gray-400 ml-auto">{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {nextCallback && (
                                      <p className="text-xs text-blue-600 font-medium">Callback: {new Date(nextCallback.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {nextCallback.rep?.name || ''}</p>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Recent Activity — full width */}
                            <div className="col-span-1 md:col-span-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800 p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                  <Clock size={15} className="text-blue-600" />
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Recent Activity</h4>
                              </div>
                              {(() => {
                                const events = expandedLeadEvents[lead.id]
                                if (!events) return <p className="text-sm text-gray-400 italic">Loading events...</p>
                                if (events.length === 0) return <p className="text-sm text-gray-400 italic">No events recorded yet.</p>
                                const getIcon = (type: string) => {
                                  switch (type) {
                                    case 'PREVIEW_VIEWED': return '\u{1F441}\uFE0F'
                                    case 'PREVIEW_CTA_CLICKED': return '\u{1F525}'
                                    case 'PREVIEW_RETURN_VISIT': return '\u{1F504}'
                                    case 'TEXT_SENT': return '\u{1F4E4}'
                                    case 'TEXT_RECEIVED': return '\u{1F4E5}'
                                    case 'EMAIL_SENT': return '\u{1F4E7}'
                                    case 'SMS_FALLBACK_EMAIL': return '\u26A0\uFE0F'
                                    case 'CALL_LOGGED': return '\u{1F4DE}'
                                    case 'STATUS_CHANGE': return '\u{1F500}'
                                    case 'HOT_LEAD_DETECTED': return '\u{1F525}'
                                    case 'CLOSE_ENGINE_TRIGGERED': return '\u{1F916}'
                                    default: return '\u{1F4CC}'
                                  }
                                }
                                return (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 max-h-48 overflow-y-auto">
                                    {events.slice(0, 8).map((event: any) => (
                                      <div key={event.id} className="flex items-start gap-2 text-sm py-1.5 border-b border-gray-50">
                                        <span className="text-base flex-shrink-0">{getIcon(event.eventType)}</span>
                                        <div className="flex-1 min-w-0">
                                          <span className="font-medium text-gray-700 dark:text-gray-300">{event.eventType.replace(/_/g, ' ')}</span>
                                          {event.actor && event.actor !== 'system' && (
                                            <span className="text-gray-400 ml-1">by {event.actor}</span>
                                          )}
                                        </div>
                                        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                          {new Date(event.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )
                              })()}
                            </div>

                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
