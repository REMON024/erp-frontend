'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Select'
import { DataState } from '@/components/ui/DataState'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Plus, FileText, Printer, Wallet } from 'lucide-react'
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
  Draft:     'bg-surface-muted text-content-muted',
  Sent:      'bg-primary/10 text-primary',
  Paid:      'bg-success/10 text-success',
  Overdue:   'bg-danger/10 text-danger',
  Cancelled: 'bg-surface-muted text-content-muted',
}
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

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
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Client <span className="text-danger">*</span></label>
            <Select {...register('customerId')} invalid={!!errors.customerId}>
              <option value="">Select client</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
            </Select>
            {errors.customerId && <p className="text-xs text-danger mt-1">{errors.customerId.message}</p>}
          </div>
          <div>
            <label className={lbl}>Project <span className="text-danger">*</span></label>
            <Select {...register('projectId')} invalid={!!errors.projectId}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
            </Select>
            {errors.projectId && <p className="text-xs text-danger mt-1">{errors.projectId.message}</p>}
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
            <label className={lbl}>Invoice Date <span className="text-danger">*</span></label>
            <DateField {...register('invoiceDate')} />
          </div>
          <div>
            <label className={lbl}>Due Date</label>
            <DateField {...register('dueDate')} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={lbl}>Sub Total (৳) <span className="text-danger">*</span></label>
            <input type="number" {...register('subTotal')} className={inp} placeholder="0" />
            {errors.subTotal && <p className="text-xs text-danger mt-1">{errors.subTotal.message}</p>}
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
        <div className="bg-surface-muted rounded-lg px-4 py-2 flex justify-between items-center">
          <span className="text-sm text-content-muted">Total Amount</span>
          <span className="text-lg font-bold text-content">{fmt(total)}</span>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
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

  const totalBilled    = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const outstanding    = totalBilled - totalCollected

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="Generate and track customer invoices"
        action={
          <PermissionGate module="INVOICES" action="create">
            <button onClick={() => setShowNew(true)}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Invoice
            </button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices',  value: invoices.length,      color: 'text-content' },
          { label: 'Total Billed',    value: fmt(totalBilled),     color: 'text-info' },
          { label: 'Collected',       value: fmt(totalCollected),  color: 'text-success' },
          { label: 'Outstanding',     value: fmt(outstanding),     color: 'text-danger' },
        ].map(s => (
          <div key={s.label} className="bg-surface rounded-xl border border-border-default p-4">
            <p className="text-xs text-content-muted uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search invoice no or client…" onRefresh={refetch}>
        <Select value={status} onChange={e => setStatus(e.target.value)} className="min-w-[150px]">
          <option value="">All Status</option>
          {['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load invoices.' : null} onRetry={refetch}
        empty={invoices.length === 0} emptyMessage="No invoices yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Invoice No.' }, { h: 'Client' }, { h: 'Type' }, { h: 'Date' },
                    { h: 'Total', num: true }, { h: 'Paid', num: true }, { h: 'Due', num: true },
                    { h: 'Status' }, { h: '' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {invoices.map(i => (
                  <tr key={i.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                      <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-content-muted" />{i.invoiceNo}</div>
                    </td>
                    <td className="px-4 py-3 text-content text-sm">{i.customerName}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{i.invoiceType}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{i.invoiceDate}</td>
                    <td className="px-4 py-3 font-semibold text-content text-right tabular-nums">{fmt(i.totalAmount)}</td>
                    <td className="px-4 py-3 text-success text-xs text-right tabular-nums">{fmt(i.paidAmount)}</td>
                    <td className="px-4 py-3 text-danger text-xs text-right tabular-nums">{fmt(i.dueAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[i.status] ?? 'bg-surface-muted text-content-muted'}`}>{i.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {i.dueAmount > 0 && i.status !== 'Cancelled' && (
                          <Link
                            href={`/sales/collections?invoice=${i.id}&customer=${i.customerId}`}
                            title="Collect payment"
                            className="p-1.5 text-content-muted hover:text-success hover:bg-success/10 rounded-lg transition-colors">
                            <Wallet className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <button
                          onClick={() => printInvoice(i)}
                          title="Print / Download PDF"
                          className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
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
