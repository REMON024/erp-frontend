'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, MapPin, Building2, Users, TrendingUp } from 'lucide-react'

type ProjectStatus = 'planning' | 'active' | 'completed' | 'on_hold'

interface HousingProject {
  id: string; code: string; name: string; location: string
  status: ProjectStatus; units_total: number; units_sold: number
  investment: number; cost_spent: number; budget: number
  start_date: string; est_completion: string; progress: number
  description: string
}

const PROJECTS: HousingProject[] = [
  {
    id: 'p1', code: 'BLK-A-001',
    name: 'Block-A Residential', location: 'Mirpur 12, Dhaka',
    status: 'completed', units_total: 12, units_sold: 10,
    investment: 12000000, cost_spent: 8500000, budget: 9000000,
    start_date: '2024-06-01', est_completion: '2025-06-30', progress: 100,
    description: '6-storey residential building with 12 apartments (2–3 BHK)',
  },
  {
    id: 'p2', code: 'BLK-B-001',
    name: 'Block-B Residential', location: 'Mohammadpur, Dhaka',
    status: 'completed', units_total: 8, units_sold: 6,
    investment: 8000000, cost_spent: 6200000, budget: 6500000,
    start_date: '2024-08-01', est_completion: '2025-08-31', progress: 100,
    description: '5-storey residential building with 8 apartments',
  },
  {
    id: 'p3', code: 'BLK-C-001',
    name: 'Block-C Residential', location: 'Uttara Sector 7, Dhaka',
    status: 'active', units_total: 16, units_sold: 4,
    investment: 15000000, cost_spent: 11000000, budget: 14000000,
    start_date: '2025-01-01', est_completion: '2026-06-30', progress: 65,
    description: '8-storey luxury residential building with 16 apartments',
  },
  {
    id: 'p4', code: 'BLK-D-001',
    name: 'Block-D Residential', location: 'Bashundhara R/A, Dhaka',
    status: 'planning', units_total: 10, units_sold: 2,
    investment: 5000000, cost_spent: 2100000, budget: 10000000,
    start_date: '2025-09-01', est_completion: '2027-03-31', progress: 18,
    description: '7-storey modern residential building with 10 apartments',
  },
]

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning:  'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  on_hold:   'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
}

function fmt(n: number) { return `৳${(n / 100000).toFixed(1)}L` }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  name:           z.string().min(1, 'Required'),
  code:           z.string().min(1, 'Required'),
  location:       z.string().min(1, 'Required'),
  units_total:    z.coerce.number().min(1, 'Required'),
  budget:         z.coerce.number().min(1, 'Required'),
  start_date:     z.string().min(1, 'Required'),
  est_completion: z.string().min(1, 'Required'),
  description:    z.string().optional(),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: HousingProject) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { start_date: new Date().toISOString().split('T')[0] },
  })
  return (
    <Modal open onClose={onClose} title="New Housing Project" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({
          id: `p${Date.now()}`, ...d,
          status: 'planning', units_sold: 0,
          investment: 0, cost_spent: 0, progress: 0,
          description: d.description ?? '',
        })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project Name</label>
            <input {...register('name')} className={inp} placeholder="Block-E Residential" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Project Code</label>
            <input {...register('code')} className={inp} placeholder="BLK-E-001" />
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Location</label>
          <input {...register('location')} className={inp} placeholder="Area, Dhaka" />
          {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Total Units</label>
            <input type="number" {...register('units_total')} className={inp} placeholder="10" />
            {errors.units_total && <p className="text-xs text-red-600 mt-1">{errors.units_total.message}</p>}
          </div>
          <div>
            <label className={lbl}>Budget (৳)</label>
            <input type="number" {...register('budget')} className={inp} placeholder="10000000" />
            {errors.budget && <p className="text-xs text-red-600 mt-1">{errors.budget.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Start Date</label>
            <input type="date" {...register('start_date')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Est. Completion</label>
            <input type="date" {...register('est_completion')} className={inp} />
          </div>
        </div>
        <div>
          <label className={lbl}>Description</label>
          <input {...register('description')} className={inp} placeholder="Brief project description" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Create Project</button>
        </div>
      </form>
    </Modal>
  )
}

function ProjectCard({ project }: { project: HousingProject }) {
  const budgetPct = project.budget > 0 ? Math.round((project.cost_spent / project.budget) * 100) : 0
  const salesPct  = project.units_total > 0 ? Math.round((project.units_sold / project.units_total) * 100) : 0
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-mono">{project.code}</p>
          <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
          <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5"><MapPin className="w-3 h-3" />{project.location}</p>
        </div>
        <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLORS[project.status]}`}>
          {project.status.replace('_', ' ')}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-4 line-clamp-2">{project.description}</p>

      {/* Progress */}
      <div className="space-y-2.5 mb-4">
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Construction Progress</span><span className="font-medium">{project.progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full">
            <div className={`h-1.5 rounded-full ${project.progress === 100 ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Budget Used</span><span className="font-medium">{budgetPct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full">
            <div className={`h-1.5 rounded-full ${budgetPct > 90 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>{fmt(project.cost_spent)}</span>
            <span>{fmt(project.budget)}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 text-xs"><Building2 className="w-3 h-3" />Units</div>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{project.units_sold}/{project.units_total}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 text-xs"><TrendingUp className="w-3 h-3" />Invested</div>
          <p className="text-sm font-bold text-blue-700 mt-0.5">{fmt(project.investment)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Completion</p>
          <p className="text-xs font-medium text-gray-700 mt-0.5">{project.est_completion}</p>
        </div>
      </div>
    </div>
  )
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<HousingProject[]>(PROJECTS)
  const [showAdd, setShowAdd]   = useState(false)
  const [filterStatus, setFS]   = useState<string>('')

  const displayed = filterStatus ? projects.filter(p => p.status === filterStatus) : projects

  const activeCount    = projects.filter(p => p.status === 'active').length
  const completedCount = projects.filter(p => p.status === 'completed').length
  const totalUnits     = projects.reduce((s, p) => s + p.units_total, 0)
  const soldUnits      = projects.reduce((s, p) => s + p.units_sold, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Housing Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all residential development projects</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Projects</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{projects.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{completedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Units Sold</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{soldUnits} / {totalUnits}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['', 'active', 'planning', 'completed', 'on_hold'] as const).map(s => (
          <button key={s} onClick={() => setFS(s)}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium capitalize ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Project cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayed.map(p => <ProjectCard key={p.id} project={p} />)}
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={p => setProjects(prev => [p, ...prev])} />}
    </div>
  )
}
