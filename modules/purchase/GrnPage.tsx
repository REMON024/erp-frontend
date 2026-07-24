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

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

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
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Purchase Order <span className="text-danger">*</span></label>
            <Select
              value={selectedPoId}
              onChange={e => handlePoSelect(Number(e.target.value))}
            >
              <option value="">— Select approved PO —</option>
              {approvedPos.map(p => (
                <option key={p.id} value={p.id}>{p.poNumber} — {p.vendorName}</option>
              ))}
            </Select>
            {approvedPos.length === 0 && (
              <p className="text-xs text-warning mt-1">No approved POs available</p>
            )}
          </div>
          <div>
            <label className={lbl}>Receipt Date <span className="text-danger">*</span></label>
            <DateField value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
          </div>
        </div>

        {lines.length > 0 && (
          <div>
            <p className="text-sm font-medium text-content mb-2">Items to Receive</p>
            <div className="border border-border-default rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted border-b border-border-default">
                  <tr>
                    {[
                      { h: 'Material' }, { h: 'Ordered', align: 'center' as const }, { h: 'Received Qty' },
                      { h: 'Unit Cost (৳)' }, { h: 'Total', num: true },
                    ].map(({ h, num, align }) => (
                      <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${num ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {lines.map((l, idx) => (
                    <tr key={l.poItemId} className="hover:bg-surface-muted">
                      <td className="px-3 py-2 text-content font-medium text-xs">{l.materialName}</td>
                      <td className="px-3 py-2 text-content-muted text-xs text-center">{l.orderedQty}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0} max={l.orderedQty} step="0.01"
                          value={l.receivedQty}
                          onChange={e => updateLine(idx, 'receivedQty', e.target.value)}
                          className="w-24 border border-border-default rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0} step="0.01"
                          value={l.unitCost}
                          onChange={e => updateLine(idx, 'unitCost', e.target.value)}
                          className="w-28 border border-border-default rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-content text-xs font-semibold text-right tabular-nums">
                        {fmt((Number(l.receivedQty) || 0) * (Number(l.unitCost) || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-sm font-bold text-content">Total: {fmt(totalAmount)}</span>
            </div>
          </div>
        )}

        <div>
          <label className={lbl}>Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} className={inp} placeholder="Optional delivery notes…" />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button onClick={onSubmit} disabled={saving || !selectedPoId}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
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
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New GRN
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total GRNs',      value: grns.length,      color: 'text-content' },
          { label: 'Total Received',  value: fmt(totalReceived), color: 'text-primary' },
          { label: 'Pending POs',     value: pos.filter(p => p.status === 'Approved').length, color: 'text-warning' },
        ].map(s => (
          <div key={s.label} className="bg-surface rounded-xl border border-border-default p-4">
            <p className="text-xs text-content-muted uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search GRN no or vendor…" onRefresh={refetch} />

      <DataState loading={isLoading} error={error ? 'Failed to load GRNs.' : null} onRetry={refetch}
        empty={grns.length === 0} emptyMessage="No goods receipts recorded yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'GRN No.' }, { h: 'PO No.' }, { h: 'Vendor' }, { h: 'Receipt Date' },
                    { h: 'Total Amount', num: true }, { h: 'Status' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {grns.map(g => (
                  <tr key={g.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                      <div className="flex items-center gap-1.5"><PackageCheck className="w-3.5 h-3.5 text-content-muted" />{g.grnNo}</div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs font-mono">{g.poNumber}</td>
                    <td className="px-4 py-3 text-content text-sm">{g.vendorName}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{g.receiptDate}</td>
                    <td className="px-4 py-3 font-semibold text-content text-right tabular-nums">{fmt(g.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-success/10 text-success">{g.status}</span>
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
