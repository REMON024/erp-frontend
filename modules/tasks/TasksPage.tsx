'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { cn } from '@/utils/cn'
import { formatDate, isOverdue } from '@/utils/format'
import { TaskDrawer } from './TaskDrawer'
import { CheckSquare, Clock, AlertTriangle, Plus } from 'lucide-react'

const STATUS_COLS: { id: TaskStatus; label: string; color: string; header: string }[] = [
  { id: 'pending',     label: 'Pending',     color: 'bg-slate-50',  header: 'bg-slate-200 text-slate-600' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50',   header: 'bg-blue-200 text-blue-800' },
  { id: 'review',      label: 'Review',      color: 'bg-amber-50',  header: 'bg-amber-200 text-amber-800' },
  { id: 'done',        label: 'Done',        color: 'bg-green-50',  header: 'bg-green-200 text-green-800' },
]

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:      'bg-slate-100 text-slate-500',
  medium:   'bg-blue-100 text-blue-600',
  high:     'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
}

function useTasks() {
  return useQuery<{ data: Task[] }>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data),
  })
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const overdue = isOverdue(task.due_date) && task.status !== 'done'
  const done = task.subtasks?.filter((s) => s.done).length ?? 0
  const total = task.subtasks?.length ?? 0

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-slate-800 leading-snug">{task.title}</p>
        <span className={cn('shrink-0 text-xs px-1.5 py-0.5 rounded capitalize font-medium', PRIORITY_COLORS[task.priority])}>
          {task.priority}
        </span>
      </div>

      {total > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          <CheckSquare className="w-3 h-3 text-slate-400" />
          <span className="text-xs text-slate-400">{done}/{total}</span>
          <div className="flex-1 h-1 bg-slate-100 rounded-full">
            <div className="h-1 bg-green-400 rounded-full" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {task.progress > 0 && task.progress < 100 && (
        <div className="mb-2">
          <div className="h-1 bg-slate-100 rounded-full">
            <div className="h-1 bg-blue-500 rounded-full" style={{ width: `${task.progress}%` }} />
          </div>
        </div>
      )}

      <div className={cn('flex items-center gap-1 text-xs', overdue ? 'text-red-500' : 'text-slate-400')}>
        {overdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        <span>{formatDate(task.due_date)}{overdue ? ' · Overdue' : ''}</span>
      </div>
    </div>
  )
}

export function TasksPage() {
  const { data, isLoading } = useTasks()
  const [selected, setSelected] = useState<Task | null>(null)
  const tasks = data?.data ?? []

  const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status)

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="h-96 bg-slate-200 rounded-xl" />)}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tasks</h1>
            <p className="text-sm text-slate-500">{tasks.length} tasks · click any card to open details</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLS.map((col) => {
            const colTasks = byStatus(col.id)
            return (
              <div key={col.id} className={cn('rounded-xl p-3', col.color)}>
                <div className={cn('flex items-center justify-between mb-3 px-2 py-1.5 rounded-lg', col.header)}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide">{col.label}</h3>
                  <span className="text-xs font-bold">{colTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-24">
                  {colTasks.map((t) => (
                    <TaskCard key={t.id} task={t} onClick={() => setSelected(t)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <TaskDrawer task={selected} open={!!selected} onClose={() => setSelected(null)} />
    </>
  )
}
