'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, MapPin, Building2, TrendingUp, Edit2, AlertTriangle, Package, ClipboardList, CheckCircle2, Ruler } from 'lucide-react'
import { ProjectSetupChecklist } from './ProjectSetupChecklist'
import { AreaBreakdownFields } from '@/components/ui/AreaBreakdownFields'
import { formatArea } from '@/utils/format'
import api from '@/lib/api'

interface Project {
  id: number; projectCode: string; projectName: string
  projectType?: string; landArea?: number; address?: string
  areaSqFt?: number; commonAreaSqFt?: number; serviceAreaSqFt?: number; netAreaSqFt?: number
  startDate?: string; endDate?: string
  estimatedCost?: number; estimatedRevenue?: number; status: string
}

const STATUS_COLORS: Record<string, string> = {
  Planning:  'bg-surface-muted text-content-muted',
  Active:    'bg-success/10 text-success',
  OnHold:    'bg-warning/15 text-warning',
  Completed: 'bg-primary/10 text-primary',
}
const STATUSES = ['Planning', 'Active', 'OnHold', 'Completed']

function fmt(n?: number) { return n ? `৳${(n / 100000).toFixed(1)}L` : '—' }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  projectCode:      z.string().min(1, 'Required'),
  projectName:      z.string().min(1, 'Required'),
  projectType:      z.string().optional(),
  address:          z.string().optional(),
  landArea:         z.coerce.number().min(0).optional(),
  areaSqFt:         z.coerce.number().min(0).optional(),
  commonAreaSqFt:   z.coerce.number().min(0).optional(),
  serviceAreaSqFt:  z.coerce.number().min(0).optional(),
  startDate:        z.string().optional(),
  endDate:          z.string().optional(),
  estimatedCost:    z.coerce.number().optional(),
  estimatedRevenue: z.coerce.number().optional(),
  status:           z.string().min(1, 'Required'),
}).refine(
  d => d.areaSqFt == null || (d.commonAreaSqFt ?? 0) + (d.serviceAreaSqFt ?? 0) <= d.areaSqFt,
  { message: 'Common + service area cannot exceed the total area.', path: ['areaSqFt'] },
)
type Form = z.infer<typeof schema>

