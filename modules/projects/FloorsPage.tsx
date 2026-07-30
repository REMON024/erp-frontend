'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { AreaBreakdownFields } from '@/components/ui/AreaBreakdownFields'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Rows3, Home } from 'lucide-react'
import { formatArea } from '@/utils/format'
import api from '@/lib/api'

interface Project { id: number; projectName: string; projectCode: string }
interface Block   { id: number; projectId: number; name: string }
export interface Floor {
  id: number; projectId: number; projectName: string
  blockId: number; blockName: string
  name: string; floorNumber: number
  areaSqFt?: number; commonAreaSqFt?: number; serviceAreaSqFt?: number; netAreaSqFt?: number
  description?: string; unitCount: number
}

const schema = z.object({
  projectId:       z.coerce.number().min(1, 'Required'),
  blockId:         z.coerce.number().min(1, 'Required'),
  name:            z.string().min(1, 'Required'),
  floorNumber:     z.coerce.number().int().min(0, 'Must be 0 or more'),
  areaSqFt:        z.coerce.number().min(0).optional(),
  commonAreaSqFt:  z.coerce.number().min(0).optional(),
  serviceAreaSqFt: z.coerce.number().min(0).optional(),
  description:     z.string().optional(),
}).refine(
  d => d.areaSqFt == null || (d.commonAreaSqFt ?? 0) + (d.serviceAreaSqFt ?? 0) <= d.areaSqFt,
  { message: 'Common + service area cannot exceed the total area.', path: ['areaSqFt'] },
)
type Form = z.infer<typeof schema>

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

