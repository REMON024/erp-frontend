'use client'
import { useState, useEffect } from 'react'
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
import { Plus, Receipt, Printer, BarChart2, Users } from 'lucide-react'
import { printReceipt } from '@/utils/printUtils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '@/lib/api'

interface Customer { id: number; fullName: string }
interface Invoice  { id: number; invoiceNo: string; customerId: number; dueAmount: number }
interface Payment {
  id: number; paymentNo: string; invoiceId?: number; invoiceNo?: string
  customerId: number; customerName: string; paymentDate: string
  amount: number; method: string; referenceNo?: string; notes?: string
  projectName?: string; scopeLabel?: string
}

const METHOD_COLORS: Record<string, string> = {
  Cash:   'bg-success/10 text-success',
  Bank:   'bg-primary/10 text-primary',
  Cheque: 'bg-warning/15 text-warning',
  Online: 'bg-primary/10 text-primary',
}
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  customerId:  z.coerce.number().min(1, 'Required'),
  invoiceId:   z.coerce.number().optional(),
  paymentDate: z.string().min(1, 'Required'),
  amount:      z.coerce.number().min(1, 'Required'),
  method:      z.string().min(1, 'Required'),
  chequeNo:    z.string().optional(),
  bankName:    z.string().optional(),
  referenceNo: z.string().optional(),
  notes:       z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.method === 'Cheque' && !d.chequeNo?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['chequeNo'], message: 'Cheque number is required' })
  }
})
type Form = z.infer<typeof schema>

