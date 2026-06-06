'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Project { id: number; projectCode: string; projectName: string }
interface CostVarianceRow {
  category: string; description: string
  estimatedAmount: number; actualAmount: number
  variance: number; variancePct: number
}
interface CostVarianceDto {
  projectId: number; projectName: string
  rows: CostVarianceRow[]
  totalEstimated: number; totalActual: number; totalVariance: number
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

export function CostVariancePage() {
  const [projectId, setProjectId] = useState('')
  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })

  const { data, isLoading, error, refetch } = useApiData<CostVarianceDto>({
    url: `/reports/cost-variance`,
    params: { projectId: projectId || undefined },
    queryKey: ['cost-variance', projectId],
    enabled: !!projectId,
  })

  const byCategory: Record<string, CostVarianceRow[]> = {}
  data?.rows.forEach(r => { (byCategory[r.category] ??= []).push(r) })

  const totalVariancePct = data && data.totalEstimated > 0
    ? Math.round((data.totalVariance / data.totalEstimated) * 100 * 10) / 10 : 0

  return (
    <div className="space-y-6">
      <PageHeader title="Cost Variance Report" subtitle="Estimated vs actual cost per BOQ line for the latest approved estimate" />

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700 shrink-0">Project:</label>
        <select value={projectId} onChange={e => setProjectId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[260px]">
          <option value="">— select a project —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
        </select>
      </div>

      {!projectId && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Select a project to view cost variance analysis</p>
        </div>
      )}

      {projectId && (
        <DataState loading={isLoading} error={error ? 'No approved estimate found or failed to load.' : null}
          onRetry={refetch} empty={!isLoading && !data} emptyMessage="No approved cost estimate found for this project.">
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Estimated', value: fmt(data?.totalEstimated ?? 0), color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: 'Total Actual',    value: fmt(data?.totalActual    ?? 0), color: data?.totalActual ?? 0 > (data?.totalEstimated ?? 0) ? 'text-red-700' : 'text-green-700', bg: 'bg-white' },
                { label: 'Total Variance',  value: fmt(data?.totalVariance  ?? 0), color: (data?.totalVariance ?? 0) > 0 ? 'text-red-700' : 'text-green-700', bg: (data?.totalVariance ?? 0) > 0 ? 'bg-red-50' : 'bg-green-50' },
                { label: 'Variance %',      value: `${totalVariancePct > 0 ? '+' : ''}${totalVariancePct}%`, color: totalVariancePct > 0 ? 'text-red-700' : 'text-green-700', bg: 'bg-white' },
              ].map(k => (
                <div key={k.label} className={`rounded-xl border border-gray-200 p-4 ${k.bg}`}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
                  <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {Object.entries(byCategory).map(([cat, items]) => {
              const catEst = items.reduce((s, i) => s + i.estimatedAmount, 0)
              const catAct = items.reduce((s, i) => s + i.actualAmount,   0)
              const catVar = catAct - catEst
              const isOver = catVar > 0
              return (
                <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className={`px-4 py-2.5 border-b flex items-center justify-between ${isOver ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      {isOver ? <TrendingUp className="w-4 h-4 text-red-500" /> : <TrendingDown className="w-4 h-4 text-green-500" />}
                      <span className="font-semibold text-sm text-gray-800">{cat}</span>
                      <span className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span>Est: <strong className="text-blue-700">{fmt(catEst)}</strong></span>
                      {catAct > 0 && <span className={isOver ? 'text-red-700 font-semibold' : 'text-green-700 font-semibold'}>Act: {fmt(catAct)}</span>}
                      {catVar !== 0 && <span className={`font-bold ${isOver ? 'text-red-700' : 'text-green-700'}`}>{catVar > 0 ? '+' : ''}{fmt(catVar)}</span>}
                    </div>
                  </div>
                  <table className="w-full min-w-[640px] text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Description', 'Estimated', 'Actual', 'Variance', 'Var %'].map(h => (
                          <th key={h} className={`px-3 py-1.5 font-semibold text-gray-500 ${h === 'Description' ? 'text-left' : 'text-right'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((item, idx) => {
                        const over = item.variance > 0
                        return (
                          <tr key={idx} className={over ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-2 text-gray-700">{item.description}</td>
                            <td className="px-3 py-2 text-right text-blue-700 font-semibold">{fmt(item.estimatedAmount)}</td>
                            <td className="px-3 py-2 text-right">
                              {item.actualAmount > 0
                                ? <span className={over ? 'text-red-700 font-semibold' : 'text-green-700'}>{fmt(item.actualAmount)}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className={`px-3 py-2 text-right font-semibold ${over ? 'text-red-700' : item.variance < 0 ? 'text-green-700' : 'text-gray-400'}`}>
                              {item.variance !== 0 ? `${item.variance > 0 ? '+' : ''}${fmt(item.variance)}` : '—'}
                            </td>
                            <td className={`px-3 py-2 text-right ${over ? 'text-red-600' : item.variancePct < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {item.actualAmount > 0 ? `${item.variancePct > 0 ? '+' : ''}${item.variancePct}%` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </>
        </DataState>
      )}
    </div>
  )
}
