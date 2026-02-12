import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Trophy, Medal, Award } from 'lucide-react'

export default function LeaderboardPage() {
  const leaderboard = [
    { rank: 1, name: 'Andrew Tesauro', closes: 32, revenue: 9568, trend: '+15%', icon: Trophy, color: 'text-yellow-500' },
    { rank: 2, name: 'Sarah Johnson', closes: 28, revenue: 8372, trend: '+12%', icon: Medal, color: 'text-gray-400' },
    { rank: 3, name: 'Jared Kolsun', closes: 24, revenue: 7176, trend: '+8%', icon: Award, color: 'text-amber-600' },
    { rank: 4, name: 'Mike Davis', closes: 18, revenue: 5382, trend: '+5%' },
    { rank: 5, name: 'Lisa Chen', closes: 15, revenue: 4485, trend: '+3%' },
  ]

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-gray-500 mt-1">This month's top performers</p>
      </div>

      <div className="grid gap-4">
        {leaderboard.map((rep) => {
          const Icon = rep.icon || Award
          const isTopThree = rep.rank <= 3
          
          return (
            <Card 
              key={rep.rank} 
              className={`p-6 ${isTopThree ? 'border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-bold ${rep.color || 'text-gray-400'}`}>
                    #{rep.rank}
                  </div>
                  {isTopThree && <Icon size={24} className={rep.color} />}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{rep.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-600">
                      <span className="font-semibold">{rep.closes}</span> closes
                    </span>
                    <span className="text-sm text-gray-600">
                      <span className="font-semibold">{formatCurrency(rep.revenue)}</span> revenue
                    </span>
                    <Badge variant={rep.rank <= 3 ? 'default' : 'secondary'} className="text-xs">
                      {rep.trend}
                    </Badge>
                  </div>
                </div>

                {isTopThree && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(rep.revenue)}</div>
                    <div className="text-xs text-gray-500">Total Revenue</div>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="text-center">
          <Trophy size={48} className="text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Top Rep Bonus</h3>
          <p className="text-gray-600 mt-1">
            The #1 rep each month wins a $500 bonus!
          </p>
        </div>
      </Card>
    </div>
  )
}
