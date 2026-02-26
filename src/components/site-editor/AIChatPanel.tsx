'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Loader2, Bot, Sparkles, Undo2, MessageSquare, Wand2 } from 'lucide-react'

interface SiteContext {
  serviceCount: number
  photoCount: number
  templateName: string | null
}

interface EditRequest {
  id: string
  requestText: string
  status: string
  createdAt: string
}

interface AIChatPanelProps {
  onSubmit: (instruction: string) => Promise<{ success: boolean; message: string }>
  companyName: string
  leadId?: string
  siteContext?: SiteContext
  editRequests?: EditRequest[]
  onEditRequestProcessed?: (editRequestId: string) => void
  onUndo?: () => void
  canUndo?: boolean
  autoInstruction?: string // Auto-submit this instruction on mount
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function getSmartSuggestions(ctx?: SiteContext): string[] {
  const suggestions: string[] = []
  if (ctx) {
    if (ctx.photoCount === 0) suggestions.push('Add professional imagery to empty photo sections')
    if (ctx.serviceCount > 0) suggestions.push('Improve service descriptions with more detail')
  }
  suggestions.push('Optimize mobile layout and spacing')
  suggestions.push('Make CTA buttons more prominent and eye-catching')
  return suggestions.slice(0, 4)
}

export default function AIChatPanel({
  onSubmit, companyName, siteContext, editRequests, onEditRequestProcessed, onUndo, canUndo, autoInstruction,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [processingEditRequestId, setProcessingEditRequestId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout>()
  const autoApplied = useRef(false)

  const suggestions = useMemo(() => getSmartSuggestions(siteContext), [siteContext])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing, elapsedSeconds])

  useEffect(() => {
    if (isProcessing) {
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsedSeconds(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isProcessing])

  // Auto-submit instruction on mount (e.g. client edit request from build queue)
  useEffect(() => {
    if (autoInstruction && !autoApplied.current) {
      autoApplied.current = true
      // Small delay so the panel renders first
      const timer = setTimeout(() => handleSubmit(autoInstruction), 300)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInstruction])

  const handleSubmit = async (text?: string, editRequestId?: string) => {
    const instruction = text || input.trim()
    if (!instruction || isProcessing) return

    setInput('')
    if (editRequestId) setProcessingEditRequestId(editRequestId)
    setMessages(prev => [...prev, { role: 'user', content: instruction }])

    setIsProcessing(true)
    const result = await onSubmit(instruction)

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: result.success ? `Done! ${result.message}` : `Error: ${result.message}`,
    }])
    setIsProcessing(false)

    // If this was processing an edit request, notify parent
    if (result.success && editRequestId && onEditRequestProcessed) {
      onEditRequestProcessed(editRequestId)
    }
    setProcessingEditRequestId(null)
  }

  const contextLine = siteContext
    ? [
        siteContext.serviceCount > 0 ? `${siteContext.serviceCount} services` : null,
        `${siteContext.photoCount} photos`,
        siteContext.templateName ? siteContext.templateName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null,
      ].filter(Boolean).join(' · ')
    : null

  const pendingRequests = editRequests?.filter(r => r.status === 'new') || []

  return (
    <div className="flex flex-col h-full bg-[#252526]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-blue-400" />
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">AI Assistant</span>
        </div>
        {canUndo && onUndo && (
          <button
            onClick={onUndo}
            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
            title="Undo last AI edit"
          >
            <Undo2 size={10} />
            Undo
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="py-4">
            {/* Site context header */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-200 mb-1">{companyName}</p>
              {contextLine && (
                <p className="text-[11px] text-gray-500">{contextLine}</p>
              )}
            </div>

            {/* Pending edit requests from clients */}
            {pendingRequests.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <MessageSquare size={12} className="text-amber-400" />
                  <span className="text-[11px] text-amber-400 font-medium uppercase tracking-wider">Client Requests</span>
                </div>
                <div className="space-y-2">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
                      <p className="text-xs text-gray-200 mb-2 leading-relaxed">&ldquo;{req.requestText}&rdquo;</p>
                      <button
                        onClick={() => handleSubmit(req.requestText, req.id)}
                        disabled={isProcessing}
                        className="w-full text-[11px] font-medium px-2.5 py-1.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-40"
                      >
                        {processingEditRequestId === req.id ? 'Processing...' : 'Apply This Edit'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smart suggestions */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Wand2 size={12} className="text-blue-400" />
                <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Suggestions</span>
              </div>
              <div className="space-y-1.5">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSubmit(suggestion)}
                    disabled={isProcessing}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-40"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={12} className="text-blue-400" />
              </div>
            )}
            <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : msg.content.startsWith('Error:')
                ? 'bg-red-900/40 text-red-300 border border-red-800/50'
                : 'bg-gray-700 text-gray-200'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <Loader2 size={12} className="text-blue-400 animate-spin" />
            </div>
            <div className="bg-gray-700 px-3 py-2 rounded-lg text-xs text-gray-400">
              <span>Applying edit</span>
              <span className="inline-block w-6 text-left">
                {'.'.repeat((elapsedSeconds % 3) + 1)}
              </span>
              {elapsedSeconds >= 5 && (
                <span className="text-gray-500 ml-1">({elapsedSeconds}s)</span>
              )}
              {elapsedSeconds >= 15 && (
                <p className="text-gray-500 mt-1 text-[10px]">
                  Still working — large sites take longer
                </p>
              )}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-gray-700 flex-shrink-0">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder={isProcessing ? 'Waiting for AI...' : 'Describe a change...'}
            className="flex-1 text-xs px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-500 disabled:opacity-50"
            rows={2}
            disabled={isProcessing}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isProcessing}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed self-end transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
