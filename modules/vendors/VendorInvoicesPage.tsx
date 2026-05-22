'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, CheckCircle } from 'lucide-react'

interface VendorInvoice {
  id: string; vendor: string; invoice_no: string; description: string
  amount: number; date: string; due_date: string; status: 'pending' | 'paid' | 'overdue'
}

const MOCK: VendorInvoice[] = [
  { id: 'vi1', vendor: 'Jackson',       invoice_no: 'INV-2025-001', description: 'Electrical work Phase 1', amount: 125000, date: '2025-11-01', due_date: '2025-11-30', status: 'paid' },
  { id: 'vi2', vendor: 'Jatin ahuja',   invoice_no: 'INV-2025-002', description: 'Raw material supply',     amount:  85000, date: '2025-11-15', due_date: '2025-12-15', status: 'pending' },
  { id: 'vi3', vendor: 'Aman Asati',    invoice_no: 'INV-2025-003', description: 'Subcontract work Q4',    amount: 210000, date: '2025-10-01', due_date: '2025-10-31', status: 'overdue' },
  { id: 'vi4', vendor: 'khushi sharma', invoice_no: 'INV-2025-004', description: 'Fire safety installation',amount:  48000, date: '2025-11-20', due_date: '2025-12-20', status: 'pending' },
  { id: 'vi5', vendor: 'Jackson',       invoice_no: 'INV-2025-005', description: 'Electrical work Phase 2', amount: 140000, date: '2025-12-01', due_date: '2025-12-31', status: 'pending' },
]

const STATUS_COLORS: Record<string, string> = {
  paid:    'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  vendor:      z.string().min(1, 'Required'),
  invoice_no:  z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  amount:      z.coerce.number().min(1, 'Required'),
  date:        z.string().min(1, 'Required'),
  due_date:    z.string().min(1, 'Required'),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (inv: VendorInvoice) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  })
  return (
    <Modal open onClose={onClose} title="Add Vendor Invoice" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({ id: `vi${Date.now()}`, ...d, status: 'pending' })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Vendor Name</label>
            <input {...register('vendor')} className={inp} placeholder="Vendor name" />
            {errors.vendor && <p className="text-xs text-red-600 mt-1">{errors.vendor.message}</p>}
          </div>
          <div>
            <label className={lbl}>Invoice Number</label>
            <input {...register('invoice_no')} className={inp} placeholder="INV-2025-001" />
            {errors.invoice_no && <p className="text-xs text-red-600 mt-1">{errors.invoice_no.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Description</label>
          <input {...register('description')} className={inp} placeholder="Work / material description" />
          {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Amount (৳)</label>
            <input type="number" {...register('amount')} className={inp} placeholder="100000" />
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className={lbl}>Invoice Date</label>
            <input type="date" {...register('date')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Due Date</label>
            <input type="date" {...register('due_date')} className={inp} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Invoice</button>
        </div>
      </form>
    </Modal>
  )
}

export function VendorInvoicesPage() {
  const [invoices, setInvoices] = useState<VendorInvoice[]>(MOCK)
  const [showAdd, setShowAdd]   = useState(false)
  const [filter, setFilter]     = useState('')

  const displayed = filter ? invoices.filter(i => i.status === filter) : invoices
  const total    = invoices.reduce((s, i) => s + i.amount, 0)
  const paid     = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const pending  = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0)

  function markPaid(id: string) {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' } : i))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices & Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vendor invoices and payment tracking</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Invoice
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Invoiced', value: `৳${(total / 1000).toFixed(0)}K`,  color: 'text-blue-600' },
          { label: 'Paid',          value: `৳${(paid / 1000).toFixed(0)}K`,    color: 'text-green-600' },
          { label: 'Outstanding',   value: `৳${(pending / 1000).toFixed(0)}K`, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'pending', 'paid', 'overdue'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Vendor', 'Invoice No.', 'Description', 'Amount', 'Date', 'Due Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(inv => (
              <tr key={inv.id} className={`hover:bg-gray-50 ${inv.status === 'overdue' ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-900">{inv.vendor}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{inv.invoice_no}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{inv.description}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">৳{inv.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{inv.date}</td>
                <td className="px-4 py-3 text-gray-500">{inv.due_date}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {inv.status !== 'paid' && (
                      <button onClick={() => markPaid(inv.id)} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <CheckCircle className="w-3 h-3" /> Pay
                      </button>
                    )}
                    <button className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">No invoices found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={inv => setInvoices(prev => [inv, ...prev])} />}
    </div>
  )
}
