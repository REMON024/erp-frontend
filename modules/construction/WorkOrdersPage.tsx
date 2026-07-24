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
import { Plus, Edit2, ClipboardList, Receipt, BookOpen, CreditCard, Trash2 } from 'lucide-react'
import api from '@/lib/api'

interface Account { id: number; accountCode: string; accountName: string; accountType: string }

interface Project { id: number; projectName: string; projectCode: string }
interface Vendor  { id: number; vendorName: string; vendorType: string }
interface Material { id: number; materialName: string; unit: string }
interface WorkOrderMaterial {
  id: number; materialId?: number | null; materialName?: string | null
  description: string; unit: string; quantity: number; unitRate: number
  budgetAmount: number; receivedQty: number
}
interface WorkOrder {
  id: number; workOrderNo: string; projectId: number; projectName: string
  vendorId: number; vendorName: string; scope: string
  startDate?: string; endDate?: string
  contractAmount: number; advanceAmount: number; retentionPercent: number; status: string
  materials?: WorkOrderMaterial[]
}
interface WorkOrderBill {
  id: number; workOrderId: number; workOrderNo: string; vendorName: string
  billNo: string; billDate: string; workDescription?: string
  billAmount: number; retentionAmount: number; netPayable: number; status: string
}

const STATUS_COLORS: Record<string, string> = {
  Draft:     'bg-surface-muted text-content-muted',
  Active:    'bg-success/10 text-success',
  Completed: 'bg-primary/10 text-primary',
  Cancelled: 'bg-danger/10 text-danger',
}
const BILL_STATUS_COLORS: Record<string, string> = {
  Pending:  'bg-warning/15 text-warning',
  Approved: 'bg-success/10 text-success',
  Paid:     'bg-primary/10 text-primary',
}
function fmt(n: number) { return `৳${(n / 100000).toFixed(1)}L` }
function fmtFull(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp  = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl  = 'block text-sm font-medium text-content mb-1'
const tinp = 'border border-border-default rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary/40 focus:outline-none w-full'

// ── Budget material line-item editor ────────────────────────────────────────────
interface DraftMaterial {
  key: string; materialId?: number; description: string; unit: string; quantity: number; unitRate: number
}
function newMaterialLine(): DraftMaterial {
  return { key: Math.random().toString(36).slice(2), materialId: undefined, description: '', unit: '', quantity: 1, unitRate: 0 }
}

function WOMaterialEditor({ items, materials, onChange }: {
  items: DraftMaterial[]; materials: Material[]; onChange: (items: DraftMaterial[]) => void
}) {
  const update = (key: string, patch: Partial<DraftMaterial>) =>
    onChange(items.map(i => i.key === key ? { ...i, ...patch } : i))
  const remove = (key: string) => onChange(items.filter(i => i.key !== key))
  const total  = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitRate) || 0), 0)

  const handleMaterialChange = (key: string, materialId: string) => {
    const mat = materials.find(m => m.id === Number(materialId))
    if (mat) update(key, { materialId: mat.id, description: mat.materialName, unit: mat.unit })
    else     update(key, { materialId: undefined })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-content">Budget Materials <span className="text-xs text-content-muted font-normal">— optional planned material list</span></span>
        <button type="button" onClick={() => onChange([...items, newMaterialLine()])}
          className="text-xs text-primary hover:text-primary font-medium flex items-center gap-1 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Line
        </button>
      </div>
      {items.length > 0 && (
        <div className="border border-border-default rounded-lg overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="bg-surface-muted border-b border-border-default">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-content-muted w-48">Material</th>
                <th className="px-2 py-2 text-left font-semibold text-content-muted">Description</th>
                <th className="px-2 py-2 text-left font-semibold text-content-muted w-16">Unit</th>
                <th className="px-2 py-2 text-left font-semibold text-content-muted w-20">Qty</th>
                <th className="px-2 py-2 text-left font-semibold text-content-muted w-28">Unit Rate (৳)</th>
                <th className="px-2 py-2 text-right font-semibold text-content-muted w-28">Amount (৳)</th>
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {items.map(item => {
                const amount = (Number(item.quantity) || 0) * (Number(item.unitRate) || 0)
                return (
                  <tr key={item.key} className="hover:bg-surface-muted">
                    <td className="px-2 py-1.5">
                      <Select value={item.materialId ?? ''} onChange={e => handleMaterialChange(item.key, e.target.value)} className="text-xs py-1">
                        <option value="">— free text —</option>
                        {materials.map(m => <option key={m.id} value={m.id}>{m.materialName} ({m.unit})</option>)}
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={item.description} onChange={e => update(item.key, { description: e.target.value })}
                        className={tinp} placeholder="Material / work description…" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={item.unit} onChange={e => update(item.key, { unit: e.target.value })} className={tinp} placeholder="Bag" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step="any" value={item.quantity}
                        onChange={e => update(item.key, { quantity: Number(e.target.value) })} className={tinp} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step="any" value={item.unitRate}
                        onChange={e => update(item.key, { unitRate: Number(e.target.value) })} className={tinp} />
                    </td>
                    <td className="px-2 py-1.5 font-semibold text-content text-right pr-3">{fmtFull(amount)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <button type="button" onClick={() => remove(item.key)}
                        className="text-content-muted/50 hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-surface-muted border-t border-border-default">
              <tr>
                <td colSpan={5} className="px-2 py-2 text-xs font-bold text-content uppercase">Total Budget</td>
                <td className="px-2 py-2 text-right font-bold text-content pr-3">{fmtFull(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Work order form ────────────────────────────────────────────────────────────
const schema = z.object({
  projectId:        z.coerce.number().min(1, 'Required'),
  vendorId:         z.coerce.number().min(1, 'Required'),
  scope:            z.string().min(1, 'Required'),
  startDate:        z.string().optional(),
  endDate:          z.string().optional(),
  contractAmount:   z.coerce.number().min(1, 'Required'),
  advanceAmount:    z.coerce.number().min(0),
  retentionPercent: z.coerce.number().min(0).max(100),
})
type Form = z.infer<typeof schema>

function WOModal({ wo, projects, vendors, onClose, onSaved }: {
  wo?: WorkOrder; projects: Project[]; vendors: Vendor[]; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!wo
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const [materialItems, setMaterialItems] = useState<DraftMaterial[]>(
    wo?.materials?.length
      ? wo.materials.map(m => ({
          key: String(m.id ?? Math.random()), materialId: m.materialId ?? undefined,
          description: m.description, unit: m.unit, quantity: m.quantity, unitRate: m.unitRate,
        }))
      : []
  )
  const { data: materials = [] } = useApiData<Material[]>({ url: '/materials', queryKey: ['materials-list'] })
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: wo
      ? { projectId: wo.projectId, vendorId: wo.vendorId, scope: wo.scope, startDate: wo.startDate, endDate: wo.endDate,
          contractAmount: wo.contractAmount, advanceAmount: wo.advanceAmount, retentionPercent: wo.retentionPercent }
      : { retentionPercent: 5, advanceAmount: 0 },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const materialsPayload = materialItems
        .filter(i => i.description.trim() && Number(i.quantity) > 0)
        .map(i => ({
          materialId: i.materialId ?? null,
          description: i.description.trim(),
          unit: i.unit,
          quantity: Number(i.quantity),
          unitRate: Number(i.unitRate),
        }))
      const payload = { ...d, materials: materialsPayload }
      if (isEdit) await api.put(`/work-orders/${wo!.id}`, payload)
      else        await api.post('/work-orders', payload)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  const contractors = vendors.filter(v => v.vendorType === 'Contractor' || v.vendorType === 'Both')

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Work Order' : 'New Work Order'} size="xl">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project <span className="text-danger">*</span></label>
            <Select {...register('projectId')}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
            </Select>
            {errors.projectId && <p className="text-xs text-danger mt-1">{errors.projectId.message}</p>}
          </div>
          <div>
            <label className={lbl}>Contractor <span className="text-danger">*</span></label>
            <Select {...register('vendorId')}>
              <option value="">Select contractor</option>
              {contractors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
            </Select>
            {errors.vendorId && <p className="text-xs text-danger mt-1">{errors.vendorId.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Scope of Work <span className="text-danger">*</span></label>
          <textarea {...register('scope')} className={inp} rows={2} placeholder="Describe the work…" />
          {errors.scope && <p className="text-xs text-danger mt-1">{errors.scope.message}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Start Date</label>
            <DateField {...register('startDate')} />
          </div>
          <div>
            <label className={lbl}>End Date</label>
            <DateField {...register('endDate')} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Contract Amount (৳) <span className="text-danger">*</span></label>
            <input type="number" {...register('contractAmount')} className={inp} placeholder="5000000" />
            {errors.contractAmount && <p className="text-xs text-danger mt-1">{errors.contractAmount.message}</p>}
          </div>
          <div>
            <label className={lbl}>Advance (৳)</label>
            <input type="number" {...register('advanceAmount')} className={inp} placeholder="0" />
          </div>
          <div>
            <label className={lbl}>Retention (%)</label>
            <input type="number" step="any" {...register('retentionPercent')} className={inp} placeholder="5" min={0} max={100} />
          </div>
        </div>
        <WOMaterialEditor items={materialItems} materials={materials} onChange={setMaterialItems} />
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Work Order'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Create Voucher from Bill modal ────────────────────────────────────────────
type VoucherMode = 'expense' | 'payment'

function VoucherFromBillModal({ bill, wo, mode, accounts, onClose, onSaved }: {
  bill: WorkOrderBill; wo: WorkOrder; mode: VoucherMode
  accounts: Account[]; onClose: () => void; onSaved: () => void
}) {
  const postingAccounts = accounts.filter(a => a.accountType !== undefined)
  const [saving,        setSaving]        = useState(false)
  const [err,           setErr]           = useState('')
  const [debitAccountId,  setDebitAccountId]  = useState('')
  const [creditAccountId, setCreditAccountId] = useState('')
  const [method, setMethod] = useState('Bank')
  const [narration, setNarration] = useState(
    mode === 'expense'
      ? `Work Order Bill ${bill.billNo} — ${wo.vendorName} (${wo.workOrderNo})`
      : `Payment of Bill ${bill.billNo} — ${wo.vendorName}`
  )

  const amount = bill.netPayable

  const title = mode === 'expense' ? 'Create Expense Voucher' : 'Create Payment Voucher'
  const debitLabel  = mode === 'expense' ? 'Expense / Cost Account (Debit)'  : 'Contractor Payable Account (Debit)'
  const creditLabel = mode === 'expense' ? 'Contractor Payable Account (Credit)' : 'Bank / Cash Account (Credit)'

  const onSubmit = async () => {
    setSaving(true); setErr('')
    try {
      if (mode === 'payment') {
        // Records the contractor payment (DR Contractor Payable / CR Bank·Cash) AND marks the bill Paid.
        await api.post('/payments/contractor', {
          vendorId:        wo.vendorId,
          workOrderBillId: bill.id,
          paymentDate:     isoToday(),
          amount,
          method,
          referenceNo:     bill.billNo,
          notes:           narration,
        })
      } else {
        if (!debitAccountId || !creditAccountId) { setErr('Select both accounts'); return }
        if (debitAccountId === creditAccountId)  { setErr('Debit and credit accounts must differ'); return }
        await api.post('/vouchers', {
          voucherType: 'JV',
          voucherDate: isoToday(),
          narration,
          referenceNo: bill.billNo,
          lines: [
            { accountId: Number(debitAccountId),  debitAmount: amount, creditAmount: 0, description: narration, projectId: wo.projectId },
            { accountId: Number(creditAccountId), debitAmount: 0, creditAmount: amount, description: narration, projectId: wo.projectId },
          ],
        })
      }
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? (mode === 'payment' ? 'Failed to record payment' : 'Failed to create voucher'))
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="bg-primary/10 rounded-lg px-4 py-2 text-xs text-primary">
          Amount: <strong>{fmtFull(amount)}</strong> · Bill: <strong>{bill.billNo}</strong> · Project: <strong>{wo.projectName}</strong>
        </div>
        {mode === 'payment' ? (
          <div>
            <label className={lbl}>Payment Method <span className="text-danger">*</span></label>
            <Select value={method} onChange={e => setMethod(e.target.value)}>
              <option value="Bank">Bank</option>
              <option value="Cash">Cash</option>
            </Select>
          </div>
        ) : (
          <>
            <div>
              <label className={lbl}>{debitLabel} <span className="text-danger">*</span></label>
              <Select value={debitAccountId} onChange={e => setDebitAccountId(e.target.value)}>
                <option value="">Select account</option>
                {postingAccounts.map(a => <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
              </Select>
            </div>
            <div>
              <label className={lbl}>{creditLabel} <span className="text-danger">*</span></label>
              <Select value={creditAccountId} onChange={e => setCreditAccountId(e.target.value)}>
                <option value="">Select account</option>
                {postingAccounts.map(a => <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
              </Select>
            </div>
          </>
        )}
        <div>
          <label className={lbl}>Narration</label>
          <input value={narration} onChange={e => setNarration(e.target.value)} className={inp} />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button onClick={onSubmit} disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? (mode === 'payment' ? 'Recording…' : 'Posting…') : (mode === 'payment' ? 'Record Payment' : 'Post Voucher')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Bills modal ────────────────────────────────────────────────────────────────
function BillsModal({ wo, onClose, onChanged }: {
  wo: WorkOrder; onClose: () => void; onChanged: () => void
}) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [amount, setAmount] = useState('')
  const [desc, setDesc]     = useState('')
  const [err, setErr]       = useState('')
  const [voucherBill, setVoucherBill] = useState<{ bill: WorkOrderBill; mode: VoucherMode } | null>(null)

  const { data: bills = [], isLoading, refetch } = useApiData<WorkOrderBill[]>({
    url: '/work-order-bills',
    params: { workOrderId: wo.id },
    queryKey: ['wo-bills', wo.id],
  })
  const { data: accounts = [] } = useApiData<Account[]>({ url: '/accounts', queryKey: ['accounts-list'] })

  const retention = (parseFloat(amount) || 0) * wo.retentionPercent / 100
  const netPayable = (parseFloat(amount) || 0) - retention

  const addBill = async () => {
    if (!amount || parseFloat(amount) <= 0) { setErr('Enter a valid bill amount.'); return }
    setErr('')
    try {
      await api.post('/work-order-bills', { workOrderId: wo.id, billDate: isoToday(), workDescription: desc, billAmount: Number(amount) })
      setAmount(''); setDesc(''); setAdding(false)
      refetch(); onChanged()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to add bill')
    }
  }

  const approve = async (id: number) => {
    try { await api.post(`/work-order-bills/${id}/approve`); refetch(); onChanged() } catch { /* noop */ }
  }

  const onVoucherSaved = () => {
    qc.invalidateQueries({ queryKey: ['vouchers'] })
    refetch()
  }

  return (
    <>
    <Modal open onClose={onClose} title={`Bills — ${wo.workOrderNo}`} size="lg">
      <div className="space-y-4">
        <div className="bg-surface-muted rounded-lg px-4 py-2 text-xs text-content-muted flex flex-wrap gap-4">
          <span>Contractor: <strong>{wo.vendorName}</strong></span>
          <span>Contract: <strong>{fmtFull(wo.contractAmount)}</strong></span>
          <span>Retention: <strong>{wo.retentionPercent}%</strong></span>
        </div>

        {!adding ? (
          <button onClick={() => setAdding(true)}
            className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Progress Bill
          </button>
        ) : (
          <div className="border border-border-default rounded-lg p-3 space-y-3">
            {err && <p className="text-xs text-danger">{err}</p>}
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
                Retention ({wo.retentionPercent}%): <strong>{fmtFull(retention)}</strong> · Net payable: <strong className="text-success">{fmtFull(netPayable)}</strong>
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
                    <td className="px-3 py-2 font-medium text-content text-xs text-right tabular-nums">{fmtFull(b.billAmount)}</td>
                    <td className="px-3 py-2 text-danger text-xs text-right tabular-nums">{fmtFull(b.retentionAmount)}</td>
                    <td className="px-3 py-2 font-semibold text-success text-xs text-right tabular-nums">{fmtFull(b.netPayable)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BILL_STATUS_COLORS[b.status] ?? 'bg-surface-muted text-content-muted'}`}>{b.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {b.status === 'Pending' && (
                          <button onClick={() => approve(b.id)}
                            className="text-xs text-success hover:text-success font-medium hover:underline">Approve</button>
                        )}
                        {b.status === 'Approved' && (
                          <>
                            <button onClick={() => setVoucherBill({ bill: b, mode: 'expense' })} title="Create Expense Voucher"
                              className="p-1 text-content-muted hover:text-info hover:bg-info/10 rounded transition-colors">
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setVoucherBill({ bill: b, mode: 'payment' })} title="Create Payment Voucher"
                              className="p-1 text-content-muted hover:text-success hover:bg-success/10 rounded transition-colors">
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          </>
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
    {voucherBill && (
      <VoucherFromBillModal
        bill={voucherBill.bill} wo={wo} mode={voucherBill.mode}
        accounts={accounts}
        onClose={() => setVoucherBill(null)}
        onSaved={() => { setVoucherBill(null); onVoucherSaved() }}
      />
    )}
    </>
  )
}

export function WorkOrdersPage() {
  const qc = useQueryClient()
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [project, setProject] = useState('')
  const [modal,   setModal]   = useState<'add' | 'edit' | null>(null)
  const [target,  setTarget]  = useState<WorkOrder | null>(null)
  const [billsFor, setBillsFor] = useState<WorkOrder | null>(null)

  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data: vendors = [] }  = useApiData<Vendor[]>({ url: '/vendors', queryKey: ['vendors-list'] })

  const { data: orders = [], isLoading, error, refetch } = useApiData<WorkOrder[]>({
    url: '/work-orders',
    params: { search: search || undefined, status: status || undefined, projectId: project || undefined },
    queryKey: ['work-orders', search, status, project],
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['work-orders'] })
  const approve = async (id: number) => {
    try { await api.post(`/work-orders/${id}/approve`); invalidate() } catch { /* noop */ }
  }

  const totalContract = orders.reduce((s, o) => s + o.contractAmount, 0)
  const active = orders.filter(o => o.status === 'Active').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        subtitle="Manage contractor work orders and progress bills"
        action={
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Work Order
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: orders.length,                                  color: 'text-content' },
          { label: 'Active',       value: active,                                          color: 'text-success' },
          { label: 'Completed',    value: orders.filter(o => o.status === 'Completed').length, color: 'text-primary' },
          { label: 'Contract Value', value: fmt(totalContract),                            color: 'text-primary' },
        ].map(k => (
          <div key={k.label} className="bg-surface rounded-xl border border-border-default p-4">
            <p className="text-xs text-content-muted uppercase tracking-wide font-medium">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search work orders…" onRefresh={refetch}>
        <Select value={project} onChange={e => setProject(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
        </Select>
        <Select value={status} onChange={e => setStatus(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Status</option>
          {['Draft', 'Active', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load work orders.' : null} onRetry={refetch}
        empty={orders.length === 0} emptyMessage="No work orders yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Work Order' }, { h: 'Project' }, { h: 'Contractor' },
                    { h: 'Contract', num: true }, { h: 'Advance', num: true }, { h: 'Retention', num: true },
                    { h: 'Status' }, { h: '' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-content-muted shrink-0" />
                        <div>
                          <p className="font-semibold text-content text-xs">{o.workOrderNo}</p>
                          <p className="text-content-muted text-xs truncate max-w-[140px]">{o.scope}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">{o.projectName.split(' ')[0]}</span>
                    </td>
                    <td className="px-4 py-3 text-content text-xs font-medium">{o.vendorName}</td>
                    <td className="px-4 py-3 font-semibold text-content text-right tabular-nums">{fmt(o.contractAmount)}</td>
                    <td className="px-4 py-3 text-content-muted text-right tabular-nums">{fmt(o.advanceAmount)}</td>
                    <td className="px-4 py-3 text-content-muted text-right tabular-nums">{o.retentionPercent}%</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[o.status] ?? 'bg-surface-muted text-content-muted'}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setBillsFor(o)} title="Progress Bills"
                          className="p-1.5 text-content-muted hover:text-info hover:bg-info/10 rounded-lg"><Receipt className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { setTarget(o); setModal('edit') }} title="Edit"
                          className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                        {o.status === 'Draft' && (
                          <button onClick={() => approve(o.id)} className="text-xs text-success hover:text-success font-medium hover:underline px-1">Approve</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {modal === 'add' && <WOModal projects={projects} vendors={vendors} onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <WOModal wo={target} projects={projects} vendors={vendors} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
      {billsFor && <BillsModal wo={billsFor} onClose={() => setBillsFor(null)} onChanged={invalidate} />}
    </div>
  )
}
