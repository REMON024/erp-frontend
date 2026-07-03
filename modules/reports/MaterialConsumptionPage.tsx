'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'

interface Project { id: number; projectCode: string; projectName: string }
interface MaterialConsumptionRow {
  materialId: number; materialCode: string; materialName: string
  category: string; unit: string
  receivedQty: number; issuedQty: number; balanceQty: number
  avgCost: number; issuedValue: number
}
interface MaterialConsumptionDto { rows: MaterialConsumptionRow[]; totalIssuedValue: number }

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtQ(n: number) { return n.toLocaleString('en-BD', { maximumFractionDigits: 3 }) }

export function MaterialConsumptionPage() {
  const [projectId, setProjectId] = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo,   setDateTo]     = useState('')

  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data, isLoading, error, refetch } = useApiData<MaterialConsumptionDto>({
    url: '/reports/material-consumption',
    params: { projectId: projectId || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
    queryKey: ['material-consumption', projectId, dateFrom, dateTo],
  })

  const categories = [...new Set(data?.rows.map(r => r.category) ?? [])]

  return (
    <div className="space-y-6">
      <PageHeader title="Material Consumption Report" subtitle="Received, issued, and balance per material with cost valuation" />

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-content mb-1">Project</label>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)}
            className="min-w-[150px]">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-content mb-1">From</label>
          <DateField value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="min-w-[150px]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-content mb-1">To</label>
          <DateField value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="min-w-[150px]" />
        </div>
        <button onClick={() => refetch()}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium self-end">
          Refresh
        </button>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && (data?.rows.length ?? 0) === 0} emptyMessage="No material transactions found for the selected filters.">
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border-default bg-primary/10 p-4">
              <p className="text-xs text-primary uppercase font-semibold">Total Issued Value</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{fmt(data?.totalIssuedValue ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-border-default bg-surface p-4">
              <p className="text-xs text-content-muted uppercase font-semibold">Materials Used</p>
              <p className="text-2xl font-bold text-content mt-1">{data?.rows.length ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border-default bg-surface p-4">
              <p className="text-xs text-content-muted uppercase font-semibold">Categories</p>
              <p className="text-2xl font-bold text-content mt-1">{categories.length}</p>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="bg-surface-muted border-b border-border-default">
                  <tr>
                    {['Code', 'Material', 'Category', 'Unit', 'Received', 'Issued', 'Balance', 'Avg Cost', 'Issued Value'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-content-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {data?.rows.map(r => (
                    <tr key={r.materialId} className={r.balanceQty < 0 ? 'bg-red-50/40' : 'hover:bg-surface-muted'}>
                      <td className="px-3 py-2 text-xs text-content-muted">{r.materialCode}</td>
                      <td className="px-3 py-2 font-medium text-content">{r.materialName}</td>
                      <td className="px-3 py-2 text-xs text-content-muted">{r.category}</td>
                      <td className="px-3 py-2 text-content-muted">{r.unit}</td>
                      <td className="px-3 py-2 text-right text-green-700">{fmtQ(r.receivedQty)}</td>
                      <td className="px-3 py-2 text-right text-primary">{fmtQ(r.issuedQty)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${r.balanceQty < 0 ? 'text-red-700' : 'text-content'}`}>{fmtQ(r.balanceQty)}</td>
                      <td className="px-3 py-2 text-right text-content-muted">{fmt(r.avgCost)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-primary">{fmt(r.issuedValue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border-default bg-surface-muted font-bold">
                  <tr>
                    <td colSpan={8} className="px-3 py-2 text-xs uppercase text-content">Total Issued Value</td>
                    <td className="px-3 py-2 text-right text-blue-800">{fmt(data?.totalIssuedValue ?? 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      </DataState>
    </div>
  )
}
