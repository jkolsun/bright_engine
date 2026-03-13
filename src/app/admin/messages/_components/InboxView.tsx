'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ToggleSwitch from '@/components/ui/toggle-switch'
import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MessageSquare, RefreshCw, Search, Plus, Hammer
} from 'lucide-react'
import { EntryPointBadge, StageBadge, timeSince } from '../_lib/constants'
import type { InboxTab } from '../_lib/constants'

interface InboxViewProps {
  inboxTab: InboxTab
  setInboxTab: (tab: InboxTab) => void
  loading: boolean
  refreshing: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  sourceFilter: 'all' | 'rep' | 'ai' | 'admin'
  setSourceFilter: (filter: 'all' | 'rep' | 'ai' | 'admin') => void
  globalAutoPush: boolean
  globalAutoPushLoaded: boolean
  handleToggleGlobalAutoPush: () => void
  closeConversations: any[]
  postClientConvs: any[]
  allConversationCount: number
  pendingApprovalCount: number
  filteredConvs: any[]
  groupedConversations: any[]
  hasMore: boolean
  loadingMore: boolean
  loadMoreMessages: () => void
  isNewClient: (conv: any) => boolean
  onRefresh: () => Promise<void>
  onNewChat: () => void
  onSelectCloseConv: (conv: any) => void
  onSelectConversation: (conv: any) => void
  // New Chat dialog
  newChatOpen: boolean
  setNewChatOpen: (open: boolean) => void
  chatSearch: string
  setChatSearch: (search: string) => void
  chatSearchResults: any[]
  setChatSearchResults: (results: any[]) => void
  onStartNewChat: (result: any) => void
}

