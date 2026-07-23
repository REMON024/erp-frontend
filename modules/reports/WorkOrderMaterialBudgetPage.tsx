'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'

interface Project { id: number; projectCode: string; projectName: string }
interface WorkOrder { id: number; workOrderNo: string; projectName: string }
interface WorkOrderMaterialBudgetRow {
  workOrderId: number; workOrderNo: string; projectName: string
  materialName: string; unit: string
  budgetQty: number; receivedQty: number; remainingQty: number
  unitRate: number; budgetAmount: number; receivedValue: number; receivedPct: number
}
interface WorkOrderMaterialBudgetDto {
  rows: WorkOrderMaterialBudgetRow[]
  totalBudgetAmount: number; totalReceivedValue: number
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtQ(n: number) { return n.toLocaleString('en-BD', { maximumFractionDigits: 3 }) }

export function WorkOrderMaterialBudgetPage() {
  const [projectId, setProjectId]     = useState('')
  const [workOrderId, setWorkOrderId] = useState('')

  const { data: projects = [] }   = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data: workOrders = [] } = useApiData<WorkOrder[]>({ url: '/work-orders', queryKey: ['work-orders-list'] })
  const { data, isLoading, error, refetch } = useApiData<WorkOrderMaterialBudgetDto>({
    url: '/reports/work-order-material-budget',
    params: { projectId: projectId || undefined, workOrderId: workOrderId || undefined },
    queryKey: ['work-order-material-budget', projectId, workOrderId],
  })

  const totalRemaining = (data?.totalBudgetAmount ?? 0) - (data?.totalReceivedValue ?? 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Work Order — Budget vs Received" subtitle="Budgeted materials against quantities received via stock-in per work order" />

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-content mb-1">Project</label>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)} className="min-w-[150px]">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-content mb-1">Work Order</label>
          <Select value={workOrderId} onChange={e => setWorkOrderId(e.target.value)} className="min-w-[200px]">
            <option value="">All Work Orders</option>
            {workOrders.map(w => <option key={w.id} value={w.id}>{w.workOrderNo} — {w.projectName}</option>)}
          </Select>
        </div>
        <button onClick={() => refetch()}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium self-end">
          Refresh
        </button>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && (data?.rows.length ?? 0) === 0} emptyMessage="No budgeted materials found for the selected filters.">
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border-default bg-surface p-4">
              <p className="text-xs text-content-muted uppercase font-semibold">Total Budgeted</p>
              <p className="text-2xl font-bold text-content mt-1">{fmt(data?.totalBudgetAmount ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-border-default bg-primary/10 p-4">
              <p className="text-xs text-primary uppercase font-semibold">Total Received</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{fmt(data?.totalReceivedValue ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-border-default bg-surface p-4">
              <p className="text-xs text-content-muted uppercase font-semibold">Remaining Budget</p>
              <p className={`text-2xl font-bold mt-1 ${totalRemaining < 0 ? 'text-red-700' : 'text-content'}`}>{fmt(totalRemaining)}</p>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-surface-muted border-b border-border-default">
                  <tr>
                    {['Work Order', 'Project', 'Material', 'Unit', 'Budget Qty', 'Received', 'Remaining', 'Received %', 'Budget Amount', 'Received Value'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-content-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {data?.rows.map((r, i) => (
                    <tr key={`${r.workOrderId}-${i}`} className="hover:bg-surface-muted">
                      <td className="px-3 py-2 text-xs font-medium text-content">{r.workOrderNo}</td>
                      <td className="px-3 py-2 text-xs text-content-muted">{r.projectName}</td>
                      <td className="px-3 py-2 font-medium text-content">{r.materialName}</td>
                      <td className="px-3 py-2 text-content-muted">{r.unit}</td>
                      <td className="px-3 py-2 text-right text-content">{fmtQ(r.budgetQty)}</td>
                      <td className="px-3 py-2 text-right text-green-700">{fmtQ(r.receivedQty)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${r.remainingQty < 0 ? 'text-red-700' : 'text-content'}`}>{fmtQ(r.remainingQty)}</td>
                      <td className="px-3 py-2 text-right text-content-muted">{r.receivedPct}%</td>
                      <td className="px-3 py-2 text-right text-content-muted">{fmt(r.budgetAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-primary">{fmt(r.receivedValue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border-default bg-surface-muted font-bold">
                  <tr>
                    <td colSpan={8} className="px-3 py-2 text-xs uppercase text-content">Totals</td>
                    <td className="px-3 py-2 text-right text-content">{fmt(data?.totalBudgetAmount ?? 0)}</td>
                    <td className="px-3 py-2 text-right text-blue-800">{fmt(data?.totalReceivedValue ?? 0)}</td>
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
