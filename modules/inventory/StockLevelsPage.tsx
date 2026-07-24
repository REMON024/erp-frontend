'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { AlertTriangle, Package } from 'lucide-react'

interface Material {
  id: number; materialCode: string; materialName: string; category?: string
  unit: string; minimumStock: number; averageCost: number
  currentStock: number; status: string; isLowStock: boolean
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

export function StockLevelsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'low'>('all')

  const { data: materials = [], isLoading, error, refetch } = useApiData<Material[]>({
    url: '/materials',
    params: { lowStock: filter === 'low' ? true : undefined },
    queryKey: ['materials', 'levels', filter],
  })

  const displayed = materials.filter(m => m.materialName.toLowerCase().includes(search.toLowerCase()))
  const lowStock   = materials.filter(m => m.isLowStock).length
  const stockValue = materials.reduce((s, m) => s + m.currentStock * m.averageCost, 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Levels" subtitle="Real-time material stock in the central store" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border-default p-5 flex justify-between items-start">
          <div><p className="text-sm text-content-muted">Total Materials</p><p className="text-2xl font-bold text-primary mt-1">{materials.length}</p></div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="w-5 h-5 text-primary" /></div>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-5 flex justify-between items-start">
          <div><p className="text-sm text-content-muted">Low Stock Alerts</p><p className="text-2xl font-bold text-danger mt-1">{lowStock}</p><p className="text-xs text-content-muted mt-1">Below reorder level</p></div>
          <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-danger" /></div>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-5 flex justify-between items-start">
          <div><p className="text-sm text-content-muted">Stock Value</p><p className="text-2xl font-bold text-info mt-1">{fmt(stockValue)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center"><Package className="w-5 h-5 text-info" /></div>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search material…" onRefresh={refetch}>
        {(['all', 'low'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 text-xs rounded-lg border font-medium capitalize ${
              filter === f ? 'bg-primary text-white border-primary' : 'border-border-default text-content-muted hover:border-info/20'
            }`}>{f === 'all' ? 'All' : 'Low Stock'}</button>
        ))}
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load stock.' : null} onRetry={refetch}
        empty={displayed.length === 0} emptyMessage="No materials found.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Material' }, { h: 'Code' }, { h: 'Unit' },
                    { h: 'Current Stock', num: true }, { h: 'Reorder Level', num: true }, { h: 'Status' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {displayed.map(m => (
                  <tr key={m.id} className={`hover:bg-surface-muted ${m.isLowStock ? 'bg-danger/10' : ''}`}>
                    <td className="px-4 py-3 font-medium text-content">{m.materialName}</td>
                    <td className="px-4 py-3 text-content-muted text-xs font-mono">{m.materialCode}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{m.unit}</td>
                    <td className={`px-4 py-3 font-bold text-right tabular-nums ${m.isLowStock ? 'text-danger' : 'text-content'}`}>{m.currentStock.toLocaleString()}</td>
                    <td className="px-4 py-3 text-content-muted text-xs text-right tabular-nums">{m.minimumStock.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${m.isLowStock ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                        {m.isLowStock ? 'Low' : 'OK'}
                      </span>
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
