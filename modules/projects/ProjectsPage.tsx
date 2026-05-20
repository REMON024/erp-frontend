'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { Project, PaginatedResponse, ProjectStatus } from '@/types'
import { formatCurrency, formatDate, formatPercent } from '@/utils/format'
import { cn } from '@/utils/cn'
import { Modal } from '@/components/ui/Modal'
import { ProjectForm } from './ProjectForm'
import { Plus, Search, FolderOpen } from 'lucide-react'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning:  'bg-slate-100 text-slate-600',
  active:    'bg-green-100 text-green-700',
  on_hold:   'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}

function useProjects(filters: { status?: string; search?: string }) {
  return useQuery<PaginatedResponse<Project>>({
    queryKey: ['projects', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.search) params.set('search', filters.search)
      return api.get(`/projects?${params}`).then((r) => r.data)
    },
  })
}

function ProjectCard({ project }: { project: Project }) {
  const budgetPct = Math.round((project.spent / project.budget) * 100)
  return (
    <Link href={`/projects/${project.id}`} className="block bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <p className="text-xs text-slate-400 font-mono">{project.code}</p>
          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{project.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{project.client_name} · {project.location}</p>
        </div>
        <span className={cn('shrink-0 text-xs px-2 py-0.5 rounded-full font-medium capitalize', STATUS_COLORS[project.status])}>
          {project.status.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-2.5 mb-4">
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progress</span><span className="font-medium">{formatPercent(project.progress)}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full">
            <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Budget</span><span className="font-medium">{formatPercent(budgetPct)}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full">
            <div className={cn('h-1.5 rounded-full', budgetPct > 90 ? 'bg-red-500' : 'bg-green-500')} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-0.5">
            <span>{formatCurrency(project.spent)}</span>
            <span>{formatCurrency(project.budget)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
        <span>{formatDate(project.start_date)}</span>
        <span>{formatDate(project.end_date)}</span>
      </div>
    </Link>
  )
}

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
]

export function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const { data, isLoading } = useProjects({ search, status })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} projects total</p>
        </div>
        <button onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
        </div>
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button key={s.value} onClick={() => setStatus(s.value)}
              className={cn('px-3 py-2 text-xs font-medium rounded-lg transition-colors',
                status === s.value ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50')}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="h-52 bg-slate-200 rounded-xl" />)}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <FolderOpen className="w-10 h-10 mb-2" />
          <p className="text-sm">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.data.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Project" size="lg">
        <ProjectForm onSuccess={() => setNewOpen(false)} onCancel={() => setNewOpen(false)} />
      </Modal>
    </div>
  )
}
