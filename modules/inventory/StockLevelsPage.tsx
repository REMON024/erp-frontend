'use client'
import { useState } from 'react'
import { AlertTriangle, Package } from 'lucide-react'

export interface StockItem {
  id: string; name: string; category: string; unit: string
  current_stock: number; reorder_level: number; total_in: number; total_out: number
}

export const STOCK_ITEMS: StockItem[] = [
  { id: 'm1', name: 'Cement',       category: 'Cement & Other',  unit: 'Bag',  current_stock: 320, reorder_level: 100, total_in: 1300, total_out: 980 },
  { id: 'm2', name: 'Steel Rod',    category: 'Steel & Iron',    unit: 'Ton',  current_stock: 12,  reorder_level: 5,   total_in: 30,   total_out: 18  },
  { id: 'm3', name: 'Bricks',       category: 'Solid',           unit: 'Pcs',  current_stock: 4200,reorder_level: 2000,total_in: 20000,total_out: 15800 },
  { id: 'm4', name: 'Sand',         category: 'Sand',            unit: 'CFT',  current_stock: 80,  reorder_level: 200, total_in: 1500, total_out: 1420 },
  { id: 'm5', name: 'Gravel',       category: 'Gravel',          unit: 'CFT',  current_stock: 150, reorder_level: 100, total_in: 800,  total_out: 650  },
  { id: 'm6', name: 'Tiles',        category: 'Finishing',       unit: 'Sqft', current_stock: 600, reorder_level: 200, total_in: 1200, total_out: 600  },
  { id: 'm7', name: 'Paint',        category: 'Finishing',       unit: 'Litre',current_stock: 45,  reorder_level: 50,  total_in: 200,  total_out: 155  },
  { id: 'm8', name: 'Electric Wire',category: 'Electrical',      unit: 'Mtr',  current_stock: 800, reorder_level: 300, total_in: 2000, total_out: 1200 },
  { id: 'm9', name: 'Plumbing Pipe',category: 'Plumbing',        unit: 'Ft',   current_stock: 120, reorder_level: 100, total_in: 500,  total_out: 380  },
  { id: 'm10',name: 'Glass',        category: 'Finishing',       unit: 'Sqft', current_stock: 30,  reorder_level: 50,  total_in: 200,  total_out: 170  },
]

export function StockLevelsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'low'>('all')

  const displayed = STOCK_ITEMS.filter(s => {
    const ok = s.name.toLowerCase().includes(search.toLowerCase())
    if (filter === 'low') return ok && s.current_stock <= s.reorder_level
    return ok
  })

  const lowStock = STOCK_ITEMS.filter(s => s.current_stock <= s.reorder_level).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Levels</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time material stock in the central store</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Materials</p><p className="text-2xl font-bold text-blue-600 mt-1">{STOCK_ITEMS.length}</p></div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Package className="w-5 h-5 text-blue-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Low Stock Alerts</p><p className="text-2xl font-bold text-red-600 mt-1">{lowStock}</p><p className="text-xs text-gray-400 mt-1">Below reorder level</p></div>
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Adequate Stock</p><p className="text-2xl font-bold text-green-600 mt-1">{STOCK_ITEMS.length - lowStock}</p></div>
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><Package className="w-5 h-5 text-green-600" /></div>
        </div>
      </div>

      {lowStock > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-800 font-medium">{lowStock} material(s) are at or below reorder level — arrange replenishment immediately.</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none max-w-xs w-full" />
        {(['all', 'low'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {f === 'all' ? 'All Stock' : 'Low Stock Only'}
          </button>
        ))}
      </div>

      {/* Stock table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Material', 'Category', 'Unit', 'Current Stock', 'Reorder Level', 'Stock Level', 'Total In', 'Total Out'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(s => {
              const isLow = s.current_stock <= s.reorder_level
              const pct = s.reorder_level > 0 ? Math.min((s.current_stock / (s.reorder_level * 3)) * 100, 100) : 50
              return (
                <tr key={s.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.category}</td>
                  <td className="px-4 py-3 text-gray-500">{s.unit}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{s.current_stock.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.reorder_level.toLocaleString()}</td>
                  <td className="px-4 py-3 w-36">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      {isLow && <span className="text-[10px] font-bold text-red-600 shrink-0">LOW</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.total_in.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{s.total_out.toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        </div>
      </div>
    </div>
  )
}
