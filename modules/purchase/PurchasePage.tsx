'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ShoppingCart, FileText } from 'lucide-react'

const PROJECTS = [
  { id: 'p1', name: 'Block-A — Mirpur 12' },
  { id: 'p2', name: 'Block-B — Mohammadpur' },
  { id: 'p3', name: 'Block-C — Uttara Sector 7' },
  { id: 'p4', name: 'Block-D — Bashundhara' },
]

const VENDORS = ['Bashundhara Cement', 'BSRM Steel', 'Meghna Bricks', 'Unique Tiles', 'Legal Aid BD', 'Supervisor Alam & Co', 'Prime Electric', 'Other']
const MATERIAL_ITEMS = ['Cement (Bag)', 'Steel Rod (Ton)', 'Bricks (Pcs)', 'Sand (CFT)', 'Tiles (Sqft)', 'Gravel (CFT)', 'Paint (Litre)', 'Plumbing Pipe (Ft)', 'Electric Wire (Mtr)', 'Glass (Sqft)']
const CONTRACT_ITEMS = ['Masonry Contract', 'Plumbing Contract', 'Electrical Contract', 'Painting Contract', 'Supervisor Contract', 'Legal Fees', 'Architect Fees', 'Design Fees']
const OTHER_ITEMS    = ['Land Registration', 'Utility Connection', 'Transport & Logistics', 'Equipment Rental', 'Security Service', 'Miscellaneous']

export type PurchaseCategory = 'material' | 'contract' | 'other'

export interface PurchaseRecord {
  id: string; project_id: string; category: PurchaseCategory
  item: string; quantity: number; unit: string; rate: number; amount: number
  vendor: string; date: string; notes: string; posted_to_inventory: boolean
}

export const PURCHASES: PurchaseRecord[] = [
  { id: 'pur1', project_id: 'p1', category: 'material',  item: 'Cement (Bag)',         quantity: 500,  unit: 'Bag',  rate: 480,    amount: 240000,   vendor: 'Bashundhara Cement', date: '2025-11-01', notes: 'Foundation work',   posted_to_inventory: true },
  { id: 'pur2', project_id: 'p1', category: 'material',  item: 'Steel Rod (Ton)',       quantity: 10,   unit: 'Ton',  rate: 80000,  amount: 800000,   vendor: 'BSRM Steel',         date: '2025-11-03', notes: 'Column reinforcement', posted_to_inventory: true },
  { id: 'pur3', project_id: 'p1', category: 'contract',  item: 'Masonry Contract',      quantity: 1,    unit: 'Job',  rate: 350000, amount: 350000,   vendor: 'Supervisor Alam & Co', date: '2025-11-10', notes: 'Phase 1 masonry', posted_to_inventory: false },
  { id: 'pur4', project_id: 'p1', category: 'other',     item: 'Land Registration',     quantity: 1,    unit: 'Job',  rate: 120000, amount: 120000,   vendor: 'Legal Aid BD',       date: '2025-10-20', notes: '',                  posted_to_inventory: false },
  { id: 'pur5', project_id: 'p2', category: 'material',  item: 'Bricks (Pcs)',          quantity: 10000,unit: 'Pcs',  rate: 12,     amount: 120000,   vendor: 'Meghna Bricks',      date: '2025-11-15', notes: 'Wall construction',  posted_to_inventory: true },
  { id: 'pur6', project_id: 'p2', category: 'material',  item: 'Sand (CFT)',            quantity: 500,  unit: 'CFT',  rate: 35,     amount: 17500,    vendor: 'Other',              date: '2025-11-16', notes: '',                  posted_to_inventory: true },
  { id: 'pur7', project_id: 'p3', category: 'contract',  item: 'Electrical Contract',   quantity: 1,    unit: 'Job',  rate: 600000, amount: 600000,   vendor: 'Prime Electric',     date: '2025-12-01', notes: 'Full electrical',   posted_to_inventory: false },
  { id: 'pur8', project_id: 'p3', category: 'material',  item: 'Cement (Bag)',          quantity: 800,  unit: 'Bag',  rate: 480,    amount: 384000,   vendor: 'Bashundhara Cement', date: '2025-12-05', notes: '',                  posted_to_inventory: true },
]

const UNITS: Record<PurchaseCategory, string[]> = {
  material: ['Bag', 'Ton', 'Pcs', 'CFT', 'Sqft', 'Litre', 'Mtr', 'Ft', 'Kg'],
  contract: ['Job', 'Lump Sum', 'Month'],
  other:    ['Job', 'Lump Sum', 'Unit'],
}

