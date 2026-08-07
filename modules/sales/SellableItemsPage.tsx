'use client'
import { useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useApiData } from '@/hooks/useApiData'

/**
 * What is for sale, priced live.
 *
 * Replaces UnitsPage. That screen showed a stored TotalPrice with no way to tell how old it was or
 * what it was built from; a rate revision meant sweeping every unit by hand. Here the price is
 * computed on read — allocated cost, plus the margin in force for the node, plus its charges — and
 * every term is shown beside the total so the figure can be defended rather than merely quoted.
 */

interface Project { id: number; projectName: string; projectCode: string }

interface SellableItem {
  nodeId: number
  name: string
  unitNo: string | null
  levelName: string
  breadcrumb: string
  status: string
  unitType: string | null
  facing: string | null
  areaSqFt: number | null
  quantity: number | null
  projectUnitCode: string | null
  projectUnitSymbol: string | null
  allocatedCost: number
  profitPerUnit: number | null
  profitSource: string | null
  profit: number
  charges: number
  sellPrice: number
  pricePerSqFt: number | null
  isPriced: boolean
  bookedPrice: number | null
}

interface SellableItemsDto {
  items: SellableItem[]
  costBasis: string
  totalSellPrice: number
  unpricedCount: number
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { maximumFractionDigits: 0 })}` }

const STATUS_TONE: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
  Available: 'success',
  Booked:    'warning',
  Sold:      'info',
  Cancelled: 'neutral',
}

const COLS = ['Item', 'Status', 'Area', 'Cost', 'Margin', 'Charges', 'Price', '৳ / sqft', 'Booked at']

export function SellableItemsPage() {
  const [projectId, setProjectId] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [search, setSearch] = useState('')

  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })

  const { data, isLoading, error, refetch } = useApiData<SellableItemsDto>({
    url: '/sellable-items',
    params: { projectId, availableOnly: availableOnly || undefined, search: search || undefined },
    queryKey: ['sellable-items', projectId, availableOnly, search],
    enabled: !!projectId,
  })

  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sellable Items"
        subtitle="Price is computed from cost plus the configured margin — never stored, so it can never go stale"
        action={
          <Select value={projectId} onChange={e => setProjectId(e.target.value)} className="min-w-[220px]">
            <option value="">Select project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>
            ))}
          </Select>
        }
      />

      {projectId && (
        <div className="flex items-end gap-3 flex-wrap">
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or unit no…" className="min-w-[240px]" />
          <label className="flex items-center gap-2 text-sm text-content pb-2 cursor-pointer">
            <input type="checkbox" checked={availableOnly}
              onChange={e => setAvailableOnly(e.target.checked)} />
            Available only
          </label>
        </div>
      )}

      {data && (
        <div className="flex flex-wrap gap-4">
          <div className="rounded-xl border border-border-default bg-primary/10 p-4 min-w-[200px]">
            <p className="text-xs text-primary uppercase font-semibold">Total Listed Value</p>
            <p className="text-2xl font-bold text-info mt-1">{fmt(data.totalSellPrice)}</p>
            <p className="text-xs text-content-muted mt-0.5">{items.length} item{items.length === 1 ? '' : 's'}</p>
          </div>
          <div className="rounded-xl border border-border-default bg-surface p-4 min-w-[200px]">
            <p className="text-xs text-content-muted uppercase font-semibold">Cost Basis</p>
            <p className="text-2xl font-bold text-content mt-1 capitalize">{data.costBasis}</p>
            <p className="text-xs text-content-muted mt-0.5">
              {data.costBasis === 'budget'
                ? 'Priced on the approved estimate'
                : 'Priced on cost booked so far'}
            </p>
          </div>
        </div>
      )}

      {/* An unpriced item is cost with no margin. Showing that as a price would list flats at a
          loss, so it is called out rather than left to be read off the table. */}
      {!!data?.unpricedCount && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <span className="text-content">
            <strong>{data.unpricedCount}</strong>{' '}
            {data.unpricedCount === 1 ? 'item has' : 'items have'} no profit margin configured, so the
            figure shown is cost only — not a selling price. Set a margin on the project or block in{' '}
            <a href="/sales/profit-config" className="text-primary hover:underline">Profit Config</a>.
          </span>
        </div>
      )}

      <DataState
        loading={!!projectId && isLoading}
        error={error ? 'Failed to load.' : null}
        onRetry={refetch}
        empty={!!projectId && !isLoading && items.length === 0}
        emptyMessage="Nothing in this project is marked sellable yet. Mark a block or its flats sellable in Project Structure."
      >
        {!projectId ? (
          <p className="text-sm text-content-muted flex items-center gap-2">
            <Info className="w-4 h-4" /> Pick a project to see what it has for sale.
          </p>
        ) : (
          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted">
                  <tr>
                    {COLS.map(c => (
                      <th key={c} className={`px-3 py-2 text-xs font-semibold text-content-muted uppercase tracking-wide ${
                        ['Item', 'Status'].includes(c) ? 'text-left' : 'text-right'}`}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {items.map(i => (
                    <tr key={i.nodeId} className="hover:bg-surface-muted/50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-content">{i.unitNo ?? i.name}</div>
                        <div className="text-xs text-content-muted">{i.breadcrumb}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={STATUS_TONE[i.status] ?? 'neutral'}>{i.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right text-content-muted">
                        {i.areaSqFt != null ? i.areaSqFt.toLocaleString('en-BD') : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-content-muted">{fmt(i.allocatedCost)}</td>
                      <td className="px-3 py-2 text-right">
                        {i.isPriced ? (
                          <>
                            <div className="text-content">{fmt(i.profit)}</div>
                            {/* Where the margin came from matters: "520/sqft from Block A" explains
                                why two otherwise identical flats can be priced differently. */}
                            <div className="text-xs text-content-muted">
                              {i.profitPerUnit?.toLocaleString('en-BD')}
                              {i.projectUnitSymbol ? `/${i.projectUnitSymbol}` : ''}
                              {i.profitSource ? ` · ${i.profitSource}` : ''}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-warning">not set</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-content-muted">
                        {i.charges > 0 ? fmt(i.charges) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-content">
                        {i.isPriced ? fmt(i.sellPrice) : <span className="text-warning">{fmt(i.sellPrice)}*</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-content-muted">
                        {i.pricePerSqFt != null ? fmt(i.pricePerSqFt) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {i.bookedPrice != null ? (
                          <div className="text-content">{fmt(i.bookedPrice)}</div>
                        ) : <span className="text-content-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DataState>

      {items.some(i => i.bookedPrice != null) && (
        <p className="text-xs text-content-muted">
          A booked item shows both figures on purpose: the contract price is frozen at booking, so it
          will not follow later changes in cost or margin. A gap between the two is real, not an error.
        </p>
      )}
    </div>
  )
}
