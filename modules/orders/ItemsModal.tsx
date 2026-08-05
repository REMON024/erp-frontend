'use client'
import { Fragment, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { type OrderListItem, fmt } from './types'

// Line-level drill-down for a work order: what was contracted, and every stock movement that
// has been booked against it. Work orders only — a purchase order's receipts are tracked on
// the PO itself, not through this screen.

export interface WorkOrderItemMovement {
  id: number; transactionDate: string; transactionType: string
  referenceNo?: string | null; referenceType?: string | null; warehouseName?: string | null
  qty: number; unitCost: number; totalCost: number; notes?: string | null
}

export interface WorkOrderItem {
  id: number; resourceId: number; resourceName: string; resourceType: string; resourceCategory?: string | null
  description: string; unit: string
  quantity: number; unitRate: number; budgetAmount: number
  receivedQty: number; receivedValue: number
  movements: WorkOrderItemMovement[]
}

export interface WorkOrderItems {
  workOrderId: number; workOrderNo: string; vendorName: string
  projectName?: string | null; status: string
  contractAmount: number; budgetTotal: number; receivedValueTotal: number
  items: WorkOrderItem[]
}

const qty = (n: number) => n.toLocaleString('en-BD', { maximumFractionDigits: 3 })

/** In / Out / Adjustment / Xfer — colour-coded so a return reads differently from a receipt. */
const MOVEMENT_COLORS: Record<string, string> = {
  In:         'bg-success/10 text-success',
  Out:        'bg-danger/10 text-danger',
  Adjustment: 'bg-warning/15 text-warning',
  Xfer:       'bg-info/10 text-info',
}

function MovementRows({ item }: { item: WorkOrderItem }) {
  if (item.movements.length === 0) {
    return (
      <tr className="bg-surface-muted/50">
        <td colSpan={8} className="px-10 py-2 text-xs text-content-muted italic">
          Nothing received against this line yet.
        </td>
      </tr>
    )
  }
  return (
    <tr className="bg-surface-muted/50">
      <td colSpan={8} className="px-10 py-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-content-muted">
              {['Date', 'Type', 'Reference', 'Warehouse', 'Qty', 'Unit Cost', 'Value'].map((h, i) => (
                <th key={h} className={`py-1 font-semibold ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {item.movements.map(m => (
              <tr key={m.id}>
                <td className="py-1 text-content-muted">{m.transactionDate}</td>
                <td className="py-1">
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${MOVEMENT_COLORS[m.transactionType] ?? 'bg-surface-muted text-content-muted'}`}>
                    {m.transactionType}
                  </span>
                </td>
                <td className="py-1 font-mono text-content-muted">
                  {m.referenceNo ?? '—'}{m.referenceType ? ` · ${m.referenceType}` : ''}
                </td>
                <td className="py-1 text-content-muted">{m.warehouseName ?? '—'}</td>
                <td className="py-1 text-right tabular-nums font-medium text-content">{qty(m.qty)} {item.unit}</td>
                <td className="py-1 text-right tabular-nums text-content-muted">{fmt(m.unitCost)}</td>
                <td className="py-1 text-right tabular-nums font-semibold text-content">{fmt(m.totalCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  )
}

export function ItemsModal({ wo, onClose }: { wo: OrderListItem; onClose: () => void }) {
  const [open, setOpen] = useState<Set<number>>(new Set())

  const { data, isLoading, error } = useApiData<WorkOrderItems>({
    url: `/work-orders/${wo.id}/items`,
    queryKey: ['wo-items', wo.id],
  })

  const toggle = (id: number) => setOpen(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const items = data?.items ?? []

  return (
    <Modal open onClose={onClose} title={`Items — ${wo.orderNo}`} size="lg">
      <div className="space-y-4">
        <div className="bg-surface-muted rounded-lg px-4 py-2 text-xs text-content-muted flex flex-wrap gap-4">
          <span>Contractor: <strong>{wo.vendorName}</strong></span>
          <span>Contract: <strong>{fmt(wo.amount)}</strong></span>
          <span>Budgeted lines: <strong>{fmt(data?.budgetTotal ?? 0)}</strong></span>
          <span>Received value: <strong>{fmt(data?.receivedValueTotal ?? 0)}</strong></span>
        </div>

        <DataState loading={isLoading} error={error?.message ?? null} empty={items.length === 0}
          emptyMessage="This work order has no budgeted lines — nothing to track receipts against.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm border border-border-default rounded-lg overflow-hidden">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: '' }, { h: 'Resource' }, { h: 'Unit' }, { h: 'Ordered', num: true },
                    { h: 'Rate', num: true }, { h: 'Budget', num: true },
                    { h: 'Received', num: true }, { h: 'Received Value', num: true },
                  ].map(({ h, num }, i) => (
                    <th key={h || i} className={`px-3 py-2 text-xs font-semibold text-content-muted ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {items.map(it => {
                  const expanded = open.has(it.id)
                  // Over-receipt is legitimate but worth seeing; short delivery is the common case.
                  const short = it.receivedQty < it.quantity
                  return (
                    <Fragment key={it.id}>
                      <tr onClick={() => toggle(it.id)}
                        className="hover:bg-surface-muted cursor-pointer">
                        <td className="px-3 py-2 text-content-muted">
                          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className="font-medium text-content">{it.resourceName}</span>
                          {it.description && <span className="text-content-muted"> · {it.description}</span>}
                          <span className="block text-[11px] text-content-muted">{it.resourceType}
                            {it.resourceCategory && ` · ${it.resourceCategory}`}
                            {it.movements.length > 0 && ` · ${it.movements.length} movement${it.movements.length === 1 ? '' : 's'}`}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-content-muted text-xs">{it.unit || '—'}</td>
                        <td className="px-3 py-2 text-content text-xs text-right tabular-nums">{qty(it.quantity)}</td>
                        <td className="px-3 py-2 text-content-muted text-xs text-right tabular-nums">{fmt(it.unitRate)}</td>
                        <td className="px-3 py-2 font-medium text-content text-xs text-right tabular-nums">{fmt(it.budgetAmount)}</td>
                        <td className={`px-3 py-2 text-xs text-right tabular-nums font-semibold ${short ? 'text-warning' : 'text-success'}`}>
                          {qty(it.receivedQty)}
                        </td>
                        <td className="px-3 py-2 text-content text-xs text-right tabular-nums">{fmt(it.receivedValue)}</td>
                      </tr>
                      {expanded && <MovementRows item={it} />}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </DataState>
      </div>
    </Modal>
  )
}