const CAT_COLORS: Record<PurchaseCategory, string> = {
  material: 'bg-blue-100 text-blue-700',
  contract: 'bg-purple-100 text-purple-700',
  other:    'bg-gray-100 text-gray-600',
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  project_id: z.string().min(1, 'Required'),
  category:   z.enum(['material', 'contract', 'other']),
  item:       z.string().min(1, 'Required'),
  quantity:   z.coerce.number().min(0.01, 'Required'),
  unit:       z.string().min(1, 'Required'),
  rate:       z.coerce.number().min(1, 'Required'),
  vendor:     z.string().min(1, 'Required'),
  date:       z.string().min(1, 'Required'),
  notes:      z.string().optional(),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (r: PurchaseRecord) => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { category: 'material', date: new Date().toISOString().split('T')[0] },
  })
  const cat = watch('category') as PurchaseCategory
  const qty = watch('quantity') || 0
  const rate = watch('rate') || 0
  const itemList = cat === 'material' ? MATERIAL_ITEMS : cat === 'contract' ? CONTRACT_ITEMS : OTHER_ITEMS

  return (
    <Modal open onClose={onClose} title="Add Purchase" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({
          id: `pur${Date.now()}`, ...d, notes: d.notes ?? '',
          amount: d.quantity * d.rate,
          posted_to_inventory: d.category === 'material',
        })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project</label>
            <select {...register('project_id')} className={inp}>
              <option value="">Select project</option>
              {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Category</label>
            <select {...register('category')} className={inp}>
              <option value="material">Material</option>
              <option value="contract">Contract / Service</option>
              <option value="other">Other Cost</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Item / Description</label>
            <select {...register('item')} className={inp}>
              <option value="">Select item</option>
              {itemList.map(i => <option key={i}>{i}</option>)}
            </select>
            {errors.item && <p className="text-xs text-red-600 mt-1">{errors.item.message}</p>}
          </div>
          <div>
            <label className={lbl}>Vendor / Supplier</label>
            <select {...register('vendor')} className={inp}>
              <option value="">Select vendor</option>
              {VENDORS.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Quantity</label>
            <input type="number" step="0.01" {...register('quantity')} className={inp} />
            {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className={lbl}>Unit</label>
            <select {...register('unit')} className={inp}>
              {UNITS[cat].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Rate (৳)</label>
            <input type="number" {...register('rate')} className={inp} />
            {errors.rate && <p className="text-xs text-red-600 mt-1">{errors.rate.message}</p>}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">Total Amount</span>
          <span className="text-lg font-bold text-blue-800">৳{(qty * rate).toLocaleString('en-BD')}</span>
        </div>
        {cat === 'material' && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-xs text-green-800">
            Material purchase will automatically create a Stock-In entry in Inventory.
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Date</label>
            <input type="date" {...register('date')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <input {...register('notes')} className={inp} placeholder="Optional notes" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Purchase</button>
        </div>
      </form>
    </Modal>
  )
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

export function PurchasePage() {
  const [records, setRecords]     = useState<PurchaseRecord[]>(PURCHASES)
  const [showAdd, setShowAdd]     = useState(false)
  const [filterProject, setFP]    = useState('')
  const [filterCat, setFC]        = useState<string>('')

  const displayed = records.filter(r =>
    (!filterProject || r.project_id === filterProject) &&
    (!filterCat     || r.category   === filterCat)
  )

  const totalMaterial = records.filter(r => r.category === 'material').reduce((s, r) => s + r.amount, 0)
  const totalContract = records.filter(r => r.category === 'contract').reduce((s, r) => s + r.amount, 0)
  const totalOther    = records.filter(r => r.category === 'other').reduce((s, r) => s + r.amount, 0)
  const grand         = totalMaterial + totalContract + totalOther

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record materials, contracts and other project expenditures</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Purchase
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Expenditure', value: fmt(grand),         color: 'text-gray-900' },
          { label: 'Materials',         value: fmt(totalMaterial), color: 'text-blue-600' },
          { label: 'Contracts',         value: fmt(totalContract), color: 'text-purple-600' },
          { label: 'Other Costs',       value: fmt(totalOther),    color: 'text-gray-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Per-project breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {PROJECTS.map(proj => {
          const recs = records.filter(r => r.project_id === proj.id)
          const total = recs.reduce((s, r) => s + r.amount, 0)
          if (!total) return null
          const mat = recs.filter(r => r.category === 'material').reduce((s, r) => s + r.amount, 0)
          const con = recs.filter(r => r.category === 'contract').reduce((s, r) => s + r.amount, 0)
          const oth = recs.filter(r => r.category === 'other').reduce((s, r) => s + r.amount, 0)
          return (
            <div key={proj.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900 text-sm">{proj.name}</p>
                <span className="font-bold text-gray-900">{fmt(total)}</span>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-blue-600">Materials: {fmt(mat)}</span>
                <span className="text-purple-600">Contracts: {fmt(con)}</span>
                {oth > 0 && <span className="text-gray-500">Other: {fmt(oth)}</span>}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden flex">
                <div className="h-full bg-blue-500"   style={{ width: `${(mat/total)*100}%` }} />
                <div className="h-full bg-purple-500" style={{ width: `${(con/total)*100}%` }} />
                <div className="h-full bg-gray-400"   style={{ width: `${(oth/total)*100}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Table with filters */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <h3 className="font-semibold text-gray-900 flex-1">Purchase Records</h3>
          <select value={filterProject} onChange={e => setFP(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Projects</option>
            {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterCat} onChange={e => setFC(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Categories</option>
            <option value="material">Material</option>
            <option value="contract">Contract</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date', 'Project', 'Category', 'Item', 'Qty', 'Unit', 'Rate', 'Amount', 'Vendor', 'Inventory'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-3 text-gray-500 text-xs">{r.date}</td>
                <td className="px-3 py-3 text-gray-700 text-xs">{PROJECTS.find(p => p.id === r.project_id)?.name.split(' — ')[0]}</td>
                <td className="px-3 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${CAT_COLORS[r.category]}`}>{r.category}</span>
                </td>
                <td className="px-3 py-3 font-medium text-gray-900">{r.item}</td>
                <td className="px-3 py-3 text-gray-700">{r.quantity}</td>
                <td className="px-3 py-3 text-gray-500">{r.unit}</td>
                <td className="px-3 py-3 text-gray-700">{fmt(r.rate)}</td>
                <td className="px-3 py-3 font-semibold text-gray-900">{fmt(r.amount)}</td>
                <td className="px-3 py-3 text-gray-500 text-xs">{r.vendor}</td>
                <td className="px-3 py-3">
                  {r.posted_to_inventory
                    ? <span className="text-xs text-green-600 font-semibold">✓ Stock-In</span>
                    : <span className="text-xs text-gray-400">—</span>}
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr><td colSpan={10} className="py-10 text-center text-gray-400">No purchase records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={r => setRecords(p => [r, ...p])} />}
    </div>
  )
}
