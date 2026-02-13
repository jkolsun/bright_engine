import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock } from 'lucide-react'

export default function TasksPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">Your daily follow-ups and action items</p>
        </div>
      </div>

      <Card className="p-12">
        <div className="text-center space-y-4">
          <div className="inline-block p-4 bg-blue-100 rounded-full">
            <Clock size={32} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">No Tasks Yet</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Your assigned tasks will appear here. Check back later or contact your manager to assign tasks.
          </p>
        </div>
      </Card>
    </div>
  )
}
