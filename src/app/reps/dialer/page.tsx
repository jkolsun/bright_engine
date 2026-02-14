'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Phone, SkipForward, Clock, CheckCircle, X, PhoneOff } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function DialerPage() {
  const [queue, setQueue] = useState<any[]>([])
  const [currentLead, setCurrentLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [callActive, setCallActive] = useState(false)

  useEffect(() => { loadQueue() }, [])

  const loadQueue = async () => {
    try {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      const leadsRes = await fetch(`/api/leads?assignedTo=${meData.user.id}&status=NEW,HOT_LEAD,QUALIFIED&limit=50`)
      if (leadsRes.ok) {
        const data = await leadsRes.json()
        const leads = data.leads || []
        setQueue(leads)
        if (leads.length > 0) setCurrentLead(leads[0])
      }
    } catch (e) { console.error('Failed to load queue:', e) }
    finally { setLoading(false) }
  }

  const handleCall = () => {
    if (currentLead?.phone) {
      window.open(`tel:${currentLead.phone}`)
      setCallActive(true)
    }
  }

  const handleOutcome = async (outcome: string) => {
    if (!currentLead) return
    try {
      // Log the call outcome
      await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: outcome === 'CLOSED' ? 'PAID' :
                  outcome === 'CALLBACK' ? 'QUALIFIED' :
                  outcome === 'NOT_INTERESTED' ? 'CLOSED_LOST' : currentLead.status
        })
      })
    } catch (e) { console.error(e) }
    setCallActive(false)
    // Move to next lead
    const nextIndex = queue.indexOf(currentLead) + 1
    if (nextIndex < queue.length) setCurrentLead(queue[nextIndex])
    else setCurrentLead(null)
  }

  const skipLead = () => {
    const nextIndex = queue.indexOf(currentLead) + 1
    if (nextIndex < queue.length) setCurrentLead(queue[nextIndex])
  }

  if (loading) return <div className="p-8 text-center">Loading dialer queue...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Power Dialer</h1>
        <p className="text-gray-500 mt-1">{queue.length} leads in queue</p>
      </div>

      {!currentLead ? (
        <Card className="p-12 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Queue Complete!</h3>
          <p className="text-gray-600 mt-2">No more leads to call right now.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{currentLead.companyName}</h2>
              <p className="text-lg text-gray-600">{currentLead.firstName} {currentLead.lastName}</p>
              <p className="text-gray-500">{currentLead.city}, {currentLead.state}</p>
              <Badge className="mt-2">{currentLead.status}</Badge>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-6">{currentLead.phone}</div>
            {!callActive ? (
              <div className="flex gap-3">
                <Button size="lg" className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleCall}>
                  <Phone size={20} className="mr-2" /> Call Now
                </Button>
                <Button size="lg" variant="outline" onClick={skipLead}>
                  <SkipForward size={20} className="mr-2" /> Skip
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Call outcome:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handleOutcome('CONNECTED')} variant="outline">Connected</Button>
                  <Button onClick={() => handleOutcome('NO_ANSWER')} variant="outline">No Answer</Button>
                  <Button onClick={() => handleOutcome('VOICEMAIL')} variant="outline">Voicemail</Button>
                  <Button onClick={() => handleOutcome('CALLBACK')} variant="outline">Callback</Button>
                  <Button onClick={() => handleOutcome('CLOSED')} className="bg-green-600">Closed!</Button>
                  <Button onClick={() => handleOutcome('NOT_INTERESTED')} variant="outline" className="text-red-600">Not Interested</Button>
                </div>
              </div>
            )}
          </Card>

          {currentLead.callScript && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Script</h3>
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                {currentLead.callScript}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}