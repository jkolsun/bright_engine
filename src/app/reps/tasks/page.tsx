'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Phone, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTasks() }, [])

  const loadTasks = async () => {
    try {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      const res = await fetch(`/api/rep-tasks?repId=${meData.user.id}&status=PENDING,IN_PROGRESS`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (e) { console.error('Failed to load tasks:', e) }
    finally { setLoading(false) }
  }

  const completeTask = async (taskId: string, outcome: string) => {
    try {
      await fetch(`/api/rep-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', outcome, completedAt: new Date().toISOString() })
      })
      setTasks(tasks.filter(t => t.id !== taskId))
    } catch (e) { console.error(e) }
  }

  if (loading) return <div className="p-8 text-center">Loading tasks...</div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        <p className="text-gray-500 mt-1">{tasks.length} pending tasks</p>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold">All caught up!</h3>
          <p className="text-gray-600 mt-2">No pending tasks. Check back later or head to the dialer.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className={`p-6 ${task.priority === 'URGENT' ? 'border-red-300 bg-red-50' : task.priority === 'HIGH' ? 'border-amber-300 bg-amber-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={task.priority === 'URGENT' ? 'destructive' : 'default'}>{task.priority}</Badge>
                    <Badge variant="outline">{task.taskType.replace(/_/g, ' ')}</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900">{task.lead?.companyName || 'Unknown'}</h3>
                  <p className="text-sm text-gray-600">{task.lead?.firstName} {task.lead?.lastName} — {task.lead?.phone}</p>
                  {task.notes && <p className="text-sm text-gray-500 mt-1">{task.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => window.open(`tel:${task.lead?.phone}`)}>
                    <Phone size={14} className="mr-1" /> Call
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => completeTask(task.id, 'COMPLETED')}>
                    <CheckCircle size={14} className="mr-1" /> Done
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}