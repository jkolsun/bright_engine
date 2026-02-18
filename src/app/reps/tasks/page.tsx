'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Phone, AlertCircle, Loader2, ListChecks } from 'lucide-react'
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <ListChecks size={22} className="text-white" />
          </div>
          <p className="text-gray-500 font-medium">Loading tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        <p className="text-gray-500 mt-1 text-sm">{tasks.length} pending task{tasks.length !== 1 ? 's' : ''}</p>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-16 text-center rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">All caught up!</h3>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">No pending tasks. Check back later or head to the dialer.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className={`p-6 rounded-2xl border shadow-medium transition-all duration-200 hover:shadow-lg ${
              task.priority === 'URGENT'
                ? 'border-red-200 bg-gradient-to-r from-red-50 to-white'
                : task.priority === 'HIGH'
                ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-white'
                : 'border-0 bg-white/80 backdrop-blur-sm'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      task.priority === 'URGENT' ? 'bg-red-100 text-red-700 border-red-200' :
                      task.priority === 'HIGH' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      'bg-teal-50 text-teal-700 border-teal-200'
                    }`}>
                      {task.priority}
                    </Badge>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-gray-100 text-gray-600 uppercase tracking-wider">
                      {task.taskType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">{task.lead?.companyName || 'Unknown'}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">{task.lead?.firstName} {task.lead?.lastName} — <a href={`tel:${task.lead?.phone}`} className="text-teal-600 hover:text-teal-700 font-medium">{task.lead?.phone}</a></p>
                  {task.notes && <p className="text-sm text-gray-500 mt-2 bg-gray-50 rounded-xl px-3 py-2">{task.notes}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => window.open(`tel:${task.lead?.phone}`)}
                    className="rounded-xl gradient-primary text-white border-0 shadow-teal">
                    <Phone size={14} className="mr-1.5" /> Call
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => completeTask(task.id, 'COMPLETED')}
                    className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <CheckCircle size={14} className="mr-1.5" /> Done
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
