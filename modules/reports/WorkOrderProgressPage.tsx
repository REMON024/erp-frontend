'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'

interface Project { id: number; projectCode: string; projectName: string }
interface WorkOrderProgressRow {
  workOrderId: number; workOrderNo: string; projectName: string; vendorName: string
  contractAmount: number; totalBilled: number; totalPaid: number
  retentionHeld: number; advanceGiven: number; advanceRecovered: number
  percentBilled: number; status: string
}
interface WorkOrderProgressDto {
  rows: WorkOrderProgressRow[]
  totalContract: number; totalBilled: number; totalRetention: number
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

const STATUS_COLOR: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600', Active: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700', Cancelled: 'bg-red-100 text-red-600',
}

export function WorkOrderProgressPage() {
  const [projectId, setProjectId] = useState('')
  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data, isLoading, error, refetch } = useApiData<WorkOrderProgressDto>({
    url: '/reports/work-order-progress',
    params: { projectId: projectId || undefined },
    queryKey: ['wo-progress', projectId],
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Work Order Progress" subtitle="Contract amount, billing progress, retention, and advance recovery" />

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700 shrink-0">Project:</label>
        <select value={projectId} onChange={e => setProjectId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
        </select>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && (data?.rows.length ?? 0) === 0} emptyMessage="No work orders found.">
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-blue-50 p-4">
              <p className="text-xs text-blue-600 uppercase font-semibold">Total Contract Value</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{fmt(data?.totalContract ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-orange-50 p-4">
              <p className="text-xs text-orange-600 uppercase font-semibold">Total Billed</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{fmt(data?.totalBilled ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-yellow-50 p-4">
              <p className="text-xs text-yellow-600 uppercase font-semibold">Retention Held</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">{fmt(data?.totalRetention ?? 0)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['WO No', 'Project', 'Vendor', 'Contract', 'Billed', '% Billed', 'Paid', 'Retention', 'Advance', 'Recovered', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.rows.map(r => (
                    <tr key={r.workOrderId} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-blue-700">{r.workOrderNo}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.projectName}</td>
                      <td className="px-3 py-2 text-gray-700">{r.vendorName}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(r.contractAmount)}</td>
                      <td className="px-3 py-2 text-right text-orange-700">{fmt(r.totalBilled)}</td>
                      <td className="px-3 py-2 w-28">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${Math.min(r.percentBilled, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{r.percentBilled}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-green-700">{fmt(r.totalPaid)}</td>
                      <td className="px-3 py-2 text-right text-yellow-700">{fmt(r.retentionHeld)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{fmt(r.advanceGiven)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{fmt(r.advanceRecovered)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      </DataState>
    </div>
  )
}
