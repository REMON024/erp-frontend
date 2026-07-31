'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { Plus, Trash2 } from 'lucide-react'
import { ResourcePicker, RateSourceChip, type ResolvedRate } from '@/components/pickers/ResourcePicker'
import type { Resource, ResourceType } from '@/modules/inventory/ResourceMasterPage'
import { type DraftOrderLine, newOrderLine, fmt, tinp } from './types'

/**
 * Line editor shared by both order types. A purchase-order line (resource, qty, unit price) is a
 * strict subset of a work-order budget line, so one editor serves both; the caller supplies the
 * heading and any per-line warning, and turns on the unmatched-EPL reason box for purchases.
 *
 * Lifted from the work-order screen, where it was `WOResourceEditor`.
 */
export function OrderLineEditor({
  items, onChange, vendorId, asOf,
  heading, hint,
  rateLabel = 'Unit Rate (৳)',
  needsUnmatchedReason,
  warningFor,
}: {
  items: DraftOrderLine[]
  onChange: (items: DraftOrderLine[]) => void
  vendorId?: number | null
  asOf?: string
  heading: string
  hint?: string
  rateLabel?: string
  /** Purchase only: true when this line has no approved-EPL match and needs a typed reason. */
  needsUnmatchedReason?: (item: DraftOrderLine) => boolean
  /** Optional per-line message, e.g. a material-budget overrun. */
  warningFor?: (item: DraftOrderLine) => string | null
}) {
  const [rateInfo, setRateInfo] = useState<Record<string, ResolvedRate>>({})

  const update = (key: string, patch: Partial<DraftOrderLine>) =>
    onChange(items.map(i => i.key === key ? { ...i, ...patch } : i))
  const remove = (key: string) => onChange(items.filter(i => i.key !== key))
  const total  = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitRate) || 0), 0)

  const clearRate = (key: string) =>
    setRateInfo(prev => { const next = { ...prev }; delete next[key]; return next })

  const handleResourceChange = (key: string, id: number | '', resource?: Resource) => {
    if (resource) update(key, { resourceId: resource.id, description: resource.resourceName, unit: resource.unit })
    else { update(key, { resourceId: undefined }); clearRate(key) }
  }

  // Changing the type invalidates the picked resource, its unit and its suggested rate.
  const handleTypeChange = (key: string, resourceType: ResourceType) => {
    update(key, { resourceType, resourceId: undefined, description: '', unit: '', unitRate: 0 })
    clearRate(key)
  }

  const handleResolved = (key: string, resolved: ResolvedRate) => {
    setRateInfo(prev => ({ ...prev, [key]: resolved }))
    const line = items.find(i => i.key === key)
    if (line && !Number(line.unitRate) && resolved.rate > 0) update(key, { unitRate: resolved.rate })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-content">
          {heading}
          {hint && <span className="text-xs text-content-muted font-normal"> — {hint}</span>}
        </span>
        <button type="button" onClick={() => onChange([...items, newOrderLine()])}
          className="text-xs text-primary hover:text-primary font-medium flex items-center gap-1 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Line
        </button>
      </div>
      {items.length > 0 && (
        <div className="border border-border-default rounded-lg overflow-x-auto">
          <table className="w-full min-w-[840px] text-xs">
            <thead className="bg-surface-muted border-b border-border-default">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-content-muted w-28">Type <span className="text-primary">*</span></th>
                <th className="px-2 py-2 text-left font-semibold text-content-muted w-56">Resource <span className="text-primary">*</span></th>
                <th className="px-2 py-2 text-left font-semibold text-content-muted">Description</th>
                <th className="px-2 py-2 text-left font-semibold text-content-muted w-16">Unit</th>
                <th className="px-2 py-2 text-left font-semibold text-content-muted w-20">Qty</th>
                <th className="px-2 py-2 text-left font-semibold text-content-muted w-28">{rateLabel}</th>
                <th className="px-2 py-2 text-right font-semibold text-content-muted w-28">Amount (৳)</th>
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {items.map(item => {
                const amount  = (Number(item.quantity) || 0) * (Number(item.unitRate) || 0)
                const warning = warningFor?.(item) ?? null
                const needsReason = needsUnmatchedReason?.(item) ?? false
                return (
                  <tr key={item.key} className="hover:bg-surface-muted align-top">
                    <td className="px-2 py-1.5">
                      <Select value={item.resourceType}
                        onChange={e => handleTypeChange(item.key, e.target.value as ResourceType)}
                        className="text-xs py-1">
                        {(['Material', 'Equipment', 'Service', 'Labour'] as ResourceType[]).map(t =>
                          <option key={t} value={t}>{t}</option>)}
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      <ResourcePicker
                        value={item.resourceId ?? ''}
                        types={[item.resourceType]}
                        vendorId={vendorId}
                        asOf={asOf}
                        onChange={(id, resource) => handleResourceChange(item.key, id, resource)}
                        onResolved={resolved => handleResolved(item.key, resolved)}
                        placeholder={`Select ${item.resourceType.toLowerCase()}…`}
                        invalid={!item.resourceId}
                        className="text-xs py-1"
                      />
                      {warning && <p className="text-[11px] text-warning mt-1">{warning}</p>}
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={item.description} onChange={e => update(item.key, { description: e.target.value })}
                        className={tinp} placeholder="Material / work description…" />
                      {needsReason && (
                        <input value={item.unmatchedReason ?? ''}
                          onChange={e => update(item.key, { unmatchedReason: e.target.value })}
                          className={`${tinp} mt-1 border-warning/60`}
                          placeholder="No approved EPL line — reason required…" />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={item.unit} readOnly disabled title="Unit comes from the selected resource"
                        className={tinp} placeholder="Bag" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step="any" value={item.quantity}
                        onChange={e => update(item.key, { quantity: Number(e.target.value) })} className={tinp} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step="any" value={item.unitRate}
                        onChange={e => update(item.key, { unitRate: Number(e.target.value) })} className={tinp} />
                      <div className="mt-0.5">
                        <RateSourceChip resolved={rateInfo[item.key]} currentValue={Number(item.unitRate)}
                          onApply={rate => update(item.key, { unitRate: rate })} />
                      </div>
                    </td>
                    <td className="px-2 py-1.5 font-semibold text-content text-right pr-3">{fmt(amount)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <button type="button" onClick={() => remove(item.key)}
                        className="text-content-muted/50 hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-surface-muted border-t border-border-default">
              <tr>
                <td colSpan={6} className="px-2 py-2 text-xs font-bold text-content uppercase">Total</td>
                <td className="px-2 py-2 text-right font-bold text-content pr-3">{fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
