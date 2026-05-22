'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { CLIENTS } from './ClientsPage'
import { INVOICES } from './InvoicesPage'

type InstallmentStatus = 'pending' | 'paid' | 'overdue'

interface Installment {
  id: string; invoice_id: string; client_id: string; installment_no: number
  amount: number; due_date: string; paid_date: string; status: InstallmentStatus; notes: string
}

const MOCK: Installment[] = [
  // Invoice 1 (fully paid)
  { id: 'ins1',  invoice_id: 'inv1', client_id: 'c1', installment_no: 1, amount: 1000000, due_date: '2025-01-15', paid_date: '2025-01-14', status: 'paid',    notes: 'Booking' },
  { id: 'ins2',  invoice_id: 'inv1', client_id: 'c1', installment_no: 2, amount: 1500000, due_date: '2025-02-15', paid_date: '2025-02-13', status: 'paid',    notes: '' },
  { id: 'ins3',  invoice_id: 'inv1', client_id: 'c1', installment_no: 3, amount: 1500000, due_date: '2025-03-15', paid_date: '2025-03-14', status: 'paid',    notes: '' },
  { id: 'ins4',  invoice_id: 'inv1', client_id: 'c1', installment_no: 4, amount: 1600000, due_date: '2025-04-15', paid_date: '2025-04-10', status: 'paid',    notes: 'Final payment' },
  // Invoice 2 (partial)
  { id: 'ins5',  invoice_id: 'inv2', client_id: 'c2', installment_no: 1, amount: 1400000, due_date: '2025-02-01', paid_date: '2025-02-01', status: 'paid',    notes: 'Booking' },
  { id: 'ins6',  invoice_id: 'inv2', client_id: 'c2', installment_no: 2, amount: 1400000, due_date: '2025-03-01', paid_date: '2025-03-02', status: 'paid',    notes: '' },
  { id: 'ins7',  invoice_id: 'inv2', client_id: 'c2', installment_no: 3, amount: 1400000, due_date: '2025-04-01', paid_date: '',           status: 'overdue', notes: '' },
  { id: 'ins8',  invoice_id: 'inv2', client_id: 'c2', installment_no: 4, amount: 1400000, due_date: '2025-05-01', paid_date: '',           status: 'overdue', notes: '' },
  // Invoice 4 (partial)
  { id: 'ins9',  invoice_id: 'inv4', client_id: 'c4', installment_no: 1, amount: 1500000, due_date: '2025-03-01', paid_date: '2025-03-01', status: 'paid',    notes: 'Booking amount' },
  { id: 'ins10', invoice_id: 'inv4', client_id: 'c4', installment_no: 2, amount: 1500000, due_date: '2025-05-01', paid_date: '',           status: 'pending', notes: '' },
  { id: 'ins11', invoice_id: 'inv4', client_id: 'c4', installment_no: 3, amount: 1750000, due_date: '2025-08-01', paid_date: '',           status: 'pending', notes: '' },
  { id: 'ins12', invoice_id: 'inv4', client_id: 'c4', installment_no: 4, amount: 1750000, due_date: '2025-11-01', paid_date: '',           status: 'pending', notes: '' },
  // Invoice 7 (partial)
  { id: 'ins13', invoice_id: 'inv7', client_id: 'c7', installment_no: 1, amount: 2000000, due_date: '2025-06-01', paid_date: '2025-06-01', status: 'paid',    notes: 'Booking' },
  { id: 'ins14', invoice_id: 'inv7', client_id: 'c7', installment_no: 2, amount: 2000000, due_date: '2025-09-01', paid_date: '',           status: 'pending', notes: '' },
  { id: 'ins15', invoice_id: 'inv7', client_id: 'c7', installment_no: 3, amount: 4000000, due_date: '2025-12-01', paid_date: '',           status: 'pending', notes: '' },
]