function ProjectModal({ project, onClose, onSaved }: {
  project?: Project; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!project
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: project ?? { status: 'Planning' },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      if (isEdit) await api.put(`/projects/${project!.id}`, d)
      else        await api.post('/projects', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Project' : 'New Housing Project'} size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project Name <span className="text-danger">*</span></label>
            <input {...register('projectName')} className={inp} placeholder="Block-E Residential" />
            {errors.projectName && <p className="text-xs text-danger mt-1">{errors.projectName.message}</p>}
          </div>
          <div>
            <label className={lbl}>Project Code <span className="text-danger">*</span></label>
            <input {...register('projectCode')} className={inp} placeholder="BLK-E-001" />
            {errors.projectCode && <p className="text-xs text-danger mt-1">{errors.projectCode.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project Type</label>
            <input {...register('projectType')} className={inp} placeholder="Residential" />
          </div>
          <div>
            <label className={lbl}>Status <span className="text-danger">*</span></label>
            <Select {...register('status')}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Address</label>
            <input {...register('address')} className={inp} placeholder="Area, Dhaka" />
          </div>
          <div>
            {/* Land plot footprint — distinct from the built-up area below. */}
            <label className={lbl}>Land Area (sqft)</label>
            <input type="number" {...register('landArea')} className={inp} placeholder="16730" min={0} />
          </div>
        </div>

        <AreaBreakdownFields
          register={register}
          areaSqFt={watch('areaSqFt')}
          commonAreaSqFt={watch('commonAreaSqFt')}
          serviceAreaSqFt={watch('serviceAreaSqFt')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Estimated Cost (৳)</label>
            <input type="number" {...register('estimatedCost')} className={inp} placeholder="10000000" />
          </div>
          <div>
            <label className={lbl}>Estimated Revenue (৳)</label>
            <input type="number" {...register('estimatedRevenue')} className={inp} placeholder="14000000" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Start Date</label>
            <DateField {...register('startDate')} />
          </div>
          <div>
            <label className={lbl}>Est. Completion</label>
            <DateField {...register('endDate')} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ProjectCard({ project, onEdit, onSetup }: { project: Project; onEdit: () => void; onSetup: () => void }) {
  return (
    <div className="bg-surface rounded-xl border border-border-default p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <p className="text-xs text-content-muted font-mono">{project.projectCode}</p>
          <h3 className="font-semibold text-content truncate">{project.projectName}</h3>
          {project.address && (
            <p className="flex items-center gap-1 text-xs text-content-muted mt-0.5"><MapPin className="w-3 h-3" />{project.address}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[project.status] ?? 'bg-surface-muted text-content-muted'}`}>
            {project.status}
          </span>
          <button onClick={onEdit} className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg" title="Edit project">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onSetup} className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg" title="Setup checklist">
            <ClipboardList className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border-default">
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <TrendingUp className="w-3.5 h-3.5 text-info" />
          <span>Cost: <span className="font-medium text-content">{fmt(project.estimatedCost)}</span></span>
        </div>
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <Building2 className="w-3.5 h-3.5 text-success" />
          <span>Revenue: <span className="font-medium text-content">{fmt(project.estimatedRevenue)}</span></span>
        </div>
        {/* Gross and net built-up area; the full breakdown lives in the modal. */}
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <Ruler className="w-3.5 h-3.5 text-info" />
          <span>Area: <span className="font-medium text-content tabular-nums">{formatArea(project.areaSqFt)}</span></span>
        </div>
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <Ruler className="w-3.5 h-3.5 text-content-muted" />
          <span>Net: <span className="font-medium text-content tabular-nums">{formatArea(project.netAreaSqFt)}</span></span>
        </div>
      </div>
      <button
        onClick={onSetup}
        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary font-medium border border-primary/20 hover:border-primary/20 bg-primary/10 hover:bg-primary/10 rounded-lg py-1.5 transition-colors"
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> View Setup Checklist
      </button>
    </div>
  )
}

export function ProjectsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [modal,    setModal]    = useState<'add' | 'edit' | null>(null)
  const [target,   setTarget]   = useState<Project | null>(null)
  const [checklist, setChecklist] = useState<Project | null>(null)

  const { data: projects = [], isLoading, error, refetch } = useApiData<Project[]>({
    url: '/projects',
    params: { search: search || undefined, status: status || undefined },
    queryKey: ['projects', search, status],
  })

  const { data: estimates = [] } = useApiData<{ projectId: number; totalEstimated: number; totalActual: number }[]>({
    url: '/cost-estimates',
    params: { status: 'Approved' },
    queryKey: ['projects-estimates'],
  })

  const { data: matSummary } = useApiData<{ overBudgetCount: number; atRiskCount: number; projectsAffected: number }>({
    url: '/cost-estimates/material-budget-summary',
    queryKey: ['material-budget-summary'],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['projects'] })
    qc.invalidateQueries({ queryKey: ['projects-list'] })
    qc.invalidateQueries({ queryKey: ['project-setup-checklist'] })
  }

  const activeCount    = projects.filter(p => p.status === 'Active').length
  const completedCount = projects.filter(p => p.status === 'Completed').length

  const overBudgetProjects = estimates.filter(e => e.totalActual > e.totalEstimated && e.totalActual > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Housing Projects"
        subtitle="Track all residential development projects"
        action={
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Project
          </button>
        }
      />

      {overBudgetProjects.length > 0 && (
        <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
          <span className="text-danger text-lg shrink-0">⚠</span>
          <div>
            <p className="text-sm font-semibold text-danger">Budget Overrun Alert</p>
            <p className="text-xs text-danger mt-0.5">
              {overBudgetProjects.length} approved estimate(s) have exceeded their budget. Visit the{' '}
              <a href="/budget" className="underline font-medium">Budget Tracker</a> for details.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Total Projects</p>
          <p className="text-2xl font-bold text-primary mt-1">{projects.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Active</p>
          <p className="text-2xl font-bold text-success mt-1">{activeCount}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Completed</p>
          <p className="text-2xl font-bold text-primary mt-1">{completedCount}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Planning</p>
          <p className="text-2xl font-bold text-content-muted mt-1">{projects.filter(p => p.status === 'Planning').length}</p>
        </div>
      </div>

      {/* Material budget health widget */}
      {matSummary && (matSummary.overBudgetCount > 0 || matSummary.atRiskCount > 0) && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${matSummary.overBudgetCount > 0 ? 'bg-danger/10 border-danger/20' : 'bg-warning/15 border-warning/20'}`}>
          <div className={`p-2 rounded-lg shrink-0 ${matSummary.overBudgetCount > 0 ? 'bg-danger/10' : 'bg-warning/15'}`}>
            <Package className={`w-4 h-4 ${matSummary.overBudgetCount > 0 ? 'text-danger' : 'text-warning'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${matSummary.overBudgetCount > 0 ? 'text-danger' : 'text-warning'}`}>
              Material Budget Alert
            </p>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {matSummary.overBudgetCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-danger">
                  <AlertTriangle className="w-3 h-3" />
                  <strong>{matSummary.overBudgetCount}</strong> material{matSummary.overBudgetCount !== 1 ? 's' : ''} over budget
                </span>
              )}
              {matSummary.atRiskCount > 0 && (
                <span className="text-xs text-warning">
                  <strong>{matSummary.atRiskCount}</strong> at risk (&gt;80% committed)
                </span>
              )}
              <span className="text-xs text-content-muted">
                across {matSummary.projectsAffected} project{matSummary.projectsAffected !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <a href="/material-budget"
            className={`text-xs font-medium shrink-0 underline ${matSummary.overBudgetCount > 0 ? 'text-danger' : 'text-warning'}`}>
            Review →
          </a>
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search projects…" onRefresh={refetch}>
        <Select value={status} onChange={e => setStatus(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load projects.' : null} onRetry={refetch}
        empty={projects.length === 0} emptyMessage="No projects yet. Create your first project.">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={() => { setTarget(p); setModal('edit') }}
              onSetup={() => setChecklist(p)}
            />
          ))}
        </div>
      </DataState>

      {modal === 'add' && <ProjectModal onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <ProjectModal project={target} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}

      {checklist && (
        <Modal open onClose={() => setChecklist(null)} title="Project Setup Checklist" size="md">
          <ProjectSetupChecklist projectId={checklist.id} onClose={() => setChecklist(null)} />
        </Modal>
      )}
    </div>
  )
}
