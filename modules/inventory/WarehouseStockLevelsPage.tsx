'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { AlertTriangle } from 'lucide-react'

interface BalanceRow { warehouseId: number | null; warehouseName: string; balance: number; lowStock: boolean }
interface Rollup {
  materialId: number; materialName: string; unit: string; reorder: number
  companyTotal: number; lowStock: boolean; warehouses: BalanceRow[]
}
interface Warehouse { id: number; name: string }

export function WarehouseStockLevelsPage() {
  const [warehouseId, setWarehouseId] = useState('')
  const { data: warehouses = [] } = useApiData<Warehouse[]>({ url: '/warehouses', params: { activeOnly: true }, queryKey: ['warehouses-list'] })
  const { data: rollups = [], isLoading, error, refetch } = useApiData<Rollup[]>({
    url: '/stock-transactions/balances',
    params: warehouseId ? { warehouseId } : undefined,
    queryKey: ['stock-balances', warehouseId],
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Levels" subtitle="Per-warehouse balances with company roll-up" />

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Warehouse</label>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All warehouses (roll-up)</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load stock levels.' : null} onRetry={refetch}
        empty={rollups.length === 0} emptyMessage="No active materials.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{['Material', 'Per-warehouse', 'Company Total', 'Reorder', 'Status'].map(h =>
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rollups.map(r => (
                  <tr key={r.materialId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.materialName}<span className="text-xs text-gray-400 ml-1">({r.unit})</span></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.warehouses.length === 0 && <span className="text-xs text-gray-400">—</span>}
                        {r.warehouses.map((w, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${w.lowStock ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                            {w.warehouseName}: {w.balance.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{r.companyTotal.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{r.reorder.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {r.lowStock
                        ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3" /> Low</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>
    </div>
  )
}
