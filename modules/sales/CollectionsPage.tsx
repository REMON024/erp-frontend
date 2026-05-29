'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Receipt, Download } from 'lucide-react'
import { CLIENTS } from './ClientsPage'
import { INVOICES } from './InvoicesPage'

type PaymentMode = 'Bank Transfer' | 'Cheque' | 'Cash' | 'NEFT/RTGS' | 'Mobile Banking'

interface Collection {
  id: string; receipt_no: string; invoice_id: string; client_id: string
  amount: number; date: string; payment_mode: PaymentMode; ref_no: string; notes: string
}

const MOCK: Collection[] = [
  { id: 'col1',  receipt_no: 'REC-2025-001', invoice_id: 'inv1', client_id: 'c1', amount: 1000000, date: '2025-01-14', payment_mode: 'Bank Transfer', ref_no: 'TXN001',  notes: 'Booking' },
  { id: 'col2',  receipt_no: 'REC-2025-002', invoice_id: 'inv1', client_id: 'c1', amount: 1500000, date: '2025-02-13', payment_mode: 'Bank Transfer', ref_no: 'TXN002',  notes: '' },
  { id: 'col3',  receipt_no: 'REC-2025-003', invoice_id: 'inv1', client_id: 'c1', amount: 1500000, date: '2025-03-14', payment_mode: 'Cheque',        ref_no: 'CHQ1234', notes: '' },
  { id: 'col4',  receipt_no: 'REC-2025-004', invoice_id: 'inv1', client_id: 'c1', amount: 1600000, date: '2025-04-10', payment_mode: 'Bank Transfer', ref_no: 'TXN010',  notes: 'Final payment' },
  { id: 'col5',  receipt_no: 'REC-2025-005', invoice_id: 'inv2', client_id: 'c2', amount: 1400000, date: '2025-02-01', payment_mode: 'Bank Transfer', ref_no: 'TXN015',  notes: 'Booking' },
  { id: 'col6',  receipt_no: 'REC-2025-006', invoice_id: 'inv2', client_id: 'c2', amount: 1400000, date: '2025-03-02', payment_mode: 'Mobile Banking', ref_no: 'bKash001',notes: '' },
  { id: 'col7',  receipt_no: 'REC-2025-007', invoice_id: 'inv3', client_id: 'c3', amount: 3250000, date: '2025-02-10', payment_mode: 'Bank Transfer', ref_no: 'TXN020',  notes: 'First half' },
  { id: 'col8',  receipt_no: 'REC-2025-008', invoice_id: 'inv3', client_id: 'c3', amount: 3250000, date: '2025-04-15', payment_mode: 'Bank Transfer', ref_no: 'TXN025',  notes: 'Second half' },
  { id: 'col9',  receipt_no: 'REC-2025-009', invoice_id: 'inv4', client_id: 'c4', amount: 1500000, date: '2025-03-01', payment_mode: 'Cheque',        ref_no: 'CHQ2001', notes: 'Booking amount' },
  { id: 'col10', receipt_no: 'REC-2025-010', invoice_id: 'inv5', client_id: 'c5', amount: 4800000, date: '2025-04-01', payment_mode: 'Bank Transfer', ref_no: 'TXN030',  notes: 'Full payment' },
  { id: 'col11', receipt_no: 'REC-2025-011', invoice_id: 'inv7', client_id: 'c7', amount: 2000000, date: '2025-06-01', payment_mode: 'Bank Transfer', ref_no: 'TXN040',  notes: 'Booking' },
]

