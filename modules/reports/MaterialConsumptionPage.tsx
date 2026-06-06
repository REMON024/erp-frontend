'use client'
import { useState } from 'react'
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
          <label className="block text-xs font-medium text-gray-700 mb-1">Project</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <button onClick={() => refetch()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium self-end">
          Refresh
        </button>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && (data?.rows.length ?? 0) === 0} emptyMessage="No material transactions found for the selected filters.">
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-blue-50 p-4">
              <p className="text-xs text-blue-600 uppercase font-semibold">Total Issued Value</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{fmt(data?.totalIssuedValue ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">Materials Used</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data?.rows.length ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">Categories</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{categories.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Code', 'Material', 'Category', 'Unit', 'Received', 'Issued', 'Balance', 'Avg Cost', 'Issued Value'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.rows.map(r => (
                    <tr key={r.materialId} className={r.balanceQty < 0 ? 'bg-red-50/40' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2 text-xs text-gray-400">{r.materialCode}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{r.materialName}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{r.category}</td>
                      <td className="px-3 py-2 text-gray-500">{r.unit}</td>
                      <td className="px-3 py-2 text-right text-green-700">{fmtQ(r.receivedQty)}</td>
                      <td className="px-3 py-2 text-right text-blue-700">{fmtQ(r.issuedQty)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${r.balanceQty < 0 ? 'text-red-700' : 'text-gray-800'}`}>{fmtQ(r.balanceQty)}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{fmt(r.avgCost)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-blue-700">{fmt(r.issuedValue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50 font-bold">
                  <tr>
                    <td colSpan={8} className="px-3 py-2 text-xs uppercase text-gray-700">Total Issued Value</td>
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
