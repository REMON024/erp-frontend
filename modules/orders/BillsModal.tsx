'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { Plus, CreditCard } from 'lucide-react'
import api from '@/lib/api'
import { type OrderListItem, fmt, isoToday, inp, lbl } from './types'

// Progress billing, retention and advance recovery belong to work orders only — a purchase
// order has no equivalent, which is why these modals are reachable only from Work rows.

export interface WorkOrderBill {
  id: number; workOrderId: number; workOrderNo: string; vendorName: string
  billNo: string; billDate: string; workDescription?: string
  billAmount: number; retentionAmount: number; netPayable: number; status: string
}

const BILL_STATUS_COLORS: Record<string, string> = {
  Pending:    'bg-warning/15 text-warning',
  Approved:   'bg-success/10 text-success',
  PartlyPaid: 'bg-info/10 text-info',
  Paid:       'bg-primary/10 text-primary',
}

// A bill still owed something. Approving it already posted DR Construction Expense / CR Contractor
// Payable, so what remains is settling the payable — never re-booking the expense.
const PAYABLE = ['Approved', 'PartlyPaid']

/// Settles a bill. Posts DR Contractor Payable / CR Bank·Cash and moves the bill to PartlyPaid or
/// Paid depending on how much of its net payable the payments now cover.
///
/// The amount is editable and defaults to the full net payable. Paying less is legitimate and the
/// server keeps the running total; paying more than is outstanding is refused there, with the
/// remaining balance in the message, so this form does not need to know what has been paid already.
function PayBillModal({ bill, wo, onClose, onSaved }: {
  bill: WorkOrderBill; wo: OrderListItem; onClose: () => void; onSaved: () => void
}) {
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState('')
  const [method,    setMethod]    = useState('Bank')
  const [amount,    setAmount]    = useState(String(bill.netPayable))
  const [narration, setNarration] = useState(`Payment of Bill ${bill.billNo} — ${wo.vendorName}`)

  const onSubmit = async () => {
    const value = parseFloat(amount)
    if (!value || value <= 0) { setErr('Enter a valid payment amount.'); return }
    setSaving(true); setErr('')
    try {
      await api.post('/payments/contractor', {
        vendorId:        wo.vendorId,
        workOrderBillId: bill.id,
        paymentDate:     isoToday(),
        amount:          value,
        method,
        referenceNo:     bill.billNo,
        notes:           narration,
      })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to record payment')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Record Payment" size="md">
      <div className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="bg-primary/10 rounded-lg px-4 py-2 text-xs text-primary">
          Net payable: <strong>{fmt(bill.netPayable)}</strong> · Bill: <strong>{bill.billNo}</strong> · Project: <strong>{wo.projectName}</strong>
        </div>
        <div>
          <label className={lbl}>Amount <span className="text-danger">*</span></label>
          <input type="number" min="0" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Payment Method <span className="text-danger">*</span></label>
          <Select value={method} onChange={e => setMethod(e.target.value)}>
            <option value="Bank">Bank</option>
            <option value="Cash">Cash</option>
          </Select>
        </div>
        <div>
          <label className={lbl}>Narration</label>
          <input value={narration} onChange={e => setNarration(e.target.value)} className={inp} />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button onClick={onSubmit} disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Recording…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function BillsModal({ wo, onClose, onChanged }: {
  wo: OrderListItem; onClose: () => void; onChanged: () => void
}) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [amount, setAmount] = useState('')
  const [desc,   setDesc]   = useState('')
  const [err,    setErr]    = useState('')
  const [payingBill, setPayingBill] = useState<WorkOrderBill | null>(null)

  const { data: bills = [], isLoading, refetch } = useApiData<WorkOrderBill[]>({
    url: '/work-order-bills',
    params: { workOrderId: wo.id },
    queryKey: ['wo-bills', wo.id],
  })
  const retentionPercent = wo.retentionPercent ?? 0
  const retention  = (parseFloat(amount) || 0) * retentionPercent / 100
  const netPayable = (parseFloat(amount) || 0) - retention

  const addBill = async () => {
    if (!amount || parseFloat(amount) <= 0) { setErr('Enter a valid bill amount.'); return }
    setErr('')
    try {
      await api.post('/work-order-bills', {
        workOrderId: wo.id, billDate: isoToday(), workDescription: desc, billAmount: Number(amount),
      })
      setAmount(''); setDesc(''); setAdding(false)
      refetch(); onChanged()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to add bill')
    }
  }

  const approve = async (id: number) => {
    setErr('')
    try { await api.post(`/work-order-bills/${id}/approve`); refetch(); onChanged() }
    catch (e: any) {
      // Bill approval posts a journal, and that posting can now refuse — surface the reason
      // instead of leaving the row silently Pending.
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to approve bill')
    }
  }

  const onVoucherSaved = () => {
    qc.invalidateQueries({ queryKey: ['vouchers'] })
    refetch()
  }

  return (
    <>
      <Modal open onClose={onClose} title={`Bills — ${wo.orderNo}`} size="lg">
        <div className="space-y-4">
          <div className="bg-surface-muted rounded-lg px-4 py-2 text-xs text-content-muted flex flex-wrap gap-4">
            <span>Contractor: <strong>{wo.vendorName}</strong></span>
            <span>Contract: <strong>{fmt(wo.amount)}</strong></span>
            <span>Retention: <strong>{retentionPercent}%</strong></span>
          </div>

          {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

          {!adding ? (
            <button onClick={() => setAdding(true)}
              className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Progress Bill
            </button>
          ) : (
            <div className="border border-border-default rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Bill Amount (৳)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inp} placeholder="0" />
                </div>
                <div>
                  <label className={lbl}>Description</label>
                  <input value={desc} onChange={e => setDesc(e.target.value)} className={inp} placeholder="Progress bill…" />
                </div>
              </div>
              {amount && (
                <p className="text-xs text-content-muted">
                  Retention ({retentionPercent}%): <strong>{fmt(retention)}</strong> · Net payable: <strong className="text-success">{fmt(netPayable)}</strong>
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => { setAdding(false); setErr('') }} className="px-3 py-1.5 text-xs border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
                <button onClick={addBill} className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 font-medium">Save Bill</button>
              </div>
            </div>
          )}

          <DataState loading={isLoading} empty={bills.length === 0} emptyMessage="No bills yet for this work order.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm border border-border-default rounded-lg overflow-hidden">
                <thead className="bg-surface-muted border-b border-border-default">
                  <tr>
                    {[
                      { h: 'Bill No.' }, { h: 'Date' }, { h: 'Amount', num: true },
                      { h: 'Retention', num: true }, { h: 'Net Payable', num: true }, { h: 'Status' }, { h: '' },
                    ].map(({ h, num }) => (
                      <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {bills.map(b => (
                    <tr key={b.id}>
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">{b.billNo}</td>
                      <td className="px-3 py-2 text-content-muted text-xs">{b.billDate}</td>
                      <td className="px-3 py-2 font-medium text-content text-xs text-right tabular-nums">{fmt(b.billAmount)}</td>
                      <td className="px-3 py-2 text-danger text-xs text-right tabular-nums">{fmt(b.retentionAmount)}</td>
                      <td className="px-3 py-2 font-semibold text-success text-xs text-right tabular-nums">{fmt(b.netPayable)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BILL_STATUS_COLORS[b.status] ?? 'bg-surface-muted text-content-muted'}`}>{b.status}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {b.status === 'Pending' && (
                            <button onClick={() => approve(b.id)}
                              className="text-xs text-success hover:text-success font-medium hover:underline">Approve</button>
                          )}
                          {PAYABLE.includes(b.status) && (
                            // Payment only. There was a second button here that posted a manual
                            // expense voucher — on top of the one bill approval already auto-posts
                            // — which silently doubled the contractor cost in every cost report.
                            <button onClick={() => setPayingBill(b)} title="Record Payment"
                              className="p-1 text-content-muted hover:text-success hover:bg-success/10 rounded transition-colors">
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataState>
        </div>
      </Modal>
      {payingBill && (
        <PayBillModal
          bill={payingBill} wo={wo}
          onClose={() => setPayingBill(null)}
          onSaved={() => { setPayingBill(null); onVoucherSaved() }}
        />
      )}
    </>
  )
}
