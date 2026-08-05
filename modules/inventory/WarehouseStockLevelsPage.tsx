'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { AlertTriangle } from 'lucide-react'

interface BalanceRow { warehouseId: number | null; warehouseName: string; balance: number; lowStock: boolean }
interface Rollup {
  resourceId: number; resourceName: string; unit: string; category?: string | null; reorder: number
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

      <div className="bg-surface rounded-xl border border-border-default p-4 flex gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-content-muted mb-1">Warehouse</label>
          <Select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
            className="min-w-[150px]">
            <option value="">All warehouses (roll-up)</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </div>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load stock levels.' : null} onRetry={refetch}
        empty={rollups.length === 0} emptyMessage="No active materials.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>{[
                  { h: 'Material' }, { h: 'Category' }, { h: 'Per-warehouse' }, { h: 'Company Total', num: true },
                  { h: 'Reorder', num: true }, { h: 'Status' },
                ].map(({ h, num }) =>
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {rollups.map(r => (
                  <tr key={r.resourceId} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-medium text-content">{r.resourceName}<span className="text-xs text-content-muted ml-1">({r.unit})</span></td>
                    <td className="px-4 py-3 text-content-muted text-xs">{r.category || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.warehouses.length === 0 && <span className="text-xs text-content-muted">—</span>}
                        {r.warehouses.map((w, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${w.lowStock ? 'bg-warning/15 text-warning' : 'bg-surface-muted text-content-muted'}`}>
                            {w.warehouseName}: {w.balance.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-content text-right tabular-nums">{r.companyTotal.toLocaleString()}</td>
                    <td className="px-4 py-3 text-content-muted text-right tabular-nums">{r.reorder.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {r.lowStock
                        ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger"><AlertTriangle className="w-3 h-3" /> Low</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">OK</span>}
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
