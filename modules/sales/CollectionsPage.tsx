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
}

const METHOD_COLORS: Record<string, string> = {
  Cash:   'bg-green-100 text-green-700',
  Bank:   'bg-blue-100 text-blue-700',
  Cheque: 'bg-amber-100 text-amber-700',
  Online: 'bg-purple-100 text-purple-700',
}
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

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

function PaymentModal({ customers, invoices, onClose, onSaved }: {
  customers: Customer[]; invoices: Invoice[]; onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const [warnUnlinked, setWarnUnlinked] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { paymentDate: isoToday(), method: 'Bank' },
  })

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
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

        <div>
          <label className={lbl}>Client <span className="text-red-500">*</span></label>
          <select {...register('customerId')} className={inp}
            onChange={e => { setValue('customerId', Number(e.target.value)); setValue('invoiceId', undefined); setWarnUnlinked(false) }}>
            <option value="">Select client</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          {errors.customerId && <p className="text-xs text-red-600 mt-1">{errors.customerId.message}</p>}
        </div>

        {selectedCustomerId > 0 && (
          <div>
            <label className={lbl}>
              Against Invoice <span className="text-red-500">*</span>
              {customerInvoices.length === 0 && <span className="text-gray-400 font-normal ml-1">(no outstanding invoices)</span>}
            </label>
            <select
              value={selectedInvoiceId || ''}
              onChange={handleInvoiceChange}
              className={inp}
              disabled={customerInvoices.length === 0}
            >
              <option value="">— Select invoice —</option>
              {customerInvoices.map(i => (
                <option key={i.id} value={i.id}>{i.invoiceNo} — due {fmt(i.dueAmount)}</option>
              ))}
            </select>
            {warnUnlinked && (
              <div className="mt-1 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-700 flex-1">
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
                  className="text-xs text-amber-700 underline whitespace-nowrap font-medium">Record anyway</button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Payment Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('paymentDate')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Amount (৳) <span className="text-red-500">*</span></label>
            <input type="number" {...register('amount')} className={inp} placeholder="0" />
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
          </div>
        </div>

        <div>
          <label className={lbl}>Method <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-4 gap-2">
            {['Cash', 'Bank', 'Cheque', 'Online'].map(m => (
              <label key={m} className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${selectedMethod === m ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                <input type="radio" value={m} {...register('method')} className="sr-only" /> {m}
              </label>
            ))}
          </div>
        </div>

        {selectedMethod === 'Cheque' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Cheque No. <span className="text-red-500">*</span></label>
              <input {...register('chequeNo')} className={inp} placeholder="e.g. 001234" />
              {errors.chequeNo && <p className="text-xs text-red-600 mt-1">{errors.chequeNo.message}</p>}
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

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
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
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Collected', value: fmt(totalCollected), color: 'text-green-600' },
          { label: 'This Month',      value: fmt(thisMonth),      color: 'text-blue-600' },
          { label: 'Payments',        value: payments.length,     color: 'text-gray-900' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-gray-200">
        {[{ key: 'list', label: 'Payments', icon: Receipt }, { key: 'graphs', label: 'Analytics', icon: BarChart2 }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'graphs' && (
        <div className="space-y-6">
          {/* Monthly bar chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-800">Monthly Collections</h3>
            </div>
            {monthlyData.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">No payment data yet.</p>
              : <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => [`৳${Number(v ?? 0).toLocaleString('en-BD')}`, 'Collected']} />
                    <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>}
          </div>

          {/* Per-client breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <Users className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-800">Collection by Client</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Client', 'Payments', 'Total Collected', 'Share', ''].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientData.map(c => {
                  const pct = totalCollected > 0 ? (c.total / totalCollected) * 100 : 0
                  return (
                    <tr key={c.name} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{c.count}</td>
                      <td className="px-4 py-2.5 font-semibold text-green-700">৳{c.total.toLocaleString('en-BD')}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => { setClientFilter(prev => prev === String(payments.find(p => p.customerName === c.name)?.customerId) ? '' : String(payments.find(p => p.customerName === c.name)?.customerId ?? '')); setActiveTab('list') }}
                          className="text-xs text-blue-600 hover:underline">View →</button>
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
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
              Showing payments for: <strong>{clientData.find(c => String(payments.find(p => p.customerName === c.name)?.customerId) === clientFilter)?.name}</strong>
              <button onClick={() => setClientFilter('')} className="ml-auto text-blue-500 hover:text-blue-700 font-medium">Clear ×</button>
            </div>
          )}
          <SearchBar value={search} onChange={setSearch} placeholder="Search payment no or client…" onRefresh={refetch} />

      <DataState loading={isLoading} error={error ? 'Failed to load payments.' : null} onRetry={refetch}
        empty={filteredPayments.length === 0} emptyMessage="No payments recorded yet.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Payment No.', 'Client', 'Invoice', 'Date', 'Amount', 'Method', 'Reference', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">
                      <div className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5 text-gray-400" />{p.paymentNo}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm">{p.customerName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{p.invoiceNo ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.paymentDate}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{fmt(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${METHOD_COLORS[p.method] ?? 'bg-gray-100 text-gray-600'}`}>{p.method}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{p.referenceNo ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => printReceipt({ paymentNo: p.paymentNo, customerName: p.customerName, paymentDate: p.paymentDate, amount: p.amount, method: p.method, referenceNo: p.referenceNo, invoiceNo: p.invoiceNo, notes: p.notes })}
                        title="Print Receipt"
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
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

      {showNew && <PaymentModal customers={customers} invoices={invoices} onClose={() => setShowNew(false)} onSaved={invalidate} />}
    </div>
  )
}
