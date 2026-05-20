'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import api from '@/lib/api'
import { Invoice, Expense } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ─── Constants ───────────────────────────────────────────────────────────────

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-100 text-blue-700',
  paid:      'bg-emerald-100 text-emerald-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const EXPENSE_CATEGORIES = ['Labour', 'Materials', 'Equipment', 'Subcontractor', 'Transport', 'Utilities', 'Safety', 'Miscellaneous']

// ─── Schemas ─────────────────────────────────────────────────────────────────

const invoiceSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  amount:     z.coerce.number().positive('Must be positive'),
  due_date:   z.string().min(1, 'Required'),
})
type InvoiceForm = z.infer<typeof invoiceSchema>

const expenseSchema = z.object({
  project_id:   z.string().min(1, 'Required'),
  category:     z.string().min(1, 'Required'),
  amount:       z.coerce.number().positive('Must be positive'),
  expense_date: z.string().min(1, 'Required'),
  description:  z.string().min(1, 'Required'),
})
type ExpenseForm = z.infer<typeof expenseSchema>

const paySchema = z.object({
  payment_date:   z.string().min(1, 'Required'),
  payment_method: z.enum(['bank_transfer', 'cheque', 'cash', 'online']),
})
type PayForm = z.infer<typeof paySchema>

// ─── Modals ──────────────────────────────────────────────────────────────────

function InvoiceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema) as any,
  })
  const mutation = useMutation({
    mutationFn: (d: unknown) => api.post('/invoices', d).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['finance-overview'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Create Invoice" size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
          <input {...register('project_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="p1" />
          {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (BDT)</label>
            <input type="number" {...register('amount')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" {...register('due_date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {errors.due_date && <p className="text-xs text-red-600 mt-1">{errors.due_date.message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
            {mutation.isPending ? 'Saving...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function PayModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm<PayForm>({
    resolver: zodResolver(paySchema) as any,
    defaultValues: { payment_date: new Date().toISOString().split('T')[0], payment_method: 'bank_transfer' },
  })
  const mutation = useMutation({
    mutationFn: (d: unknown) => api.post(`/invoices/${invoice.id}/pay`, d).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['finance-overview'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title={`Mark Paid — ${invoice.invoice_number}`} size="sm">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <p className="text-sm text-gray-600">Amount: <span className="font-semibold text-gray-900">{formatCurrency(invoice.amount)}</span></p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
          <input type="date" {...register('payment_date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <select {...register('payment_method')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="cash">Cash</option>
            <option value="online">Online Payment</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 font-medium">
            {mutation.isPending ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ExpenseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: { expense_date: new Date().toISOString().split('T')[0] },
  })
  const mutation = useMutation({
    mutationFn: (d: unknown) => api.post('/expenses', d).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['finance-overview'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Log Expense" size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
            <input {...register('project_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="p1" />
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select {...register('category')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select category</option>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (BDT)</label>
            <input type="number" {...register('amount')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" {...register('expense_date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {errors.expense_date && <p className="text-xs text-red-600 mt-1">{errors.expense_date.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input {...register('description')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Brief description..." />
          {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60 font-medium">
            {mutation.isPending ? 'Saving...' : 'Log Expense'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: overview } = useQuery({
    queryKey: ['finance-overview'],
    queryFn: () => api.get('/finance/overview').then((r) => r.data),
  })
  const { data: cashflow } = useQuery({
    queryKey: ['finance-cashflow'],
    queryFn: () => api.get('/finance/cashflow').then((r) => r.data),
  })
  const { data: profitability } = useQuery({
    queryKey: ['finance-profitability'],
    queryFn: () => api.get('/finance/profitability').then((r) => r.data),
  })

  const cfData = cashflow ?? []
  const profData = profitability ?? []

  const stats = [
    { label: 'Total Invoiced',   value: formatCurrency(overview?.totalInvoiced ?? 0), color: 'text-blue-600',    bg: 'bg-blue-50',    icon: '📄' },
    { label: 'Total Collected',  value: formatCurrency(overview?.totalPaid ?? 0),      color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✅' },
    { label: 'Total Expenses',   value: formatCurrency(overview?.totalExpenses ?? 0),  color: 'text-orange-600',  bg: 'bg-orange-50',  icon: '💸' },
    { label: 'Net Balance',      value: formatCurrency(overview?.balance ?? 0),        color: overview?.balance >= 0 ? 'text-emerald-700' : 'text-red-700', bg: 'bg-gray-50', icon: '💰' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-100`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{s.icon}</span>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
            <p className={`text-lg sm:text-xl font-bold ${s.color} break-all`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Cash flow chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Cash Flow (BDT)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={cfData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} width={40} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            <Legend />
            <Area type="monotone" dataKey="income"  name="Income"  stroke="#22c55e" fill="url(#income)"  strokeWidth={2} />
            <Area type="monotone" dataKey="expense" name="Expense" stroke="#f97316" fill="url(#expense)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Profitability table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Project Profitability</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Project', 'Budget', 'Spent', 'Invoiced', 'Margin'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profData.map((row: any) => (
                <tr key={row.project} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 text-xs sm:text-sm">{row.project}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(row.budget)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(row.spent)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(row.invoiced)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${row.margin >= 35 ? 'text-emerald-600' : row.margin >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                      {row.margin}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Invoices ────────────────────────────────────────────────────────────

function InvoicesTab() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [paying, setPaying] = useState<Invoice | null>(null)

  const { data } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () => {
      const p = new URLSearchParams()
      if (statusFilter) p.set('status', statusFilter)
      return api.get(`/invoices?${p}`).then((r) => r.data)
    },
  })

  const send = useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/send`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })

  const invoices: Invoice[] = data?.data ?? []
  const today = new Date()

  return (
    <div>
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100">
        <div className="flex gap-1 flex-wrap">
          {['', 'draft', 'sent', 'paid', 'overdue'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium self-start sm:self-auto">
          + New Invoice
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Invoice #', 'Project', 'Amount', 'Due Date', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv) => {
              const isOverdue = inv.status === 'overdue' || (inv.status === 'sent' && new Date(inv.due_date) < today)
              return (
                <tr key={inv.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.project_id}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(inv.due_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${INVOICE_STATUS_COLORS[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {inv.status === 'draft' && (
                        <button onClick={() => send.mutate(inv.id)} className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Send</button>
                      )}
                      {(inv.status === 'sent' || inv.status === 'overdue') && (
                        <button onClick={() => setPaying(inv)} className="text-xs px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Mark Paid</button>
                      )}
                      {(inv.status === 'draft') && (
                        <button onClick={() => del.mutate(inv.id)} className="text-xs px-2.5 py-1 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {invoices.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No invoices found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <InvoiceModal onClose={() => setShowCreate(false)} />}
      {paying && <PayModal invoice={paying} onClose={() => setPaying(null)} />}
    </div>
  )
}

// ─── Tab: Expenses ────────────────────────────────────────────────────────────

function ExpensesTab() {
  const qc = useQueryClient()
  const [category, setCategory] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const { data } = useQuery({
    queryKey: ['expenses', category],
    queryFn: () => {
      const p = new URLSearchParams()
      if (category) p.set('category', category)
      return api.get(`/expenses?${p}`).then((r) => r.data)
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const expenses: Expense[] = data?.data ?? []
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  // Expense breakdown for mini chart
  const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat,
    value: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.value > 0)

  return (
    <div>
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100">
        <div className="flex gap-1 flex-wrap">
          {['', ...EXPENSE_CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium ${category === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
              {c === '' ? 'All' : c}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium self-start sm:self-auto">
          + Log Expense
        </button>
      </div>

      {/* Category breakdown chart */}
      {byCategory.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Total: <span className="font-semibold text-gray-800">{formatCurrency(total)}</span></p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={byCategory} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="value" name="Amount" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date', 'Project', 'Category', 'Description', 'Amount', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(exp.expense_date)}</td>
                <td className="px-4 py-3 text-gray-600">{exp.project_id}</td>
                <td className="px-4 py-3">
                  <span className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded-full">{exp.category}</span>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs text-xs">{exp.description}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(exp.amount)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => del.mutate(exp.id)} className="text-gray-400 hover:text-red-600 text-lg leading-none">×</button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No expenses found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <ExpenseModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FinancePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'expenses'>('overview')

  const { data: invData } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get('/invoices').then((r) => r.data),
  })
  const overdueCount = (invData?.data ?? []).filter((i: Invoice) => i.status === 'overdue').length

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance</h1>
        <p className="text-sm text-gray-500 mt-1">Invoices, expenses, payments, and profitability</p>
      </div>

      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-500 text-xl">⚠</span>
          <p className="text-sm font-medium text-red-800">
            {overdueCount} invoice{overdueCount > 1 ? 's are' : ' is'} overdue — follow up with clients
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200 px-4 overflow-x-auto">
          {(['overview', 'invoices', 'expenses'] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap border-b-2 -mb-px ${activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
              {t === 'invoices' && overdueCount > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">{overdueCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="p-4 sm:p-6">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'invoices' && <InvoicesTab />}
          {activeTab === 'expenses' && <ExpensesTab />}
        </div>
      </div>
    </div>
  )
}
