'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, Sparkles } from 'lucide-react'

interface AIChatPanelProps {
  onSubmit: (instruction: string) => Promise<{ success: boolean; message: string }>
  companyName: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_EDITS = [
  'Make the hero section full-width',
  'Change the primary color to blue',
  'Make the CTA buttons larger and bolder',
  'Add more spacing between sections',
  'Move testimonials above the services section',
  'Swap the first and second service images',
]

export default function AIChatPanel({ onSubmit, companyName }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing, elapsedSeconds])

  // Timer for showing elapsed time during processing
  useEffect(() => {
    if (isProcessing) {
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsedSeconds(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isProcessing])

  const handleSubmit = async (text?: string) => {
    const instruction = text || input.trim()
    if (!instruction || isProcessing) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: instruction }])

    setIsProcessing(true)
    const result = await onSubmit(instruction)

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: result.success ? `Done! ${result.message}` : `Error: ${result.message}`,
    }])
    setIsProcessing(false)
  }

  return (
    <div className="flex flex-col h-full bg-[#252526]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 flex items-center gap-2 flex-shrink-0">
        <Sparkles size={14} className="text-blue-400" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">AI Assistant</span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <Bot size={28} className="text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-1">AI Site Editor</p>
            <p className="text-xs text-gray-500 mb-4">
              Describe changes in plain English. Try:
            </p>
            <div className="space-y-2">
              {SUGGESTED_EDITS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(suggestion)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
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
