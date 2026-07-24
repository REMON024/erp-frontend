'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
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
        <label className="text-sm font-medium text-content shrink-0">Project:</label>
        <Select value={projectId} onChange={e => setProjectId(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
        </Select>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && (data?.rows.length ?? 0) === 0} emptyMessage="No active bookings found.">
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Net Value',   value: fmt(data?.totalNetAmount    ?? 0), color: 'text-content', bg: 'bg-surface' },
              { label: 'Collected',         value: fmt(data?.totalCollected    ?? 0), color: 'text-success', bg: 'bg-success/10' },
              { label: 'Outstanding',       value: fmt(data?.totalOutstanding  ?? 0), color: 'text-danger', bg: 'bg-danger/10' },
              { label: 'Collection Rate',   value: `${collectedPct}%`,               color: collectedPct >= 80 ? 'text-success' : 'text-warning', bg: 'bg-surface' },
            ].map(k => (
              <div key={k.label} className={`rounded-xl border border-border-default p-4 ${k.bg}`}>
                <p className="text-xs text-content-muted uppercase tracking-wide">{k.label}</p>
                <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-surface-muted border-b border-border-default">
                  <tr>
                    {['Booking No', 'Customer', 'Unit', 'Project', 'Net Value', 'Collected', 'Outstanding', 'Progress', 'Installments', 'Overdue'].map(h => (
                      <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${['Net Value','Collected','Outstanding'].includes(h) ? 'text-right' : ['Installments','Overdue'].includes(h) ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {data?.rows.map(r => {
                    const p = pct(r.collected, r.netAmount)
                    return (
                      <tr key={r.bookingId} className={r.overdueInstallments > 0 ? 'bg-danger/10' : 'hover:bg-surface-muted'}>
                        <td className="px-3 py-2 font-medium text-primary">{r.bookingNo}</td>
                        <td className="px-3 py-2 text-content">{r.customerName}</td>
                        <td className="px-3 py-2 text-content-muted">{r.unitNo}</td>
                        <td className="px-3 py-2 text-content-muted text-xs">{r.projectName}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmt(r.netAmount)}</td>
                        <td className="px-3 py-2 text-right text-success font-semibold">{fmt(r.collected)}</td>
                        <td className="px-3 py-2 text-right text-danger font-semibold">{fmt(r.outstanding)}</td>
                        <td className="px-3 py-2 w-28">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                              <div className={`h-1.5 rounded-full ${p >= 100 ? 'bg-success' : p >= 60 ? 'bg-primary' : 'bg-warning'}`}
                                style={{ width: `${Math.min(p, 100)}%` }} />
                            </div>
                            <span className="text-xs text-content-muted w-8 text-right">{p}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-content-muted">{r.paidInstallments}/{r.totalInstallments}</td>
                        <td className="px-3 py-2 text-center">
                          {r.overdueInstallments > 0 && (
                            <span className="text-xs font-semibold text-danger bg-danger/10 px-1.5 py-0.5 rounded-full">{r.overdueInstallments}</span>
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
