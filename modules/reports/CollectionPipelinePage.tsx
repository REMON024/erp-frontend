'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'

interface Project { id: number; projectCode: string; projectName: string }
interface CollectionPipelineRow {
  bookingId: number; bookingNo: string; customerName: string
  unitNo: string; projectName: string
  netAmount: number; collected: number; outstanding: number
  totalInstallments: number; paidInstallments: number; overdueInstallments: number
  status: string
}
interface CollectionPipelineDto {
  rows: CollectionPipelineRow[]
  totalNetAmount: number; totalCollected: number; totalOutstanding: number
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

export function CollectionPipelinePage() {
  const [projectId, setProjectId] = useState('')
  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data, isLoading, error, refetch } = useApiData<CollectionPipelineDto>({
    url: '/reports/collection-pipeline',
    params: { projectId: projectId || undefined },
    queryKey: ['collection-pipeline', projectId],
  })

  const collectedPct = pct(data?.totalCollected ?? 0, data?.totalNetAmount ?? 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Collection Pipeline" subtitle="Booking receivables — collected vs outstanding per customer" />

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700 shrink-0">Project:</label>
        <select value={projectId} onChange={e => setProjectId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
        </select>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && (data?.rows.length ?? 0) === 0} emptyMessage="No active bookings found.">
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Net Value',   value: fmt(data?.totalNetAmount    ?? 0), color: 'text-gray-900', bg: 'bg-white' },
              { label: 'Collected',         value: fmt(data?.totalCollected    ?? 0), color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Outstanding',       value: fmt(data?.totalOutstanding  ?? 0), color: 'text-red-700', bg: 'bg-red-50' },
              { label: 'Collection Rate',   value: `${collectedPct}%`,               color: collectedPct >= 80 ? 'text-green-700' : 'text-orange-600', bg: 'bg-white' },
            ].map(k => (
              <div key={k.label} className={`rounded-xl border border-gray-200 p-4 ${k.bg}`}>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
                <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Booking No', 'Customer', 'Unit', 'Project', 'Net Value', 'Collected', 'Outstanding', 'Progress', 'Installments', 'Overdue'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.rows.map(r => {
                    const p = pct(r.collected, r.netAmount)
                    return (
                      <tr key={r.bookingId} className={r.overdueInstallments > 0 ? 'bg-red-50/30' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-2 font-medium text-blue-700">{r.bookingNo}</td>
                        <td className="px-3 py-2 text-gray-800">{r.customerName}</td>
                        <td className="px-3 py-2 text-gray-500">{r.unitNo}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{r.projectName}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmt(r.netAmount)}</td>
                        <td className="px-3 py-2 text-right text-green-700 font-semibold">{fmt(r.collected)}</td>
                        <td className="px-3 py-2 text-right text-red-700 font-semibold">{fmt(r.outstanding)}</td>
                        <td className="px-3 py-2 w-28">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-1.5 rounded-full ${p >= 100 ? 'bg-green-500' : p >= 60 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                style={{ width: `${Math.min(p, 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{p}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-gray-600">{r.paidInstallments}/{r.totalInstallments}</td>
                        <td className="px-3 py-2 text-center">
                          {r.overdueInstallments > 0 && (
                            <span className="text-xs font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">{r.overdueInstallments}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      </DataState>
    </div>
  )
}
