'use client'
import { useState } from 'react'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import { DateField } from '@/components/ui/DateField'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { ScopePicker, scopeToParams, EMPTY_SCOPE, type ScopeValue } from '@/components/pickers/ScopePicker'

interface CostNode {
  level: string; id: number | null; name: string
  areaSqFt: number | null
  directAtLevel: number; directBelow: number; allocatedFromAbove: number
  totalAbsorbed: number; costPerSqFt: number | null; sharePct: number
  budgetAmount: number; variance: number; varianceStatus: string
}
interface CostPoolRow {
  level: string; id: number | null; name: string; source: string
  /** This pool's share of the CURRENT scope — these sum to scopeAllocated. */
  allocatedIntoScope: number
  unallocated: number
  unallocatedReason: string | null
}
interface ScopeCrumb { level: string; id: number | null; name: string }
interface CostRollupDto {
  scopeLevel: string
  breadcrumb: ScopeCrumb[]
  childLevel: string | null
  children: CostNode[]
  pools: CostPoolRow[]
  scopeDirect: number; scopeAllocated: number; scopeUnallocated: number
  scopeTotalAbsorbed: number; scopeBudget: number
  scopeAreaSqFt: number | null; scopeCostPerSqFt: number | null
  allocationBasis: string; includeIndirect: boolean
  reconciliationOk: boolean
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtArea(n: number) { return `${n.toLocaleString('en-BD', { maximumFractionDigits: 0 })} sqft` }

const VARIANCE_STYLE: Record<string, string> = {
  exceeded:    'text-danger',
  approaching: 'text-warning',
  within:      'text-success',
}

const COLS = ['Name', 'Area', 'Direct', 'Allocated', 'Total Cost', '৳ / sqft', 'Budget', 'Variance', 'Share']

export function CostRollupPage() {
  const [scope, setScope]   = useState<ScopeValue>(EMPTY_SCOPE)
  const [dateFrom, setFrom] = useState('')
  const [dateTo,   setTo]   = useState('')

  const { data, isLoading, error, refetch } = useApiData<CostRollupDto>({
    url: '/reports/cost-rollup',
    params: { ...scopeToParams(scope), dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
    queryKey: ['cost-rollup', scope.projectId, scope.nodeId, dateFrom, dateTo],
  })

  // The dropdowns above and the rollup rows below write the same scope, so there is never a
  // second "drill state" to keep in sync with the filter bar.
  // Levels are user-defined now, so there is no ladder of cases to enumerate: any row below
  // the project is a node, and selecting it is the same operation whatever level it sits at.
  const drill = (level: string, id: number | null) => {
    if (id === null) return
    const v = String(id)
    setScope(s => level === 'Project' ? { projectId: v, nodeId: '' } : { ...s, nodeId: v })
  }

  /** Clicking a crumb jumps back to it, dropping everything below. */
  const jumpTo = (level: string, id: number | null) => {
    setScope(s =>
      level === 'All'     ? EMPTY_SCOPE
    : level === 'Project' ? { ...s, nodeId: '' }
    : id === null         ? s
    :                       { ...s, nodeId: String(id) })
  }

  const here = data?.breadcrumb[data.breadcrumb.length - 1]
  const rollupTitle = !data?.childLevel ? null
    : data.childLevel === 'Project' ? 'Projects'
    : `${data.childLevel}s under ${here?.name ?? ''}`

  const variance = (data?.scopeTotalAbsorbed ?? 0) - (data?.scopeBudget ?? 0)

  // The pool rows are this scope's allocated cost, split by where it was booked — so they are a
  // partition of scopeAllocated, and their total is a live check on the apportionment.
  const scopeName = here?.name ?? 'this scope'
  const poolTotal = (data?.pools ?? []).reduce((s, p) => s + p.allocatedIntoScope, 0)
  const poolsReconcile = Math.abs(poolTotal - (data?.scopeAllocated ?? 0)) < 0.05

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Rollup"
        subtitle="Absorbed cost at every level — direct spend plus each level's share of shared cost, apportioned by area"
      />

      <div className="flex items-end gap-3 flex-wrap">
        <label className="text-sm font-medium text-content shrink-0 pb-2">Scope:</label>
        <ScopePicker value={scope} onChange={setScope} mode="filter" />
        <div>
          <label className="block text-xs font-medium text-content mb-1">From</label>
          <DateField value={dateFrom} onChange={e => setFrom(e.target.value)} className="min-w-[150px]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-content mb-1">To</label>
          <DateField value={dateTo} onChange={e => setTo(e.target.value)} className="min-w-[150px]" />
        </div>
      </div>

      <DataState
        loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && (data?.scopeTotalAbsorbed ?? 0) === 0 && (data?.children.length ?? 0) === 0}
        emptyMessage="No cost has been recorded against this scope in the selected period."
      >
        <>
          {data && !data.reconciliationOk && (
            <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <span className="text-content">
                The levels below do not add up to this level&apos;s total. Some cost may be recorded
                against part of the structure that no longer exists — treat these figures as indicative
                until it is resolved.
              </span>
            </div>
          )}

          {data && data.breadcrumb.length > 1 && (
            <nav className="flex items-center gap-1 flex-wrap text-sm">
              {data.breadcrumb.map((c, i) => {
                const last = i === data.breadcrumb.length - 1
                return (
                  <span key={`${c.level}-${c.id}`} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-content-muted/60" />}
                    {last
                      ? <span className="font-semibold text-content">{c.name}</span>
                      : <button onClick={() => jumpTo(c.level, c.id)} className="text-primary hover:underline">{c.name}</button>}
                  </span>
                )
              })}
            </nav>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border-default bg-primary/10 p-4">
              <p className="text-xs text-primary uppercase font-semibold">Total Absorbed Cost</p>
              <p className="text-2xl font-bold text-info mt-1">{fmt(data?.scopeTotalAbsorbed ?? 0)}</p>
              <p className="text-xs text-content-muted mt-0.5">
                {fmt(data?.scopeDirect ?? 0)} direct + {fmt(data?.scopeAllocated ?? 0)} allocated
              </p>
            </div>
            <div className="rounded-xl border border-border-default bg-surface p-4">
              <p className="text-xs text-content-muted uppercase font-semibold">৳ / sq ft</p>
              <p className="text-2xl font-bold text-content mt-1">
                {data?.scopeCostPerSqFt != null ? fmt(data.scopeCostPerSqFt) : '—'}
              </p>
              {data?.scopeAreaSqFt != null && (
                <p className="text-xs text-content-muted mt-0.5">over {fmtArea(data.scopeAreaSqFt)}</p>
              )}
            </div>
            <div className="rounded-xl border border-border-default bg-surface p-4">
              <p className="text-xs text-content-muted uppercase font-semibold">Budget</p>
              <p className="text-2xl font-bold text-content mt-1">{fmt(data?.scopeBudget ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-border-default bg-surface p-4">
              <p className="text-xs text-content-muted uppercase font-semibold">Variance</p>
              <p className={`text-2xl font-bold mt-1 ${variance > 0 ? 'text-danger' : 'text-success'}`}>
                {variance > 0 ? '+' : ''}{fmt(variance)}
              </p>
              <p className="text-xs text-content-muted mt-0.5">
                {variance > 0 ? 'over budget' : 'under budget'}
              </p>
            </div>
          </div>

          {rollupTitle && (data?.children.length ?? 0) > 0 && (
            <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-muted border-b border-border-default">
                <span className="text-xs font-semibold text-content uppercase tracking-wide">{rollupTitle}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-surface-muted border-b border-border-default">
                    <tr>
                      {COLS.map(h => (
                        <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${h === 'Name' ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {data!.children.map(c => {
                      const drillable = c.level !== 'Unallocated'
                      return (
                        <tr
                          key={`${c.level}-${c.id}`}
                          onClick={drillable ? () => drill(c.level, c.id) : undefined}
                          className={drillable ? 'cursor-pointer hover:bg-surface-muted' : 'bg-surface-muted/40'}
                        >
                          <td className={`px-3 py-2 ${drillable ? 'font-medium text-content' : 'text-content-muted italic'}`}>
                            <span className="flex items-center gap-1">
                              {drillable && <ChevronRight className="w-3.5 h-3.5 text-content-muted/60" />}
                              {c.name}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-content-muted">
                            {c.areaSqFt != null ? fmtArea(c.areaSqFt) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-content">{fmt(c.directAtLevel + c.directBelow)}</td>
                          <td className="px-3 py-2 text-right text-content-muted">{fmt(c.allocatedFromAbove)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-primary">{fmt(c.totalAbsorbed)}</td>
                          <td className="px-3 py-2 text-right text-content">
                            {c.costPerSqFt != null ? fmt(c.costPerSqFt) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-content-muted">
                            {c.budgetAmount > 0 ? fmt(c.budgetAmount) : '—'}
                          </td>
                          <td className={`px-3 py-2 text-right font-medium ${VARIANCE_STYLE[c.varianceStatus] ?? 'text-content-muted'}`}>
                            {c.budgetAmount > 0 ? `${c.variance > 0 ? '+' : ''}${fmt(c.variance)}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="flex items-center justify-end gap-2">
                              <span className="h-1.5 w-16 rounded-full bg-border-default overflow-hidden">
                                <span className="block h-full bg-primary" style={{ width: `${Math.min(c.sharePct, 100)}%` }} />
                              </span>
                              <span className="text-xs text-content-muted w-10 text-right">{c.sharePct}%</span>
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="border-t border-border-default bg-surface-muted font-bold">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-xs uppercase text-content">Total</td>
                      <td className="px-3 py-2 text-right text-content">{fmt(data?.scopeDirect ?? 0)}</td>
                      <td className="px-3 py-2 text-right text-content">{fmt(data?.scopeAllocated ?? 0)}</td>
                      <td className="px-3 py-2 text-right text-info">{fmt(data?.scopeTotalAbsorbed ?? 0)}</td>
                      <td className="px-3 py-2 text-right text-content">
                        {data?.scopeCostPerSqFt != null ? fmt(data.scopeCostPerSqFt) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-content">{fmt(data?.scopeBudget ?? 0)}</td>
                      <td className={`px-3 py-2 text-right ${variance > 0 ? 'text-danger' : 'text-success'}`}>
                        {variance > 0 ? '+' : ''}{fmt(variance)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-content-muted">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="px-4 py-2.5 text-xs text-content-muted border-t border-border-default">
                <strong>Direct</strong> is cost booked to this level or below it. <strong>Allocated</strong> is
                this level&apos;s share of cost booked higher up — structure, site works, common areas and
                overheads — split by floor area
                {data?.allocationBasis === 'equal' && ' (currently splitting evenly, not by area)'}.
                Together they are what this part of the build really costs.
              </p>
            </div>
          )}

          {(data?.pools.length ?? 0) > 0 && (
            <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-muted border-b border-border-default">
                <span className="text-xs font-semibold text-content uppercase tracking-wide">
                  Shared cost pools — where {scopeName}&apos;s allocated cost came from
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-surface-muted border-b border-border-default">
                    <tr>
                      {['Booked at', 'Level', 'Source', `Into ${scopeName}`, 'Not allocated'].map(h => (
                        <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${['Booked at', 'Level', 'Source'].includes(h) ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {data!.pools.map(p => (
                      <tr key={`${p.level}-${p.id ?? 0}-${p.source}`} className="hover:bg-surface-muted">
                        <td className="px-3 py-2 text-content">{p.name}</td>
                        <td className="px-3 py-2 text-content-muted">{p.level}</td>
                        <td className="px-3 py-2 text-content-muted">{p.source}</td>
                        <td className="px-3 py-2 text-right text-primary">{fmt(p.allocatedIntoScope)}</td>
                        <td className="px-3 py-2 text-right">
                          {p.unallocated > 0
                            ? <span className="text-warning" title={p.unallocatedReason ?? undefined}>{fmt(p.unallocated)}</span>
                            : <span className="text-content-muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* The rows are a partition of this scope's allocated cost, so they must add up
                      to it. Shown rather than asserted, like reconciliationOk above. */}
                  <tfoot className="bg-surface-muted border-t border-border-default">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-xs font-bold text-content uppercase">Total allocated</td>
                      <td className="px-3 py-2 text-right font-bold text-content tabular-nums">{fmt(poolTotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              {!poolsReconcile && (
                <p className="px-4 py-2.5 text-xs text-warning border-t border-border-default">
                  These pools total {fmt(poolTotal)} but this scope absorbed {fmt(data!.scopeAllocated)} in
                  allocated cost. They should match — treat the breakdown as unreliable.
                </p>
              )}
              {(data?.scopeUnallocated ?? 0) > 0 && (
                <p className="px-4 py-2.5 text-xs text-content-muted border-t border-border-default">
                  Cost shown as <em>not allocated</em> could not be pushed down to any unit — usually because
                  the units beneath it have no floor area recorded. Fill in those areas and it will be
                  absorbed automatically.
                </p>
              )}
            </div>
          )}
        </>
      </DataState>
    </div>
  )
}
