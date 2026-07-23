'use client'
import { useEffect, useState, useCallback } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, AlertCircle, RefreshCw, Clock, CheckCircle2, Eye, Circle } from 'lucide-react'
import api from '@/lib/api'
import type { Task, TaskStatus, TaskPriority } from '@/types'

const COLUMNS: { id: TaskStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { id: 'pending',     label: 'Pending',     color: 'bg-surface-muted border-border-default',   icon: <Circle className="w-4 h-4 text-content-muted" /> },
  { id: 'in_progress', label: 'In Progress', color: 'bg-primary/10 border-blue-200',    icon: <Clock className="w-4 h-4 text-primary" /> },
  { id: 'review',      label: 'Review',      color: 'bg-amber-50 border-amber-200',  icon: <Eye className="w-4 h-4 text-amber-500" /> },
  { id: 'done',        label: 'Done',        color: 'bg-green-50 border-green-200',  icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
]

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:      'bg-surface-muted text-content-muted',
  medium:   'bg-primary/10 text-primary',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  title:       z.string().min(1, 'Required'),
  description: z.string().optional(),
  project_id:  z.string().min(1, 'Required'),
  assigned_to: z.string().min(1, 'Required'),
  priority:    z.enum(['low', 'medium', 'high', 'critical']),
  start_date:  z.string().min(1, 'Required'),
  due_date:    z.string().min(1, 'Required'),
})
type Form = z.infer<typeof schema>

function TaskModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { priority: 'medium', start_date: new Date().toISOString().split('T')[0] },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      await api.post('/tasks', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.message ?? 'Failed to create task')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="New Task" size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className={lbl}>Title</label>
          <input {...register('title')} className={inp} placeholder="Task title" />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <label className={lbl}>Description</label>
          <textarea {...register('description')} className={inp} rows={2} placeholder="Optional description" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project ID</label>
            <input {...register('project_id')} className={inp} placeholder="p1" />
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Assign To (User ID)</label>
            <input {...register('assigned_to')} className={inp} placeholder="u1" />
            {errors.assigned_to && <p className="text-xs text-red-600 mt-1">{errors.assigned_to.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Priority</label>
            <Select {...register('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <div>
            <label className={lbl}>Start Date</label>
            <DateField {...register('start_date')} />
          </div>
          <div>
            <label className={lbl}>Due Date</label>
            <DateField {...register('due_date')} />
            {errors.due_date && <p className="text-xs text-red-600 mt-1">{errors.due_date.message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (id: string, status: TaskStatus) => void }) {
  const overdue = task.status !== 'done' && task.due_date < new Date().toISOString().split('T')[0]
  const next: Record<TaskStatus, TaskStatus | null> = {
    pending: 'in_progress', in_progress: 'review', review: 'done', done: null,
  }
  return (
    <div className="bg-surface rounded-lg border border-border-default p-3 shadow-sm space-y-2">
      <p className="text-sm font-medium text-content leading-tight">{task.title}</p>
      {task.description && <p className="text-xs text-content-muted line-clamp-2">{task.description}</p>}
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
        <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-content-muted'}`}>
          {overdue ? 'Overdue ' : ''}{task.due_date}
        </span>
      </div>
      {task.progress > 0 && (
        <div className="h-1 bg-surface-muted rounded-full">
          <div className="h-1 bg-primary rounded-full" style={{ width: `${task.progress}%` }} />
        </div>
      )}
      {next[task.status] && (
        <button
          onClick={() => onStatusChange(task.id, next[task.status]!)}
          className="text-xs text-primary hover:underline"
        >
          Move to {next[task.status]!.replace('_', ' ')} →
        </button>
      )}
    </div>
  )
}

export function TasksPage() {
  const [tasks,   setTasks]   = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [project, setProject] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get('/tasks', { params: { project_id: project || undefined } })
      setTasks(res.data.data ?? res.data)
    } catch {
      setError('Failed to load tasks.')
    } finally { setLoading(false) }
  }, [project])

  useEffect(() => { load() }, [load])

  const moveTask = async (id: string, status: TaskStatus) => {
    try {
      await api.put(`/tasks/${id}`, { status })
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    } catch { /* ignore */ }
  }

  const counts = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id).length
    return acc
  }, {} as Record<TaskStatus, number>)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content">Task Management</h1>
          <p className="text-sm text-content-muted mt-0.5">Track tasks across all projects</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={project} onChange={e => setProject(e.target.value)}
            placeholder="Filter by project ID"
            className="border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none w-44"
          />
          <button onClick={load} className="p-2 border border-border-default rounded-lg hover:bg-surface-muted text-content-muted">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(col => (
          <div key={col.id} className="bg-surface rounded-xl border border-border-default p-4 flex items-center gap-3">
            {col.icon}
            <div>
              <p className="text-xs text-content-muted">{col.label}</p>
              <p className="text-2xl font-bold text-content">{counts[col.id] ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Kanban */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(col => (
          <div key={col.id} className={`rounded-xl border-2 ${col.color} p-3 space-y-3 min-h-[300px]`}>
            <div className="flex items-center gap-2">
              {col.icon}
              <span className="text-sm font-semibold text-content">{col.label}</span>
              <span className="ml-auto text-xs bg-surface border border-border-default rounded-full px-2 py-0.5 font-medium">
                {counts[col.id] ?? 0}
              </span>
            </div>
            {loading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-20 bg-surface rounded-lg border border-border-default animate-pulse" />
                ))
              : tasks.filter(t => t.status === col.id).map(t => (
                  <TaskCard key={t.id} task={t} onStatusChange={moveTask} />
                ))
            }
          </div>
        ))}
      </div>

      {showAdd && <TaskModal onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  )
}
