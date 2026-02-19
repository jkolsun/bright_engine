'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Trophy, Medal, Award, Crown } from 'lucide-react'
import { useState, useEffect } from 'react'

interface RepRanking {
  rank: number
  rep: any
  closedLeads: number
  totalRevenue: number
  icon?: any
  color?: string
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<RepRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const [repsRes, configRes] = await Promise.all([
        fetch('/api/users?role=REP'),
        fetch('/api/rep-config'),
      ])
      const repsData = repsRes.ok ? await repsRes.json() : { users: [] }
      const reps = repsData.users || []
      const configData = configRes.ok ? await configRes.json() : {}
      const productPrice = configData.productPrice || 188

      const rankings = reps
        .map((rep: any) => ({
          rep,
          closedLeads: rep.totalCloses || 0,
          totalRevenue: (rep.totalCloses || 0) * (rep.commissionRate ?? productPrice),
        }))
        .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
        .map((item: any, idx: number) => ({
          ...item,
          rank: idx + 1,
          icon: idx === 0 ? Trophy : idx === 1 ? Medal : idx === 2 ? Award : undefined,
          color: idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-gray-400',
        }))

      setLeaderboard(rankings)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
      setError('Failed to load leaderboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Trophy size={22} className="text-white" />
          </div>
          <p className="text-gray-500 font-medium">Loading rankings...</p>
        </div>
      </div>
    )
  }

  if (error || leaderboard.length === 0) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Current rankings based on closed deals</p>
        </div>
        <Card className="p-16 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Trophy size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">
              {error || 'No reps available yet. Once reps are created, rankings will appear here.'}
            </p>
          </div>
        </Card>
      </div>
    )
  }

  const rankBg = ['from-yellow-50 via-amber-50 to-orange-50', 'from-gray-50 via-slate-50 to-gray-100', 'from-amber-50 via-orange-50 to-yellow-50']
  const rankBorder = ['border-yellow-200', 'border-gray-200', 'border-amber-200']

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Current rankings based on closed deals</p>
      </div>

      <div className="space-y-3">
        {leaderboard.map((item) => {
          const Icon = item.icon || Award
          const isTopThree = item.rank <= 3

          return (
            <Card
              key={item.rep.id}
              className={`p-6 rounded-2xl border shadow-medium transition-all duration-300 hover:shadow-lg ${
                isTopThree
                  ? `bg-gradient-to-r ${rankBg[item.rank - 1]} ${rankBorder[item.rank - 1]}`
                  : 'bg-white/80 backdrop-blur-sm border-0 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    item.rank === 1 ? 'bg-yellow-100' :
                    item.rank === 2 ? 'bg-gray-200' :
                    item.rank === 3 ? 'bg-amber-100' :
                    'bg-gray-100'
                  }`}>
                    {isTopThree ? (
                      <Icon size={22} className={item.color} />
                    ) : (
                      <span className="text-sm font-bold text-gray-500">#{item.rank}</span>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{item.rep.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-600">
                      <span className="font-bold text-gray-900">{item.closedLeads}</span> closed
                    </span>
                    {!isTopThree && (
                      <span className="text-sm text-gray-600">
                        <span className="font-bold text-gray-900">{formatCurrency(item.totalRevenue)}</span> revenue
                      </span>
                    )}
                  </div>
                </div>

                {isTopThree && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gradient">{formatCurrency(item.totalRevenue)}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Total Revenue</div>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="p-8 rounded-2xl border-0 shadow-medium bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-teal">
            <Crown size={28} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Top Rep Bonus</h3>
          <p className="text-gray-600 mt-2">
            The #1 rep each month wins a <span className="font-bold text-teal-600">$500 bonus</span>!
          </p>
        </div>
      </Card>
    </div>
  )
}