const MODES: PaymentMode[] = ['Bank Transfer', 'Cheque', 'Cash', 'NEFT/RTGS', 'Mobile Banking']

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function getClient(id: string)  { return CLIENTS.find(c => c.id === id) }
function getInvoice(id: string) { return INVOICES.find(i => i.id === id) }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  invoice_id:   z.string().min(1, 'Required'),
  amount:       z.coerce.number().min(1, 'Required'),
  date:         z.string().min(1, 'Required'),
  payment_mode: z.string().min(1, 'Required'),
  ref_no:       z.string().optional(),
  notes:        z.string().optional(),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Collection) => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { date: new Date().toISOString().split('T')[0], payment_mode: 'Bank Transfer' },
  })
  const selectedInvoice = watch('invoice_id')
  const inv = getInvoice(selectedInvoice)
  const client = inv ? getClient(inv.client_id) : null
  const balance = inv ? inv.total_amount - inv.paid_amount : 0

  return (
    <Modal open onClose={onClose} title="Record Collection" size="md">
      <form onSubmit={handleSubmit(d => {
        const seq = String(MOCK.length + 1).padStart(3, '0')
        onAdd({ id: `col${Date.now()}`, receipt_no: `REC-2025-${seq}`, ...d, client_id: inv?.client_id ?? '', payment_mode: d.payment_mode as PaymentMode, ref_no: d.ref_no ?? '', notes: d.notes ?? '' })
        onClose()
      })} className="space-y-4 p-1">
        <div>
          <label className={lbl}>Invoice</label>
          <select {...register('invoice_id')} className={inp}>
            <option value="">Select invoice</option>
            {INVOICES.map(i => {
              const c = getClient(i.client_id)
              return <option key={i.id} value={i.id}>{i.invoice_no} — {c?.name}</option>
            })}
          </select>
          {errors.invoice_id && <p className="text-xs text-red-600 mt-1">{errors.invoice_id.message}</p>}
        </div>
        {inv && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-800">
            {client?.name} · Total: {fmt(inv.total_amount)} · Paid: {fmt(inv.paid_amount)} · <span className="font-bold">Balance: {fmt(balance)}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Amount (৳)</label>
            <input type="number" {...register('amount')} className={inp} placeholder="0" />
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className={lbl}>Payment Mode</label>
            <select {...register('payment_mode')} className={inp}>
              {MODES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Date</label>
            <input type="date" {...register('date')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Reference / Cheque No.</label>
            <input {...register('ref_no')} className={inp} placeholder="TXN001 or CHQ1234" />
          </div>
        </div>
        <div>
          <label className={lbl}>Notes</label>
          <input {...register('notes')} className={inp} placeholder="Optional notes" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">Record & Generate Receipt</button>
        </div>
      </form>
    </Modal>
  )
}

const MODE_COLORS: Record<string, string> = {
  'Bank Transfer': 'bg-blue-100 text-blue-700',
  'Cheque':        'bg-purple-100 text-purple-700',
  'Cash':          'bg-green-100 text-green-700',
  'NEFT/RTGS':     'bg-indigo-100 text-indigo-700',
  'Mobile Banking':'bg-orange-100 text-orange-700',
}

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>(MOCK)
  const [showAdd, setShowAdd]          = useState(false)
  const [filterClient, setFC]          = useState('')

  const displayed = filterClient ? collections.filter(c => c.client_id === filterClient) : collections

  const totalCollected = collections.reduce((s, c) => s + c.amount, 0)
  const byMode = MODES.reduce((acc, m) => {
    acc[m] = collections.filter(c => c.payment_mode === m).reduce((s, c) => s + c.amount, 0)
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collections & Receipts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record payments received from clients and generate receipts</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Record Collection
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Collected</p><p className="text-xl font-bold text-green-600 mt-1">{fmt(totalCollected)}</p><p className="text-xs text-gray-400 mt-1">{collections.length} receipts</p></div>
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><Receipt className="w-5 h-5 text-green-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-3">By Payment Mode</p>
          <div className="space-y-1.5">
            {MODES.filter(m => byMode[m] > 0).map(m => (
              <div key={m} className="flex justify-between text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${MODE_COLORS[m]}`}>{m}</span>
                <span className="font-semibold text-gray-900">{fmt(byMode[m])}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-3">Top Clients</p>
          <div className="space-y-1.5">
            {CLIENTS.map(c => {
              const paid = collections.filter(col => col.client_id === c.id).reduce((s, col) => s + col.amount, 0)
              return paid > 0 ? (
                <div key={c.id} className="flex justify-between text-xs">
                  <span className="text-gray-600 truncate max-w-[120px]">{c.name}</span>
                  <span className="font-semibold text-gray-900">{fmt(paid)}</span>
                </div>
              ) : null
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <h3 className="font-semibold text-gray-900 flex-1">Receipt Register</h3>
          <select value={filterClient} onChange={e => setFC(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Clients</option>
            {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Receipt No.', 'Date', 'Client', 'Invoice', 'Amount', 'Payment Mode', 'Reference', 'Notes', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(col => {
              const inv = getInvoice(col.invoice_id)
              const client = getClient(col.client_id)
              return (
                <tr key={col.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-green-700 font-semibold">{col.receipt_no}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{col.date}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 text-xs">{client?.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{inv?.invoice_no}</td>
                  <td className="px-4 py-3 font-bold text-green-700">{fmt(col.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${MODE_COLORS[col.payment_mode] ?? 'bg-gray-100 text-gray-600'}`}>{col.payment_mode}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{col.ref_no || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{col.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <button className="text-gray-400 hover:text-blue-600 p-1" title="Download Receipt"><Download className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={c => setCollections(p => [c, ...p])} />}
    </div>
  )
}
