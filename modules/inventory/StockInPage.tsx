'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, PackagePlus } from 'lucide-react'
import api from '@/lib/api'

interface Material { id: number; materialName: string; unit: string; averageCost: number }
interface Warehouse { id: number; name: string }
interface WorkOrderMaterialLine { materialId: number | null; materialName: string | null; unit: string; quantity: number; receivedQty: number }
interface WorkOrder { id: number; workOrderNo: string; projectName: string; materials: WorkOrderMaterialLine[] }
interface StockTxn {
  id: number; materialName: string; unit: string; transactionType: string
  qty: number; unitCost: number; totalCost: number
  referenceNo?: string; transactionDate: string; notes?: string
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  materialId:      z.coerce.number().min(1, 'Required'),
  warehouseId:     z.coerce.number().optional(),
  workOrderId:     z.coerce.number().min(1, 'Required'),
  qty:             z.coerce.number().min(0.01, 'Required'),
  unitCost:        z.coerce.number().min(0, 'Required'),
  transactionDate: z.string().min(1, 'Required'),
  referenceNo:     z.string().optional(),
  notes:           z.string().optional(),
})
type Form = z.infer<typeof schema>

function StockInModal({ materials, warehouses, workOrders, onClose, onSaved }: {
  materials: Material[]; warehouses: Warehouse[]; workOrders: WorkOrder[]; onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, setValue, watch, resetField, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { transactionDate: isoToday() },
  })

  // A budget line is receivable when it links a material master and isn't fully received yet.
  const isReceivable = (m: WorkOrderMaterialLine) => m.materialId != null && m.receivedQty < m.quantity
  // Only show work orders that still have at least one receivable material line.
  const selectableWorkOrders = workOrders.filter(w => w.materials.some(isReceivable))

  const selectedWorkOrder = workOrders.find(w => w.id === Number(watch('workOrderId')))
  const woMaterialIds = new Set(
    (selectedWorkOrder?.materials ?? [])
      .filter(isReceivable)
      .map(m => m.materialId as number))
  const availableMaterials = materials.filter(m => woMaterialIds.has(m.id))

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const payload = {
        ...d,
        warehouseId: d.warehouseId ? Number(d.warehouseId) : undefined,
        workOrderId: d.workOrderId ? Number(d.workOrderId) : undefined,
      }
      await api.post('/stock-transactions/in', payload)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Stock In (Goods Received)" size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className={lbl}>Work Order <span className="text-danger">*</span></label>
          <Select {...register('workOrderId', {
            onChange: () => {
              // Reset the material when the work order changes so a stale selection can't survive.
              resetField('materialId')
            },
          })}>
            <option value="">Select work order</option>
            {selectableWorkOrders.map(w => <option key={w.id} value={w.id}>{w.workOrderNo} — {w.projectName}</option>)}
          </Select>
          {errors.workOrderId && <p className="text-xs text-danger mt-1">{errors.workOrderId.message}</p>}
        </div>
        <div>
          <label className={lbl}>Material <span className="text-danger">*</span></label>
          <Select {...register('materialId', {
            onChange: e => {
              const m = materials.find(x => x.id === Number(e.target.value))
              if (m) setValue('unitCost', m.averageCost)
            },
          })} disabled={!selectedWorkOrder}>
            <option value="">{selectedWorkOrder ? 'Select material' : 'Select a work order first'}</option>
            {availableMaterials.map(m => <option key={m.id} value={m.id}>{m.materialName} ({m.unit})</option>)}
          </Select>
          {selectedWorkOrder && availableMaterials.length === 0 &&
            <p className="text-xs text-content-muted mt-1">This work order has no budgeted materials linked to the material master.</p>}
          {errors.materialId && <p className="text-xs text-danger mt-1">{errors.materialId.message}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Warehouse</label>
            <Select {...register('warehouseId')}>
              <option value="">Unassigned (central store)</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Quantity <span className="text-danger">*</span></label>
            <input type="number" step="any" {...register('qty')} className={inp} placeholder="0" />
            {errors.qty && <p className="text-xs text-danger mt-1">{errors.qty.message}</p>}
          </div>
          <div>
            <label className={lbl}>Unit Cost (৳) <span className="text-danger">*</span></label>
            <input type="number" step="any" {...register('unitCost')} className={inp} placeholder="0" />
            {errors.unitCost && <p className="text-xs text-danger mt-1">{errors.unitCost.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Date <span className="text-danger">*</span></label>
            <DateField {...register('transactionDate')} />
          </div>
          <div>
            <label className={lbl}>Reference / GRN No.</label>
            <input {...register('referenceNo')} className={inp} placeholder="GRN-..." />
          </div>
        </div>
        <div>
          <label className={lbl}>Notes</label>
          <input {...register('notes')} className={inp} placeholder="Optional…" />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Record Stock In'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function StockInPage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)

  const { data: materials = [] } = useApiData<Material[]>({ url: '/materials', queryKey: ['materials-list'] })
  const { data: warehouses = [] } = useApiData<Warehouse[]>({ url: '/warehouses', params: { activeOnly: true }, queryKey: ['warehouses-list'] })
  const { data: workOrders = [] } = useApiData<WorkOrder[]>({ url: '/work-orders', queryKey: ['work-orders-list'] })
  const { data: txns = [], isLoading, error, refetch } = useApiData<StockTxn[]>({
    url: '/stock-transactions',
    params: { type: 'In' },
    queryKey: ['stock-in'],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['stock-in'] })
    qc.invalidateQueries({ queryKey: ['materials'] })
    qc.invalidateQueries({ queryKey: ['materials-list'] })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock In"
        subtitle="Record goods received into the central store"
        action={
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Stock In
          </button>
        }
      />

      <DataState loading={isLoading} error={error ? 'Failed to load stock-in history.' : null} onRetry={refetch}
        empty={txns.length === 0} emptyMessage="No stock-in transactions yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Material' }, { h: 'Date' }, { h: 'Qty', num: true },
                    { h: 'Unit Cost', num: true }, { h: 'Total', num: true }, { h: 'Reference' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {txns.map(t => (
                  <tr key={t.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-medium text-content">
                      <div className="flex items-center gap-2"><PackagePlus className="w-4 h-4 text-success" />{t.materialName}</div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs">{t.transactionDate}</td>
                    <td className="px-4 py-3 text-success font-semibold text-right tabular-nums">+{t.qty.toLocaleString()} {t.unit}</td>
                    <td className="px-4 py-3 text-content-muted text-xs text-right tabular-nums">{fmt(t.unitCost)}</td>
                    <td className="px-4 py-3 font-semibold text-content text-right tabular-nums">{fmt(t.totalCost)}</td>
                    <td className="px-4 py-3 text-content-muted text-xs font-mono">{t.referenceNo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {showNew && <StockInModal materials={materials} warehouses={warehouses} workOrders={workOrders} onClose={() => setShowNew(false)} onSaved={invalidate} />}
    </div>
  )
}
