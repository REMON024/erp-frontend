'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Task, TaskPriority, TaskStatus } from '@/types'
import { Drawer } from '@/components/ui/Drawer'
import { cn } from '@/utils/cn'
import { formatDate, isOverdue } from '@/utils/format'
import { useAuthStore } from '@/store/auth.store'
import { MOCK_USERS } from '@/mocks/fixtures/users'
import api from '@/lib/api'
import { CheckSquare, Square, Send, Flag, Calendar, User, AlertTriangle } from 'lucide-react'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:      'text-slate-500 bg-slate-50 border-slate-200',
  medium:   'text-blue-600  bg-blue-50  border-blue-200',
  high:     'text-amber-600 bg-amber-50 border-amber-200',
  critical: 'text-red-600   bg-red-50   border-red-200',
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review',      label: 'Review' },
  { value: 'done',        label: 'Done' },
]

interface Props {
  task: Task | null
  open: boolean
  onClose: () => void
}

export function TaskDrawer({ task, open, onClose }: Props) {
  const [comment, setComment] = useState('')
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const updateTask = useMutation({
    mutationFn: (patch: Partial<Task>) => api.put(`/tasks/${task!.id}`, patch).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const toggleSubtask = useMutation({
    mutationFn: (subtaskId: string) => {
      const st = task!.subtasks?.find((s) => s.id === subtaskId)
      const updated = { subtasks: task!.subtasks?.map((s) => s.id === subtaskId ? { ...s, done: !s.done } : s) }
      return api.put(`/tasks/${task!.id}`, updated).then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const addComment = useMutation({
    mutationFn: () => api.post(`/tasks/${task!.id}/comments`, { text: comment, user_id: user?.id }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setComment('') },
  })

  if (!task) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>

  const assignee = MOCK_USERS.find((u) => u.id === task.assigned_to)
  const done = task.subtasks?.filter((s) => s.done).length ?? 0
  const total = task.subtasks?.length ?? 0
  const overdue = isOverdue(task.due_date) && task.status !== 'done'

  return (
    <Drawer open={open} onClose={onClose} title={task.title} width="w-[520px]">
      <div className="p-5 space-y-5">

        {/* Status + Priority */}
        <div className="flex gap-3">
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Status</p>
            <select
              value={task.status}
              onChange={(e) => updateTask.mutate({ status: e.target.value as TaskStatus })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Priority</p>
            <div className={cn('flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium', PRIORITY_COLORS[task.priority])}>
              <Flag className="w-3.5 h-3.5" />
              <span className="capitalize">{task.priority}</span>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <User className="w-3.5 h-3.5" /> Assigned to
            </div>
            <p className="text-sm font-medium text-slate-800">
              {assignee ? `${assignee.first_name} ${assignee.last_name}` : '—'}
            </p>
          </div>
          <div className={cn('rounded-lg p-3', overdue ? 'bg-red-50' : 'bg-slate-50')}>
            <div className={cn('flex items-center gap-1.5 text-xs mb-1', overdue ? 'text-red-500' : 'text-slate-500')}>
              {overdue ? <AlertTriangle className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
              Due date
            </div>
            <p className={cn('text-sm font-medium', overdue ? 'text-red-600' : 'text-slate-800')}>
              {formatDate(task.due_date)} {overdue && '(Overdue)'}
            </p>
          </div>
        </div>

        {/* Progress */}
        {task.progress > 0 && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Progress</span><span className="font-medium">{task.progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full">
              <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${task.progress}%` }} />
            </div>
            <input type="range" min={0} max={100} value={task.progress} step={5}
              onChange={(e) => updateTask.mutate({ progress: parseInt(e.target.value) })}
              className="w-full mt-2 accent-blue-600" />
          </div>
        )}

        {/* Description */}
        {task.description && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Description</p>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3">{task.description}</p>
          </div>
        )}

        {/* Subtasks */}
        {total > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Subtasks</p>
              <span className="text-xs text-slate-400">{done}/{total} done</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full mb-2">
              <div className="h-1 bg-green-500 rounded-full transition-all" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
            </div>
            <ul className="space-y-1.5">
              {task.subtasks?.map((st) => (
                <li key={st.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => toggleSubtask.mutate(st.id)}>
                  {st.done
                    ? <CheckSquare className="w-4 h-4 text-green-500 shrink-0" />
                    : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                  <span className={cn('text-sm', st.done ? 'line-through text-slate-400' : 'text-slate-700')}>{st.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Comments */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">
            Comments {task.comments && task.comments.length > 0 && `(${task.comments.length})`}
          </p>
          <div className="space-y-3 mb-3">
            {task.comments?.map((c) => {
              const author = MOCK_USERS.find((u) => u.id === c.user_id)
              return (
                <div key={c.id} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {author?.first_name?.[0]}{author?.last_name?.[0]}
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-slate-700">{author?.first_name} {author?.last_name}</span>
                    </div>
                    <p className="text-sm text-slate-600">{c.text}</p>
                  </div>
                </div>
              )
            })}
            {(!task.comments || task.comments.length === 0) && (
              <p className="text-xs text-slate-400">No comments yet.</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && comment.trim()) addComment.mutate() }}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => { if (comment.trim()) addComment.mutate() }}
              disabled={!comment.trim() || addComment.isPending}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </Drawer>
  )
}
