'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ArrowUpCircle, AlertTriangle } from 'lucide-react'
import { STOCK_ITEMS } from './StockLevelsPage'

const PROJECTS = [
  { id: 'p1', name: 'Block-A — Mirpur 12' },
  { id: 'p2', name: 'Block-B — Mohammadpur' },
  { id: 'p3', name: 'Block-C — Uttara Sector 7' },
  { id: 'p4', name: 'Block-D — Bashundhara' },
]

interface IssueRecord {
  id: string; material_id: string; project_id: string; qty: number
  date: string; issued_by: string; purpose: string; notes: string
}

const MOCK: IssueRecord[] = [
  { id: 'is1',  material_id: 'm1', project_id: 'p1', qty: 200, date: '2025-01-20', issued_by: 'Site Manager',  purpose: 'Foundation work',    notes: '' },
  { id: 'is2',  material_id: 'm3', project_id: 'p1', qty: 5000,date: '2025-01-22', issued_by: 'Site Manager',  purpose: 'Brick masonry',      notes: '' },
  { id: 'is3',  material_id: 'm2', project_id: 'p1', qty: 8,   date: '2025-02-01', issued_by: 'Store Keeper',  purpose: 'Column reinforcement',notes: '' },
  { id: 'is4',  material_id: 'm1', project_id: 'p2', qty: 150, date: '2025-03-10', issued_by: 'Site Manager',  purpose: 'Plaster work',       notes: '' },
  { id: 'is5',  material_id: 'm4', project_id: 'p1', qty: 700, date: '2025-03-15', issued_by: 'Store Keeper',  purpose: 'Concrete mix',       notes: '' },
  { id: 'is6',  material_id: 'm5', project_id: 'p2', qty: 300, date: '2025-04-01', issued_by: 'Site Manager',  purpose: 'Concrete mix',       notes: '' },
  { id: 'is7',  material_id: 'm8', project_id: 'p3', qty: 600, date: '2025-04-20', issued_by: 'Electrician',   purpose: 'Electrical wiring',  notes: 'Floor 1-3' },
  { id: 'is8',  material_id: 'm6', project_id: 'p1', qty: 300, date: '2025-05-05', issued_by: 'Store Keeper',  purpose: 'Floor tiling',       notes: '' },
  { id: 'is9',  material_id: 'm9', project_id: 'p2', qty: 180, date: '2025-05-12', issued_by: 'Plumber',       purpose: 'Plumbing install',   notes: '' },
  { id: 'is10', material_id: 'm7', project_id: 'p3', qty: 80,  date: '2025-06-01', issued_by: 'Site Manager',  purpose: 'Wall painting',      notes: '' },
]

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  material_id: z.string().min(1, 'Required'),
  project_id:  z.string().min(1, 'Required'),
  qty:         z.coerce.number().min(1, 'Required'),
  date:        z.string().min(1, 'Required'),
  issued_by:   z.string().min(1, 'Required'),
  purpose:     z.string().min(1, 'Required'),
  notes:       z.string().optional(),
})
type Form = z.infer<typeof schema>

