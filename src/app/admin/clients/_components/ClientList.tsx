'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BulkSelectDropdown } from '@/components/ui/BulkSelectDropdown'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import React from 'react'
import {
  Search, Plus, ExternalLink, Users,
  ChevronDown, ChevronUp,
  Phone, Mail, Eye, MessageSquare, Edit3
} from 'lucide-react'
import { getClientStage, getHealthScore, getHealthBadge, getDaysSince, type ViewMode } from '../_lib/utils'

// ─── Props ───
interface ClientListProps {
  viewMode: ViewMode
  filteredClients: any[]
  loading: boolean
  searchTerm: string
  setSearchTerm: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
  tagFilter: string
  setTagFilter: (v: string) => void
  allTags: string[]
  selectedClients: Set<string>
  setSelectedClients: (v: Set<string>) => void
  toggleSelectClient: (id: string) => void
  expandedClient: string | null
  setExpandedClient: (id: string | null) => void
  setDialogOpen: (v: boolean) => void
  setSelectedClient: (client: any) => void
  setViewMode: (v: ViewMode) => void
  setProfileTab: (v: string) => void
}

export default function ClientList({
  viewMode,
  filteredClients,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  tagFilter,
  setTagFilter,
  allTags,
  selectedClients,
  setSelectedClients,
  toggleSelectClient,
  expandedClient,
  setExpandedClient,
  setDialogOpen,
  setSelectedClient,
  setViewMode,
  setProfileTab,
}: ClientListProps) {
  const router = useRouter()

  return (
    <>
      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input className="pl-10" placeholder="Search clients by name, phone, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-800 dark:text-gray-100">
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ONBOARDING">Onboarding</option>
            <option value="AT_RISK">At Risk</option>
            <option value="FAILED_PAYMENT">Payment Issues</option>
            <option value="DEACTIVATED">Deactivated</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {allTags.length > 0 && (
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-800 dark:text-gray-100">
              <option value="">All Tags</option>
              {allTags.map((tag: string) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          )}
        </div>
        {selectedClients.size > 0 && (
          <div className="mt-3 pt-3 border-t flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">{selectedClients.size} selected</span>
            <Button variant="outline" size="sm">Send Upsell</Button>
            <Button variant="outline" size="sm">Send Stat Report</Button>
            <Button variant="outline" size="sm">Change Tags</Button>
          </div>
        )}
      </Card>

      {/* Client Table */}
      <Card>
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto mb-2 text-gray-400 dark:text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No clients found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Add your first client to get started</p>
            <Button onClick={() => setDialogOpen(true)}><Plus size={18} className="mr-2" />Add Client</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
                <tr>
                  <th className="text-left p-4 w-10">
                    <BulkSelectDropdown
                      pageItemIds={filteredClients.map(c => c.id)}
                      selectedIds={selectedClients}
                      onSelectionChange={setSelectedClients}
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Client</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Health</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">MRR</th>
                  {viewMode === 'billing' ? (
                    <>
                      <th className="text-right p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">LTV</th>
                      <th className="text-right p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Stripe</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Tags</th>
                      <th className="text-right p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Activity</th>
                    </>
                  )}
                  <th className="text-right p-4 text-sm font-semibold text-gray-700 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredClients.map((client) => {
                  const stage = getClientStage(client)
                  const StageIcon = stage.icon
                  const healthScore = getHealthScore(client)
                  const health = getHealthBadge(healthScore)
                  const contact = client.contactName || (client.lead ? `${client.lead.firstName} ${client.lead.lastName || ''}`.trim() : '')
                  const location = client.location || (client.lead ? `${client.lead.city || ''}, ${client.lead.state || ''}`.replace(/^, |, $/g, '') : '')
                  const daysActive = getDaysSince(client.siteLiveDate)
                  const daysSinceInteraction = getDaysSince(client.lastInteraction)
                  const isExpanded = expandedClient === client.id
                  const pendingEdits = client.editRequests?.length || 0

                  return (
                    <React.Fragment key={client.id}>
                    <tr className="group hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded" checked={selectedClients.has(client.id)} onChange={() => toggleSelectClient(client.id)} />
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => { setSelectedClient(client); setViewMode('profile'); setProfileTab('overview') }}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{client.companyName}</span>
                          {pendingEdits > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                              <Edit3 size={10} />{pendingEdits}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {contact && <span>{contact}</span>}
                          {location && <span className="ml-2 text-gray-400 dark:text-gray-500">- {location}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stage.color}`}>
                          <StageIcon size={12} />{stage.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${health.color}`}>
                          {health.icon} {healthScore}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(client.monthlyRevenue)}<span className="text-xs text-gray-400 dark:text-gray-500">/mo</span>
                      </td>
                      {viewMode === 'billing' ? (
                        <>
                          <td className="p-4 text-right text-sm text-gray-600 dark:text-gray-400">
                            {daysActive !== null ? formatCurrency(Math.round((client.monthlyRevenue || 0) * (daysActive / 30))) : '—'}
                          </td>
                          <td className="p-4 text-right">
                            <span className={`text-xs font-medium ${client.stripeCustomerId ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                              {client.stripeCustomerId ? 'Connected' : 'Not linked'}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {(client.tags || []).slice(0, 3).map((tag: string) => (
                                <span key={tag} className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded text-xs">{tag}</span>
                              ))}
                              {(client.tags || []).length > 3 && <span className="text-xs text-gray-400 dark:text-gray-500">+{client.tags.length - 3}</span>}
                            </div>
                          </td>
                          <td className="p-4 text-right text-sm text-gray-600 dark:text-gray-400">
                            <div>{daysSinceInteraction !== null ? `${daysSinceInteraction}d ago` : 'Never'}</div>
                            {pendingEdits > 0 && <div className="text-xs text-amber-600 dark:text-amber-400">{pendingEdits} pending edits</div>}
                          </td>
                        </>
                      )}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/admin/messages?clientId=${client.id}`) }}
                            title="Open Chat"
                            className="p-1.5 rounded-md text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
                          >
                            <MessageSquare size={15} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setExpandedClient(isExpanded ? null : client.id) }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50 dark:bg-slate-800/50">
                        <td colSpan={viewMode === 'billing' ? 8 : 8} className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Contact</p>
                              <p className="font-medium">{contact || '—'}</p>
                              {(client.phone || client.lead?.phone) && (
                                <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1"><Phone size={12} /> {client.phone || client.lead?.phone}</p>
                              )}
                              {(client.email || client.lead?.email) && (
                                <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1"><Mail size={12} /> {client.email || client.lead?.email}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Site</p>
                              {client.siteUrl ? (
                                <a href={`https://${client.siteUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                  {client.siteUrl} <ExternalLink size={12} />
                                </a>
                              ) : <p className="text-gray-400 dark:text-gray-500">Not set</p>}
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Billing</p>
                              <p className="font-medium">{formatCurrency(client.monthlyRevenue)}/mo</p>
                              <p className="text-gray-600 dark:text-gray-400 mt-1">{daysActive !== null ? `${daysActive} days active` : 'Not live yet'}</p>
                              <p className="text-gray-600 dark:text-gray-400 mt-1">Automation: {client.autonomyLevel || 'FULL_AUTO'}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Actions</p>
                              <Button size="sm" variant="outline" onClick={() => { setSelectedClient(client); setViewMode('profile'); setProfileTab('overview') }}>
                                <Eye size={14} className="mr-1" /> View Profile
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setSelectedClient(client); setViewMode('profile'); setProfileTab('messages') }}>
                                <Mail size={14} className="mr-1" /> Messages
                              </Button>
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
        )}
      </Card>
    </>
  )
}