function ConversationCard({ conversation, onClick, variant }: { conversation: any; onClick: () => void; variant: 'escalated' | 'ai' | 'default' }) {
  const borderColor = variant === 'escalated' ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30' : variant === 'ai' ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20' : 'border-gray-200 dark:border-slate-700'
  const lastMsg = conversation.lastMessage
  const ts = lastMsg?.createdAt ? timeSince(lastMsg.createdAt) : ''

  return (
    <Card className={`p-4 cursor-pointer hover:shadow-md transition-all ${borderColor}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{conversation.name}</span>
            {conversation.isClient ? <Badge variant="default" className="text-xs">Client</Badge> : <Badge variant="secondary" className="text-xs">Lead</Badge>}
            {conversation.channels?.has('SMS') && <span className="text-[10px]">💬</span>}
            {conversation.channels?.has('EMAIL') && <span className="text-[10px]">📧</span>}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
            {lastMsg?.direction === 'OUTBOUND' && (
              <span className="text-gray-400 dark:text-gray-500">{(lastMsg.aiGenerated || lastMsg.senderType === 'AI') ? '🤖 ' : 'You: '}</span>
            )}
            {lastMsg?.content?.replace(/<[^>]*>/g, '').substring(0, 100)}{(lastMsg?.content?.length || 0) > 100 && '...'}
          </div>
          {conversation.escalated && lastMsg?.escalationReason && (
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">AI paused — {lastMsg.escalationReason}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 ml-3">
          <span className="text-xs text-gray-400 dark:text-gray-500">{ts}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="text-xs h-7 px-2">OPEN</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function InboxView(props: InboxViewProps) {
  const {
    inboxTab, setInboxTab, loading, refreshing, searchTerm, setSearchTerm,
    sourceFilter, setSourceFilter, globalAutoPush, globalAutoPushLoaded,
    handleToggleGlobalAutoPush, closeConversations, postClientConvs,
    allConversationCount, pendingApprovalCount, filteredConvs,
    groupedConversations, hasMore, loadingMore, loadMoreMessages,
    isNewClient, onRefresh, onNewChat, onSelectCloseConv, onSelectConversation,
    newChatOpen, setNewChatOpen, chatSearch, setChatSearch, chatSearchResults,
    setChatSearchResults, onStartNewChat,
  } = props

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Unified inbox — AI handler + manual override</p>
        </div>
        <div className="flex gap-3">
          <Button size="sm" onClick={onNewChat}>
            <Plus size={16} className="mr-1" /> New Chat
          </Button>
          <Button variant="outline" size="sm" disabled={refreshing} onClick={onRefresh}>
            <RefreshCw size={14} className={`mr-1 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Inbox Tabs — Teal active indicator */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
        {[
          { key: 'pre_client' as const, label: 'Pre-Client', count: closeConversations.length },
          { key: 'post_client' as const, label: 'Post-Client', count: postClientConvs.length },
          { key: 'all' as const, label: 'All', count: allConversationCount },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setInboxTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              inboxTab === tab.key
                ? 'border-teal-500 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
            <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs ${
              inboxTab === tab.key ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
            }`}>
              {tab.count}
            </span>
            {tab.key === 'pre_client' && pendingApprovalCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs bg-orange-500 text-white animate-pulse">
                {pendingApprovalCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Source Filter + Global Auto-Push */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <Input className="pl-10" placeholder="Search conversations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as any)}
          className="text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-100 flex-shrink-0"
        >
          <option value="all">All Sources</option>
          <option value="rep">Rep</option>
          <option value="ai">AI</option>
          <option value="admin">Admin</option>
        </select>
        {inboxTab === 'pre_client' && globalAutoPushLoaded && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg flex-shrink-0">
            <Hammer size={13} className="text-teal-600" />
            <ToggleSwitch
              label="Auto-push builds"
              size="sm"
              checked={globalAutoPush}
              onChange={handleToggleGlobalAutoPush}
            />
          </div>
        )}
      </div>

      {/* ─── PRE-CLIENT TAB ─── */}
      {inboxTab === 'pre_client' && (
        <>
          {loading ? (
            <Card className="p-12 text-center text-gray-500 dark:text-gray-400">Loading conversations...</Card>
          ) : filteredConvs.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No active conversations</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Close Engine conversations will appear when leads engage.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {(filteredConvs as any[]).map((conv: any) => {
                const eng = conv.engagement
                const hasCtaClick = eng?.ctaClickCount > 0
                const hasCallClick = eng?.callClickCount > 0
                const hasReturnVisit = eng?.returnVisitCount > 0
                const isHotEngagement = hasCtaClick || hasCallClick

                return (
                <Card
                  key={conv.id}
                  className={`p-4 cursor-pointer hover:shadow-md transition-all ${
                    conv.pendingActionCount > 0 ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30' :
                    isHotEngagement ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20' :
                    conv.stage === 'STALLED' ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20' :
                    'border-gray-200 dark:border-slate-700'
                  }`}
                  onClick={() => onSelectCloseConv(conv)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{conv.lead?.companyName || 'Unknown'}</span>
                        <EntryPointBadge entryPoint={conv.entryPoint} />
                        <StageBadge stage={conv.stage} />
                        {conv.pendingActionCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500 text-white animate-pulse">
                            Action needed
                          </span>
                        )}
                        {hasCtaClick && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                            CTA Clicked{eng.ctaClickCount > 1 ? ` x${eng.ctaClickCount}` : ''}
                          </span>
                        )}
                        {hasCallClick && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                            Called
                          </span>
                        )}
                        {hasReturnVisit && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400">
                            Return Visit
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {conv.lead?.firstName} {conv.lead?.lastName || ''}
                        {conv.lead?.phone && <span className="ml-2">{conv.lead.phone}</span>}
                      </div>
                      {/* Engagement summary line */}
                      {eng && (eng.previewViewCount > 0 || hasCtaClick) && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-3">
                          {eng.previewViewCount > 0 && <span>{eng.previewViewCount} preview view{eng.previewViewCount !== 1 ? 's' : ''}</span>}
                          {hasCtaClick && eng.lastCtaClick && <span>Last click {timeSince(eng.lastCtaClick)}</span>}
                          {hasReturnVisit && <span>{eng.returnVisitCount} return visit{eng.returnVisitCount !== 1 ? 's' : ''}</span>}
                        </div>
                      )}
                      {conv.lastMessage ? (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                          {conv.lastMessage.direction === 'OUTBOUND' && (
                            <span className="text-gray-400 dark:text-gray-500">
                              {(conv.lastMessage.aiGenerated || conv.lastMessage.senderType === 'AI') ? '🤖 ' : 'You: '}
                            </span>
                          )}
                          {conv.lastMessage.content?.substring(0, 100)}{(conv.lastMessage.content?.length || 0) > 100 && '...'}
                        </div>
                      ) : hasCtaClick && (
                        <div className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">
                          Lead clicked "Get Started" — no message sent yet
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      {conv.lastMessage?.createdAt ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{timeSince(conv.lastMessage.createdAt)}</span>
                      ) : eng?.lastCtaClick ? (
                        <span className="text-xs text-green-500">{timeSince(eng.lastCtaClick)}</span>
                      ) : null}
                      <span className="text-xs text-gray-400 dark:text-gray-500">{conv.autonomyLevel.replace('_', ' ')}</span>
                    </div>
                  </div>
                </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ─── POST-CLIENT TAB ─── */}
      {inboxTab === 'post_client' && (
        <>
          {loading ? (
            <Card className="p-12 text-center text-gray-500 dark:text-gray-400">Loading messages...</Card>
          ) : filteredConvs.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No client conversations</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Support conversations will appear when clients text or email.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {(filteredConvs as any[]).map((conv: any) => (
                <Card
                  key={conv.key}
                  className={`p-4 cursor-pointer hover:shadow-md transition-all ${
                    conv.escalated ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30' :
                    conv.aiHandling ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20' :
                    'border-gray-200 dark:border-slate-700'
                  }`}
                  onClick={() => onSelectConversation(conv)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{conv.name}</span>
                        <Badge variant="default" className="text-xs">Client</Badge>
                        {isNewClient(conv) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
                            NEW CLIENT
                          </span>
                        )}
                        {conv.escalated && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400">
                            Escalated
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {conv.channels?.has('SMS') && <span className="text-[10px]">💬</span>}
                        {conv.channels?.has('EMAIL') && <span className="text-[10px]">📧</span>}
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {conv.lastMessage?.direction === 'OUTBOUND' && (
                            <span className="text-gray-400 dark:text-gray-500">{(conv.lastMessage.aiGenerated || conv.lastMessage.senderType === 'AI') ? '🤖 ' : 'You: '}</span>
                          )}
                          {conv.lastMessage?.content?.replace(/<[^>]*>/g, '').substring(0, 80)}{(conv.lastMessage?.content?.length || 0) > 80 && '...'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      {conv.lastMessage?.createdAt && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{timeSince(conv.lastMessage.createdAt)}</span>
                      )}
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="text-xs h-7 px-2">OPEN</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── ALL TAB ─── */}
      {inboxTab === 'all' && (
        <>
          {loading ? (
            <Card className="p-12 text-center text-gray-500 dark:text-gray-400">Loading messages...</Card>
          ) : filteredConvs.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No conversations</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Messages will appear here as they come in.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {/* Escalated */}
              {(filteredConvs as any[]).filter((c: any) => c.escalated).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2">ESCALATED</h3>
                  {(filteredConvs as any[]).filter((c: any) => c.escalated).map((conv: any) => (
                    <ConversationCard key={conv.key} conversation={conv} onClick={() => onSelectConversation(conv)} variant="escalated" />
                  ))}
                </div>
              )}

              {/* AI Handling */}
              {(filteredConvs as any[]).filter((c: any) => c.aiHandling && !c.escalated).length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">🤖 AI HANDLING</h3>
                  {(filteredConvs as any[]).filter((c: any) => c.aiHandling && !c.escalated).map((conv: any) => (
                    <ConversationCard key={conv.key} conversation={conv} onClick={() => onSelectConversation(conv)} variant="ai" />
                  ))}
                </div>
              )}

              {/* Other */}
              {(filteredConvs as any[]).filter((c: any) => !c.aiHandling && !c.escalated).length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">CONVERSATIONS</h3>
                  {(filteredConvs as any[]).filter((c: any) => !c.aiHandling && !c.escalated).map((conv: any) => (
                    <ConversationCard key={conv.key} conversation={conv} onClick={() => onSelectConversation(conv)} variant="default" />
                  ))}
                </div>
              )}

              {/* BUG M.3: Load More button */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm" disabled={loadingMore} onClick={loadMoreMessages}>
                    {loadingMore ? 'Loading...' : 'Load More Conversations'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* New Chat Dialog */}
      <Dialog open={newChatOpen} onOpenChange={(v) => { setNewChatOpen(v); if (!v) { setChatSearch(''); setChatSearchResults([]) } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
          <Input placeholder="Search by name, company, or phone..." value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} autoFocus />
          <div className="max-h-60 overflow-y-auto mt-2 space-y-1">
            {chatSearchResults.length === 0 && chatSearch.length >= 2 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No results</p>
            )}
            {chatSearchResults.map((r: any) => (
              <button
                key={`${r.type}-${r.id}`}
                className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md flex items-center justify-between"
                onClick={() => onStartNewChat(r)}
              >
                <div>
                  <div className="font-medium text-sm">{String(r.name || '')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{String(r.company || '')}{r.phone ? ` • ${String(r.phone)}` : ''}</div>
                </div>
                <Badge variant={r.type === 'client' ? 'default' : 'secondary'} className="text-xs">{r.type}</Badge>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
