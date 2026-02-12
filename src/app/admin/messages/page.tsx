'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { MessageSquare, AlertCircle, CheckCircle, Send } from 'lucide-react'

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [twilioStatus, setTwilioStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')

  useEffect(() => {
    checkTwilioStatus()
    loadMessages()
  }, [])

  const checkTwilioStatus = async () => {
    try {
      const res = await fetch('/api/twilio/status')
      if (res.ok) {
        const data = await res.json()
        setTwilioStatus(data.connected ? 'connected' : 'disconnected')
      } else {
        setTwilioStatus('disconnected')
      }
    } catch (error) {
      setTwilioStatus('disconnected')
    }
  }

  const loadMessages = async () => {
    try {
      const res = await fetch('/api/messages?limit=50')
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages Center</h1>
        <p className="text-gray-500 mt-1">SMS conversations with leads and clients</p>
      </div>

      {/* Twilio Status Card */}
      <Card className={`p-6 ${
        twilioStatus === 'connected' ? 'border-green-300 bg-green-50' : 
        twilioStatus === 'disconnected' ? 'border-amber-300 bg-amber-50' :
        'border-gray-300'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {twilioStatus === 'connected' ? (
              <CheckCircle size={24} className="text-green-600" />
            ) : twilioStatus === 'disconnected' ? (
              <AlertCircle size={24} className="text-amber-600" />
            ) : (
              <MessageSquare size={24} className="text-gray-400" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">
                Twilio SMS {twilioStatus === 'connected' ? 'Connected' : 'Not Connected'}
              </h3>
              <p className="text-sm text-gray-600">
                {twilioStatus === 'connected' 
                  ? 'Your phone number is active and ready to send/receive SMS'
                  : 'Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to Railway env vars'
                }
              </p>
            </div>
          </div>
          {twilioStatus === 'connected' && (
            <Badge variant="default">Active</Badge>
          )}
        </div>
      </Card>

      {/* Messages List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Messages</h3>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-600 mb-4">
              Messages will appear here once you start communicating with leads
            </p>
            {twilioStatus !== 'connected' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-amber-800">
                  <strong>Setup Required:</strong> Add Twilio credentials to Railway to enable SMS
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-lg ${
                  msg.direction === 'OUTBOUND' ? 'bg-blue-50 ml-12' : 'bg-gray-50 mr-12'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900">
                      {msg.direction === 'OUTBOUND' ? 'You' : msg.sender}
                    </div>
                    <div className="text-sm text-gray-600">{msg.recipient || msg.phone}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(msg.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-gray-800">{msg.content}</div>
                {msg.twilioStatus && (
                  <div className="text-xs text-gray-500 mt-2">
                    Status: {msg.twilioStatus}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      {twilioStatus === 'connected' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Send SMS</h3>
          <div className="flex gap-3">
            <Input placeholder="Phone number" className="flex-1" />
            <Input placeholder="Message..." className="flex-[2]" />
            <Button>
              <Send size={18} className="mr-2" />
              Send
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
