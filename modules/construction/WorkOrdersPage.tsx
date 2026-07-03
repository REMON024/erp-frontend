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
import { Plus, Edit2, ClipboardList, Receipt, BookOpen, CreditCard } from 'lucide-react'
import api from '@/lib/api'

interface Account { id: number; accountCode: string; accountName: string; accountType: string }

interface Project { id: number; projectName: string; projectCode: string }
interface Vendor  { id: number; vendorName: string; vendorType: string }
interface WorkOrder {
  id: number; workOrderNo: string; projectId: number; projectName: string
  vendorId: number; vendorName: string; scope: string
  startDate?: string; endDate?: string
  contractAmount: number; advanceAmount: number; retentionPercent: number; status: string
}
interface WorkOrderBill {
  id: number; workOrderId: number; workOrderNo: string; vendorName: string
  billNo: string; billDate: string; workDescription?: string
  billAmount: number; retentionAmount: number; netPayable: number; status: string
}

const STATUS_COLORS: Record<string, string> = {
  Draft:     'bg-surface-muted text-content-muted',
  Active:    'bg-green-100 text-green-700',
  Completed: 'bg-primary/10 text-primary',
  Cancelled: 'bg-red-100 text-red-600',
}
const BILL_STATUS_COLORS: Record<string, string> = {
  Pending:  'bg-amber-100 text-amber-700',
  Approved: 'bg-green-100 text-green-700',
  Paid:     'bg-primary/10 text-primary',
}
function fmt(n: number) { return `৳${(n / 100000).toFixed(1)}L` }
function fmtFull(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

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
      if (isEdit) await api.put(`/work-orders/${wo!.id}`, d)
      else        await api.post('/work-orders', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  const contractors = vendors.filter(v => v.vendorType === 'Contractor' || v.vendorType === 'Both')

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Work Order' : 'New Work Order'} size="lg">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project <span className="text-red-500">*</span></label>
            <Select {...register('projectId')}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
            </Select>
            {errors.projectId && <p className="text-xs text-red-600 mt-1">{errors.projectId.message}</p>}
          </div>
          <div>
            <label className={lbl}>Contractor <span className="text-red-500">*</span></label>
            <Select {...register('vendorId')}>
              <option value="">Select contractor</option>
              {contractors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
            </Select>
            {errors.vendorId && <p className="text-xs text-red-600 mt-1">{errors.vendorId.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Scope of Work <span className="text-red-500">*</span></label>
          <textarea {...register('scope')} className={inp} rows={2} placeholder="Describe the work…" />
          {errors.scope && <p className="text-xs text-red-600 mt-1">{errors.scope.message}</p>}
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
            <label className={lbl}>Contract Amount (৳) <span className="text-red-500">*</span></label>
            <input type="number" {...register('contractAmount')} className={inp} placeholder="5000000" />
            {errors.contractAmount && <p className="text-xs text-red-600 mt-1">{errors.contractAmount.message}</p>}
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
    if (!debitAccountId || !creditAccountId) { setErr('Select both accounts'); return }
    if (debitAccountId === creditAccountId)  { setErr('Debit and credit accounts must differ'); return }
    setSaving(true); setErr('')
    try {
      await api.post('/vouchers', {
        voucherType: mode === 'expense' ? 'JV' : 'PV',
        voucherDate: isoToday(),
        narration,
        referenceNo: bill.billNo,
        lines: [
          { accountId: Number(debitAccountId),  debitAmount: amount, creditAmount: 0, description: narration, projectId: wo.projectId },
          { accountId: Number(creditAccountId), debitAmount: 0, creditAmount: amount, description: narration, projectId: wo.projectId },
        ],
      })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to create voucher')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="bg-primary/10 rounded-lg px-4 py-2 text-xs text-primary">
          Amount: <strong>{fmtFull(amount)}</strong> · Bill: <strong>{bill.billNo}</strong> · Project: <strong>{wo.projectName}</strong>
        </div>
        <div>
          <label className={lbl}>{debitLabel} <span className="text-red-500">*</span></label>
          <Select value={debitAccountId} onChange={e => setDebitAccountId(e.target.value)}>
            <option value="">Select account</option>
            {postingAccounts.map(a => <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
          </Select>
        </div>
        <div>
          <label className={lbl}>{creditLabel} <span className="text-red-500">*</span></label>
          <Select value={creditAccountId} onChange={e => setCreditAccountId(e.target.value)}>
            <option value="">Select account</option>
            {postingAccounts.map(a => <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
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
            {saving ? 'Posting…' : 'Post Voucher'}
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
    {voucherBill && (
      <VoucherFromBillModal
        bill={voucherBill.bill} wo={wo} mode={voucherBill.mode}
        accounts={accounts}
        onClose={() => setVoucherBill(null)}
        onSaved={() => { setVoucherBill(null); onVoucherSaved() }}
      />
    )}
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
            {err && <p className="text-xs text-red-600">{err}</p>}
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
                Retention ({wo.retentionPercent}%): <strong>{fmtFull(retention)}</strong> · Net payable: <strong className="text-green-700">{fmtFull(netPayable)}</strong>
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
                  {['Bill No.', 'Date', 'Amount', 'Retention', 'Net Payable', 'Status', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-content-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {bills.map(b => (
                  <tr key={b.id}>
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">{b.billNo}</td>
                    <td className="px-3 py-2 text-content-muted text-xs">{b.billDate}</td>
                    <td className="px-3 py-2 font-medium text-content text-xs">{fmtFull(b.billAmount)}</td>
                    <td className="px-3 py-2 text-red-600 text-xs">{fmtFull(b.retentionAmount)}</td>
                    <td className="px-3 py-2 font-semibold text-green-700 text-xs">{fmtFull(b.netPayable)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BILL_STATUS_COLORS[b.status] ?? 'bg-surface-muted text-content-muted'}`}>{b.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {b.status === 'Pending' && (
                          <button onClick={() => approve(b.id)}
                            className="text-xs text-green-600 hover:text-green-700 font-medium hover:underline">Approve</button>
                        )}
                        {b.status === 'Approved' && (
                          <>
                            <button onClick={() => setVoucherBill({ bill: b, mode: 'expense' })} title="Create Expense Voucher"
                              className="p-1 text-content-muted hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setVoucherBill({ bill: b, mode: 'payment' })} title="Create Payment Voucher"
                              className="p-1 text-content-muted hover:text-green-600 hover:bg-green-50 rounded transition-colors">
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
          { label: 'Active',       value: active,                                          color: 'text-green-600' },
          { label: 'Completed',    value: orders.filter(o => o.status === 'Completed').length, color: 'text-primary' },
          { label: 'Contract Value', value: fmt(totalContract),                            color: 'text-purple-600' },
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
                  {['Work Order', 'Project', 'Contractor', 'Contract', 'Advance', 'Retention', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
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
                    <td className="px-4 py-3 font-semibold text-content">{fmt(o.contractAmount)}</td>
                    <td className="px-4 py-3 text-content-muted">{fmt(o.advanceAmount)}</td>
                    <td className="px-4 py-3 text-content-muted">{o.retentionPercent}%</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[o.status] ?? 'bg-surface-muted text-content-muted'}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setBillsFor(o)} title="Progress Bills"
                          className="p-1.5 text-content-muted hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Receipt className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { setTarget(o); setModal('edit') }} title="Edit"
                          className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                        {o.status === 'Draft' && (
                          <button onClick={() => approve(o.id)} className="text-xs text-green-600 hover:text-green-700 font-medium hover:underline px-1">Approve</button>
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
