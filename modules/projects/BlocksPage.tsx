'use client'
import { useState } from 'react'
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

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

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
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className={lbl}>Project <span className="text-red-500">*</span></label>
          <select {...register('projectId')} className={inp}>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
          </select>
          {errors.projectId && <p className="text-xs text-red-600 mt-1">{errors.projectId.message}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Block / Tower Name <span className="text-red-500">*</span></label>
            <input {...register('name')} className={inp} placeholder="Tower A1" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
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
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
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
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Block
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Blocks</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{blocks.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Projects</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{projects.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Units</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{totalUnits}</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search blocks…" onRefresh={refetch}>
        <select value={projectId} onChange={e => setProject(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
        </select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load blocks.' : null} onRetry={refetch}
        empty={blocks.length === 0} emptyMessage="No blocks found. Create a block within a project.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Block / Tower', 'Project', 'Floors', 'Units', 'Description', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {blocks.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4 text-indigo-500" />
                        </div>
                        <span className="font-semibold text-gray-900">{b.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{b.projectName}</td>
                    <td className="px-4 py-3 text-gray-600">{b.totalFloors ?? '—'} floors</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Home className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium">{b.unitCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{b.description}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setTarget(b); setModal('edit') }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
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
