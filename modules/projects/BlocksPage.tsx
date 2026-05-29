'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Layers, Home } from 'lucide-react'

// ── Mock data (swap for useApiData when backend is ready) ─────────────────────
interface Block {
  id: string; projectId: string; projectName: string; projectCode: string
  name: string; totalFloors: number; description: string; unitCount: number
}

const MOCK_PROJECTS = [
  { id: 'p1', projectCode: 'BLK-A', projectName: 'Block-A Residential' },
  { id: 'p2', projectCode: 'BLK-B', projectName: 'Block-B Residential' },
  { id: 'p3', projectCode: 'BLK-C', projectName: 'Block-C Residential' },
  { id: 'p4', projectCode: 'BLK-D', projectName: 'Block-D Residential' },
]

const INITIAL_BLOCKS: Block[] = [
  { id: 'bl1', projectId: 'p1', projectCode: 'BLK-A', projectName: 'Block-A Residential', name: 'Tower A1', totalFloors: 6,  description: 'Main residential tower, east wing', unitCount: 12 },
  { id: 'bl2', projectId: 'p1', projectCode: 'BLK-A', projectName: 'Block-A Residential', name: 'Tower A2', totalFloors: 6,  description: 'Secondary tower, west wing',         unitCount: 10 },
  { id: 'bl3', projectId: 'p2', projectCode: 'BLK-B', projectName: 'Block-B Residential', name: 'Block B1', totalFloors: 5,  description: 'Single tower building',              unitCount: 8  },
  { id: 'bl4', projectId: 'p3', projectCode: 'BLK-C', projectName: 'Block-C Residential', name: 'Tower C1', totalFloors: 8,  description: 'Luxury high-rise, north face',       unitCount: 16 },
  { id: 'bl5', projectId: 'p3', projectCode: 'BLK-C', projectName: 'Block-C Residential', name: 'Tower C2', totalFloors: 8,  description: 'Luxury high-rise, south face',       unitCount: 14 },
  { id: 'bl6', projectId: 'p4', projectCode: 'BLK-D', projectName: 'Block-D Residential', name: 'Block D1', totalFloors: 7,  description: 'Modern design tower',               unitCount: 10 },
]

const schema = z.object({
  projectId:   z.string().min(1, 'Required'),
  name:        z.string().min(1, 'Required'),
  totalFloors: z.coerce.number().int().min(1, 'Min 1 floor'),
  description: z.string().optional(),
})
type Form = z.infer<typeof schema>

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

function BlockModal({ block, onClose, onSave }: {
  block?: Block; onClose: () => void; onSave: (d: Form) => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: block
      ? { projectId: block.projectId, name: block.name, totalFloors: block.totalFloors, description: block.description }
      : {},
  })

  return (
    <Modal open onClose={onClose} title={block ? 'Edit Block' : 'Add Block'} size="md">
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <div>
          <label className={lbl}>Project <span className="text-red-500">*</span></label>
          <select {...register('projectId')} className={inp}>
            <option value="">Select project…</option>
            {MOCK_PROJECTS.map(p => (
              <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>
            ))}
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
            <label className={lbl}>Total Floors <span className="text-red-500">*</span></label>
            <input type="number" {...register('totalFloors')} className={inp} placeholder="6" min={1} />
            {errors.totalFloors && <p className="text-xs text-red-600 mt-1">{errors.totalFloors.message}</p>}
          </div>
        </div>

        <div>
          <label className={lbl}>Description</label>
          <textarea {...register('description')} className={inp} rows={2} placeholder="Short note about this block…" />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit"
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            {block ? 'Save Changes' : 'Add Block'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function BlocksPage() {
  const [blocks,    setBlocks]  = useState<Block[]>(INITIAL_BLOCKS)
  const [search,    setSearch]  = useState('')
  const [projectId, setProject] = useState('')
  const [modal,     setModal]   = useState<'add' | 'edit' | null>(null)
  const [target,    setTarget]  = useState<Block | null>(null)

  const displayed = blocks.filter(b => {
    const matchSearch  = b.name.toLowerCase().includes(search.toLowerCase()) ||
                         b.projectName.toLowerCase().includes(search.toLowerCase())
    const matchProject = !projectId || b.projectId === projectId
    return matchSearch && matchProject
  })

  const totalUnits = blocks.reduce((s, b) => s + b.unitCount, 0)

  const handleSave = (data: Form) => {
    const proj = MOCK_PROJECTS.find(p => p.id === data.projectId)!
    if (modal === 'add') {
      setBlocks(prev => [{
        id: `bl${Date.now()}`,
        projectId:   data.projectId,
        projectCode: proj.projectCode,
        projectName: proj.projectName,
        name:        data.name,
        totalFloors: Number(data.totalFloors),
        description: data.description ?? '',
        unitCount:   0,
      }, ...prev])
    } else if (target) {
      setBlocks(prev => prev.map(b => b.id === target.id
        ? { ...b, projectId: data.projectId, projectCode: proj.projectCode,
            projectName: proj.projectName, name: data.name,
            totalFloors: Number(data.totalFloors), description: data.description ?? '' }
        : b))
    }
    setModal(null); setTarget(null)
  }

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

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Blocks</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{blocks.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Projects</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{MOCK_PROJECTS.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Units</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{totalUnits}</p>
        </div>
      </div>

      {/* Search + project filter */}
      <SearchBar value={search} onChange={setSearch} placeholder="Search blocks…">
        <select value={projectId} onChange={e => setProject(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Projects</option>
          {MOCK_PROJECTS.map(p => (
            <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>
          ))}
        </select>
      </SearchBar>

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No blocks match your filters.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Block / Tower', 'Project', 'Floors', 'Units', 'Description', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4 text-indigo-500" />
                      </div>
                      <span className="font-semibold text-gray-900">{b.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-1 rounded-full">
                      {b.projectCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.totalFloors} floors</td>
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
      )}

      {modal === 'add' && <BlockModal onClose={() => setModal(null)} onSave={handleSave} />}
      {modal === 'edit' && target && (
        <BlockModal block={target} onClose={() => { setModal(null); setTarget(null) }} onSave={handleSave} />
      )}
    </div>
  )
}