function PaymentModal({ customers, invoices, onClose, onSaved, initialCustomerId, initialInvoiceId }: {
  customers: Customer[]; invoices: Invoice[]; onClose: () => void; onSaved: () => void
  initialCustomerId?: number; initialInvoiceId?: number
}) {
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const [warnUnlinked, setWarnUnlinked] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      paymentDate: isoToday(), method: 'Bank',
      customerId: initialCustomerId ?? undefined,
      invoiceId: initialInvoiceId ?? undefined,
    },
  })

  // Pre-fill the amount from the linked invoice's due once invoices have loaded.
  useEffect(() => {
    if (!initialInvoiceId) return
    const inv = invoices.find(i => i.id === initialInvoiceId && i.dueAmount > 0)
    if (inv) setValue('amount', inv.dueAmount)
  }, [initialInvoiceId, invoices, setValue])

  const selectedCustomerId = Number(watch('customerId'))
  const selectedInvoiceId  = Number(watch('invoiceId') || 0)
  const selectedMethod     = watch('method')
  const customerInvoices   = invoices.filter(i => i.customerId === selectedCustomerId && i.dueAmount > 0)

  const handleInvoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value)
    setValue('invoiceId', id || undefined)
    if (id) {
      const inv = customerInvoices.find(i => i.id === id)
      if (inv) setValue('amount', inv.dueAmount)
      setWarnUnlinked(false)
    }
  }

  const onSubmit = async (d: Form) => {
    if (customerInvoices.length > 0 && !d.invoiceId) {
      setWarnUnlinked(true)
      return
    }
    setSaving(true); setErr('')
    try {
      const body: Record<string, unknown> = {
        customerId:  d.customerId,
        invoiceId:   d.invoiceId || undefined,
        paymentDate: d.paymentDate,
        amount:      d.amount,
        method:      d.method,
        referenceNo: d.method === 'Cheque' ? d.chequeNo : d.referenceNo || undefined,
        bankName:    d.bankName || undefined,
        notes:       d.notes || undefined,
      }
      await api.post('/payments', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Record Payment" size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <div>
          <label className={lbl}>Client <span className="text-danger">*</span></label>
          <Select {...register('customerId')}
            onChange={e => { setValue('customerId', Number(e.target.value)); setValue('invoiceId', undefined); setWarnUnlinked(false) }}>
            <option value="">Select client</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </Select>
          {errors.customerId && <p className="text-xs text-danger mt-1">{errors.customerId.message}</p>}
        </div>

        {selectedCustomerId > 0 && (
          <div>
            <label className={lbl}>
              Against Invoice <span className="text-danger">*</span>
              {customerInvoices.length === 0 && <span className="text-content-muted font-normal ml-1">(no outstanding invoices)</span>}
            </label>
            <Select
              value={selectedInvoiceId || ''}
              onChange={handleInvoiceChange}
              disabled={customerInvoices.length === 0}
            >
              <option value="">— Select invoice —</option>
              {customerInvoices.map(i => (
                <option key={i.id} value={i.id}>{i.invoiceNo} — due {fmt(i.dueAmount)}</option>
              ))}
            </Select>
            {warnUnlinked && (
              <div className="mt-1 flex items-start gap-2 bg-warning/15 border border-warning/20 rounded-lg px-3 py-2">
                <p className="text-xs text-warning flex-1">
                  This client has {customerInvoices.length} outstanding invoice(s). Select one to keep records accurate, or confirm to record an unlinked payment.
                </p>
                <button type="button" onClick={() => { setWarnUnlinked(false); setSaving(true); handleSubmit(async (d) => {
                  setErr('')
                  try {
                    await api.post('/payments', { ...d, invoiceId: undefined })
                    onSaved(); onClose()
                  } catch (e: any) { setErr(e.response?.data?.errors?.[0] ?? 'Save failed') }
                  finally { setSaving(false) }
                })() }}
                  className="text-xs text-warning underline whitespace-nowrap font-medium">Record anyway</button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Payment Date <span className="text-danger">*</span></label>
            <DateField {...register('paymentDate')} />
          </div>
          <div>
            <label className={lbl}>Amount (৳) <span className="text-danger">*</span></label>
            <input type="number" {...register('amount')} className={inp} placeholder="0" />
            {errors.amount && <p className="text-xs text-danger mt-1">{errors.amount.message}</p>}
          </div>
        </div>

        <div>
          <label className={lbl}>Method <span className="text-danger">*</span></label>
          <div className="grid grid-cols-4 gap-2">
            {['Cash', 'Bank', 'Cheque', 'Online'].map(m => (
              <label key={m} className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${selectedMethod === m ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border-default text-content-muted hover:bg-surface-muted'}`}>
                <input type="radio" value={m} {...register('method')} className="sr-only" /> {m}
              </label>
            ))}
          </div>
        </div>

        {selectedMethod === 'Cheque' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Cheque No. <span className="text-danger">*</span></label>
              <input {...register('chequeNo')} className={inp} placeholder="e.g. 001234" />
              {errors.chequeNo && <p className="text-xs text-danger mt-1">{errors.chequeNo.message}</p>}
            </div>
            <div>
              <label className={lbl}>Bank Name</label>
              <input {...register('bankName')} className={inp} placeholder="e.g. Dutch-Bangla Bank" />
            </div>
          </div>
        ) : (
          <div>
            <label className={lbl}>Reference No.</label>
            <input {...register('referenceNo')} className={inp} placeholder="Transaction ID / reference…" />
          </div>
        )}

        <div>
          <label className={lbl}>Notes</label>
          <input {...register('notes')} className={inp} placeholder="Optional…" />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function CollectionsPage() {
  const qc = useQueryClient()
  const [search, setSearch]         = useState('')
  const [showNew, setShowNew]       = useState(false)
  const [activeTab, setActiveTab]   = useState<'list' | 'graphs'>('list')
  const [clientFilter, setClientFilter] = useState('')
  const [initial, setInitial] = useState<{ customerId?: number; invoiceId?: number }>({})

  // Deep-link from Invoices: ?customer=&invoice= pre-opens the Record Payment modal.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const customerId = Number(sp.get('customer')) || undefined
    const invoiceId  = Number(sp.get('invoice')) || undefined
    if (customerId || invoiceId) {
      setInitial({ customerId, invoiceId })
      setShowNew(true)
    }
  }, [])

  const { data: customers = [] } = useApiData<Customer[]>({ url: '/customers', queryKey: ['customers-list'] })
  const { data: invoices = [] }  = useApiData<Invoice[]>({ url: '/invoices', queryKey: ['invoices-list'] })

  const { data: payments = [], isLoading, error, refetch } = useApiData<Payment[]>({
    url: '/payments',
    params: { search: search || undefined },
    queryKey: ['payments', search],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['payments'] })
    qc.invalidateQueries({ queryKey: ['invoices'] })
    qc.invalidateQueries({ queryKey: ['invoices-list'] })
    qc.invalidateQueries({ queryKey: ['installments'] })
  }

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)
  const thisMonth = payments.filter(p => p.paymentDate.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, p) => s + p.amount, 0)

  // Monthly chart data — last 12 months
  const monthlyData = (() => {
    const map: Record<string, number> = {}
    payments.forEach(p => {
      const month = p.paymentDate.slice(0, 7)
      map[month] = (map[month] || 0) + p.amount
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, amount]) => ({ month: month.slice(0, 7), amount }))
  })()

  // Per-client summary
  const clientData = (() => {
    const map: Record<string, { name: string; total: number; count: number }> = {}
    payments.forEach(p => {
      if (!map[p.customerId]) map[p.customerId] = { name: p.customerName, total: 0, count: 0 }
      map[p.customerId].total += p.amount
      map[p.customerId].count += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  })()

  const filteredPayments = clientFilter
    ? payments.filter(p => String(p.customerId) === clientFilter)
    : payments

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        subtitle="Record and track customer payments"
        action={
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Collected', value: fmt(totalCollected), color: 'text-success' },
          { label: 'This Month',      value: fmt(thisMonth),      color: 'text-primary' },
          { label: 'Payments',        value: payments.length,     color: 'text-content' },
        ].map(s => (
          <div key={s.label} className="bg-surface rounded-xl border border-border-default p-4">
            <p className="text-xs text-content-muted uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-border-default">
        {[{ key: 'list', label: 'Payments', icon: Receipt }, { key: 'graphs', label: 'Analytics', icon: BarChart2 }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-content-muted hover:text-content'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'graphs' && (
        <div className="space-y-6">
          {/* Monthly bar chart */}
          <div className="bg-surface rounded-xl border border-border-default p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-content">Monthly Collections</h3>
            </div>
            {monthlyData.length === 0
              ? <p className="text-sm text-content-muted text-center py-8">No payment data yet.</p>
              : <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => [`৳${Number(v ?? 0).toLocaleString('en-BD')}`, 'Collected']} />
                    <Bar dataKey="amount" fill="rgb(var(--info))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>}
          </div>

          {/* Per-client breakdown */}
          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border-default">
              <Users className="w-4 h-4 text-content-muted" />
              <h3 className="text-sm font-semibold text-content">Collection by Client</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Client' }, { h: 'Payments', num: true }, { h: 'Total Collected', num: true },
                    { h: 'Share' }, { h: '' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-2 text-xs font-semibold text-content-muted ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {clientData.map(c => {
                  const pct = totalCollected > 0 ? (c.total / totalCollected) * 100 : 0
                  return (
                    <tr key={c.name} className="hover:bg-surface-muted">
                      <td className="px-4 py-2.5 font-medium text-content">{c.name}</td>
                      <td className="px-4 py-2.5 text-content-muted text-right tabular-nums">{c.count}</td>
                      <td className="px-4 py-2.5 font-semibold text-success text-right tabular-nums">৳{c.total.toLocaleString('en-BD')}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                            <div className="h-1.5 bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-content-muted">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => { setClientFilter(prev => prev === String(payments.find(p => p.customerName === c.name)?.customerId) ? '' : String(payments.find(p => p.customerName === c.name)?.customerId ?? '')); setActiveTab('list') }}
                          className="text-xs text-primary hover:underline">View →</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <>
          {clientFilter && (
            <div className="flex items-center gap-2 bg-primary/10 border border-info/20 rounded-lg px-3 py-2 text-xs text-primary">
              Showing payments for: <strong>{clientData.find(c => String(payments.find(p => p.customerName === c.name)?.customerId) === clientFilter)?.name}</strong>
              <button onClick={() => setClientFilter('')} className="ml-auto text-primary hover:text-primary font-medium">Clear ×</button>
            </div>
          )}
          <SearchBar value={search} onChange={setSearch} placeholder="Search payment no or client…" onRefresh={refetch} />

      <DataState loading={isLoading} error={error ? 'Failed to load payments.' : null} onRetry={refetch}
        empty={filteredPayments.length === 0} emptyMessage="No payments recorded yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Payment No.' }, { h: 'Client' }, { h: 'Invoice' }, { h: 'Date' },
                    { h: 'Amount', num: true }, { h: 'Method' }, { h: 'Reference' }, { h: '' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                      <div className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5 text-content-muted" />{p.paymentNo}</div>
                    </td>
                    <td className="px-4 py-3 text-content text-sm">{p.customerName}</td>
                    <td className="px-4 py-3 text-content-muted text-xs font-mono">{p.invoiceNo ?? '—'}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{p.paymentDate}</td>
                    <td className="px-4 py-3 font-semibold text-success text-right tabular-nums">{fmt(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${METHOD_COLORS[p.method] ?? 'bg-surface-muted text-content-muted'}`}>{p.method}</span>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs">{p.referenceNo ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => printReceipt(p)}
                        title="Print Receipt"
                        className="p-1.5 text-content-muted hover:text-success hover:bg-success/10 rounded-lg transition-colors">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

        </>
      )}

      {showNew && <PaymentModal customers={customers} invoices={invoices}
        initialCustomerId={initial.customerId} initialInvoiceId={initial.invoiceId}
        onClose={() => { setShowNew(false); setInitial({}) }} onSaved={invalidate} />}
    </div>
  )
}
