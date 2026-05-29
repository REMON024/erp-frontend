'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, FileText, Eye } from 'lucide-react'
import { CLIENTS } from './ClientsPage'
import { PROJECTS, UNITS as RAW_UNITS } from './UnitsPage'

// Flatten units to the label shape this page needs
const UNITS = RAW_UNITS.map(u => ({
  id:         u.id,
  project_id: u.project_id,
  label:      `${u.unit_no} — ${u.area_sqft} sqft`,
}))

export type InvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'overdue'

export interface Invoice {
  id: string; invoice_no: string; client_id: string; project_id: string
  unit_id: string; total_amount: number; paid_amount: number
  issue_date: string; due_date: string; status: InvoiceStatus; notes: string
}

export const INVOICES: Invoice[] = [
  { id: 'inv1',  invoice_no: 'INV-2025-001', client_id: 'c1', project_id: 'p1', unit_id: 'u1', total_amount: 5600000, paid_amount: 5600000, issue_date: '2025-01-15', due_date: '2025-04-15', status: 'paid',    notes: '' },
  { id: 'inv2',  invoice_no: 'INV-2025-002', client_id: 'c2', project_id: 'p1', unit_id: 'u2', total_amount: 5600000, paid_amount: 2800000, issue_date: '2025-02-01', due_date: '2025-05-01', status: 'partial', notes: '' },
  { id: 'inv3',  invoice_no: 'INV-2025-003', client_id: 'c3', project_id: 'p1', unit_id: 'u3', total_amount: 6500000, paid_amount: 6500000, issue_date: '2025-02-10', due_date: '2025-05-10', status: 'paid',    notes: '' },
  { id: 'inv4',  invoice_no: 'INV-2025-004', client_id: 'c4', project_id: 'p1', unit_id: 'u4', total_amount: 6500000, paid_amount: 1500000, issue_date: '2025-03-01', due_date: '2025-06-01', status: 'partial', notes: 'Booking amount received' },
  { id: 'inv5',  invoice_no: 'INV-2025-005', client_id: 'c5', project_id: 'p2', unit_id: 'u5', total_amount: 4800000, paid_amount: 4800000, issue_date: '2025-04-01', due_date: '2025-07-01', status: 'paid',    notes: '' },
  { id: 'inv6',  invoice_no: 'INV-2025-006', client_id: 'c6', project_id: 'p2', unit_id: 'u6', total_amount: 4800000, paid_amount: 0,       issue_date: '2025-05-01', due_date: '2025-08-01', status: 'overdue', notes: '' },
  { id: 'inv7',  invoice_no: 'INV-2025-007', client_id: 'c7', project_id: 'p3', unit_id: 'u7', total_amount: 8000000, paid_amount: 2000000, issue_date: '2025-06-01', due_date: '2025-09-01', status: 'partial', notes: '' },
  { id: 'inv8',  invoice_no: 'INV-2025-008', client_id: 'c8', project_id: 'p4', unit_id: 'u8', total_amount: 3600000, paid_amount: 0,       issue_date: '2025-09-15', due_date: '2025-12-15', status: 'issued',  notes: 'New booking' },
]

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft:   'bg-gray-100 text-gray-600',
  issued:  'bg-blue-100 text-blue-700',
  partial: 'bg-yellow-100 text-yellow-700',
  paid:    'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function getClient(id: string)  { return CLIENTS.find(c => c.id === id) }
