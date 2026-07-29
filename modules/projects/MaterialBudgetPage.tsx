'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { Package, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'

interface Project { id: number; projectCode: string; projectName: string }

interface MaterialBudgetV2Line {
  resourceId:    number
  resourceName:  string
  resourceCode:  string
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
  status:        string   // 'within' | 'approaching' | 'exceeded' (PRD-02 FR-EST-09)
  resourceType:   string  // Material | Equipment | Service | Labour
  isStockTracked: boolean // only materials accrue actuals from stock issues
}

function fmt(n: number) {
  return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtQ(n: number) {
  return n.toLocaleString('en-BD', { maximumFractionDigits: 3 })
}

function StatusBadge({ line }: { line: MaterialBudgetV2Line }) {
  if (line.budgetedCost === 0 && line.actualCost === 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted text-content-muted">Unbudgeted</span>
  }
  // Driven by the backend threshold engine (within / approaching / exceeded — FR-EST-09).
  switch (line.status) {
    case 'exceeded':
      return <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger font-semibold">Exceeded</span>
    case 'approaching':
      return <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning">Approaching (80%)</span>
    default:
      return <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">Within</span>
  }
}

function UtilBar({ pct, overBudget }: { pct: number; overBudget: boolean }) {
  const capped = Math.min(pct, 100)
  const color  = overBudget ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-primary'
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${capped}%` }} />
      </div>
      <span className={`text-xs w-9 text-right ${overBudget ? 'text-danger font-semibold' : 'text-content-muted'}`}>
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}

const CATEGORY_COLORS: Record<string, string> = {
  Cement:    'bg-surface-muted text-content',
  Steel:     'bg-primary/10 text-primary',
  Brick:     'bg-warning/15 text-warning',
  Sand:      'bg-warning/15 text-warning',
  Aggregate: 'bg-surface-muted text-content-muted',
  Paint:     'bg-primary/10 text-primary',
  General:   'bg-surface-muted text-content-muted',
}
const catColor = (c: string) => CATEGORY_COLORS[c] ?? 'bg-info/10 text-info'

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
        <label className="text-sm font-medium text-content shrink-0">Project:</label>
        <Select
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          className="min-w-[260px]"
        >
          <option value="">— select a project —</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>
          ))}
        </Select>
      </div>

      {!selectedProject && (
        <div className="rounded-xl border border-dashed border-border-default bg-surface-muted p-12 text-center">
          <Package className="w-10 h-10 text-content-muted/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-content-muted">Select a project to compare budget vs actual</p>
          <p className="text-xs text-content-muted mt-1">Shows BOQ budget, PO commitments, and stock issue actuals side by side</p>
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
              <div className="rounded-xl border border-border-default bg-surface p-4">
                <p className="text-xs text-content-muted uppercase font-semibold tracking-wide">Total Budget (BOQ)</p>
                <p className="text-2xl font-bold text-content mt-1">{fmt(totalBudget)}</p>
              </div>
              <div className="rounded-xl border border-border-default bg-warning/15 p-4">
                <p className="text-xs text-warning uppercase font-semibold tracking-wide">Committed (POs)</p>
                <p className="text-2xl font-bold text-warning mt-1">{fmt(totalCommitted)}</p>
                {totalBudget > 0 && (
                  <p className="text-xs text-warning mt-0.5">
                    {((totalCommitted / totalBudget) * 100).toFixed(1)}% of budget
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-border-default bg-primary/10 p-4">
                <p className="text-xs text-primary uppercase font-semibold tracking-wide">Actual (Issued)</p>
                <p className="text-2xl font-bold text-info mt-1">{fmt(totalActual)}</p>
                {totalBudget > 0 && (
                  <p className="text-xs text-primary mt-0.5">
                    {((totalActual / totalBudget) * 100).toFixed(1)}% of budget
                  </p>
                )}
              </div>
              <div className={`rounded-xl border p-4 ${totalVariance > 0 ? 'border-danger/20 bg-danger/10' : 'border-success/20 bg-success/10'}`}>
                <p className={`text-xs uppercase font-semibold tracking-wide ${totalVariance > 0 ? 'text-danger' : 'text-success'}`}>
                  Variance
                </p>
                <p className={`text-2xl font-bold mt-1 ${totalVariance > 0 ? 'text-danger' : 'text-success'}`}>
                  {totalVariance > 0 ? '+' : ''}{fmt(totalVariance)}
                </p>
                {overBudgetCount > 0 && (
                  <p className="text-xs text-danger mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {overBudgetCount} material{overBudgetCount > 1 ? 's' : ''} over budget
                  </p>
                )}
                {overBudgetCount === 0 && totalBudget > 0 && (
                  <p className="text-xs text-success mt-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    All within budget
                  </p>
                )}
              </div>
            </div>

            {/* PO warning if committed exceeds budget */}
            {totalCommitted > totalBudget && totalBudget > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/15 px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <p className="text-sm text-warning">
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
                <div key={category} className="bg-surface rounded-xl border border-border-default overflow-hidden">
                  {/* Category header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-muted border-b border-border-default">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${catColor(category)}`}>{category}</span>
                      <span className="text-xs text-content-muted">{items.length} material{items.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-content-muted">Budget: <span className="font-semibold text-content">{fmt(catBudget)}</span></span>
                      <span className="text-warning">Committed: <span className="font-semibold">{fmt(catCommitted)}</span></span>
                      <span className="text-primary">Actual: <span className="font-semibold">{fmt(catActual)}</span></span>
                      <span className={catVariance > 0 ? 'text-danger font-bold' : 'text-success font-semibold'}>
                        {catVariance > 0 ? '+' : ''}{fmt(catVariance)}
                      </span>
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead className="bg-surface-muted border-b border-border-default">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-content-muted">Material</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-content-muted">Unit</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-content-muted">Budget Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-content-muted">Budget Cost</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-warning">Ordered Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-warning">Committed</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-primary">Issued Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-primary">Actual Cost</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-content-muted">Variance</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-content-muted">Utilisation</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-content-muted">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default">
                        {items.map(item => {
                          const over = item.actualCost > item.budgetedCost && item.budgetedCost > 0
                          return (
                            <tr key={item.resourceId} className={over ? 'bg-danger/10' : 'hover:bg-surface-muted'}>
                              <td className="px-4 py-2.5">
                                <div className="font-medium text-content leading-tight">{item.resourceName}</div>
                                <div className="text-xs text-content-muted flex items-center gap-1.5">
                                  {item.resourceCode}
                                  {item.resourceType && item.resourceType !== 'Material' && (
                                    <span className="px-1.5 py-0.5 rounded bg-info/10 text-info">{item.resourceType}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-content-muted">{item.unit}</td>
                              <td className="px-4 py-2.5 text-right text-content-muted">{fmtQ(item.budgetedQty)}</td>
                              <td className="px-4 py-2.5 text-right font-medium text-content">{fmt(item.budgetedCost)}</td>
                              <td className="px-4 py-2.5 text-right text-warning">{fmtQ(item.orderedQty)}</td>
                              <td className="px-4 py-2.5 text-right font-medium text-warning">{fmt(item.committedCost)}</td>
                              <td className="px-4 py-2.5 text-right text-primary">{fmtQ(item.issuedQty)}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-primary">{fmt(item.actualCost)}</td>
                              <td className={`px-4 py-2.5 text-right font-semibold ${over ? 'text-danger' : item.variance < 0 ? 'text-success' : 'text-content-muted'}`}>
                                {item.variance !== 0 ? (item.variance > 0 ? '+' : '') + fmt(item.variance) : '—'}
                              </td>
                              <td className="px-4 py-2.5">
                                {/* Non-material resources never produce stock issues, so a 0%
                                    utilisation bar would read as "nothing used" rather than
                                    "not measured this way". Show nothing instead. */}
                                {item.isStockTracked
                                  ? <UtilBar pct={item.budgetUtilPct} overBudget={over} />
                                  : <span className="text-xs text-content-muted" title="Utilisation is tracked from stock issues, which only apply to materials">n/a</span>}
                              </td>
                              <td className="px-4 py-2.5">
                                <StatusBadge line={item} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="border-t border-border-default bg-surface-muted text-xs font-bold">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-content uppercase">Category Total</td>
                          <td className="px-4 py-2 text-right text-content">{fmt(catBudget)}</td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 text-right text-warning">{fmt(catCommitted)}</td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 text-right text-info">{fmt(catActual)}</td>
                          <td className={`px-4 py-2 text-right ${catVariance > 0 ? 'text-danger' : 'text-success'}`}>
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
            <div className="rounded-xl border border-border-default bg-surface-muted px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-content-muted" />
                <span className="text-sm font-bold text-content uppercase tracking-wide">Project Total</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-content-muted mb-0.5">Budget</p>
                  <p className="font-bold text-content">{fmt(totalBudget)}</p>
                </div>
                <div>
                  <p className="text-xs text-warning mb-0.5">Committed</p>
                  <p className="font-bold text-warning">{fmt(totalCommitted)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary mb-0.5">Actual</p>
                  <p className="font-bold text-info">{fmt(totalActual)}</p>
                </div>
                <div>
                  <p className={`text-xs mb-0.5 ${totalVariance > 0 ? 'text-danger' : 'text-success'}`}>Variance</p>
                  <p className={`font-bold ${totalVariance > 0 ? 'text-danger' : 'text-success'}`}>
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
