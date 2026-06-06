'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { Plus, PackageCheck } from 'lucide-react'
import api from '@/lib/api'

interface PoItem   { id: number; materialId: number; materialName: string; qty: number; unitPrice: number }
interface PO       { id: number; poNumber: string; vendorName: string; poDate: string; totalAmount: number; status: string; items: PoItem[] }
interface GrnItem  { materialName: string; orderedQty: number; receivedQty: number; unitCost: number }
interface Grn {
  id: number; grnNo: string; poId: number; poNumber: string; vendorName: string
  receiptDate: string; totalAmount: number; status: string; items: GrnItem[]
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday()     { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

function GrnModal({ pos, onClose, onSaved }: { pos: PO[]; onClose: () => void; onSaved: () => void }) {
  const [saving,      setSaving]      = useState(false)
  const [err,         setErr]         = useState('')
  const [selectedPoId, setSelectedPoId] = useState<number | ''>('')
  const [receiptDate, setReceiptDate] = useState(isoToday())
  const [notes,       setNotes]       = useState('')
  const [lines,       setLines]       = useState<{ poItemId: number; materialName: string; orderedQty: number; receivedQty: string; unitCost: string }[]>([])

  const approvedPos = pos.filter(p => p.status === 'Approved')

  const handlePoSelect = (poId: number) => {
    setSelectedPoId(poId)
    const po = pos.find(p => p.id === poId)
    if (!po) { setLines([]); return }
    setLines(po.items.map(item => ({
      poItemId:    item.id,
      materialName: item.materialName,
      orderedQty:  item.qty,
      receivedQty: String(item.qty),
      unitCost:    String(item.unitPrice),
    })))
  }

  const updateLine = (idx: number, field: 'receivedQty' | 'unitCost', val: string) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l))
  }

  const totalAmount = lines.reduce((s, l) => s + (Number(l.receivedQty) || 0) * (Number(l.unitCost) || 0), 0)

  const onSubmit = async () => {
    if (!selectedPoId) { setErr('Select a Purchase Order'); return }
    const validLines = lines.filter(l => Number(l.receivedQty) > 0)
    if (validLines.length === 0) { setErr('Enter received quantity for at least one item'); return }

    setSaving(true); setErr('')
    try {
      await api.post('/grn', {
        poId:        selectedPoId,
        receiptDate,
        notes:       notes || undefined,
        items: validLines.map(l => ({
          poItemId:    l.poItemId,
          receivedQty: Number(l.receivedQty),
          unitCost:    Number(l.unitCost),
        })),
      })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="New Goods Receipt (GRN)" size="lg">
      <div className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Purchase Order <span className="text-red-500">*</span></label>
            <select
              value={selectedPoId}
              onChange={e => handlePoSelect(Number(e.target.value))}
              className={inp}
            >
              <option value="">— Select approved PO —</option>
              {approvedPos.map(p => (
                <option key={p.id} value={p.id}>{p.poNumber} — {p.vendorName}</option>
              ))}
            </select>
            {approvedPos.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No approved POs available</p>
            )}
          </div>
          <div>
            <label className={lbl}>Receipt Date <span className="text-red-500">*</span></label>
            <input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className={inp} />
          </div>
        </div>

        {lines.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Items to Receive</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Material', 'Ordered', 'Received Qty', 'Unit Cost (৳)', 'Total'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((l, idx) => (
                    <tr key={l.poItemId} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-800 font-medium text-xs">{l.materialName}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs text-center">{l.orderedQty}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0} max={l.orderedQty} step="0.01"
                          value={l.receivedQty}
                          onChange={e => updateLine(idx, 'receivedQty', e.target.value)}
                          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0} step="0.01"
                          value={l.unitCost}
                          onChange={e => updateLine(idx, 'unitCost', e.target.value)}
                          className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-700 text-xs font-semibold">
                        {fmt((Number(l.receivedQty) || 0) * (Number(l.unitCost) || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-sm font-bold text-gray-900">Total: {fmt(totalAmount)}</span>
            </div>
          </div>
        )}

        <div>
          <label className={lbl}>Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} className={inp} placeholder="Optional delivery notes…" />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={onSubmit} disabled={saving || !selectedPoId}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Confirm Receipt'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function GrnPage() {
  const qc = useQueryClient()
  const [search,  setSearch]  = useState('')
  const [showNew, setShowNew] = useState(false)

  const { data: pos = [] } = useApiData<PO[]>({ url: '/purchase-orders', queryKey: ['pos-list'] })

  const { data: grns = [], isLoading, error, refetch } = useApiData<Grn[]>({
    url: '/grn',
    params: { search: search || undefined },
    queryKey: ['grn', search],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['grn'] })
    qc.invalidateQueries({ queryKey: ['stock-transactions'] })
    qc.invalidateQueries({ queryKey: ['materials'] })
    qc.invalidateQueries({ queryKey: ['materials-list'] })
    qc.invalidateQueries({ queryKey: ['pos-list'] })
    qc.invalidateQueries({ queryKey: ['purchase-orders'] })
  }

  const totalReceived = grns.reduce((s, g) => s + g.totalAmount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipt (GRN)"
        subtitle="Record goods received against approved purchase orders"
        action={
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New GRN
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total GRNs',      value: grns.length,      color: 'text-gray-900' },
          { label: 'Total Received',  value: fmt(totalReceived), color: 'text-blue-600' },
          { label: 'Pending POs',     value: pos.filter(p => p.status === 'Approved').length, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search GRN no or vendor…" onRefresh={refetch} />

      <DataState loading={isLoading} error={error ? 'Failed to load GRNs.' : null} onRetry={refetch}
        empty={grns.length === 0} emptyMessage="No goods receipts recorded yet.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['GRN No.', 'PO No.', 'Vendor', 'Receipt Date', 'Total Amount', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grns.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">
                      <div className="flex items-center gap-1.5"><PackageCheck className="w-3.5 h-3.5 text-gray-400" />{g.grnNo}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">{g.poNumber}</td>
                    <td className="px-4 py-3 text-gray-900 text-sm">{g.vendorName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{g.receiptDate}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(g.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">{g.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {showNew && <GrnModal pos={pos} onClose={() => setShowNew(false)} onSaved={invalidate} />}
    </div>
  )
}
