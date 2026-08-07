'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, PackageCheck, AlertTriangle } from 'lucide-react'
import { ScopePicker, type ScopeNode } from '@/components/pickers/ScopePicker'
import api from '@/lib/api'

interface BudgetLine { resourceId: number; budgetedQty: number; issuedQty: number; unit: string }
interface PoLine { id: number; resourceId: number; resourceName: string; qty: number; receivedQty?: number; unitPrice: number }
interface PurchaseOrderRow { id: number; poNumber: string; status: string; items: PoLine[] }
interface WorkOrderRow { id: number; orderNo: string; scope?: string | null }
interface StockBalanceRow { warehouseId: number | null; balance: number }
interface MaterialRollup { resourceId: number; resourceName: string; unit: string; category?: string | null; warehouses: StockBalanceRow[] }
interface StockTxn {
  id: number; resourceName: string; unit: string; projectName?: string
  qty: number; totalCost: number; referenceNo?: string; transactionDate: string
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

/**
 * Where the goods come from. A work order is not a source — it says which contract the
 * consumption is charged against, so it applies to either of these.
 */
type IssueSource = 'Stock' | 'PurchaseOrder'

/**
 * Material is consumed by construction area, so it can only be issued to a node whose level
 * bears area. Issuing to a mandays or per-bay node would enter area-based allocation with no
 * area to divide by — the server rejects it, and this keeps it out of the picker too.
 */
const areaBearingOnly = (n: ScopeNode) => n.isAreaBearing

const schema = z.object({
  source:          z.enum(['Stock', 'PurchaseOrder']),
  // Only a draw from the store has a warehouse; a direct delivery never enters one.
  warehouseId:     z.coerce.number().optional(),
  orderLineId: z.coerce.number().optional(),
  workOrderId:     z.coerce.number().optional(),
  resourceId:      z.coerce.number().min(1, 'Required'),
  projectId:       z.coerce.number().min(1, 'Required'),
  // Which part of the project consumed the material. Required unless the issue is declared
  // project-wide: the scope is write-once, so an unattributed issue can never afterwards be
  // traced back to the flat it was spent on.
  nodeId:          z.coerce.number().optional(),
  projectWide:     z.boolean().optional(),
  qty:             z.coerce.number().min(0.01, 'Required'),
  transactionDate: z.string().min(1, 'Required'),
  referenceNo:     z.string().optional(),
  notes:           z.string().optional(),
})
  .refine(d => d.projectWide || d.nodeId || d.workOrderId, {
    // A work order carries its own scope, so naming one satisfies this too.
    message: 'Pick the part of the project that consumed this — or tick "Project-wide".',
    path: ['nodeId'],
  })
  .refine(d => d.source !== 'Stock' || !!d.warehouseId, {
    message: 'Required', path: ['warehouseId'],
  })
  .refine(d => d.source !== 'PurchaseOrder' || !!d.orderLineId, {
    message: 'Select the purchase order line this delivery is against.',
    path: ['orderLineId'],
  })
type Form = z.infer<typeof schema>

function IssueModal({ warehouses, onClose, onSaved }: {
  warehouses: { id: number; name: string }[]; onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  // Narrows the material list only — the issue still records the specific resource.
  const [category, setCategory] = useState('')
  const { register, handleSubmit, watch, setValue, resetField, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { transactionDate: isoToday(), source: 'Stock' },
  })

  const source       = watch('source') ?? 'Stock'
  const fromPo       = source === 'PurchaseOrder'
  const watchedWh    = Number(watch('warehouseId'))
  const watchedMat   = Number(watch('resourceId'))
  const watchedProj  = Number(watch('projectId'))
  const watchedQty   = Number(watch('qty')) || 0
  const watchedPoLine = Number(watch('orderLineId'))

  // Approved/received orders on the chosen project, with the pending qty per line — a direct
  // delivery can only be booked against a line that still has something outstanding.
  const { data: purchaseOrders = [] } = useApiData<PurchaseOrderRow[]>({
    url: '/purchase-orders',
    params: { projectId: watchedProj || undefined },
    queryKey: ['issue-po-lines', String(watchedProj)],
    enabled: fromPo && !!watchedProj,
  })
  const poLines = purchaseOrders
    .filter(po => po.status === 'Approved' || po.status === 'Received')
    .flatMap(po => po.items.map(i => ({
      ...i, poNumber: po.poNumber, pending: i.qty - (i.receivedQty ?? 0),
    })))
    .filter(l => l.pending > 0)
  const selectedPoLine = poLines.find(l => l.id === watchedPoLine)

  // Attribution is optional and independent of the source, so this loads for both.
  const { data: workOrders = [] } = useApiData<WorkOrderRow[]>({
    url: '/orders',
    params: { type: 'Work', status: 'Active', projectId: watchedProj || undefined },
    queryKey: ['issue-work-orders', String(watchedProj)],
    enabled: !!watchedProj,
  })

  // Per-warehouse stock for the selected warehouse; drives the material list and "Available".
  const { data: rollups = [] } = useApiData<MaterialRollup[]>({
    url: '/stock-transactions/balances',
    params: { warehouseId: watchedWh || undefined },
    queryKey: ['issue-wh-balances', String(watchedWh)],
    enabled: !!watchedWh,
  })
  // Only materials that have a positive balance in the chosen warehouse.
  const inStock = rollups
    .map(r => ({
      id: r.resourceId, name: r.resourceName, unit: r.unit, category: r.category ?? '',
      balance: r.warehouses.find(w => w.warehouseId === watchedWh)?.balance ?? 0,
    }))
    .filter(m => m.balance > 0)
  // Derived from what is actually in stock here, so no category leads to an empty list.
  const categories = [...new Set(inStock.map(m => m.category).filter(Boolean))].sort()
  const availableMaterials = category ? inStock.filter(m => m.category === category) : inStock
  const selectedMat = inStock.find(m => m.id === watchedMat)

  const { data: budgetLines = [] } = useApiData<BudgetLine[]>({
    url: `/cost-estimates/resource-budget/${watchedProj || '0'}`,
    queryKey: ['resource-budget', String(watchedProj)],
    enabled: !!watchedProj,
  })
  const budgetLine   = budgetLines.find(l => l.resourceId === watchedMat)
  const remaining    = budgetLine ? budgetLine.budgetedQty - budgetLine.issuedQty : null
  const wouldExceed  = budgetLine && budgetLine.budgetedQty > 0 && (budgetLine.issuedQty + watchedQty) > budgetLine.budgetedQty

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      await api.post('/stock-transactions/issue', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Issue Material to Project" size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        {/* Where the goods come from. Straight from the supplier they never enter the store, so
            they carry the order's price rather than the warehouse's weighted average. */}
        <div>
          <label className={lbl}>Source <span className="text-danger">*</span></label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'Stock',         title: 'From Stock',      blurb: 'Draw from a warehouse balance' },
              { key: 'PurchaseOrder', title: 'Direct from PO',  blurb: 'Supplier delivers to site' },
            ] as { key: IssueSource; title: string; blurb: string }[]).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setValue('source', opt.key, { shouldValidate: false })
                  // Each source owns different fields; carrying one over into the other is how a
                  // stale warehouse or PO line ends up on the request.
                  setCategory('')
                  for (const k of ['resourceId', 'warehouseId', 'orderLineId'] as const)
                    setValue(k, undefined as any, { shouldValidate: false })
                }}
                className={`text-left border rounded-lg p-2.5 transition-colors ${
                  source === opt.key
                    ? 'border-primary bg-primary/5'
                    : 'border-border-default hover:border-primary/50'
                }`}
              >
                <span className="block text-sm font-medium text-content">{opt.title}</span>
                <span className="block text-xs text-content-muted">{opt.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        {!fromPo && (
          <>
            <div>
              <label className={lbl}>Warehouse <span className="text-danger">*</span></label>
              <Select {...register('warehouseId', {
                onChange: () => { setCategory(''); resetField('resourceId') },
              })}>
                <option value="">Select warehouse</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
              {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId.message}</p>}
            </div>
            <div>
              <label className={lbl}>Resource Category</label>
              <Select value={category} disabled={!watchedWh}
                onChange={e => { setCategory(e.target.value); resetField('resourceId') }}>
                <option value="">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <label className={lbl}>Material <span className="text-danger">*</span></label>
              <Select {...register('resourceId')} disabled={!watchedWh}>
                <option value="">{watchedWh ? 'Select material' : 'Select a warehouse first'}</option>
                {availableMaterials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.category ? ` · ${m.category}` : ''} — {m.balance.toLocaleString()} {m.unit} available
                  </option>
                ))}
              </Select>
              {watchedWh && availableMaterials.length === 0 &&
                <p className="text-xs text-content-muted mt-1">No materials in stock in this warehouse.</p>}
              {errors.resourceId && <p className="text-xs text-danger mt-1">{errors.resourceId.message}</p>}
            </div>
            {selectedMat && (
              <div className="bg-surface-muted rounded-lg px-3 py-2 text-xs text-content-muted">
                Available: <strong>{selectedMat.balance.toLocaleString()} {selectedMat.unit}</strong>
              </div>
            )}
          </>
        )}

        {fromPo && (
          <div>
            <label className={lbl}>Purchase Order Line <span className="text-danger">*</span></label>
            {/* The material comes from the chosen line, so it is never picked separately here. */}
            <Select
              {...register('orderLineId', {
                onChange: e => {
                  const line = poLines.find(l => l.id === Number(e.target.value))
                  setValue('resourceId', (line?.resourceId ?? undefined) as any, { shouldValidate: false })
                },
              })}
              disabled={!watchedProj}
            >
              <option value="">{watchedProj ? 'Select PO line' : 'Choose the project first'}</option>
              {poLines.map(l => (
                <option key={l.id} value={l.id}>
                  {l.poNumber} · {l.resourceName} — {l.pending.toLocaleString()} pending @ {fmt(l.unitPrice)}
                </option>
              ))}
            </Select>
            {watchedProj && poLines.length === 0 && (
              <p className="text-xs text-content-muted mt-1">
                No approved purchase order on this project has anything outstanding.
              </p>
            )}
            {errors.orderLineId && (
              <p className="text-xs text-danger mt-1">{errors.orderLineId.message}</p>
            )}
            {selectedPoLine && (
              <div className="bg-surface-muted rounded-lg px-3 py-2 text-xs text-content-muted mt-2">
                Pending: <strong>{selectedPoLine.pending.toLocaleString()}</strong> ·
                {' '}Unit price <strong>{fmt(selectedPoLine.unitPrice)}</strong>
                <span className="block mt-0.5">
                  Goes straight to site — stock levels are unaffected and the order's price is used,
                  not the store's average.
                </span>
              </div>
            )}
          </div>
        )}
        <div className="rounded-lg border border-border-default p-3">
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-3">Issued to</p>
          <ScopePicker
            value={{
              projectId: watch('projectId') ? String(watch('projectId')) : '',
              nodeId:    watch('nodeId')    ? String(watch('nodeId'))    : '',
            }}
            onChange={next => {
              // Empty string clears the field so zod's optional() sees undefined, not NaN.
              const set = (k: 'projectId' | 'nodeId', v: string) =>
                setValue(k, (v ? Number(v) : undefined) as any, { shouldValidate: false })
              set('projectId', next.projectId)
              set('nodeId',    next.nodeId)
              // Naming a scope and calling it project-wide contradict each other, so picking
              // one clears the other — in both directions.
              if (next.nodeId) setValue('projectWide', false, { shouldValidate: false })
            }}
            mode="form"
            // Material is consumed by construction area. A node measured in mandays or bays has
            // no area to absorb it, so the server rejects such an issue — don't offer it here.
            nodeFilter={areaBearingOnly}
          />
          <label className="flex items-start gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              {...register('projectWide', {
                onChange: e => {
                  if (!e.target.checked) return
                  setValue('nodeId', undefined as any, { shouldValidate: false })
                },
              })}
            />
            <span className="text-sm text-content">
              Project-wide
              <span className="block text-xs text-content-muted">
                Substructure, boundary wall or site works — spend that belongs to no single block or flat.
              </span>
            </span>
          </label>
          {errors.projectId && <p className="text-xs text-danger mt-1">{errors.projectId.message}</p>}
          {errors.nodeId    && <p className="text-xs text-danger mt-1">{errors.nodeId.message}</p>}

          {/* Attribution, not a source: it charges the consumption against the order's material
              budget and supplies the scope when none is picked above. */}
          <div className="mt-3">
            <label className={lbl}>
              Against Work Order
              <span className="text-xs text-content-muted font-normal"> — optional</span>
            </label>
            <Select {...register('workOrderId')} disabled={!watchedProj}>
              <option value="">{watchedProj ? 'Not against a work order' : 'Choose the project first'}</option>
              {workOrders.map(w => (
                <option key={w.id} value={w.id}>
                  {w.orderNo}{w.scope ? ` — ${w.scope}` : ''}
                </option>
              ))}
            </Select>
            <p className="text-xs text-content-muted mt-1">
              Draws down that order's material budget. The material must be budgeted on it, and its
              block/floor/unit is used when none is chosen above.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Quantity <span className="text-danger">*</span></label>
            <input type="number" step="any" {...register('qty')} className={inp} placeholder="0" />
            {errors.qty && <p className="text-xs text-danger mt-1">{errors.qty.message}</p>}
            {remaining !== null && !wouldExceed && (
              <p className="text-xs text-content-muted mt-1">
                BOQ remaining: <span className="font-medium text-success">{remaining.toLocaleString()} {budgetLine?.unit}</span>
              </p>
            )}
            {wouldExceed && (
              <div className="flex items-start gap-1.5 mt-1.5 bg-warning/15 border border-warning/20 rounded-lg px-2.5 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-warning">
                  This would exceed the BOQ budget by{' '}
                  <span className="font-semibold">
                    {((budgetLine!.issuedQty + watchedQty) - budgetLine!.budgetedQty).toLocaleString()} {budgetLine?.unit}
                  </span>. You can still proceed.
                </p>
              </div>
            )}
          </div>
          <div>
            <label className={lbl}>Date <span className="text-danger">*</span></label>
            <DateField {...register('transactionDate')} />
          </div>
        </div>
        <div>
          <label className={lbl}>Reference / Notes</label>
          <input {...register('referenceNo')} className={inp} placeholder="ISS-..." />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Issue Material'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function IssueToProjectPage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)

  const { data: warehouses = [] } = useApiData<{ id: number; name: string }[]>({ url: '/warehouses', params: { activeOnly: true }, queryKey: ['warehouses-list'] })
  const { data: txns = [], isLoading, error, refetch } = useApiData<StockTxn[]>({
    url: '/stock-transactions',
    params: { type: 'Out' },
    queryKey: ['stock-out'],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['stock-out'] })
    qc.invalidateQueries({ queryKey: ['materials'] })
    qc.invalidateQueries({ queryKey: ['materials-list'] })
    qc.invalidateQueries({ queryKey: ['resource-budget'] })
    qc.invalidateQueries({ queryKey: ['resource-budget-summary'] })
    qc.invalidateQueries({ queryKey: ['cost-estimates'] })
    qc.invalidateQueries({ queryKey: ['project-setup-checklist'] })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issue to Project"
        subtitle="Issue materials from store to project sites"
        action={
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Issue Material
          </button>
        }
      />

      <DataState loading={isLoading} error={error ? 'Failed to load issue history.' : null} onRetry={refetch}
        empty={txns.length === 0} emptyMessage="No material issues yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Material' }, { h: 'Project' }, { h: 'Date' },
                    { h: 'Qty', num: true }, { h: 'Value', num: true }, { h: 'Reference' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {txns.map(t => (
                  <tr key={t.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-medium text-content">
                      <div className="flex items-center gap-2"><PackageCheck className="w-4 h-4 text-warning" />{t.resourceName}</div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs">{t.projectName ?? '—'}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{t.transactionDate}</td>
                    <td className="px-4 py-3 text-warning font-semibold text-right tabular-nums">−{t.qty.toLocaleString()} {t.unit}</td>
                    <td className="px-4 py-3 font-semibold text-content text-right tabular-nums">{fmt(t.totalCost)}</td>
                    <td className="px-4 py-3 text-content-muted text-xs font-mono">{t.referenceNo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {showNew && <IssueModal warehouses={warehouses} onClose={() => setShowNew(false)} onSaved={invalidate} />}
    </div>
  )
}
