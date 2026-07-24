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
import { Plus, Edit2, Layers, Home } from 'lucide-react'
import api from '@/lib/api'

interface Project { id: number; projectName: string; projectCode: string }
interface Block {
  id: number; projectId: number; projectName: string
  name: string; totalFloors?: number; description?: string; unitCount: number
}

const schema = z.object({
  projectId:   z.coerce.number().min(1, 'Required'),
  name:        z.string().min(1, 'Required'),
  totalFloors: z.coerce.number().int().min(1, 'Min 1 floor').optional(),
  description: z.string().optional(),
})
type Form = z.infer<typeof schema>

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

function BlockModal({ block, projects, onClose, onSaved }: {
  block?: Block; projects: Project[]; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!block
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: block
      ? { projectId: block.projectId, name: block.name, totalFloors: block.totalFloors, description: block.description }
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
        <div>
          <label className={lbl}>Project <span className="text-danger">*</span></label>
          <Select {...register('projectId')}>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
          </Select>
          {errors.projectId && <p className="text-xs text-danger mt-1">{errors.projectId.message}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Block / Tower Name <span className="text-danger">*</span></label>
            <input {...register('name')} className={inp} placeholder="Tower A1" />
            {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Total Floors</label>
            <input type="number" {...register('totalFloors')} className={inp} placeholder="6" min={1} />
          </div>
        </div>
        <div>
          <label className={lbl}>Description</label>
          <textarea {...register('description')} className={inp} rows={2} placeholder="Short note about this block…" />
        </div>
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
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Block
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide font-medium">Total Blocks</p>
          <p className="text-3xl font-bold text-content mt-1">{blocks.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide font-medium">Projects</p>
          <p className="text-3xl font-bold text-primary mt-1">{projects.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide font-medium">Total Units</p>
          <p className="text-3xl font-bold text-primary mt-1">{totalUnits}</p>
        </div>
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
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {['Block / Tower', 'Project', 'Floors', 'Units', 'Description', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {blocks.map(b => (
                  <tr key={b.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4 text-info" />
                        </div>
                        <span className="font-semibold text-content">{b.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-sm">{b.projectName}</td>
                    <td className="px-4 py-3 text-content-muted">{b.totalFloors ?? '—'} floors</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-content">
                        <Home className="w-3.5 h-3.5 text-content-muted" />
                        <span className="font-medium">{b.unitCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs max-w-xs truncate">{b.description}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setTarget(b); setModal('edit') }}
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

      {modal === 'add' && <BlockModal projects={projects} onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <BlockModal block={target} projects={projects} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
