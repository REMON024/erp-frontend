'use client'
import { useState } from 'react'
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
import { Plus, Edit2, Layers, Home, FolderKanban } from 'lucide-react'
import { Input, Field } from '@/components/ui/Input'
import { Table, TH, TR, TD } from '@/components/ui/Table'
import { StatCard } from '@/components/ui/Card'
import { AreaBreakdownFields } from '@/components/ui/AreaBreakdownFields'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { formatArea } from '@/utils/format'
import api from '@/lib/api'

interface Project { id: number; projectName: string; projectCode: string }
interface Block {
  id: number; projectId: number; projectName: string
  name: string; totalFloors?: number; floorCount: number
  areaSqFt?: number; commonAreaSqFt?: number; serviceAreaSqFt?: number; netAreaSqFt?: number
  description?: string; unitCount: number
}

const schema = z.object({
  projectId:       z.coerce.number().min(1, 'Required'),
  name:            z.string().min(1, 'Required'),
  totalFloors:     z.coerce.number().int().min(1, 'Min 1 floor').optional(),
  areaSqFt:        z.coerce.number().min(0).optional(),
  commonAreaSqFt:  z.coerce.number().min(0).optional(),
  serviceAreaSqFt: z.coerce.number().min(0).optional(),
  description:     z.string().optional(),
}).refine(
  d => d.areaSqFt == null || (d.commonAreaSqFt ?? 0) + (d.serviceAreaSqFt ?? 0) <= d.areaSqFt,
  { message: 'Common + service area cannot exceed the total area.', path: ['areaSqFt'] },
)
type Form = z.infer<typeof schema>

function BlockModal({ block, projects, onClose, onSaved }: {
  block?: Block; projects: Project[]; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!block
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: block
      ? { projectId: block.projectId, name: block.name, totalFloors: block.totalFloors,
          areaSqFt: block.areaSqFt, commonAreaSqFt: block.commonAreaSqFt,
          serviceAreaSqFt: block.serviceAreaSqFt, description: block.description }
      : {},
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      if (isEdit) await api.put(`/blocks/${block!.id}`, d)
      else        await api.post('/blocks', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Block' : 'Add Block'} size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <Field label="Project" required error={errors.projectId?.message}>
          <Select {...register('projectId')}>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Block / Tower Name" required error={errors.name?.message}>
            <Input {...register('name')} invalid={!!errors.name} placeholder="Tower A1" />
          </Field>
          <Field label="Planned Floors">
            <Input type="number" min={1} {...register('totalFloors')} placeholder="6" />
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
          <textarea {...register('description')} rows={2} placeholder="Short note about this block…"
            className="w-full border border-border-default rounded-lg px-3 py-2 text-sm bg-surface text-content focus:ring-2 focus:ring-primary/40 focus:outline-none" />
        </Field>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Block'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function BlocksPage() {
  const qc = useQueryClient()
  const [search,    setSearch]  = useState('')
  const [projectId, setProject] = useState('')
  const [modal,     setModal]   = useState<'add' | 'edit' | null>(null)
  const [target,    setTarget]  = useState<Block | null>(null)

  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })

  const { data: blocks = [], isLoading, error, refetch } = useApiData<Block[]>({
    url: '/blocks',
    params: { search: search || undefined, projectId: projectId || undefined },
    queryKey: ['blocks', search, projectId],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['blocks'] })
    qc.invalidateQueries({ queryKey: ['blocks-list'] })
  }
  const totalUnits = blocks.reduce((s, b) => s + b.unitCount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Blocks"
        subtitle="Manage towers and blocks within each project — the foundation of your unit inventory"
        action={
          <PermissionGate module="BLOCKS" action="create">
            <button onClick={() => setModal('add')}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Block
            </button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Blocks" value={String(blocks.length)} icon={Layers} tone="info" />
        <StatCard label="Projects" value={String(projects.length)} icon={FolderKanban} tone="primary" />
        <StatCard label="Total Units" value={String(totalUnits)} icon={Home} tone="primary" />
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search blocks…" onRefresh={refetch}>
        <Select value={projectId} onChange={e => setProject(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
        </Select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load blocks.' : null} onRetry={refetch}
        empty={blocks.length === 0} emptyMessage="No blocks found. Create a block within a project.">
        <Table
          minWidth={900}
          head={<>
            <TH>Block / Tower</TH><TH>Project</TH><TH num>Floors</TH>
            <TH num>Area</TH><TH num>Common</TH><TH num>Service</TH>
            <TH num>Net</TH><TH num>Units</TH><TH />
          </>}
        >
          {blocks.map(b => (
            <TR key={b.id}>
              <TD>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4 text-info" />
                  </div>
                  <span className="font-semibold text-content">{b.name}</span>
                </div>
              </TD>
              <TD className="text-content-muted">{b.projectName}</TD>
              {/* actual floors created vs the planned figure */}
              <TD num className="text-content-muted">
                {b.floorCount}{b.totalFloors != null && ` / ${b.totalFloors}`}
              </TD>
              <TD num className="text-content font-medium">{formatArea(b.areaSqFt)}</TD>
              <TD num className="text-content-muted">{formatArea(b.commonAreaSqFt)}</TD>
              <TD num className="text-content-muted">{formatArea(b.serviceAreaSqFt)}</TD>
              <TD num className="text-content font-medium">{formatArea(b.netAreaSqFt)}</TD>
              <TD num>
                <div className="flex items-center justify-end gap-1.5 text-content">
                  <Home className="w-3.5 h-3.5 text-content-muted" />
                  <span className="font-medium">{b.unitCount}</span>
                </div>
              </TD>
              <TD>
                <button onClick={() => { setTarget(b); setModal('edit') }} aria-label={`Edit ${b.name}`}
                  className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </TD>
            </TR>
          ))}
        </Table>
      </DataState>

      {modal === 'add' && <BlockModal projects={projects} onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <BlockModal block={target} projects={projects} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
