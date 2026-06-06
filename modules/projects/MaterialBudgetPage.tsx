'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { Package, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'

interface Project { id: number; projectCode: string; projectName: string }

interface MaterialBudgetV2Line {
  materialId:    number
  materialName:  string
  materialCode:  string
  category:      string
  unit:          string
  budgetedQty:   number
  budgetedCost:  number
  orderedQty:    number
  committedCost: number
  issuedQty:     number
  actualCost:    number
  variance:      number
  budgetUtilPct: number
}

function fmt(n: number) {
  return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtQ(n: number) {
  return n.toLocaleString('en-BD', { maximumFractionDigits: 3 })
}

function StatusBadge({ line }: { line: MaterialBudgetV2Line }) {
  if (line.budgetedCost === 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Unbudgeted</span>
  }
  if (line.actualCost > line.budgetedCost) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Over Budget</span>
  }
  if (line.committedCost > line.budgetedCost * 0.8) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">At Risk</span>
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">On Track</span>
}

function UtilBar({ pct, overBudget }: { pct: number; overBudget: boolean }) {
  const capped = Math.min(pct, 100)
  const color  = overBudget ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-blue-500'
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${capped}%` }} />
      </div>
      <span className={`text-xs w-9 text-right ${overBudget ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}

const CATEGORY_COLORS: Record<string, string> = {
  Cement:    'bg-gray-100 text-gray-700',
  Steel:     'bg-blue-100 text-blue-700',
  Brick:     'bg-orange-100 text-orange-700',
  Sand:      'bg-yellow-100 text-yellow-700',
  Aggregate: 'bg-stone-100 text-stone-700',
  Paint:     'bg-pink-100 text-pink-700',
  General:   'bg-slate-100 text-slate-600',
}
const catColor = (c: string) => CATEGORY_COLORS[c] ?? 'bg-indigo-100 text-indigo-700'

export function MaterialBudgetPage() {
  const [selectedProject, setSelectedProject] = useState('')

  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })

  const { data: lines = [], isLoading, error, refetch } = useApiData<MaterialBudgetV2Line[]>({
    url: `/cost-estimates/material-budget/${selectedProject || '0'}`,
    queryKey: ['material-budget-v2', selectedProject],
    enabled: !!selectedProject,
  })

  const totalBudget    = lines.reduce((s, l) => s + l.budgetedCost,  0)
  const totalCommitted = lines.reduce((s, l) => s + l.committedCost, 0)
  const totalActual    = lines.reduce((s, l) => s + l.actualCost,    0)
  const totalVariance  = totalActual - totalBudget
  const overBudgetCount = lines.filter(l => l.actualCost > l.budgetedCost && l.budgetedCost > 0).length

  const byCategory: Record<string, MaterialBudgetV2Line[]> = {}
  lines.forEach(l => {
    if (!byCategory[l.category]) byCategory[l.category] = []
    byCategory[l.category].push(l)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Budget vs Actual"
        subtitle="Budgeted (BOQ) · Committed (POs) · Actual (stock issues) — per material per project"
      />

      {/* Project selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700 shrink-0">Project:</label>
        <select
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[260px]"
        >
          <option value="">— select a project —</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>
          ))}
        </select>
      </div>

      {!selectedProject && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Select a project to compare budget vs actual</p>
          <p className="text-xs text-gray-400 mt-1">Shows BOQ budget, PO commitments, and stock issue actuals side by side</p>
        </div>
      )}

      {selectedProject && (
        <DataState
          loading={isLoading}
          error={error ? 'Failed to load material budget data.' : null}
          onRetry={refetch}
          empty={!isLoading && lines.length === 0}
          emptyMessage="No material data found for this project. Add a BOQ estimate, purchase orders, or issue materials to get started."
        >
          <>
            {/* KPI summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Budget (BOQ)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalBudget)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-amber-50 p-4">
                <p className="text-xs text-amber-600 uppercase font-semibold tracking-wide">Committed (POs)</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{fmt(totalCommitted)}</p>
                {totalBudget > 0 && (
                  <p className="text-xs text-amber-500 mt-0.5">
                    {((totalCommitted / totalBudget) * 100).toFixed(1)}% of budget
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 bg-blue-50 p-4">
                <p className="text-xs text-blue-600 uppercase font-semibold tracking-wide">Actual (Issued)</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{fmt(totalActual)}</p>
                {totalBudget > 0 && (
                  <p className="text-xs text-blue-500 mt-0.5">
                    {((totalActual / totalBudget) * 100).toFixed(1)}% of budget
                  </p>
                )}
              </div>
              <div className={`rounded-xl border p-4 ${totalVariance > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                <p className={`text-xs uppercase font-semibold tracking-wide ${totalVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Variance
                </p>
                <p className={`text-2xl font-bold mt-1 ${totalVariance > 0 ? 'text-red-900' : 'text-green-900'}`}>
                  {totalVariance > 0 ? '+' : ''}{fmt(totalVariance)}
                </p>
                {overBudgetCount > 0 && (
                  <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {overBudgetCount} material{overBudgetCount > 1 ? 's' : ''} over budget
                  </p>
                )}
                {overBudgetCount === 0 && totalBudget > 0 && (
                  <p className="text-xs text-green-500 mt-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    All within budget
                  </p>
                )}
              </div>
            </div>

            {/* PO warning if committed exceeds budget */}
            {totalCommitted > totalBudget && totalBudget > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Warning:</span> Total committed from purchase orders ({fmt(totalCommitted)}) exceeds the BOQ budget ({fmt(totalBudget)}). Review your POs before issuing more materials.
                </p>
              </div>
            )}

            {/* Breakdown by category */}
            {Object.entries(byCategory).map(([category, items]) => {
              const catBudget    = items.reduce((s, i) => s + i.budgetedCost,  0)
              const catCommitted = items.reduce((s, i) => s + i.committedCost, 0)
              const catActual    = items.reduce((s, i) => s + i.actualCost,    0)
              const catVariance  = catActual - catBudget
              return (
                <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Category header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${catColor(category)}`}>{category}</span>
                      <span className="text-xs text-gray-400">{items.length} material{items.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-500">Budget: <span className="font-semibold text-gray-800">{fmt(catBudget)}</span></span>
                      <span className="text-amber-600">Committed: <span className="font-semibold">{fmt(catCommitted)}</span></span>
                      <span className="text-blue-600">Actual: <span className="font-semibold">{fmt(catActual)}</span></span>
                      <span className={catVariance > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-semibold'}>
                        {catVariance > 0 ? '+' : ''}{fmt(catVariance)}
                      </span>
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Material</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Unit</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Budget Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Budget Cost</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-amber-600">Ordered Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-amber-600">Committed</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-blue-600">Issued Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-blue-600">Actual Cost</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Variance</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Utilisation</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map(item => {
                          const over = item.actualCost > item.budgetedCost && item.budgetedCost > 0
                          return (
                            <tr key={item.materialId} className={over ? 'bg-red-50/30' : 'hover:bg-gray-50'}>
                              <td className="px-4 py-2.5">
                                <div className="font-medium text-gray-800 leading-tight">{item.materialName}</div>
                                <div className="text-xs text-gray-400">{item.materialCode}</div>
                              </td>
                              <td className="px-4 py-2.5 text-gray-500">{item.unit}</td>
                              <td className="px-4 py-2.5 text-right text-gray-600">{fmtQ(item.budgetedQty)}</td>
                              <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmt(item.budgetedCost)}</td>
                              <td className="px-4 py-2.5 text-right text-amber-700">{fmtQ(item.orderedQty)}</td>
                              <td className="px-4 py-2.5 text-right font-medium text-amber-700">{fmt(item.committedCost)}</td>
                              <td className="px-4 py-2.5 text-right text-blue-700">{fmtQ(item.issuedQty)}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{fmt(item.actualCost)}</td>
                              <td className={`px-4 py-2.5 text-right font-semibold ${over ? 'text-red-700' : item.variance < 0 ? 'text-green-700' : 'text-gray-500'}`}>
                                {item.variance !== 0 ? (item.variance > 0 ? '+' : '') + fmt(item.variance) : '—'}
                              </td>
                              <td className="px-4 py-2.5">
                                <UtilBar pct={item.budgetUtilPct} overBudget={over} />
                              </td>
                              <td className="px-4 py-2.5">
                                <StatusBadge line={item} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="border-t border-gray-200 bg-gray-50 text-xs font-bold">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-gray-700 uppercase">Category Total</td>
                          <td className="px-4 py-2 text-right text-gray-900">{fmt(catBudget)}</td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 text-right text-amber-800">{fmt(catCommitted)}</td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 text-right text-blue-800">{fmt(catActual)}</td>
                          <td className={`px-4 py-2 text-right ${catVariance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                            {catVariance !== 0 ? (catVariance > 0 ? '+' : '') + fmt(catVariance) : '—'}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            })}

            {/* Grand total footer */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">Project Total</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Budget</p>
                  <p className="font-bold text-gray-900">{fmt(totalBudget)}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-600 mb-0.5">Committed</p>
                  <p className="font-bold text-amber-900">{fmt(totalCommitted)}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 mb-0.5">Actual</p>
                  <p className="font-bold text-blue-900">{fmt(totalActual)}</p>
                </div>
                <div>
                  <p className={`text-xs mb-0.5 ${totalVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>Variance</p>
                  <p className={`font-bold ${totalVariance > 0 ? 'text-red-900' : 'text-green-900'}`}>
                    {totalVariance > 0 ? '+' : ''}{fmt(totalVariance)}
                  </p>
                </div>
              </div>
            </div>
          </>
        </DataState>
      )}
    </div>
  )
}