function getMaterial(id: string) { return STOCK_ITEMS.find(s => s.id === id) }
function getProject(id: string)  { return PROJECTS.find(p => p.id === id) }

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (r: IssueRecord) => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  })
  const selectedId = watch('material_id')
  const qty = watch('qty')
  const mat = getMaterial(selectedId)
  const insufficient = mat && qty > mat.current_stock

  return (
    <Modal open onClose={onClose} title="Issue Material to Project" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({ id: `is${Date.now()}`, ...d, notes: d.notes ?? '' })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Material</label>
            <select {...register('material_id')} className={inp}>
              <option value="">Select material</option>
              {STOCK_ITEMS.map(s => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
            </select>
            {errors.material_id && <p className="text-xs text-red-600 mt-1">{errors.material_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Project</label>
            <select {...register('project_id')} className={inp}>
              <option value="">Select project</option>
              {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
        </div>

        {mat && (
          <div className={`border rounded-lg px-4 py-2.5 text-sm ${insufficient ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
            {insufficient
              ? <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Insufficient stock — available: <strong>{mat.current_stock.toLocaleString()} {mat.unit}</strong></span>
              : <>Available stock: <strong>{mat.current_stock.toLocaleString()} {mat.unit}</strong> · Reorder level: {mat.reorder_level.toLocaleString()}</>
            }
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Quantity to Issue</label>
            <input type="number" {...register('qty')} className={inp} placeholder="0" />
            {errors.qty && <p className="text-xs text-red-600 mt-1">{errors.qty.message}</p>}
          </div>
          <div>
            <label className={lbl}>Date</label>
            <input type="date" {...register('date')} className={inp} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Issued By</label>
            <input {...register('issued_by')} className={inp} placeholder="Site Manager" />
            {errors.issued_by && <p className="text-xs text-red-600 mt-1">{errors.issued_by.message}</p>}
          </div>
          <div>
            <label className={lbl}>Purpose</label>
            <input {...register('purpose')} className={inp} placeholder="Foundation work" />
            {errors.purpose && <p className="text-xs text-red-600 mt-1">{errors.purpose.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Notes</label>
          <input {...register('notes')} className={inp} placeholder="Optional notes" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium">Issue Material</button>
        </div>
      </form>
    </Modal>
  )
}

export function IssueToProjectPage() {
  const [records, setRecords] = useState<IssueRecord[]>(MOCK)
  const [showAdd, setShowAdd]  = useState(false)
  const [filterProject, setFP] = useState('')
  const [filterMat, setFM]     = useState('')

  const displayed = records.filter(r => {
    if (filterProject && r.project_id !== filterProject) return false
    if (filterMat && r.material_id !== filterMat) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issue to Project</h1>
          <p className="text-sm text-gray-500 mt-0.5">Issue materials from central store to construction projects</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Issue Material
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Issues</p><p className="text-2xl font-bold text-orange-600 mt-1">{records.length}</p></div>
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center"><ArrowUpCircle className="w-5 h-5 text-orange-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Projects Supplied</p><p className="text-2xl font-bold text-blue-600 mt-1">{new Set(records.map(r => r.project_id)).size}</p></div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><ArrowUpCircle className="w-5 h-5 text-blue-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Materials Issued</p><p className="text-2xl font-bold text-purple-600 mt-1">{new Set(records.map(r => r.material_id)).size}</p></div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><ArrowUpCircle className="w-5 h-5 text-purple-600" /></div>
        </div>
      </div>

      {/* Per-project material usage summary */}
      <div className="grid grid-cols-2 gap-4">
        {PROJECTS.map(proj => {
          const projIssues = records.filter(r => r.project_id === proj.id)
          if (projIssues.length === 0) return null
          const matTotals = STOCK_ITEMS.map(mat => {
            const total = projIssues.filter(r => r.material_id === mat.id).reduce((s, r) => s + r.qty, 0)
            return { mat, total }
          }).filter(x => x.total > 0)
          return (
            <div key={proj.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="font-semibold text-gray-900 mb-3">{proj.name}</p>
              <div className="space-y-1.5">
                {matTotals.map(({ mat, total }) => (
                  <div key={mat.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{mat.name}</span>
                    <span className="font-medium text-gray-900">{total.toLocaleString()} {mat.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter + table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <h3 className="font-semibold text-gray-900 flex-1">Issue Records</h3>
          <select value={filterProject} onChange={e => setFP(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Projects</option>
            {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterMat} onChange={e => setFM(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Materials</option>
            {STOCK_ITEMS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date', 'Material', 'Project', 'Qty Issued', 'Unit', 'Issued By', 'Purpose', 'Notes'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(r => {
              const mat = getMaterial(r.material_id)
              const proj = getProject(r.project_id)
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{r.date}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{mat?.name}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{proj?.name}</td>
                  <td className="px-4 py-3 font-bold text-orange-700">{r.qty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{mat?.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{r.issued_by}</td>
                  <td className="px-4 py-3 text-gray-700">{r.purpose}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.notes || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={r => setRecords(p => [r, ...p])} />}
    </div>
  )
}
