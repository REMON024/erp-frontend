'use client'
import { useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { Badge } from '@/components/ui/Badge'
import { useApiData } from '@/hooks/useApiData'
import { ScopePicker, scopeToParams, EMPTY_SCOPE, type ScopeValue } from '@/components/pickers/ScopePicker'

/**
 * Where revenue and cost finally meet, per sold item.
 *
 * The column that earns the report is Drift: a flat sold at a healthy margin can quietly stop
 * being profitable long after the contract is signed, and nothing else in the system says so.
 */

interface RealisedMarginRow {
  nodeId: number; name: string; unitNo: string | null; breadcrumb: string
  status: string; areaSqFt: number | null
  bookingNo: string | null; bookingDate: string | null; customerName: string | null
  soldFor: number | null
  costAtSale: number | null; costNow: number; costDrift: number | null; costDriftPct: number | null
  realisedMargin: number | null; realisedMarginPct: number | null
  expectedMargin: number | null
  currentSellPrice: number; isPriced: boolean; isUnsnapshotted: boolean
}

interface RealisedMarginDto {
  rows: RealisedMarginRow[]
  soldCount: number; unsoldCount: number; unsnapshottedCount: number
  totalSoldFor: number; totalCostNow: number
  totalRealisedMargin: number; totalCostDrift: number
  pipelineValue: number; costBasis: string
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { maximumFractionDigits: 0 })}` }

const COLS = ['Item', 'Sold to', 'Sold for', 'Cost @ sale', 'Cost now', 'Drift', 'Realised margin']

export function RealisedMarginPage() {
  const [scope, setScope] = useState<ScopeValue>(EMPTY_SCOPE)

  const { data, isLoading, error, refetch } = useApiData<RealisedMarginDto>({
    url: '/sellable-items/realised-margin',
    params: scopeToParams(scope),
    queryKey: ['realised-margin', scope.projectId, scope.nodeId],
    enabled: !!scope.projectId,
  })

  const rows = data?.rows ?? []
  const marginTone = (n: number) => (n < 0 ? 'text-danger' : 'text-success')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Realised Margin"
        subtitle="What each item sold for, against what it has cost since — the figure a signed contract cannot follow"
      />

      <div className="flex items-end gap-3 flex-wrap">
        <label className="text-sm font-medium text-content shrink-0 pb-2">Scope:</label>
        <ScopePicker value={scope} onChange={setScope} mode="filter" />
      </div>

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border-default bg-primary/10 p-4">
            <p className="text-xs text-primary uppercase font-semibold">Realised Margin</p>
            <p className={`text-2xl font-bold mt-1 ${marginTone(data.totalRealisedMargin)}`}>
              {fmt(data.totalRealisedMargin)}
            </p>
            <p className="text-xs text-content-muted mt-0.5">on {data.soldCount} sold</p>
          </div>
          <div className="rounded-xl border border-border-default bg-surface p-4">
            <p className="text-xs text-content-muted uppercase font-semibold">Sold For</p>
            <p className="text-2xl font-bold text-content mt-1">{fmt(data.totalSoldFor)}</p>
            <p className="text-xs text-content-muted mt-0.5">cost since: {fmt(data.totalCostNow)}</p>
          </div>
          <div className="rounded-xl border border-border-default bg-surface p-4">
            <p className="text-xs text-content-muted uppercase font-semibold">Cost Drift</p>
            <p className={`text-2xl font-bold mt-1 ${data.totalCostDrift > 0 ? 'text-danger' : 'text-content'}`}>
              {data.totalCostDrift > 0 ? '+' : ''}{fmt(data.totalCostDrift)}
            </p>
            <p className="text-xs text-content-muted mt-0.5">since these were priced</p>
          </div>
          <div className="rounded-xl border border-border-default bg-surface p-4">
            <p className="text-xs text-content-muted uppercase font-semibold">Pipeline</p>
            <p className="text-2xl font-bold text-content mt-1">{fmt(data.pipelineValue)}</p>
            <p className="text-xs text-content-muted mt-0.5">{data.unsoldCount} unsold at list</p>
          </div>
        </div>
      )}

      {/* A sale predating the price snapshot has no frozen cost, so its drift is unknowable —
          which is a different statement from "it has not moved", and must not read as one. */}
      {!!data?.unsnapshottedCount && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <span className="text-content">
            <strong>{data.unsnapshottedCount}</strong>{' '}
            {data.unsnapshottedCount === 1 ? 'sale was' : 'sales were'} made before the price
            snapshot existed, so no cost was frozen against{' '}
            {data.unsnapshottedCount === 1 ? 'it' : 'them'}. Their realised margin is correct;
            their drift is shown as unknown rather than as zero.
          </span>
        </div>
      )}

      <DataState
        loading={!!scope.projectId && isLoading}
        error={error ? 'Failed to load.' : null}
        onRetry={refetch}
        empty={!!scope.projectId && !isLoading && rows.length === 0}
        emptyMessage="Nothing in this scope is marked sellable yet."
      >
        {!scope.projectId ? (
          <p className="text-sm text-content-muted flex items-center gap-2">
            <Info className="w-4 h-4" /> Pick a project to see what it has realised.
          </p>
        ) : (
          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted">
                  <tr>
                    {COLS.map(c => (
                      <th key={c} className={`px-3 py-2 text-xs font-semibold text-content-muted uppercase tracking-wide ${
                        ['Item', 'Sold to'].includes(c) ? 'text-left' : 'text-right'}`}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {rows.map(r => (
                    <tr key={r.nodeId} className="hover:bg-surface-muted/50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-content">{r.unitNo ?? r.name}</div>
                        <div className="text-xs text-content-muted">{r.breadcrumb}</div>
                      </td>
                      <td className="px-3 py-2">
                        {r.customerName ? (
                          <>
                            <div className="text-content">{r.customerName}</div>
                            <div className="text-xs text-content-muted">{r.bookingNo} · {r.bookingDate}</div>
                          </>
                        ) : (
                          <Badge tone="neutral">{r.status}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-content">
                        {r.soldFor != null ? fmt(r.soldFor)
                          : <span className="text-content-muted">{fmt(r.currentSellPrice)} list</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-content-muted">
                        {r.costAtSale != null ? fmt(r.costAtSale)
                          : r.soldFor != null ? <span className="text-warning">unknown</span> : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-content-muted">{fmt(r.costNow)}</td>
                      <td className="px-3 py-2 text-right">
                        {r.costDrift == null ? <span className="text-content-muted">—</span> : (
                          <span className={r.costDrift > 0 ? 'text-danger' : 'text-content-muted'}>
                            {r.costDrift > 0 ? '+' : ''}{fmt(r.costDrift)}
                            {r.costDriftPct != null && (
                              <span className="text-xs ml-1">({r.costDriftPct > 0 ? '+' : ''}{r.costDriftPct}%)</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.realisedMargin == null ? <span className="text-content-muted">—</span> : (
                          <>
                            <div className={`font-semibold ${marginTone(r.realisedMargin)}`}>
                              {fmt(r.realisedMargin)}
                            </div>
                            {/* Expected beside realised is what makes an eroded sale legible:
                                the two agree until cost moves after the contract. */}
                            {r.expectedMargin != null && r.expectedMargin !== r.realisedMargin && (
                              <div className="text-xs text-content-muted">
                                expected {fmt(r.expectedMargin)}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DataState>

      {data && (
        <p className="text-xs text-content-muted">
          Cost is computed on the <strong>{data.costBasis}</strong> basis, the same one the sellable
          list and the cost rollup use. A sold item&apos;s price never moves — only what it has cost
          since does.
        </p>
      )}
    </div>
  )
}