function FloorModal({ floor, projects, blocks, onClose, onSaved }: {
  floor?: Floor; projects: Project[]; blocks: Block[]; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!floor
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: floor
      ? { projectId: floor.projectId, blockId: floor.blockId, name: floor.name,
          floorNumber: floor.floorNumber, areaSqFt: floor.areaSqFt,
          commonAreaSqFt: floor.commonAreaSqFt, serviceAreaSqFt: floor.serviceAreaSqFt,
          description: floor.description }
      : {},
  })

  const selectedProject = watch('projectId')
  const eligibleBlocks  = blocks.filter(b => b.projectId === Number(selectedProject))

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      if (isEdit) await api.put(`/floors/${floor!.id}`, d)
      else        await api.post('/floors', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Floor' : 'Add Floor'} size="lg">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project <span className="text-danger">*</span></label>
            <Select
              {...register('projectId', {
                // Changing the project invalidates the chosen block, so clear it rather than
                // letting a block from the previous project survive.
                onChange: () => setValue('blockId', undefined as any, { shouldValidate: false }),
              })}
            >
              <option value="">Select project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
            </Select>
            {errors.projectId && <p className="text-xs text-danger mt-1">{errors.projectId.message}</p>}
          </div>
          <div>
            <label className={lbl}>Block <span className="text-danger">*</span></label>
            <Select {...register('blockId')} disabled={!selectedProject}>
              <option value="">{selectedProject ? 'Select block…' : 'Select a project first'}</option>
              {eligibleBlocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            {errors.blockId && <p className="text-xs text-danger mt-1">{errors.blockId.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Floor Name <span className="text-danger">*</span></label>
            <input {...register('name')} className={inp} placeholder="Level 3" />
            {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Floor No. <span className="text-danger">*</span></label>
            <input type="number" {...register('floorNumber')} className={inp} placeholder="3" min={0} />
            {errors.floorNumber && <p className="text-xs text-danger mt-1">{errors.floorNumber.message}</p>}
          </div>
        </div>

        <AreaBreakdownFields
          register={register}
          areaSqFt={watch('areaSqFt')}
          commonAreaSqFt={watch('commonAreaSqFt')}
          serviceAreaSqFt={watch('serviceAreaSqFt')}
        />

        <div>
          <label className={lbl}>Description</label>
          <textarea {...register('description')} className={inp} rows={2} placeholder="Short note about this floor…" />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Floor'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function FloorsPage() {
  const qc = useQueryClient()
  const [search,    setSearch]  = useState('')
  const [projectId, setProject] = useState('')
  const [blockId,   setBlock]   = useState('')
  const [modal,     setModal]   = useState<'add' | 'edit' | null>(null)
  const [target,    setTarget]  = useState<Floor | null>(null)

  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data: blocks = [] }   = useApiData<Block[]>({ url: '/blocks', queryKey: ['blocks-list'] })

  const { data: floors = [], isLoading, error, refetch } = useApiData<Floor[]>({
    url: '/floors',
    params: {
      search:    search    || undefined,
      projectId: projectId || undefined,
      blockId:   blockId   || undefined,
    },
    queryKey: ['floors', search, projectId, blockId],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['floors'] })
    qc.invalidateQueries({ queryKey: ['floors-list'] })
    // A block's floorCount changes with this write.
    qc.invalidateQueries({ queryKey: ['blocks'] })
  }

  const filterBlocks = projectId
    ? blocks.filter(b => b.projectId === Number(projectId))
    : blocks
  const totalUnits = floors.reduce((s, f) => s + f.unitCount, 0)
  const totalArea  = floors.reduce((s, f) => s + (f.areaSqFt ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Floors"
        subtitle="Manage the floors inside each block — units are assigned to a floor"
        action={
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Floor
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide font-medium">Total Floors</p>
          <p className="text-3xl font-bold text-content mt-1">{floors.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide font-medium">Total Units</p>
          <p className="text-3xl font-bold text-primary mt-1">{totalUnits}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide font-medium">Total Area (sqft)</p>
          <p className="text-3xl font-bold text-primary mt-1 tabular-nums">{formatArea(totalArea)}</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search floors…" onRefresh={refetch}>
        <Select value={projectId} onChange={e => { setProject(e.target.value); setBlock('') }}
          className="min-w-[150px]">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
        </Select>
        <Select value={blockId} onChange={e => setBlock(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Blocks</option>
          {filterBlocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load floors.' : null} onRetry={refetch}
        empty={floors.length === 0} emptyMessage="No floors found. Add floors to a block before creating units.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Floor' }, { h: 'Block' }, { h: 'Project' },
                    { h: 'No.', num: true }, { h: 'Area', num: true }, { h: 'Common', num: true },
                    { h: 'Service', num: true }, { h: 'Net', num: true }, { h: 'Units', num: true },
                    { h: '' },
                  ].map(({ h, num }) => (
                    <th key={h}
                      className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {floors.map(f => (
                  <tr key={f.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                          <Rows3 className="w-4 h-4 text-info" />
                        </div>
                        <span className="font-semibold text-content">{f.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-sm">{f.blockName}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{f.projectName}</td>
                    <td className="px-4 py-3 text-content-muted text-right tabular-nums">{f.floorNumber}</td>
                    <td className="px-4 py-3 text-content font-medium text-right tabular-nums">{formatArea(f.areaSqFt)}</td>
                    <td className="px-4 py-3 text-content-muted text-right tabular-nums">{formatArea(f.commonAreaSqFt)}</td>
                    <td className="px-4 py-3 text-content-muted text-right tabular-nums">{formatArea(f.serviceAreaSqFt)}</td>
                    <td className="px-4 py-3 text-content font-medium text-right tabular-nums">{formatArea(f.netAreaSqFt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-content">
                        <Home className="w-3.5 h-3.5 text-content-muted" />
                        <span className="font-medium tabular-nums">{f.unitCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setTarget(f); setModal('edit') }} aria-label={`Edit ${f.name}`}
                        className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {modal === 'add' && (
        <FloorModal projects={projects} blocks={blocks} onClose={() => setModal(null)} onSaved={invalidate} />
      )}
      {modal === 'edit' && target && (
        <FloorModal floor={target} projects={projects} blocks={blocks}
          onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
