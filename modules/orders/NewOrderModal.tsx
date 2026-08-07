'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useApiData } from '@/hooks/useApiData'
import { ScopePicker, scopeToPayload, EMPTY_SCOPE, type ScopeValue } from '@/components/pickers/ScopePicker'
import { ShoppingCart, ClipboardList, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'
import { OrderLineEditor } from './OrderLineEditor'
import {
  type OrderType, type Vendor, type Material, type DraftOrderLine,
  type OrderCapabilities, newOrderLine, fmt, isoToday, inp, lbl,
} from './types'

interface ResourceBudgetLine { resourceId: number; budgetedCost: number; committedCost: number; actualCost: number }

/**
 * One creation flow for both order types. The user picks the type first; everything below —
 * header fields, the line editor's labels, and which endpoint payload is built — follows from
 * that choice. The backend receives a single POST /orders and routes it to the command that
 * owns that type's rules.
 */
export function NewOrderModal({ capabilities, vendors, materials, onClose, onSaved }: {
  capabilities: OrderCapabilities
  vendors: Vendor[]; materials: Material[]
  onClose: () => void; onSaved: () => void
}) {
  const allowed: OrderType[] = [
    ...(capabilities.canCreatePurchase ? ['Purchase' as const] : []),
    ...(capabilities.canCreateWork     ? ['Work' as const]     : []),
  ]
  // With a single permitted type there is nothing to choose — go straight to the form.
  const [orderType, setOrderType] = useState<OrderType | null>(allowed.length === 1 ? allowed[0] : null)

  if (!orderType) {
    return (
      <Modal open onClose={onClose} title="New Order" size="md">
        <div className="space-y-4">
          <p className="text-sm text-content-muted">What kind of order is this?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TypeCard
              icon={<ShoppingCart className="w-5 h-5" />}
              title="Purchase Order"
              blurb="Buy materials or goods from a supplier. Delivery date, per-line unit prices, received against a GRN."
              disabled={!capabilities.canCreatePurchase}
              onClick={() => setOrderType('Purchase')}
            />
            <TypeCard
              icon={<ClipboardList className="w-5 h-5" />}
              title="Work Order"
              blurb="Engage a contractor to execute scope of work. Contract value, advance recovery, retention and progress bills."
              disabled={!capabilities.canCreateWork}
              onClick={() => setOrderType('Work')}
            />
          </div>
          {allowed.length === 0 && (
            <p className="text-xs text-warning">
              You do not have permission to raise either kind of order.
            </p>
          )}
        </div>
      </Modal>
    )
  }

  return (
    <OrderForm
      orderType={orderType}
      canSwitchType={allowed.length > 1}
      onBack={() => setOrderType(null)}
      vendors={vendors} materials={materials}
      onClose={onClose} onSaved={onSaved}
    />
  )
}

function TypeCard({ icon, title, blurb, disabled, onClick }: {
  icon: React.ReactNode; title: string; blurb: string; disabled?: boolean; onClick: () => void
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="text-left border border-border-default rounded-xl p-4 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border-default disabled:hover:bg-transparent">
      <div className="flex items-center gap-2 text-primary mb-1.5">{icon}<span className="font-semibold text-sm text-content">{title}</span></div>
      <p className="text-xs text-content-muted leading-relaxed">{blurb}</p>
      {disabled && <p className="text-[11px] text-warning mt-2">No permission to create this type.</p>}
    </button>
  )
}

function OrderForm({ orderType, canSwitchType, onBack, vendors, materials, onClose, onSaved }: {
  orderType: OrderType
  canSwitchType: boolean
  onBack: () => void
  vendors: Vendor[]; materials: Material[]
  onClose: () => void; onSaved: () => void
}) {
  const isWork = orderType === 'Work'

  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const [vendorId,  setVendorId]  = useState('')
  const [orderDate, setOrderDate] = useState(isoToday())
  // Which part of the build the order is for. Required for a work order; a purchase order may
  // leave it empty entirely, which means general stock.
  const [scope, setScope] = useState<ScopeValue>(EMPTY_SCOPE)
  const projectId = scope.projectId
  // Purchase
  const [deliveryDate, setDeliveryDate] = useState('')
  // Work
  const [scopeOfWork,      setScopeOfWork]      = useState('')
  const [endDate,          setEndDate]          = useState('')
  const [advanceAmount,    setAdvanceAmount]    = useState('0')
  const [retentionPercent, setRetentionPercent] = useState('5')

  const [lines, setLines] = useState<DraftOrderLine[]>([newOrderLine()])
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitRate) || 0), 0)

  // ── Purchase-only budget + EPL context (PRD-04) ────────────────────────────
  const { data: budgetLines = [] } = useApiData<ResourceBudgetLine[]>({
    url: `/cost-estimates/resource-budget/${projectId || '0'}`,
    queryKey: ['resource-budget', projectId],
    enabled: !isWork && !!projectId,
  })
  const budgetByMaterial = Object.fromEntries(budgetLines.map(l => [l.resourceId, l]))

  const { data: approvedEpls = [] } = useApiData<{ items: { id: number; resourceId?: number }[] }[]>({
    url: '/cost-estimates',
    params: { projectId: projectId || undefined, status: 'Approved' },
    queryKey: ['approved-epls', projectId],
    enabled: !isWork && !!projectId,
  })
  const eplItemByMaterial: Record<number, number> = {}
  approvedEpls.forEach(e => e.items?.forEach(it => { if (it.resourceId) eplItemByMaterial[it.resourceId] = it.id }))
  const eplItemFor = (resourceId?: number) => (resourceId ? eplItemByMaterial[resourceId] : undefined)

  // A purchase line on a project with an approved EPL but no matching line needs a reason.
  const needsUnmatchedReason = (l: DraftOrderLine) =>
    !isWork && !!projectId && !!l.resourceId && !eplItemFor(l.resourceId)

  const warningFor = (l: DraftOrderLine) => {
    if (isWork || !projectId || !l.resourceId) return null
    const budget = budgetByMaterial[l.resourceId]
    if (!budget || budget.budgetedCost === 0) return null
    const projected = budget.committedCost + (Number(l.quantity) || 0) * (Number(l.unitRate) || 0)
    if (projected <= budget.budgetedCost) return null
    return `Over material budget: ${fmt(projected)} committed vs ${fmt(budget.budgetedCost)} budgeted.`
  }

  const vendorOptions = isWork
    ? vendors.filter(v => v.vendorType === 'Contractor' || v.vendorType === 'Both')
    : vendors

  // An order carries exactly one vendor, and both the category list and the rate are scoped to
  // them — so switching vendor has to drop every downstream choice rather than leave lines
  // sitting on another vendor's categories and prices.
  const handleVendorChange = (next: string) => {
    setVendorId(next)
    setLines(prev => prev.map(l => ({
      ...l, categoryId: undefined, resourceId: undefined,
      description: '', unit: '', unitRate: 0,
    })))
  }

  const submit = async () => {
    const valid = lines.filter(l => l.resourceId && Number(l.quantity) > 0)
    if (!vendorId)        { setErr(isWork ? 'Contractor is required.' : 'Vendor is required.'); return }
    if (valid.length === 0) { setErr('At least one valid line is required.'); return }
    if (isWork) {
      if (!projectId)     { setErr('Project is required for a work order.'); return }
      if (!scopeOfWork.trim()) { setErr('Scope of work is required.'); return }
      if (Number(advanceAmount) > total) { setErr('Advance cannot exceed the contract amount.'); return }
    } else {
      const missing = valid.find(l => needsUnmatchedReason(l) && !(l.unmatchedReason ?? '').trim())
      if (missing) {
        setErr(`"${missing.description || 'A line'}" has no approved EPL line — enter a reason to proceed.`)
        return
      }
    }

    setSaving(true); setErr('')
    try {
      const body = isWork
        ? {
            orderType,
            work: {
              ...scopeToPayload(scope),
              vendorId: Number(vendorId),
              scope: scopeOfWork.trim(),
              startDate: orderDate || undefined,
              endDate: endDate || undefined,
              contractAmount: total,
              advanceAmount: Number(advanceAmount) || 0,
              retentionPercent: Number(retentionPercent) || 0,
              resources: valid.map(l => ({
                resourceId: l.resourceId,
                description: (l.description || '').trim(),
                unit: l.unit,
                quantity: Number(l.quantity),
                unitRate: Number(l.unitRate),
              })),
            },
          }
        : {
            orderType,
            purchase: {
              vendorId: Number(vendorId),
              // Not scopeToPayload: it coerces an empty projectId to 0, and a purchase order is
              // allowed to carry no project at all.
              projectId: projectId ? Number(projectId) : undefined,
              nodeId:    scope.nodeId ? Number(scope.nodeId) : undefined,
              poDate: orderDate,
              deliveryDate: deliveryDate || undefined,
              items: valid.map(l => {
                const eplId = projectId ? eplItemFor(l.resourceId) : undefined
                return {
                  resourceId: l.resourceId,
                  qty: Number(l.quantity),
                  unitPrice: Number(l.unitRate),
                  costEstimateItemId: eplId ?? null,
                  unmatchedReason: (!eplId && projectId) ? ((l.unmatchedReason ?? '').trim() || null) : null,
                }
              }),
            },
          }
      await api.post('/orders', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isWork ? 'New Work Order' : 'New Purchase Order'} size="xl">
      <div className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        {canSwitchType && (
          <button type="button" onClick={onBack} className="text-xs text-primary hover:underline">
            ← Change order type
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Vendor comes first: it is the one vendor for the whole order and it scopes the
              categories, resources and rates every line below can use. */}
          <div>
            <label className={lbl}>{isWork ? 'Contractor' : 'Vendor'} <span className="text-danger">*</span></label>
            <Select value={vendorId} onChange={e => handleVendorChange(e.target.value)}>
              <option value="">Select {isWork ? 'contractor' : 'vendor'}</option>
              {vendorOptions.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
            </Select>
          </div>
        </div>

        {/* Which part of the build this order is for. Leaving a level blank covers everything
            below it; for a purchase order, leaving even the project blank means general stock. */}
        <div className="rounded-lg border border-border-default p-3">
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-3">
            Scope {isWork
              ? <span className="text-danger">*</span>
              : <span className="normal-case font-normal"> — optional; leave blank for general stock</span>}
          </p>
          <ScopePicker value={scope} onChange={setScope} mode="form" />
        </div>

        {isWork && (
          <div>
            <label className={lbl}>Scope of Work <span className="text-danger">*</span></label>
            <textarea value={scopeOfWork} onChange={e => setScopeOfWork(e.target.value)} className={inp} rows={2} placeholder="Describe the work…" />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>{isWork ? 'Start Date' : 'PO Date'}</label>
            <DateField value={orderDate} onChange={e => setOrderDate(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>{isWork ? 'End Date' : 'Expected Delivery'}</label>
            <DateField
              value={isWork ? endDate : deliveryDate}
              onChange={e => (isWork ? setEndDate(e.target.value) : setDeliveryDate(e.target.value))} />
          </div>
        </div>

        {isWork && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Contract Amount (৳)</label>
              <input value={fmt(total)} readOnly disabled className={inp}
                title="Sum of the budget lines below" />
            </div>
            <div>
              <label className={lbl}>Advance (৳)</label>
              <input type="number" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} className={inp} placeholder="0" />
            </div>
            <div>
              <label className={lbl}>Retention (%)</label>
              <input type="number" step="any" min={0} max={100} value={retentionPercent}
                onChange={e => setRetentionPercent(e.target.value)} className={inp} placeholder="5" />
            </div>
          </div>
        )}

        {/* Vendor and date give the rate lookup its context, so a back-dated order picks up the
            rate that was in force then, and this vendor's own rate if it has one. */}
        <OrderLineEditor
          items={lines}
          onChange={setLines}
          vendorId={Number(vendorId) || null}
          asOf={orderDate || undefined}
          heading={isWork ? 'Budget Resources' : 'Order Items'}
          hint={isWork
            ? 'planned material, equipment, service or labour — the contract amount is their total'
            : 'what is being bought; material lines are matched against the approved EPL'}
          rateLabel={isWork ? 'Unit Rate (৳)' : 'Unit Price (৳)'}
          needsUnmatchedReason={needsUnmatchedReason}
          warningFor={warningFor}
        />

        {!isWork && lines.some(l => warningFor(l)) && (
          <p className="text-xs text-warning flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            One or more lines exceed the material budget for this project. You can still proceed.
          </p>
        )}

        <div className="flex justify-end items-center gap-3 pt-2 border-t border-border-default">
          <span className="text-sm text-content-muted mr-auto">Total: <strong className="text-content">{fmt(total)}</strong></span>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isWork ? 'Create Work Order' : 'Create Purchase Order'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