const STATUS_ICONS: Record<InstallmentStatus, React.ReactNode> = {
  paid:    <CheckCircle className="w-4 h-4 text-green-500" />,
  pending: <Clock className="w-4 h-4 text-yellow-500" />,
  overdue: <AlertTriangle className="w-4 h-4 text-red-500" />,
}
const STATUS_COLORS: Record<InstallmentStatus, string> = {
  paid:    'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function getClient(id: string)  { return CLIENTS.find(c => c.id === id) }
function getInvoice(id: string) { return INVOICES.find(i => i.id === id) }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  invoice_id:      z.string().min(1, 'Required'),
  installment_no:  z.coerce.number().min(1),
  amount:          z.coerce.number().min(1, 'Required'),
  due_date:        z.string().min(1, 'Required'),
  notes:           z.string().optional(),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (i: Installment) => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { installment_no: 1 },
  })
  const selectedInvoice = watch('invoice_id')
  const inv = getInvoice(selectedInvoice)
  const client = inv ? getClient(inv.client_id) : null

  return (
    <Modal open onClose={onClose} title="Add Payment Installment" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({ id: `ins${Date.now()}`, ...d, client_id: inv?.client_id ?? '', paid_date: '', status: 'pending', notes: d.notes ?? '' })
        onClose()
      })} className="space-y-4 p-1">
        <div>
          <label className={lbl}>Invoice</label>
          <select {...register('invoice_id')} className={inp}>
            <option value="">Select invoice</option>
            {INVOICES.map(i => {
              const c = getClient(i.client_id)
              return <option key={i.id} value={i.id}>{i.invoice_no} — {c?.name} — {fmt(i.total_amount)}</option>
            })}
          </select>
          {errors.invoice_id && <p className="text-xs text-red-600 mt-1">{errors.invoice_id.message}</p>}
        </div>
        {client && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-800">
            Client: <span className="font-bold">{client.name}</span> · Total: {fmt(inv!.total_amount)} · Paid: {fmt(inv!.paid_amount)}
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Installment #</label>
            <input type="number" {...register('installment_no')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Amount (৳)</label>
            <input type="number" {...register('amount')} className={inp} placeholder="0" />
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className={lbl}>Due Date</label>
            <input type="date" {...register('due_date')} className={inp} />
          </div>
        </div>
        <div>
          <label className={lbl}>Notes</label>
          <input {...register('notes')} className={inp} placeholder="Booking, down payment, etc." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Installment</button>
        </div>
      </form>
    </Modal>
  )
}

export function PaymentSchedulePage() {
  const [installments, setInstallments] = useState<Installment[]>(MOCK)
  const [showAdd, setShowAdd]            = useState(false)
  const [filterInvoice, setFI]           = useState('')
  const [filterStatus, setFS]            = useState<string>('')

  const displayed = installments.filter(i => {
    if (filterInvoice && i.invoice_id !== filterInvoice) return false
    if (filterStatus  && i.status   !== filterStatus)   return false
    return true
  })

  const totalDue    = installments.reduce((s, i) => s + i.amount, 0)
  const totalPaid   = installments.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const overdueAmt  = installments.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  const pendingAmt  = installments.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Schedules</h1>
          <p className="text-sm text-gray-500 mt-0.5">Installment plans and due-date tracking per client</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Installment
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Scheduled</p><p className="text-xl font-bold text-blue-600 mt-1">{fmt(totalDue)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Calendar className="w-5 h-5 text-blue-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Paid</p><p className="text-xl font-bold text-green-600 mt-1">{fmt(totalPaid)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Pending</p><p className="text-xl font-bold text-yellow-600 mt-1">{fmt(pendingAmt)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center"><Clock className="w-5 h-5 text-yellow-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Overdue</p><p className="text-xl font-bold text-red-600 mt-1">{fmt(overdueAmt)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <h3 className="font-semibold text-gray-900 flex-1">Installment Schedule</h3>
          <select value={filterInvoice} onChange={e => setFI(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Invoices</option>
            {INVOICES.map(i => <option key={i.id} value={i.id}>{i.invoice_no}</option>)}
          </select>
          {(['', 'paid', 'pending', 'overdue'] as const).map(s => (
            <button key={s} onClick={() => setFS(s)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Invoice', 'Client', '#', 'Amount', 'Due Date', 'Paid Date', 'Notes', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(ins => {
              const inv = getInvoice(ins.invoice_id)
              const client = getClient(ins.client_id)
              return (
                <tr key={ins.id} className={`hover:bg-gray-50 ${ins.status === 'overdue' ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{inv?.invoice_no}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs font-medium">{client?.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-center font-bold">{ins.installment_no}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{fmt(ins.amount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{ins.due_date}</td>
                  <td className="px-4 py-3 text-green-700 text-xs">{ins.paid_date || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{ins.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold w-fit ${STATUS_COLORS[ins.status]}`}>
                      {STATUS_ICONS[ins.status]}
                      {ins.status.charAt(0).toUpperCase() + ins.status.slice(1)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={i => setInstallments(p => [i, ...p])} />}
    </div>
  )
}
