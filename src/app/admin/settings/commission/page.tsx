'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { DollarSign, Save } from 'lucide-react'

export default function CommissionSettingsPage() {
  const [reps, setReps] = useState<any[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReps()
  }, [])

  const loadReps = async () => {
    try {
      const res = await fetch('/api/users?role=REP')
      if (res.ok) {
        const data = await res.json()
        setReps(data.users || [])
        
        // Initialize rates
        const initialRates: Record<string, number> = {}
        data.users?.forEach((rep: any) => {
          initialRates[rep.id] = 0.50 // Default 50%
        })
        setRates(initialRates)
      }
    } catch (error) {
      console.error('Failed to load reps:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      for (const [repId, rate] of Object.entries(rates)) {
        await fetch(`/api/users/${repId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commissionRate: rate })
        })
      }
      alert('Commission rates saved successfully')
    } catch (error) {
      console.error('Failed to save rates:', error)
      alert('Failed to save commission rates')
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading commission settings...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Commission Settings</h1>
        <p className="text-gray-500 mt-1">Set commission rates for your sales reps</p>
      </div>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> Set the percentage of each closed deal that goes to the rep.
          For example, 50% means the rep gets $74.50 on a $149 site build.
        </p>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          {reps.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No reps yet</p>
          ) : (
            <>
              {reps.map((rep) => (
                <div key={rep.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{rep.name}</div>
                    <div className="text-sm text-gray-500">{rep.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={(rates[rep.id] || 0.5) * 100}
                      onChange={(e) => {
                        setRates(prev => ({
                          ...prev,
                          [rep.id]: parseInt(e.target.value) / 100
                        }))
                      }}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                </div>
              ))}
              
              <div className="pt-4 flex justify-end">
                <Button onClick={handleSave}>
                  <Save size={18} className="mr-2" />
                  Save Commission Rates
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-amber-50 border-amber-200">
        <h3 className="font-semibold text-gray-900 mb-2">💡 Tips</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Standard rate: 50% (split between rep and operations)</li>
          <li>• Top performers: 60% (bonus for high closes)</li>
          <li>• New reps: 40% (training period)</li>
          <li>• Rates can be adjusted monthly based on performance</li>
        </ul>
      </Card>
    </div>
  )
}
