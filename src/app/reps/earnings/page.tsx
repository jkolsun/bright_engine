import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, TrendingUp, Calendar, Award } from 'lucide-react'

export default function EarningsPage() {
  const earnings = {
    thisMonth: 4186,
    pending: 1196,
    paid: 2990,
    commission: 0.50
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
        <p className="text-gray-500 mt-1">Track your commissions and payouts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">This Month</span>
            <DollarSign size={20} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.thisMonth)}</div>
          <div className="text-xs text-green-600 mt-1">+{earnings.commission * 100}% commission rate</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Pending</span>
            <Calendar size={20} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.pending)}</div>
          <div className="text-xs text-gray-500 mt-1">Awaiting payment</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Paid</span>
            <Award size={20} className="text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.paid)}</div>
          <div className="text-xs text-gray-500 mt-1">In your account</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Growth</span>
            <TrendingUp size={20} className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">+42%</div>
          <div className="text-xs text-gray-500 mt-1">vs last month</div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Payouts</h3>
        <div className="text-center text-gray-500 py-12">
          Payout history will appear here
        </div>
      </Card>
    </div>
  )
}
