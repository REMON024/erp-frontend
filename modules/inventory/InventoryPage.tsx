'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Material, StockTransaction } from '@/types'
import { formatNumber, formatCurrency } from '@/utils/format'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const CATEGORIES = ['All', 'Cement', 'Steel', 'Brick', 'Sand', 'Aggregate', 'Paint', 'Timber', 'Electrical', 'Plumbing', 'Hardware', 'Safety']

const stockSchema = z.object({
  material_id: z.string().min(1, 'Required'),
  warehouse_id: z.string().min(1, 'Required'),
  quantity: z.coerce.number().positive('Must be positive'),
  unit_price: z.coerce.number().positive('Must be positive'),
  notes: z.string().optional(),
})
type StockForm = z.infer<typeof stockSchema>

function StockLevelBar({ quantity, reorder_level }: { quantity: number; reorder_level: number }) {
  const max = Math.max(reorder_level * 3, quantity * 1.2, 100)
  const pct = Math.min((quantity / max) * 100, 100)
  const color = quantity <= reorder_level ? 'bg-red-500' : quantity <= reorder_level * 1.5 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-16 text-right">{formatNumber(quantity)}</span>
    </div>
  )
}

function StockModal({ type, materials, warehouses, onClose }: {
  type: 'in' | 'out'
  materials: Material[]
  warehouses: { id: string; name: string }[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<StockForm>({
    resolver: zodResolver(stockSchema) as any,
  })

  const mutation = useMutation({
    mutationFn: (data: unknown) => api.post(`/stock/${type}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); qc.invalidateQueries({ queryKey: ['stock-transactions'] }); onClose() },
  })

  return (
    <Modal open onClose={onClose} title={type === 'in' ? 'Stock In' : 'Stock Out'} size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
          <select {...register('material_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">Select material</option>
            {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
          </select>
          {errors.material_id && <p className="text-xs text-red-600 mt-1">{errors.material_id.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
          <select {...register('warehouse_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">Select warehouse</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          {errors.warehouse_id && <p className="text-xs text-red-600 mt-1">{errors.warehouse_id.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input type="number" step="0.01" {...register('quantity')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (BDT)</label>
            <input type="number" step="0.01" {...register('unit_price')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.unit_price && <p className="text-xs text-red-600 mt-1">{errors.unit_price.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input {...register('notes')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Optional" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={`px-4 py-2 text-sm rounded-lg text-white font-medium ${type === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-60`}>
            {mutation.isPending ? 'Saving...' : type === 'in' ? 'Record Stock In' : 'Record Stock Out'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function InventoryPage() {
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [stockModal, setStockModal] = useState<'in' | 'out' | null>(null)
  const [activeTab, setActiveTab] = useState<'materials' | 'transactions' | 'alerts'>('materials')

  const { data: materialsData } = useQuery({
    queryKey: ['materials', category, search, warehouseFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (category !== 'All') params.set('category', category)
      if (search) params.set('search', search)
      if (warehouseFilter) params.set('warehouse_id', warehouseFilter)
      return api.get(`/materials?${params}`).then((r) => r.data)
    },
  })

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses').then((r) => r.data),
  })

  const { data: alertsData } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: () => api.get('/materials/alerts').then((r) => r.data),
  })

  const { data: txData } = useQuery({
    queryKey: ['stock-transactions'],
    queryFn: () => api.get('/stock/transactions').then((r) => r.data),
    enabled: activeTab === 'transactions',
  })

  const materials: Material[] = materialsData?.data ?? []
  const warehouses = warehousesData?.data ?? []
  const alerts: Material[] = alertsData?.data ?? []
  const transactions: StockTransaction[] = txData?.data ?? []

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage materials, stock levels, and transactions</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => setStockModal('out')} className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium">
            Stock Out
          </button>
          <button onClick={() => setStockModal('in')} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
            + Stock In
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Materials', value: materials.length, color: 'text-blue-600' },
          { label: 'Low Stock Alerts', value: alerts.length, color: 'text-red-600' },
          { label: 'Warehouses', value: warehouses.length, color: 'text-purple-600' },
          { label: 'Total SKUs', value: materials.length, color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200 px-4">
          {(['materials', 'transactions', 'alerts'] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 -mb-px ${activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
              {t === 'alerts' && alerts.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">{alerts.length}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'materials' && (
          <div>
            {/* Filters */}
            <div className="p-4 flex gap-3 flex-wrap border-b border-gray-100">
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search materials..."
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-56"
              />
              <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">All Warehouses</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <div className="flex gap-1 flex-wrap">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-colors ${category === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Material', 'SKU', 'Category', 'Unit', 'Stock Level', 'Reorder Level'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materials.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{m.sku}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">{m.category}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                      <td className="px-4 py-3 w-40">
                        <StockLevelBar quantity={m.stock_quantity} reorder_level={m.reorder_level} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatNumber(m.reorder_level)} {m.unit}</td>
                    </tr>
                  ))}
                  {materials.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No materials found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Date', 'Material', 'Type', 'Quantity', 'Reference', 'Project'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{tx.created_at.split('T')[0]}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{tx.material_id}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${tx.type === 'in' ? 'bg-emerald-100 text-emerald-700' : tx.type === 'out' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {tx.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatNumber(tx.quantity)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{tx.reference_no ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{tx.project_id ?? '—'}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No transactions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="p-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="py-12 text-center text-gray-400">All stock levels are healthy</div>
            ) : (
              alerts.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">Category: {m.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-700">{formatNumber(m.stock_quantity)} {m.unit} remaining</p>
                    <p className="text-xs text-gray-500 mt-0.5">Reorder at {formatNumber(m.reorder_level)} {m.unit}</p>
                  </div>
                  <div className="ml-4">
                    <button onClick={() => setStockModal('in')} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                      Restock
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {stockModal && (
        <StockModal
          type={stockModal}
          materials={materials}
          warehouses={warehouses}
          onClose={() => setStockModal(null)}
        />
      )}
    </div>
  )
}
