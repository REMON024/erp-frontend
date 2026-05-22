'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react'

type MaterialCategory = 'structural' | 'electrical' | 'plumbing' | 'finishing' | 'other'

export interface Material {
  id: string; code: string; name: string; unit: string
  category: MaterialCategory; reorder_level: number
  current_stock: number; unit_rate: number; status: 'active' | 'inactive'
}

export const MATERIALS: Material[] = [
  { id: 'm1', code: 'CEM-OPC-50',  name: 'Cement (OPC Grade)',      unit: 'Bag',  category: 'structural',  reorder_level: 100, current_stock: 342,  unit_rate: 580,    status: 'active' },
  { id: 'm2', code: 'STL-ROD-12',  name: 'Steel Rod (12mm TMT)',     unit: 'Ton',  category: 'structural',  reorder_level: 5,   current_stock: 18,   unit_rate: 90000,  status: 'active' },
  { id: 'm3', code: 'BRK-FLY-01',  name: 'Bricks (First Class)',     unit: 'Pcs',  category: 'structural',  reorder_level: 5000,current_stock: 12400,unit_rate: 12,     status: 'active' },
  { id: 'm4', code: 'SND-RSV-01',  name: 'Sand (River Sand)',        unit: 'CFT',  category: 'structural',  reorder_level: 500, current_stock: 2100, unit_rate: 45,     status: 'active' },
  { id: 'm5', code: 'GRV-CRS-01',  name: 'Gravel (Coarse)',          unit: 'CFT',  category: 'structural',  reorder_level: 300, current_stock: 850,  unit_rate: 55,     status: 'active' },
  { id: 'm6', code: 'ELE-CAB-01',  name: 'Electrical Cable (2.5mm)', unit: 'Meter',category: 'electrical',  reorder_level: 500, current_stock: 1200, unit_rate: 85,     status: 'active' },
  { id: 'm7', code: 'ELE-MCB-01',  name: 'MCB Breaker (20A)',        unit: 'Pcs',  category: 'electrical',  reorder_level: 20,  current_stock: 65,   unit_rate: 450,    status: 'active' },
  { id: 'm8', code: 'PLM-PVC-01',  name: 'PVC Pipe (2 inch)',        unit: 'Pcs',  category: 'plumbing',    reorder_level: 50,  current_stock: 180,  unit_rate: 320,    status: 'active' },
  { id: 'm9', code: 'PLM-FIT-01',  name: 'Plumbing Fittings Set',    unit: 'Set',  category: 'plumbing',    reorder_level: 10,  current_stock: 35,   unit_rate: 1800,   status: 'active' },
  { id: 'm10',code: 'FIN-TIL-01',  name: 'Floor Tiles (60x60 cm)',   unit: 'SFT',  category: 'finishing',   reorder_level: 500, current_stock: 1800, unit_rate: 95,     status: 'active' },
  { id: 'm11',code: 'FIN-PNT-01',  name: 'Paint (Interior Emulsion)',unit: 'Ltr',  category: 'finishing',   reorder_level: 100, current_stock: 420,  unit_rate: 320,    status: 'active' },
  { id: 'm12',code: 'FIN-DOR-01',  name: 'Wooden Door (Standard)',   unit: 'Pcs',  category: 'finishing',   reorder_level: 5,   current_stock: 12,   unit_rate: 8500,   status: 'active' },
]

const CATEGORY_COLORS: Record<MaterialCategory, string> = {
  structural:  'bg-blue-100 text-blue-700',
  electrical:  'bg-yellow-100 text-yellow-700',
  plumbing:    'bg-teal-100 text-teal-700',
  finishing:   'bg-purple-100 text-purple-700',
  other:       'bg-gray-100 text-gray-600',
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  code:          z.string().min(1, 'Required'),
  name:          z.string().min(1, 'Required'),
  unit:          z.string().min(1, 'Required'),
  category:      z.enum(['structural', 'electrical', 'plumbing', 'finishing', 'other']),
  reorder_level: z.coerce.number().min(0, 'Required'),
  unit_rate:     z.coerce.number().min(0, 'Required'),
})
type Form = z.infer<typeof schema>

