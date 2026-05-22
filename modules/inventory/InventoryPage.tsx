'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Material } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ShoppingCart, Edit2, Trash2 } from 'lucide-react'
import { formatDate, formatCurrency } from '@/utils/format'

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const CATEGORIES = ['Steel & Iron', 'Cement & Other', 'Fire and mining', 'Solid', 'Wood', 'Sand', 'Gravel', 'Other']
const UNITS = ['Tons', 'Kg', 'Bags', 'Cubic Meter', 'Meter', 'Per Day', 'Pieces']

const matSchema = z.object({
  name:          z.string().min(1, 'Required'),
  category:      z.string().min(1, 'Required'),
  unit:          z.string().min(1, 'Required'),
  stock_quantity:z.coerce.number().min(0),
  reorder_level: z.coerce.number().min(0),
  max_quantity:  z.coerce.number().min(1),
  supplier:      z.string().optional(),
  cost_per_unit: z.coerce.number().optional(),
  avg_consumption: z.string().optional(),
})
type MatForm = z.infer<typeof matSchema>

function AddMaterialModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<MatForm>({
    resolver: zodResolver(matSchema) as any,
    defaultValues: { stock_quantity: 0, reorder_level: 10, max_quantity: 1000 },
  })
  const mut = useMutation({
    mutationFn: (d: unknown) => api.post('/materials', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Add Material" size="md">
      <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Material Name</label>
            <input {...register('name')} className={inp} placeholder="Steel, Cement..." />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Category</label>
            <select {...register('category')} className={inp}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Unit</label>
            <select {...register('unit')} className={inp}>
              <option value="">Select unit</option>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Current Stock</label>
            <input type="number" {...register('stock_quantity')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Reorder Level (Min)</label>
            <input type="number" {...register('reorder_level')} className={inp} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Max Quantity</label>
            <input type="number" {...register('max_quantity')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Supplier</label>
            <input {...register('supplier')} className={inp} placeholder="Supplier name" />
          </div>
          <div>
            <label className={lbl}>Cost / Unit</label>
            <input type="number" {...register('cost_per_unit')} className={inp} placeholder="25" />
          </div>
        </div>
        <div>
          <label className={lbl}>Avg. Consumption</label>
          <input {...register('avg_consumption')} className={inp} placeholder="30 Ton per month" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
            {mut.isPending ? 'Saving...' : 'Add Material'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function StockInModal({ material, onClose }: { material: Material; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({ defaultValues: { quantity: 0, warehouse_id: 'wh1', notes: '' } })
  const mut = useMutation({
    mutationFn: (d: any) => api.post('/stock-transactions', { ...d, material_id: material.id, transaction_type: 'stock_in' }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title={`Stock In: ${material.name}`} size="sm">
      <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-4 p-1">
        <div>
          <label className={lbl}>Quantity ({material.unit})</label>
          <input type="number" {...register('quantity')} className={inp} placeholder="100" />
        </div>
        <div>
          <label className={lbl}>Notes</label>
          <input {...register('notes')} className={inp} placeholder="Delivery from supplier..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 font-medium">
            {mut.isPending ? 'Saving...' : 'Confirm Stock In'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function InventoryPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd]   = useState(false)
  const [stockIn, setStockIn]   = useState<Material | null>(null)
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('')

  const { data } = useQuery({
    queryKey: ['materials', search, category],
    queryFn: () => {
      const p = new URLSearchParams()
      if (search) p.set('search', search)
      if (category) p.set('category', category)
      return api.get(`/materials?${p}`).then(r => r.data)
    },
  })

  const { data: txData } = useQuery({
    queryKey: ['stock-transactions'],
    queryFn: () => api.get('/stock-transactions').then(r => r.data),
  })

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/materials/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  })

  const materials: Material[] = data?.data ?? []
  const transactions = txData?.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track material stock and manage procurement</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Create Order
          </button>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Material
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials..."
          className={inp + ' max-w-xs'} />
        <select value={category} onChange={e => setCategory(e.target.value)} className={inp + ' max-w-xs'}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Material Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {materials.map(m => {
          const pct = m.max_quantity ? Math.round((m.stock_quantity / m.max_quantity) * 100) : 0
          const isLow = m.stock_quantity <= m.reorder_level
          return (
            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-bold text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {isLow ? '⚠ Low Stock' : '✓ Available'}
                  </span>
                  <button className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => del.mutate(m.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Stock bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Stock Level</span>
                  <span className="font-semibold text-gray-900">{m.stock_quantity} {m.unit}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isLow ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>Min: {m.reorder_level}</span>
                  <span>Max: {m.max_quantity ?? '—'}</span>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div>
                  <span className="text-gray-400">Supplier</span>
                  <p className="font-medium text-gray-700">{m.supplier ?? '—'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Cost/Unit</span>
                  <p className="font-medium text-gray-700">{m.cost_per_unit ? `৳${m.cost_per_unit}/${m.unit}` : '—'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Avg. Consumption</span>
                  <p className="font-medium text-gray-700">{m.avg_consumption ?? '—'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Last Delivery</span>
                  <p className="font-medium text-gray-700">{m.last_delivery_date ? formatDate(m.last_delivery_date) : 'N/A'}</p>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setStockIn(m)}
                  className="w-full py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium"
                >
                  + Stock In
                </button>
              </div>
            </div>
          )
        })}
        {materials.length === 0 && (
          <div className="col-span-2 py-16 text-center text-gray-400">No materials found</div>
        )}
      </div>

      {/* Recent Orders */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
            <p className="text-xs text-gray-400">Track recent orders and deliveries</p>
          </div>
          <div className="divide-y divide-gray-100">
            {transactions.slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{tx.material_id}</p>
                  <p className="text-xs text-gray-400">{tx.transaction_type} · {formatDate(tx.date ?? tx.created_at)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">{tx.quantity} units</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && <AddMaterialModal onClose={() => setShowAdd(false)} />}
      {stockIn  && <StockInModal material={stockIn} onClose={() => setStockIn(null)} />}
    </div>
  )
}