function getProject(id: string) { return PROJECTS.find(p => p.id === id) }
function getUnit(id: string)    { return UNITS.find(u => u.id === id) }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  client_id:    z.string().min(1, 'Required'),
  project_id:   z.string().min(1, 'Required'),
  unit_id:      z.string().min(1, 'Required'),
  total_amount: z.coerce.number().min(1, 'Required'),
  issue_date:   z.string().min(1, 'Required'),
  due_date:     z.string().min(1, 'Required'),
  notes:        z.string().optional(),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (i: Invoice) => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { issue_date: new Date().toISOString().split('T')[0] },
  })
  const selectedProject = watch('project_id')
  const filteredUnits = selectedProject ? UNITS.filter(u => u.project_id === selectedProject) : UNITS

  return (
    <Modal open onClose={onClose} title="Generate Invoice" size="md">
      <form onSubmit={handleSubmit(d => {
        const seq = String(INVOICES.length + 1).padStart(3, '0')
        onAdd({ id: `inv${Date.now()}`, invoice_no: `INV-2025-${seq}`, ...d, paid_amount: 0, status: 'issued', notes: d.notes ?? '' })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Client</label>
            <select {...register('client_id')} className={inp}>
              <option value="">Select client</option>
              {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.client_id && <p className="text-xs text-red-600 mt-1">{errors.client_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Project</label>
            <select {...register('project_id')} className={inp}>
              <option value="">Select project</option>
              {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Unit</label>
          <select {...register('unit_id')} className={inp}>
            <option value="">Select unit</option>
            {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
          {errors.unit_id && <p className="text-xs text-red-600 mt-1">{errors.unit_id.message}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Total Amount (৳)</label>
            <input type="number" {...register('total_amount')} className={inp} placeholder="5000000" />
            {errors.total_amount && <p className="text-xs text-red-600 mt-1">{errors.total_amount.message}</p>}
          </div>
          <div>
            <label className={lbl}>Issue Date</label>
            <input type="date" {...register('issue_date')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Due Date</label>
            <input type="date" {...register('due_date')} className={inp} />
          </div>
        </div>
        <div>
          <label className={lbl}>Notes</label>
          <input {...register('notes')} className={inp} placeholder="Optional notes" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Generate Invoice</button>
        </div>
      </form>
    </Modal>
  )
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(INVOICES)
  const [showAdd, setShowAdd]   = useState(false)
  const [filterStatus, setFS]   = useState<string>('')

  const displayed = filterStatus ? invoices.filter(i => i.status === filterStatus) : invoices

  const totalRevenue  = invoices.reduce((s, i) => s + i.total_amount, 0)
  const totalCollected = invoices.reduce((s, i) => s + i.paid_amount, 0)
  const totalPending  = totalRevenue - totalCollected
  const overdueCount  = invoices.filter(i => i.status === 'overdue').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate and track unit sale invoices</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Generate Invoice
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Revenue</p><p className="text-xl font-bold text-blue-600 mt-1">{fmt(totalRevenue)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Collected</p><p className="text-xl font-bold text-green-600 mt-1">{fmt(totalCollected)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><FileText className="w-5 h-5 text-green-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Pending</p><p className="text-xl font-bold text-yellow-600 mt-1">{fmt(totalPending)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center"><FileText className="w-5 h-5 text-yellow-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Overdue</p><p className="text-xl font-bold text-red-600 mt-1">{overdueCount}</p><p className="text-xs text-gray-400 mt-1">Invoices</p></div>
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><FileText className="w-5 h-5 text-red-600" /></div>
        </div>
      </div>

      {/* Filter + table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <h3 className="font-semibold text-gray-900 flex-1">All Invoices</h3>
          {(['', 'draft', 'issued', 'partial', 'paid', 'overdue'] as const).map(s => (
            <button key={s} onClick={() => setFS(s)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Invoice No.', 'Client', 'Project / Unit', 'Total Amount', 'Paid', 'Balance', 'Issue Date', 'Due Date', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(inv => {
              const balance = inv.total_amount - inv.paid_amount
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{inv.invoice_no}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 text-xs">{getClient(inv.client_id)?.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{getUnit(inv.unit_id)?.label}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{fmt(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-green-700 font-medium">{fmt(inv.paid_amount)}</td>
                  <td className="px-4 py-3 text-red-600 font-medium">{balance > 0 ? fmt(balance) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{inv.issue_date}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{inv.due_date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={i => setInvoices(p => [i, ...p])} />}
    </div>
  )
}
