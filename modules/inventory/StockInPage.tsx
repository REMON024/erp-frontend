'use client'
import { useState } from 'react'
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
interface StockTxn {
  id: number; materialName: string; unit: string; transactionType: string
  qty: number; unitCost: number; totalCost: number
  referenceNo?: string; transactionDate: string; notes?: string
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  materialId:      z.coerce.number().min(1, 'Required'),
  qty:             z.coerce.number().min(0.01, 'Required'),
  unitCost:        z.coerce.number().min(0, 'Required'),
  transactionDate: z.string().min(1, 'Required'),
  referenceNo:     z.string().optional(),
  notes:           z.string().optional(),
})
type Form = z.infer<typeof schema>

function StockInModal({ materials, onClose, onSaved }: {
  materials: Material[]; onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { transactionDate: isoToday() },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      await api.post('/stock-transactions/in', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Stock In (Goods Received)" size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className={lbl}>Material <span className="text-red-500">*</span></label>
          <select {...register('materialId')} className={inp}
            onChange={e => {
              const m = materials.find(x => x.id === Number(e.target.value))
              if (m) setValue('unitCost', m.averageCost)
            }}>
            <option value="">Select material</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.materialName} ({m.unit})</option>)}
          </select>
          {errors.materialId && <p className="text-xs text-red-600 mt-1">{errors.materialId.message}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Quantity <span className="text-red-500">*</span></label>
            <input type="number" step="any" {...register('qty')} className={inp} placeholder="0" />
            {errors.qty && <p className="text-xs text-red-600 mt-1">{errors.qty.message}</p>}
          </div>
          <div>
            <label className={lbl}>Unit Cost (৳) <span className="text-red-500">*</span></label>
            <input type="number" step="any" {...register('unitCost')} className={inp} placeholder="0" />
            {errors.unitCost && <p className="text-xs text-red-600 mt-1">{errors.unitCost.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('transactionDate')} className={inp} />
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
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
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
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Stock In
          </button>
        }
      />

      <DataState loading={isLoading} error={error ? 'Failed to load stock-in history.' : null} onRetry={refetch}
        empty={txns.length === 0} emptyMessage="No stock-in transactions yet.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Material', 'Date', 'Qty', 'Unit Cost', 'Total', 'Reference'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txns.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2"><PackagePlus className="w-4 h-4 text-green-500" />{t.materialName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{t.transactionDate}</td>
                    <td className="px-4 py-3 text-green-700 font-semibold">+{t.qty.toLocaleString()} {t.unit}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{fmt(t.unitCost)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(t.totalCost)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{t.referenceNo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {showNew && <StockInModal materials={materials} onClose={() => setShowNew(false)} onSaved={invalidate} />}
    </div>
  )
}