function AddMaterialModal({ onClose, onAdd }: { onClose: () => void; onAdd: (m: Material) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { category: 'structural' },
  })
  return (
    <Modal open onClose={onClose} title="Add Material" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({
          id: `m${Date.now()}`,
          ...d,
          current_stock: 0,
          status: 'active',
        })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Material Code</label>
            <input {...register('code')} className={inp} placeholder="CEM-OPC-50" />
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
          </div>
          <div>
            <label className={lbl}>Category</label>
            <select {...register('category')} className={inp}>
              <option value="structural">Structural</option>
              <option value="electrical">Electrical</option>
              <option value="plumbing">Plumbing</option>
              <option value="finishing">Finishing</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className={lbl}>Material Name</label>
          <input {...register('name')} className={inp} placeholder="Full material description" />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Unit of Measure</label>
            <input {...register('unit')} className={inp} placeholder="Bag / Ton / Pcs" />
            {errors.unit && <p className="text-xs text-red-600 mt-1">{errors.unit.message}</p>}
          </div>
          <div>
            <label className={lbl}>Reorder Level</label>
            <input type="number" {...register('reorder_level')} className={inp} placeholder="100" />
            {errors.reorder_level && <p className="text-xs text-red-600 mt-1">{errors.reorder_level.message}</p>}
          </div>
          <div>
            <label className={lbl}>Unit Rate (৳)</label>
            <input type="number" {...register('unit_rate')} className={inp} placeholder="580" />
            {errors.unit_rate && <p className="text-xs text-red-600 mt-1">{errors.unit_rate.message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Material</button>
        </div>
      </form>
    </Modal>
  )
}

export function MaterialMasterPage() {
  const [materials, setMaterials] = useState<Material[]>(MATERIALS)
  const [showAdd, setShowAdd]     = useState(false)
  const [filterCat, setFilterCat] = useState<string>('')

  const displayed    = filterCat ? materials.filter(m => m.category === filterCat) : materials
  const lowStockCount = materials.filter(m => m.current_stock <= m.reorder_level).length
  const totalValue    = materials.reduce((s, m) => s + m.current_stock * m.unit_rate, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Material Master</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage the material catalog, units, and reorder levels</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Material
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Materials</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{materials.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Low Stock Items</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{lowStockCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2">
          <p className="text-sm text-gray-500">Total Inventory Value</p>
          <p className="text-2xl font-bold text-green-600 mt-1">৳{totalValue.toLocaleString('en-BD')}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'structural', 'electrical', 'plumbing', 'finishing', 'other'] as const).map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium capitalize ${filterCat === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {c === '' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Code', 'Material Name', 'Category', 'Unit', 'Current Stock', 'Reorder Level', 'Unit Rate', 'Stock Value', ''].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${['Current Stock', 'Reorder Level', 'Unit Rate', 'Stock Value'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map(m => {
                const isLow = m.current_stock <= m.reorder_level
                return (
                  <tr key={m.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{m.code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        <span className="font-medium text-gray-900 text-xs">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${CATEGORY_COLORS[m.category]}`}>{m.category}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{m.unit}</td>
                    <td className={`px-4 py-3 text-right font-bold text-xs ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                      {m.current_stock.toLocaleString('en-BD')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{m.reorder_level.toLocaleString('en-BD')}</td>
                    <td className="px-4 py-3 text-right text-gray-700 text-xs">৳{m.unit_rate.toLocaleString('en-BD')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 text-xs">
                      ৳{(m.current_stock * m.unit_rate).toLocaleString('en-BD')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setMaterials(p => p.filter(x => x.id !== m.id))} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={7} className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Total Inventory Value</td>
                <td className="px-4 py-3 text-right font-bold text-green-700">
                  ৳{displayed.reduce((s, m) => s + m.current_stock * m.unit_rate, 0).toLocaleString('en-BD')}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {showAdd && <AddMaterialModal onClose={() => setShowAdd(false)} onAdd={m => setMaterials(p => [m, ...p])} />}
    </div>
  )
}
