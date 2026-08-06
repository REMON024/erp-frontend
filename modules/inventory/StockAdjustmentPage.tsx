'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { useApiData } from '@/hooks/useApiData'
import { SlidersHorizontal, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { ResourcePicker } from '@/components/pickers/ResourcePicker'
import { CategorySelect } from '@/components/pickers/CategorySelect'
import api from '@/lib/api'

interface Warehouse { id: number; name: string }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'
function isoToday() { return new Date().toISOString().split('T')[0] }

/**
 * Stock that arrives or disappears without a document behind it — opening balances, stock-take
 * corrections, damage and theft.
 *
 * It exists because a receipt must now name the purchase or work order it came against. That rule
 * is right for deliveries and wrong for a count, so the two are separated and this one is
 * permissioned on its own: it is the only screen in the system that can create stock from nothing.
 */
export function StockAdjustmentPage() {
  const qc = useQueryClient()
  const { data: warehouses = [] } = useApiData<Warehouse[]>({
    url: '/warehouses', params: { activeOnly: true }, queryKey: ['warehouses-list'],
  })

  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [resourceId, setResourceId] = useState<number | ''>('')
  const [warehouseId, setWarehouseId] = useState('')
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(isoToday())
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = async () => {
    setBusy(true); setMsg(null)
    try {
      // The API takes a signed quantity; the direction toggle is only here so nobody has to type
      // a minus sign to write stock off.
      const signed = direction === 'decrease' ? -Math.abs(Number(qty)) : Math.abs(Number(qty))
      await api.post('/stock-transactions/adjustment', {
        resourceId: Number(resourceId),
        qty: signed,
        reason: reason.trim(),
        transactionDate: date,
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
        referenceNo: referenceNo || undefined,
        notes: notes || undefined,
      })
      setMsg({ ok: true, text: 'Adjustment recorded.' })
      setQty(''); setReason(''); setReferenceNo(''); setNotes('')
      qc.invalidateQueries({ queryKey: ['stock-balances'] })
    } catch (e: any) {
      setMsg({ ok: false, text: e.response?.data?.errors?.[0] ?? 'Adjustment failed' })
    } finally { setBusy(false) }
  }

  const valid = resourceId && Number(qty) > 0 && reason.trim().length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Adjustment"
        subtitle="Opening balances, stock-take corrections and write-offs"
      />

      <div className="bg-surface rounded-xl border border-border-default p-5 max-w-2xl space-y-4">
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            An adjustment changes stock with no order behind it, so it is always visible as an
            adjustment in the movement history and cannot be deleted — correct a wrong one with a
            further adjustment.
          </span>
        </div>

        {msg && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${msg.ok ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
            {msg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.text}
          </div>
        )}

        <div>
          <label className={lbl}>Resource Category</label>
          <CategorySelect value={categoryId} resourceType="Material" placeholder="All categories"
            onChange={id => { setCategoryId(id); setResourceId('') }} />
        </div>

        <div>
          <label className={lbl}>Material <span className="text-danger">*</span></label>
          {/* Materials only: nothing else carries a stock balance to adjust. */}
          <ResourcePicker value={resourceId} types={['Material']} categoryId={categoryId}
            onChange={id => setResourceId(id)} placeholder="Select material" />
        </div>

        <div>
          <label className={lbl}>Warehouse</label>
          <Select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
            <option value="">Unassigned (central stock)</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </div>

        <div>
          <label className={lbl}>Direction <span className="text-danger">*</span></label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'increase', title: 'Add stock',    blurb: 'Opening balance, found on count' },
              { key: 'decrease', title: 'Remove stock', blurb: 'Damage, theft, shortfall' },
            ] as const).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDirection(opt.key)}
                className={`text-left border rounded-lg p-2.5 transition-colors ${
                  direction === opt.key
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Quantity <span className="text-danger">*</span></label>
            <input type="number" step="any" min={0} value={qty} onChange={e => setQty(e.target.value)}
              className={inp} placeholder="0" />
          </div>
          <div>
            <label className={lbl}>Date <span className="text-danger">*</span></label>
            <DateField value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={lbl}>Reason <span className="text-danger">*</span></label>
          <input value={reason} onChange={e => setReason(e.target.value)} className={inp}
            placeholder="Opening balance, stock-take variance, damaged in storage…" />
          <p className="text-xs text-content-muted mt-1">
            Required — an unexplained adjustment is indistinguishable from a mistake.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Reference No</label>
            <input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} className={inp}
              placeholder="Stock-take sheet no." />
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className={inp} placeholder="Optional" />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border-default">
          <button onClick={submit} disabled={!valid || busy}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60 flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4" />
            {busy ? 'Saving…' : 'Record Adjustment'}
          </button>
        </div>
      </div>
    </div>
  )
}
