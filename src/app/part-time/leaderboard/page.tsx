'use client'

import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Trophy, Medal, Award } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLeaderboard() }, [])

  const loadLeaderboard = async () => {
    try {
      const repsRes = await fetch('/api/users?role=REP')
      const repsData = repsRes.ok ? await repsRes.json() : { users: [] }
      const rankings = (repsData.users || [])
        .map((rep: any) => ({ rep, closedLeads: rep.totalCloses || 0, totalRevenue: (rep.totalCloses || 0) * 149 }))
        .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
        .map((item: any, idx: number) => ({
          ...item, rank: idx + 1,
          icon: idx === 0 ? Trophy : idx === 1 ? Medal : idx === 2 ? Award : undefined,
          color: idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-gray-400',
        }))
      setLeaderboard(rankings)
    } catch (error) { console.error('Failed to load leaderboard:', error) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="p-8"><h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1><p className="text-gray-500 mt-1">Loading rankings...</p></div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-gray-500 mt-1">Current rankings based on closed deals</p>
      </div>
      {leaderboard.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-gray-600">No reps yet. Rankings will appear here.</p></Card>
      ) : (
        <div className="grid gap-4">
          {leaderboard.map((item) => {
            const Icon = item.icon || Award
            const isTopThree = item.rank <= 3
            return (
              <Card key={item.rep.id} className={`p-6 ${isTopThree ? 'border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl font-bold ${item.color || 'text-gray-400'}`}>#{item.rank}</div>
                    {isTopThree && <Icon size={24} className={item.color} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.rep.name}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-gray-600"><span className="font-semibold">{item.closedLeads}</span> closed</span>
                      <span className="text-sm text-gray-600"><span className="font-semibold">{formatCurrency(item.totalRevenue)}</span> revenue</span>
                    </div>
                  </div>
                  {isTopThree && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(item.totalRevenue)}</div>
                      <div className="text-xs text-gray-500">Total Revenue</div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="text-center">
          <Trophy size={48} className="text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Top Rep Bonus</h3>
          <p className="text-gray-600 mt-1">The #1 rep each month wins a $500 bonus!</p>
        </div>
      </Card>
    </div>
  )
}
