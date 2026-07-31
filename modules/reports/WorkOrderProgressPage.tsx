'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
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
  totalContract: number; totalBilled: number; totalPaid: number; totalRetention: number
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

const STATUS_COLOR: Record<string, string> = {
  Draft: 'bg-surface-muted text-content-muted', Active: 'bg-primary/10 text-primary',
  Completed: 'bg-success/10 text-success', Cancelled: 'bg-danger/10 text-danger',
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
        <label className="text-sm font-medium text-content shrink-0">Project:</label>
        <Select value={projectId} onChange={e => setProjectId(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
        </Select>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && (data?.rows.length ?? 0) === 0} emptyMessage="No work orders found.">
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border-default bg-primary/10 p-4">
              <p className="text-xs text-primary uppercase font-semibold">Total Contract Value</p>
              <p className="text-2xl font-bold text-info mt-1">{fmt(data?.totalContract ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-border-default bg-warning/15 p-4">
              <p className="text-xs text-warning uppercase font-semibold">Total Billed</p>
              <p className="text-2xl font-bold text-warning mt-1">{fmt(data?.totalBilled ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-border-default bg-success/10 p-4">
              <p className="text-xs text-success uppercase font-semibold">Total Paid</p>
              <p className="text-2xl font-bold text-success mt-1">{fmt(data?.totalPaid ?? 0)}</p>
              <p className="text-xs text-content-muted mt-1">
                {fmt(Math.max(0, (data?.totalBilled ?? 0) - (data?.totalPaid ?? 0)))} outstanding
              </p>
            </div>
            <div className="rounded-xl border border-border-default bg-warning/15 p-4">
              <p className="text-xs text-warning uppercase font-semibold">Retention Held</p>
              <p className="text-2xl font-bold text-warning mt-1">{fmt(data?.totalRetention ?? 0)}</p>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-surface-muted border-b border-border-default">
                  <tr>
                    {['WO No', 'Project', 'Vendor', 'Contract', 'Billed', '% Billed', 'Paid', 'Retention', 'Advance', 'Recovered', 'Status'].map(h => (
                      <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${['Contract','Billed','Paid','Retention','Advance','Recovered'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {data?.rows.map(r => (
                    <tr key={r.workOrderId} className="hover:bg-surface-muted">
                      <td className="px-3 py-2 font-medium text-primary">{r.workOrderNo}</td>
                      <td className="px-3 py-2 text-xs text-content-muted">{r.projectName}</td>
                      <td className="px-3 py-2 text-content">{r.vendorName}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(r.contractAmount)}</td>
                      <td className="px-3 py-2 text-right text-warning">{fmt(r.totalBilled)}</td>
                      <td className="px-3 py-2 w-28">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                            <div className="h-1.5 bg-primary rounded-full" style={{ width: `${Math.min(r.percentBilled, 100)}%` }} />
                          </div>
                          <span className="text-xs text-content-muted w-8 text-right">{r.percentBilled}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-success">{fmt(r.totalPaid)}</td>
                      <td className="px-3 py-2 text-right text-warning">{fmt(r.retentionHeld)}</td>
                      <td className="px-3 py-2 text-right text-content-muted">{fmt(r.advanceGiven)}</td>
                      <td className="px-3 py-2 text-right text-content-muted">{fmt(r.advanceRecovered)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] ?? 'bg-surface-muted text-content-muted'}`}>{r.status}</span>
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
