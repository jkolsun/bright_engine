import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, Clock } from 'lucide-react'

export default function TasksPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">Your daily follow-ups and action items</p>
        </div>
        <Button>Add Task</Button>
      </div>

      <div className="grid gap-4">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <Circle size={20} className="text-gray-400 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Follow up with ABC Roofing</h3>
              <p className="text-sm text-gray-600 mt-1">They viewed preview 3x - ready to close</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="destructive" className="text-xs">High Priority</Badge>
                <span className="text-xs text-gray-500">Due today at 2:00 PM</span>
              </div>
            </div>
            <Button size="sm">Complete</Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <Circle size={20} className="text-gray-400 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Send quote to Elite Plumbing</h3>
              <p className="text-sm text-gray-600 mt-1">They requested pricing info</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="text-xs">Normal</Badge>
                <span className="text-xs text-gray-500">Due tomorrow</span>
              </div>
            </div>
            <Button size="sm">Complete</Button>
          </div>
        </Card>

        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-start gap-4">
            <CheckCircle size={20} className="text-green-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Call Pro Painting - Completed</h3>
              <p className="text-sm text-gray-600 mt-1">Closed deal for $299</p>
              <span className="text-xs text-gray-500">Completed 2 hours ago</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
