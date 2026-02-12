'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import {
  Search, Send, Phone, User, Clock, Check, CheckCheck,
  MessageSquare, Filter, Zap, Copy, Archive
} from 'lucide-react'
import Link from 'next/link'

// Mock conversations data
const MOCK_CONVERSATIONS = [
  {
    id: 1,
    lead: {
      id: 1,
      name: 'John Smith',
      company: 'ABC Roofing',
      phone: '5551234567'
    },
    lastMessage: {
      content: 'This looks great! Can we add before/after photos?',
      direction: 'inbound',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      status: 'delivered'
    },
    unreadCount: 1,
    status: 'HOT_LEAD',
    priority: 'HIGH'
  },
  {
    id: 2,
    lead: {
      id: 2,
      name: 'Mike Johnson',
      company: 'Elite Plumbing',
      phone: '5559876543'
    },
    lastMessage: {
      content: 'Thanks! Will review and get back to you tomorrow.',
      direction: 'inbound',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'delivered'
    },
    unreadCount: 0,
    status: 'QUALIFIED',
    priority: 'NORMAL'
  },
  {
    id: 3,
    lead: {
      id: 3,
      name: 'Sarah Davis',
      company: 'Pro Painting',
      phone: '5554567890'
    },
    lastMessage: {
      content: 'QA link sent! Please review at your convenience.',
      direction: 'outbound',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      status: 'delivered'
    },
    unreadCount: 0,
    status: 'BUILDING',
    priority: 'NORMAL'
  }
]

const MOCK_MESSAGES = [
  {
    id: 1,
    direction: 'outbound',
    content: 'Hi John! I saw you viewed the preview again. The before/after photos are a great idea - I can add those today. Want me to include your top 3 recent projects?',
    timestamp: new Date(Date.now() - 3 * 60 * 1000),
    status: 'delivered'
  },
  {
    id: 2,
    direction: 'inbound',
    content: 'This looks great! Can we add before/after photos?',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    status: 'read'
  },
  {
    id: 3,
    direction: 'outbound',
    content: 'Hi John! I saw you clicked the "Schedule Call" button. I\'m available today from 2-4pm or tomorrow morning. What works better for you?',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    status: 'delivered'
  },
  {
    id: 4,
    direction: 'inbound',
    content: 'YES, interested!',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    status: 'read'
  },
  {
    id: 5,
    direction: 'outbound',
    content: 'Hi John! Here\'s a preview of what your new website could look like: https://preview.bright.ai/abc-roofing\n\nI built this based on your roofing business in Dallas. Take a look and let me know what you think!',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    status: 'delivered'
  }
]

const QUICK_REPLIES = [
  'Thanks for your interest! Let me know if you have any questions.',
  'I can schedule a call for today or tomorrow. What works best?',
  'Great! I\'ll get started on that right away.',
  'The preview link is ready: [PREVIEW_URL]',
  'I\'ve sent over the details. Let me know what you think!',
]

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState(MOCK_CONVERSATIONS[0])
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

  const filteredConversations = MOCK_CONVERSATIONS.filter(conv =>
    conv.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lead.phone.includes(searchTerm)
  )

  const sendMessage = () => {
    if (!message.trim()) return
    // In real app: call API to send SMS
    console.log('Sending:', message, 'to', selectedConversation.lead.phone)
    setMessage('')
    setShowTemplates(false)
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversations List */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {MOCK_CONVERSATIONS.reduce((sum, c) => sum + c.unreadCount, 0)}
              </p>
              <p className="text-xs text-gray-600">Unread</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {MOCK_CONVERSATIONS.filter(c => c.priority === 'HIGH').length}
              </p>
              <p className="text-xs text-gray-600">Hot</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {MOCK_CONVERSATIONS.length}
              </p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={`w-full p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left ${
                selectedConversation.id === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User size={18} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{conv.lead.name}</p>
                    <p className="text-xs text-gray-600">{conv.lead.company}</p>
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {conv.unreadCount}
                  </Badge>
                )}
              </div>
              <p className={`text-sm ${conv.lastMessage.direction === 'inbound' && conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'} truncate`}>
                {conv.lastMessage.direction === 'outbound' && 'You: '}
                {conv.lastMessage.content}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatTimeAgo(conv.lastMessage.timestamp)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Thread Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-blue-600">
                  {selectedConversation.lead.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedConversation.lead.name}</h3>
                <p className="text-sm text-gray-600">{selectedConversation.lead.company} • {selectedConversation.lead.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open(`tel:${selectedConversation.lead.phone}`)}>
                <Phone size={16} className="mr-2" />
                Call
              </Button>
              <Link href={`/leads/${selectedConversation.lead.id}`}>
                <Button variant="outline" size="sm">
                  View Lead
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {MOCK_MESSAGES.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${
                msg.direction === 'outbound'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              } rounded-lg p-4 shadow-sm`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <div className={`flex items-center gap-2 mt-2 text-xs ${
                  msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <span>{formatTimeAgo(msg.timestamp)}</span>
                  {msg.direction === 'outbound' && (
                    <>
                      <span>•</span>
                      {msg.status === 'delivered' && <CheckCheck size={14} />}
                      {msg.status === 'sent' && <Check size={14} />}
                      <span className="capitalize">{msg.status}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Replies */}
        {showTemplates && (
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Quick Replies</h4>
              <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_REPLIES.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setMessage(reply)
                    setShowTemplates(false)
                  }}
                  className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left text-sm text-gray-700 transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Type a message... (Shift+Enter for new line)"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplates(!showTemplates)}
                  >
                    <Zap size={14} className="mr-1" />
                    Templates
                  </Button>
                  <span className="text-xs text-gray-500">
                    {message.length}/160 chars
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  ~{Math.ceil(message.length / 160)} SMS
                </span>
              </div>
            </div>
            <Button
              size="lg"
              onClick={sendMessage}
              disabled={!message.trim()}
              className="px-8"
            >
              <Send size={18} className="mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}
