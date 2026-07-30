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
import { Input, Field } from '@/components/ui/Input'
import { Table, TH, TR, TD } from '@/components/ui/Table'
import { StatCard } from '@/components/ui/Card'
import { Plus, Edit2, Rows3, Home, Ruler } from 'lucide-react'
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
          <Field label="Project" required error={errors.projectId?.message}>
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
          </Field>
          <Field label="Block" required error={errors.blockId?.message}>
            <Select {...register('blockId')} disabled={!selectedProject}>
              <option value="">{selectedProject ? 'Select block…' : 'Select a project first'}</option>
              {eligibleBlocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Floor Name" required error={errors.name?.message}>
            <Input {...register('name')} invalid={!!errors.name} placeholder="Level 3" />
          </Field>
          <Field label="Floor No." required error={errors.floorNumber?.message}>
            <Input type="number" min={0} {...register('floorNumber')} invalid={!!errors.floorNumber} placeholder="3" />
          </Field>
        </div>

        <AreaBreakdownFields
          register={register}
          areaSqFt={watch('areaSqFt')}
          commonAreaSqFt={watch('commonAreaSqFt')}
          serviceAreaSqFt={watch('serviceAreaSqFt')}
        />

        <Field label="Description">
          {/* No shared primitive for multiline yet; Input's classes are mirrored here. */}
          <textarea {...register('description')} rows={2} placeholder="Short note about this floor…"
            className="w-full border border-border-default rounded-lg px-3 py-2 text-sm bg-surface text-content focus:ring-2 focus:ring-primary/40 focus:outline-none" />
        </Field>

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
        <StatCard label="Total Floors" value={String(floors.length)} icon={Rows3} tone="info" />
        <StatCard label="Total Units" value={String(totalUnits)} icon={Home} tone="primary" />
        <StatCard label="Total Area (sqft)" value={formatArea(totalArea)} icon={Ruler} tone="primary" />
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
        <Table
          minWidth={940}
          head={<>
            <TH>Floor</TH><TH>Block</TH><TH>Project</TH>
            <TH num>No.</TH><TH num>Area</TH><TH num>Common</TH>
            <TH num>Service</TH><TH num>Net</TH><TH num>Units</TH><TH />
          </>}
        >
          {floors.map(f => (
            <TR key={f.id}>
              <TD>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                    <Rows3 className="w-4 h-4 text-info" />
                  </div>
                  <span className="font-semibold text-content">{f.name}</span>
                </div>
              </TD>
              <TD className="text-content-muted">{f.blockName}</TD>
              <TD className="text-content-muted text-xs">{f.projectName}</TD>
              <TD num className="text-content-muted">{f.floorNumber}</TD>
              <TD num className="text-content font-medium">{formatArea(f.areaSqFt)}</TD>
              <TD num className="text-content-muted">{formatArea(f.commonAreaSqFt)}</TD>
              <TD num className="text-content-muted">{formatArea(f.serviceAreaSqFt)}</TD>
              <TD num className="text-content font-medium">{formatArea(f.netAreaSqFt)}</TD>
              <TD num>
                <div className="flex items-center justify-end gap-1.5 text-content">
                  <Home className="w-3.5 h-3.5 text-content-muted" />
                  <span className="font-medium">{f.unitCount}</span>
                </div>
              </TD>
              <TD>
                <button onClick={() => { setTarget(f); setModal('edit') }} aria-label={`Edit ${f.name}`}
                  className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </TD>
            </TR>
          ))}
        </Table>
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
