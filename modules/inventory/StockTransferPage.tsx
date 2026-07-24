'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { useApiData } from '@/hooks/useApiData'
import { ArrowLeftRight, CheckCircle, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

interface Material { id: number; materialName: string; unit: string }
interface Warehouse { id: number; name: string }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'
function isoToday() { return new Date().toISOString().split('T')[0] }

export function StockTransferPage() {
  const qc = useQueryClient()
  const { data: materials = [] }  = useApiData<Material[]>({ url: '/materials', queryKey: ['materials-list'] })
  const { data: warehouses = [] } = useApiData<Warehouse[]>({ url: '/warehouses', params: { activeOnly: true }, queryKey: ['warehouses-list'] })

  const [materialId, setMaterialId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [qty, setQty] = useState('')
  const [date, setDate] = useState(isoToday())
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = async () => {
    setBusy(true); setMsg(null)
    try {
      await api.post('/stock-transactions/transfer', {
        materialId: Number(materialId), fromWarehouseId: Number(from), toWarehouseId: Number(to),
        qty: Number(qty), transactionDate: date, referenceNo, notes,
      })
      setMsg({ ok: true, text: 'Transfer recorded.' })
      setQty(''); setReferenceNo(''); setNotes('')
      qc.invalidateQueries({ queryKey: ['stock-balances'] })
    } catch (e: any) {
      setMsg({ ok: false, text: e.response?.data?.errors?.[0] ?? 'Transfer failed' })
    } finally { setBusy(false) }
  }

  const valid = materialId && from && to && from !== to && Number(qty) > 0

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Transfer" subtitle="Move stock between warehouses (guards source balance)" />

      <div className="bg-surface rounded-xl border border-border-default p-5 max-w-2xl space-y-4">
        {msg && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${msg.ok ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
            {msg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.text}
          </div>
        )}
        <div>
          <label className={lbl}>Material <span className="text-danger">*</span></label>
          <Select value={materialId} onChange={e => setMaterialId(e.target.value)}>
            <option value="">Select material</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.materialName} ({m.unit})</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className={lbl}>From warehouse <span className="text-danger">*</span></label>
            <Select value={from} onChange={e => setFrom(e.target.value)}>
              <option value="">Select source</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </div>
          <div>
            <label className={lbl}>To warehouse <span className="text-danger">*</span></label>
            <Select value={to} onChange={e => setTo(e.target.value)}>
              <option value="">Select destination</option>
              {warehouses.filter(w => String(w.id) !== from).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </div>
        </div>
        {from && to && from === to && <p className="text-xs text-danger">Source and destination must differ.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Quantity <span className="text-danger">*</span></label>
            <input type="number" step="any" value={qty} onChange={e => setQty(e.target.value)} className={inp} placeholder="0" />
          </div>
          <div>
            <label className={lbl}>Date</label>
            <DateField value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={lbl}>Reference</label>
          <input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} className={inp} placeholder="TRF-..." />
        </div>
        <div>
          <label className={lbl}>Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} className={inp} placeholder="Optional…" />
        </div>
        <div className="flex justify-end">
          <button onClick={submit} disabled={!valid || busy}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" /> Transfer
          </button>
        </div>
      </div>
    </div>
  )
}
