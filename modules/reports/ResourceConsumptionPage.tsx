'use client'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { ScopePicker, scopeToParams, EMPTY_SCOPE, type ScopeValue } from '@/components/pickers/ScopePicker'

interface ResourceConsumptionRow {
  resourceId: number; resourceCode: string; resourceName: string
  category: string; unit: string
  /** Material, Equipment, Service or Labour — which pool the actual came from. */
  resourceType: string
  receivedQty: number; issuedQty: number; balanceQty: number
  avgCost: number; issuedValue: number
}
interface ConsumptionNode {
  level: string; id: number | null; name: string
  areaSqFt: number | null; issuedValue: number
  costPerSqFt: number | null; sharePct: number
}
interface ScopeCrumb { level: string; id: number | null; name: string }
interface MaterialSourceRow {
  level: string; id: number | null; name: string; amountIntoScope: number
}
interface ResourceConsumptionDto {
  rows: ResourceConsumptionRow[]
  totalIssuedValue: number
  scopeLevel: string
  breadcrumb: ScopeCrumb[]
  childLevel: string | null
  children: ConsumptionNode[]
  scopeAreaSqFt: number | null
  scopeCostPerSqFt: number | null
  showStockColumns: boolean
  mode: string
  /** Absorbed mode only: where this scope's material came from; sums to totalIssuedValue. */
  sources: MaterialSourceRow[]
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtQ(n: number) { return n.toLocaleString('en-BD', { maximumFractionDigits: 3 }) }
function fmtArea(n: number) { return `${n.toLocaleString('en-BD', { maximumFractionDigits: 0 })} sqft` }

const RESOURCE_TYPES = ['Material', 'Equipment', 'Service', 'Labour']
const STOCK_COLS = ['Received', 'Balance']
const NUMERIC = ['Received', 'Issued', 'Balance', 'Avg Cost', 'Issued Value']

export function ResourceConsumptionPage() {
  const [scope, setScope]   = useState<ScopeValue>(EMPTY_SCOPE)
  const [dateFrom, setFrom] = useState('')
  const [dateTo,   setTo]   = useState('')
  const [mode, setMode]     = useState<'direct' | 'absorbed'>('direct')
  const [type, setType]     = useState('')

  const { data, isLoading, error, refetch } = useApiData<ResourceConsumptionDto>({
    url: '/reports/resource-consumption',
    params: { ...scopeToParams(scope), dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, mode,
              resourceType: type || undefined },
    queryKey: ['resource-consumption', scope.projectId, scope.nodeId, dateFrom, dateTo, mode, type],
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

  const categories = [...new Set(data?.rows.map(r => r.category) ?? [])]
  const showStock  = data?.showStockColumns ?? true
  const headers    = ['Code', 'Resource', 'Type', 'Category', 'Unit', 'Received', 'Issued', 'Balance', 'Avg Cost', 'Issued Value']
    .filter(h => showStock || !STOCK_COLS.includes(h))

  const here          = data?.breadcrumb[data.breadcrumb.length - 1]
  const hasUnattributed = data?.children.some(c => c.level === 'Unattributed') ?? false

  // The toggle only means something once a project is picked — the warehouse view has no
  // hierarchy to apportion across, and the API forces direct mode there.
  const scoped      = !!scope.projectId
  const isAbsorbed  = data?.mode === 'absorbed'
  const scopeName   = here?.name ?? 'this scope'
  const sourceTotal = (data?.sources ?? []).reduce((s, r) => s + r.amountIntoScope, 0)
  const sourcesReconcile = Math.abs(sourceTotal - (data?.totalIssuedValue ?? 0)) < 0.05
  const rollupTitle = !data?.childLevel ? null
    : data.childLevel === 'Project' ? 'Projects'
    : `${data.childLevel}s under ${here?.name ?? ''}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Consumption Report"
        subtitle="What each part of the project consumed — materials from stock issues, labour, plant and services from posted spend"
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
        <div>
          <label className="block text-xs font-medium text-content mb-1">Type</label>
          <Select value={type} onChange={e => setType(e.target.value)} className="min-w-[150px]">
            <option value="">All types</option>
            {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        {scoped && (
          <div>
            <label className="block text-xs font-medium text-content mb-1">Basis</label>
            <div className="inline-flex rounded-lg border border-border-default overflow-hidden">
              {([
                ['direct',   'Direct',   'Only spend naming this exact level'],
                ['absorbed', 'Absorbed', "Adds this level's share, by area, of spend booked above it"],
              ] as const).map(([value, label, hint]) => (
                <button key={value} type="button" title={hint} onClick={() => setMode(value)}
                  className={`px-3 py-2 text-sm ${mode === value
                    ? 'bg-primary text-white font-medium'
                    : 'bg-surface text-content-muted hover:bg-surface-muted'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isAbsorbed && (
        <p className="text-xs text-info bg-info/10 border border-info/20 rounded-lg px-3 py-2">
          Showing what {scopeName} <strong>absorbed</strong>: spend booked here, plus its share by floor
          area of everything issued above it. This is the figure that matches the Cost Rollup for the
          same scope. Switch to <em>Direct</em> to see only what was booked at this level.
        </p>
      )}

      <DataState
        loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && (data?.rows.length ?? 0) === 0}
        emptyMessage={isAbsorbed
          ? 'Nothing has reached this scope in the selected period.'
          : 'Nothing was booked directly to this scope in the selected period. Spend booked higher up is excluded — switch to Absorbed to include its share.'}
      >
        <>
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
              <p className="text-xs text-primary uppercase font-semibold">Total Issued Value</p>
              <p className="text-2xl font-bold text-info mt-1">{fmt(data?.totalIssuedValue ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-border-default bg-surface p-4">
              <p className="text-xs text-content-muted uppercase font-semibold">Material ৳ / sq ft</p>
              <p className="text-2xl font-bold text-content mt-1">
                {data?.scopeCostPerSqFt != null ? fmt(data.scopeCostPerSqFt) : '—'}
              </p>
              {data?.scopeAreaSqFt != null && (
                <p className="text-xs text-content-muted mt-0.5">over {fmtArea(data.scopeAreaSqFt)}</p>
              )}
            </div>
            <div className="rounded-xl border border-border-default bg-surface p-4">
              <p className="text-xs text-content-muted uppercase font-semibold">Materials Used</p>
              <p className="text-2xl font-bold text-content mt-1">{data?.rows.length ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border-default bg-surface p-4">
              <p className="text-xs text-content-muted uppercase font-semibold">Categories</p>
              <p className="text-2xl font-bold text-content mt-1">{categories.length}</p>
            </div>
          </div>

          {rollupTitle && (data?.children.length ?? 0) > 0 && (
            <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-muted border-b border-border-default">
                <span className="text-xs font-semibold text-content uppercase tracking-wide">{rollupTitle}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-surface-muted border-b border-border-default">
                    <tr>
                      {['Name', 'Area', 'Issued Value', '৳ / sqft', 'Share'].map(h => (
                        <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${h === 'Name' ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {data!.children.map(c => {
                      const drillable = c.level !== 'Unattributed'
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
                          <td className="px-3 py-2 text-right font-semibold text-primary">{fmt(c.issuedValue)}</td>
                          <td className="px-3 py-2 text-right text-content">
                            {c.costPerSqFt != null ? fmt(c.costPerSqFt) : '—'}
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
                      <td className="px-3 py-2 text-right text-info">{fmt(data?.totalIssuedValue ?? 0)}</td>
                      <td className="px-3 py-2 text-right text-content">
                        {data?.scopeCostPerSqFt != null ? fmt(data.scopeCostPerSqFt) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-content-muted">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {hasUnattributed && (
                <p className="px-4 py-2.5 text-xs text-content-muted border-t border-border-default">
                  {isAbsorbed
                    ? `Unattributed material could not be pushed down to any unit — usually because the units
                       beneath it have no floor area recorded. Fill in those areas and it will be absorbed.`
                    : `Unattributed spend was issued at this level without naming a child — site works, structure
                       and common areas. It is shown so the rows always add up to the total.`}
                </p>
              )}
            </div>
          )}

          {isAbsorbed && (data?.sources.length ?? 0) > 0 && (
            <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-muted border-b border-border-default">
                <span className="text-xs font-semibold text-content uppercase tracking-wide">
                  Where {scopeName}&apos;s material came from
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-surface-muted border-b border-border-default">
                    <tr>
                      {['Issued at', 'Level', `Into ${scopeName}`].map(h => (
                        <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${h.startsWith('Into') ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {data!.sources.map(s => (
                      <tr key={`${s.level}-${s.id ?? 0}`} className="hover:bg-surface-muted">
                        <td className="px-3 py-2 text-content">{s.name}</td>
                        <td className="px-3 py-2 text-content-muted">{s.level}</td>
                        <td className="px-3 py-2 text-right text-primary tabular-nums">{fmt(s.amountIntoScope)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {/* A partition of the total above, so it must add back up to it. */}
                  <tfoot className="bg-surface-muted border-t border-border-default">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-xs font-bold text-content uppercase">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-content tabular-nums">{fmt(sourceTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {!sourcesReconcile && (
                <p className="px-4 py-2.5 text-xs text-warning border-t border-border-default">
                  These sources total {fmt(sourceTotal)} but {scopeName} consumed {fmt(data!.totalIssuedValue)}.
                  They should match — treat the breakdown as unreliable.
                </p>
              )}
            </div>
          )}

          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-muted border-b border-border-default">
              <span className="text-xs font-semibold text-content uppercase tracking-wide">
                Materials consumed{here && here.level !== 'All' ? ` — ${here.name}` : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-surface-muted border-b border-border-default">
                  <tr>
                    {headers.map(h => (
                      <th key={h}
                        title={h === 'Avg Cost' ? 'Company-wide moving average from the resource master — not this scope’s realised rate' : undefined}
                        className={`px-3 py-2 text-xs font-semibold text-content-muted ${NUMERIC.includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {data?.rows.map(r => (
                    <tr key={r.resourceId} className={showStock && r.balanceQty < 0 ? 'bg-danger/10' : 'hover:bg-surface-muted'}>
                      <td className="px-3 py-2 text-xs text-content-muted">{r.resourceCode}</td>
                      <td className="px-3 py-2 font-medium text-content">{r.resourceName}</td>
                      <td className="px-3 py-2 text-xs text-content-muted">{r.resourceType}</td>
                      <td className="px-3 py-2 text-xs text-content-muted">{r.category}</td>
                      <td className="px-3 py-2 text-content-muted">{r.unit}</td>
                      {showStock && <td className="px-3 py-2 text-right text-success">{fmtQ(r.receivedQty)}</td>}
                      <td className="px-3 py-2 text-right text-primary">{fmtQ(r.issuedQty)}</td>
                      {showStock && (
                        <td className={`px-3 py-2 text-right font-semibold ${r.balanceQty < 0 ? 'text-danger' : 'text-content'}`}>
                          {fmtQ(r.balanceQty)}
                        </td>
                      )}
                      <td className="px-3 py-2 text-right text-content-muted">{fmt(r.avgCost)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-primary">{fmt(r.issuedValue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border-default bg-surface-muted font-bold">
                  <tr>
                    <td colSpan={headers.length - 1} className="px-3 py-2 text-xs uppercase text-content">Total Issued Value</td>
                    <td className="px-3 py-2 text-right text-info">{fmt(data?.totalIssuedValue ?? 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {!showStock && (
              <p className="px-4 py-2.5 text-xs text-content-muted border-t border-border-default">
                Received and balance are warehouse figures and cannot be attributed to a project, so they are
                shown only under <em>All Projects</em>.
              </p>
            )}
            <p className="px-4 py-2.5 text-xs text-content-muted border-t border-border-default">
              <strong>Avg Cost</strong> is the material&apos;s company-wide moving average from the resource
              master — not this scope&apos;s realised rate, and not affected by the date filter. It will
              generally differ from issued value ÷ issued quantity.
            </p>
          </div>
        </>
      </DataState>
    </div>
  )
}
