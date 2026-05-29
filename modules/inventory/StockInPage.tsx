'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ArrowDownCircle } from 'lucide-react'
import { STOCK_ITEMS } from './StockLevelsPage'

interface StockInRecord {
  id: string; material_id: string; qty: number; date: string
  supplier: string; purchase_ref: string; notes: string
}

const MOCK: StockInRecord[] = [
  { id: 'si1',  material_id: 'm1', qty: 500,  date: '2025-01-10', supplier: 'Bashundhara Cement',   purchase_ref: 'PO-2025-001', notes: 'Initial stock' },
  { id: 'si2',  material_id: 'm3', qty: 10000,date: '2025-01-15', supplier: 'Rupa Bricks Ltd.',      purchase_ref: 'PO-2025-002', notes: '' },
  { id: 'si3',  material_id: 'm2', qty: 15,   date: '2025-01-20', supplier: 'BSRM Steel',            purchase_ref: 'PO-2025-003', notes: '' },
  { id: 'si4',  material_id: 'm8', qty: 1000, date: '2025-02-05', supplier: 'Energypac',             purchase_ref: 'PO-2025-004', notes: '' },
  { id: 'si5',  material_id: 'm1', qty: 300,  date: '2025-03-01', supplier: 'Crown Cement',          purchase_ref: 'PO-2025-008', notes: 'Block-B supply' },
  { id: 'si6',  material_id: 'm6', qty: 600,  date: '2025-04-10', supplier: 'RAK Ceramics',          purchase_ref: 'PO-2025-012', notes: '' },
  { id: 'si7',  material_id: 'm7', qty: 100,  date: '2025-04-12', supplier: 'Berger Paints',         purchase_ref: 'PO-2025-013', notes: '' },
  { id: 'si8',  material_id: 'm9', qty: 200,  date: '2025-05-01', supplier: 'RFL Plastics',          purchase_ref: 'PO-2025-015', notes: '' },
  { id: 'si9',  material_id: 'm4', qty: 800,  date: '2025-06-01', supplier: 'Local Sand Supplier',   purchase_ref: 'PO-2025-018', notes: '' },
  { id: 'si10', material_id: 'm5', qty: 400,  date: '2025-06-05', supplier: 'Gravel Corp BD',        purchase_ref: 'PO-2025-019', notes: '' },
]

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  material_id:  z.string().min(1, 'Required'),
  qty:          z.coerce.number().min(1, 'Required'),
  date:         z.string().min(1, 'Required'),
  supplier:     z.string().min(1, 'Required'),
  purchase_ref: z.string().optional(),
  notes:        z.string().optional(),
})
type Form = z.infer<typeof schema>

function getMaterial(id: string) { return STOCK_ITEMS.find(s => s.id === id) }

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (r: StockInRecord) => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  })
  const selectedId = watch('material_id')
  const mat = getMaterial(selectedId)

  return (
    <Modal open onClose={onClose} title="Record Stock In" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({ id: `si${Date.now()}`, ...d, purchase_ref: d.purchase_ref ?? '', notes: d.notes ?? '' })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Material</label>
            <select {...register('material_id')} className={inp}>
              <option value="">Select material</option>
              {STOCK_ITEMS.map(s => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
            </select>
            {errors.material_id && <p className="text-xs text-red-600 mt-1">{errors.material_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Quantity</label>
            <input type="number" {...register('qty')} className={inp} placeholder="0" />
            {errors.qty && <p className="text-xs text-red-600 mt-1">{errors.qty.message}</p>}
          </div>
        </div>

        {mat && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-800">
            Current stock: <span className="font-bold">{mat.current_stock.toLocaleString()} {mat.unit}</span>
            <span className="mx-2">·</span>Category: <span className="font-medium">{mat.category}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Date</label>
            <input type="date" {...register('date')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Supplier</label>
            <input {...register('supplier')} className={inp} placeholder="Supplier name" />
            {errors.supplier && <p className="text-xs text-red-600 mt-1">{errors.supplier.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Purchase Ref / PO No.</label>
            <input {...register('purchase_ref')} className={inp} placeholder="PO-2025-001" />
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <input {...register('notes')} className={inp} placeholder="Optional notes" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Record Stock In</button>
        </div>
      </form>
    </Modal>
  )
}

export function StockInPage() {
  const [records, setRecords] = useState<StockInRecord[]>(MOCK)
  const [showAdd, setShowAdd]   = useState(false)
  const [filterMat, setFilterMat] = useState('')

  const displayed = filterMat ? records.filter(r => r.material_id === filterMat) : records

  const totalQtyIn = records.reduce((s, r) => {
    const mat = getMaterial(r.material_id)
    return s + (mat ? r.qty : 0)
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock In</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record incoming materials into the central store</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Record Stock In
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Entries</p><p className="text-2xl font-bold text-blue-600 mt-1">{records.length}</p></div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><ArrowDownCircle className="w-5 h-5 text-blue-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Materials Covered</p><p className="text-2xl font-bold text-green-600 mt-1">{new Set(records.map(r => r.material_id)).size}</p></div>
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><ArrowDownCircle className="w-5 h-5 text-green-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Units Received</p><p className="text-2xl font-bold text-purple-600 mt-1">{totalQtyIn.toLocaleString()}</p></div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><ArrowDownCircle className="w-5 h-5 text-purple-600" /></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Stock In Records</h3>
          <select value={filterMat} onChange={e => setFilterMat(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Materials</option>
            {STOCK_ITEMS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date', 'Material', 'Category', 'Qty Received', 'Unit', 'Supplier', 'PO Reference', 'Notes'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(r => {
              const mat = getMaterial(r.material_id)
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{r.date}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{mat?.name ?? r.material_id}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{mat?.category}</td>
                  <td className="px-4 py-3 font-bold text-green-700">{r.qty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{mat?.unit}</td>
                  <td className="px-4 py-3 text-gray-700">{r.supplier}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.purchase_ref || '—'}</td>
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
