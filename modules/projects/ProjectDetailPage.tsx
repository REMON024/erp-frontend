'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { Project } from '@/types'
import { formatCurrency, formatDate, formatPercent } from '@/utils/format'
import { cn } from '@/utils/cn'
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { ProjectForm } from './ProjectForm'
import { TeamTab } from './TeamTab'
import { DailyLogTab } from './DailyLogTab'
import { ArrowLeft, MapPin, Calendar, DollarSign, Edit, Trash2 } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  planning:  'bg-slate-100 text-slate-700',
  active:    'bg-green-100 text-green-700',
  on_hold:   'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}

function useProject(id: string) {
  return useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then((r) => r.data),
  })
}

// ─── Budget Tab ───────────────────────────────────────────────────────────────
function BudgetTab({ project }: { project: Project }) {
  const pct = Math.round((project.spent / project.budget) * 100)
  const remaining = project.budget - project.spent

  const breakdown = [
    { label: 'Labour',           amount: project.spent * 0.35 },
    { label: 'Materials',        amount: project.spent * 0.40 },
    { label: 'Equipment',        amount: project.spent * 0.12 },
    { label: 'Subcontractors',   amount: project.spent * 0.08 },
    { label: 'Miscellaneous',    amount: project.spent * 0.05 },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Budget',  value: formatCurrency(project.budget),  color: 'text-slate-900' },
          { label: 'Spent',         value: formatCurrency(project.spent),    color: 'text-red-600'   },
          { label: 'Remaining',     value: formatCurrency(remaining),         color: remaining < 0 ? 'text-red-600' : 'text-green-600' },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={cn('text-xl font-bold mt-1', c.color)}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600">Utilization</span>
          <span className="font-semibold">{formatPercent(pct)}</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full">
          <div className={cn('h-3 rounded-full transition-all', pct > 90 ? 'bg-red-500' : 'bg-blue-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h4 className="font-semibold text-slate-800 mb-4">Expenditure Breakdown</h4>
        <div className="space-y-3">
          {breakdown.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{b.label}</span>
                <span className="font-medium text-slate-800">{formatCurrency(b.amount)}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full">
                <div className="h-1.5 bg-blue-400 rounded-full" style={{ width: `${(b.amount / project.spent) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tasks Tab (summary) ──────────────────────────────────────────────────────
function TasksTab({ projectId }: { projectId: string }) {
  const { data } = useQuery({
    queryKey: ['tasks', { project_id: projectId }],
    queryFn: () => api.get(`/tasks?project_id=${projectId}`).then((r) => r.data),
  })

  const tasks = (data as { data: Array<{ id: string; title: string; status: string; priority: string; due_date: string }> })?.data ?? []

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-amber-100 text-amber-700',
    done: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-2">
      {tasks.length === 0 && <p className="text-sm text-slate-400">No tasks for this project.</p>}
      {tasks.map((t) => (
        <div key={t.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
          <span className="text-sm text-slate-800">{t.title}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{formatDate(t.due_date)}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-600')}>
              {t.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ProjectDetailPage({ id }: { id: string }) {
  const [editOpen, setEditOpen] = useState(false)
  const qc = useQueryClient()
  const { data: project, isLoading } = useProject(id)

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); window.history.back() },
  })

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 rounded-xl" />
        <div className="h-32 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    )
  }
  if (!project) return <p className="text-slate-500">Project not found.</p>

  const budgetPct = Math.round((project.spent / project.budget) * 100)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/projects" className="p-2 rounded-lg hover:bg-slate-100 transition-colors mt-0.5">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-400">{project.code}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', STATUS_COLORS[project.status])}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-slate-500 text-sm">{project.client_name}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button
            onClick={() => { if (confirm('Delete this project?')) deleteMutation.mutate() }}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Location</p>
            <p className="text-sm font-medium text-slate-800 truncate">{project.location}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Timeline</p>
            <p className="text-sm font-medium text-slate-800">{formatDate(project.start_date)} → {formatDate(project.end_date)}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Budget</p>
            <p className="text-sm font-medium text-slate-800">{formatCurrency(project.budget)}</p>
          </div>
        </div>
      </div>

      {/* Progress bars */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-slate-700">Progress</span>
            <span className="font-bold text-blue-600">{formatPercent(project.progress)}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full">
            <div className="h-3 bg-blue-500 rounded-full" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-slate-700">Budget Used</span>
            <span className={cn('font-bold', budgetPct > 90 ? 'text-red-600' : 'text-green-600')}>{formatPercent(budgetPct)}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full">
            <div className={cn('h-3 rounded-full transition-all', budgetPct > 90 ? 'bg-red-500' : 'bg-green-500')} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultTab="overview">
        <TabList>
          <Tab id="overview"  label="Overview" />
          <Tab id="tasks"     label="Tasks" />
          <Tab id="team"      label="Team" />
          <Tab id="budget"    label="Budget" />
          <Tab id="logs"      label="Daily Logs" />
        </TabList>

        <TabPanel id="overview">
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-600 space-y-2">
            <p><span className="font-medium text-slate-800">Client:</span> {project.client_name}</p>
            <p><span className="font-medium text-slate-800">Code:</span> {project.code}</p>
            <p><span className="font-medium text-slate-800">Location:</span> {project.location}</p>
            <p><span className="font-medium text-slate-800">Start:</span> {formatDate(project.start_date)}</p>
            <p><span className="font-medium text-slate-800">End:</span> {formatDate(project.end_date)}</p>
            <p><span className="font-medium text-slate-800">Status:</span> <span className="capitalize">{project.status.replace('_', ' ')}</span></p>
          </div>
        </TabPanel>

        <TabPanel id="tasks">
          <TasksTab projectId={id} />
        </TabPanel>

        <TabPanel id="team">
          <TeamTab projectId={id} />
        </TabPanel>

        <TabPanel id="budget">
          <BudgetTab project={project} />
        </TabPanel>

        <TabPanel id="logs">
          <DailyLogTab projectId={id} />
        </TabPanel>
      </Tabs>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Project" size="lg">
        <ProjectForm project={project} onSuccess={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} />
      </Modal>
    </div>
  )
}
