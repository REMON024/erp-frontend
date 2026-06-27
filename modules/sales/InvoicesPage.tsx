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
import { Plus, FileText, XCircle, Printer } from 'lucide-react'
import { printInvoice } from '@/utils/printUtils'
import api from '@/lib/api'

interface Customer { id: number; fullName: string }
interface Project  { id: number; projectName: string; projectCode: string }
interface Invoice {
  id: number; invoiceNo: string; projectId: number; bookingId?: number
  customerId: number; customerName: string; invoiceType: string
  invoiceDate: string; dueDate?: string
  subTotal: number; discountAmount: number; vatAmount: number; taxAmount: number
  totalAmount: number; paidAmount: number; dueAmount: number; status: string
}

const STATUS_COLORS: Record<string, string> = {
  Draft:     'bg-gray-100 text-gray-600',
  Sent:      'bg-blue-100 text-blue-700',
  Paid:      'bg-green-100 text-green-700',
  Overdue:   'bg-red-100 text-red-700',
  Cancelled: 'bg-gray-100 text-gray-400',
}
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  customerId:     z.coerce.number().min(1, 'Required'),
  projectId:      z.coerce.number().min(1, 'Required'),
  invoiceType:    z.string().min(1, 'Required'),
  invoiceDate:    z.string().min(1, 'Required'),
  dueDate:        z.string().optional(),
  subTotal:       z.coerce.number().min(1, 'Required'),
  discountAmount: z.coerce.number().min(0),
  vatAmount:      z.coerce.number().min(0),
  taxAmount:      z.coerce.number().min(0),
})
type Form = z.infer<typeof schema>

function InvoiceModal({ customers, projects, onClose, onSaved }: {
  customers: Customer[]; projects: Project[]; onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { invoiceType: 'Installment', invoiceDate: isoToday(), discountAmount: 0, vatAmount: 0, taxAmount: 0 },
  })

  const sub = Number(watch('subTotal') || 0)
  const disc = Number(watch('discountAmount') || 0)
  const vat = Number(watch('vatAmount') || 0)
  const tax = Number(watch('taxAmount') || 0)
  const total = sub - disc + vat + tax

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      await api.post('/invoices', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="New Invoice" size="lg">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Client <span className="text-red-500">*</span></label>
            <select {...register('customerId')} className={inp}>
              <option value="">Select client</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
            </select>
            {errors.customerId && <p className="text-xs text-red-600 mt-1">{errors.customerId.message}</p>}
          </div>
          <div>
            <label className={lbl}>Project <span className="text-red-500">*</span></label>
            <select {...register('projectId')} className={inp}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
            </select>
            {errors.projectId && <p className="text-xs text-red-600 mt-1">{errors.projectId.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Type</label>
            <select {...register('invoiceType')} className={inp}>
              {['Booking', 'Installment', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Invoice Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('invoiceDate')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Due Date</label>
            <input type="date" {...register('dueDate')} className={inp} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={lbl}>Sub Total (৳) <span className="text-red-500">*</span></label>
            <input type="number" {...register('subTotal')} className={inp} placeholder="0" />
            {errors.subTotal && <p className="text-xs text-red-600 mt-1">{errors.subTotal.message}</p>}
          </div>
          <div>
            <label className={lbl}>Discount</label>
            <input type="number" {...register('discountAmount')} className={inp} placeholder="0" />
          </div>
          <div>
            <label className={lbl}>VAT</label>
            <input type="number" {...register('vatAmount')} className={inp} placeholder="0" />
          </div>
          <div>
            <label className={lbl}>Tax</label>
            <input type="number" {...register('taxAmount')} className={inp} placeholder="0" />
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-2 flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Amount</span>
          <span className="text-lg font-bold text-gray-900">{fmt(total)}</span>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function InvoicesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showNew, setShowNew] = useState(false)

  const { data: customers = [] } = useApiData<Customer[]>({ url: '/customers', queryKey: ['customers-list'] })
  const { data: projects = [] }  = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })

  const { data: invoices = [], isLoading, error, refetch } = useApiData<Invoice[]>({
    url: '/invoices',
    params: { search: search || undefined, status: status || undefined },
    queryKey: ['invoices', search, status],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['invoices'] })
    qc.invalidateQueries({ queryKey: ['invoices-list'] })
  }

  const cancelInvoice = async (id: number) => {
    if (!confirm('Cancel this invoice? This cannot be undone.')) return
    try { await api.post(`/invoices/${id}/cancel`); invalidate() } catch { /* noop */ }
  }

  const totalBilled    = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const outstanding    = totalBilled - totalCollected

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="Generate and track customer invoices"
        action={
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices',  value: invoices.length,      color: 'text-gray-900' },
          { label: 'Total Billed',    value: fmt(totalBilled),     color: 'text-indigo-600' },
          { label: 'Collected',       value: fmt(totalCollected),  color: 'text-green-600' },
          { label: 'Outstanding',     value: fmt(outstanding),     color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search invoice no or client…" onRefresh={refetch}>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Status</option>
          {['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load invoices.' : null} onRetry={refetch}
        empty={invoices.length === 0} emptyMessage="No invoices yet.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Invoice No.', 'Client', 'Type', 'Date', 'Total', 'Paid', 'Due', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">
                      <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-gray-400" />{i.invoiceNo}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm">{i.customerName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{i.invoiceType}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{i.invoiceDate}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(i.totalAmount)}</td>
                    <td className="px-4 py-3 text-green-700 text-xs">{fmt(i.paidAmount)}</td>
                    <td className="px-4 py-3 text-red-600 text-xs">{fmt(i.dueAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[i.status] ?? 'bg-gray-100 text-gray-600'}`}>{i.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => printInvoice(i)}
                          title="Print / Download PDF"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {(i.status === 'Draft' || i.status === 'Sent') && (
                          <button onClick={() => cancelInvoice(i.id)} title="Cancel Invoice"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
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

      {showNew && <InvoiceModal customers={customers} projects={projects} onClose={() => setShowNew(false)} onSaved={invalidate} />}
    </div>
  )
}
