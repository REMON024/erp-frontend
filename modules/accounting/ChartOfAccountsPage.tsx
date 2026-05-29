'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, BookOpen, ChevronRight } from 'lucide-react'

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export interface Account {
  id: string; code: string; name: string; type: AccountType
  parent_id: string; balance: number; description: string
}

export const ACCOUNTS: Account[] = [
  // Assets
  { id: 'a1',  code: '1000', name: 'Cash & Bank',            type: 'asset',    parent_id: '',   balance: 15200000, description: 'Cash on hand and bank accounts' },
  { id: 'a2',  code: '1100', name: 'Accounts Receivable',    type: 'asset',    parent_id: '',   balance: 22800000, description: 'Amount owed by clients' },
  { id: 'a3',  code: '1200', name: 'Material Inventory',     type: 'asset',    parent_id: '',   balance:  8400000, description: 'Value of materials in store' },
  { id: 'a4',  code: '1300', name: 'Work in Progress',       type: 'asset',    parent_id: '',   balance: 32000000, description: 'Cost incurred on ongoing projects' },
  { id: 'a5',  code: '1400', name: 'Land & Building',        type: 'asset',    parent_id: '',   balance: 45000000, description: 'Land and completed structures' },
  // Liabilities
  { id: 'l1',  code: '2000', name: 'Accounts Payable',       type: 'liability',parent_id: '',   balance:  6500000, description: 'Amount owed to vendors' },
  { id: 'l2',  code: '2100', name: 'Advance from Clients',   type: 'liability',parent_id: '',   balance: 12000000, description: 'Booking and advance payments' },
  { id: 'l3',  code: '2200', name: 'Short-term Loan',        type: 'liability',parent_id: '',   balance:  5000000, description: 'Bank overdraft and short-term borrowings' },
  // Equity
  { id: 'e1',  code: '3000', name: 'Share Capital',          type: 'equity',   parent_id: '',   balance: 68000000, description: 'Capital contributed by investors' },
  { id: 'e2',  code: '3100', name: 'Retained Earnings',      type: 'equity',   parent_id: '',   balance:  5500000, description: 'Accumulated profits' },
  // Revenue
  { id: 'r1',  code: '4000', name: 'Unit Sales Revenue',     type: 'revenue',  parent_id: '',   balance: 23500000, description: 'Revenue from housing unit sales' },
  { id: 'r2',  code: '4100', name: 'Other Income',           type: 'revenue',  parent_id: '',   balance:   800000, description: 'Interest and miscellaneous income' },
  // Expenses
  { id: 'x1',  code: '5000', name: 'Material Cost',          type: 'expense',  parent_id: '',   balance: 12800000, description: 'Cost of construction materials' },
  { id: 'x2',  code: '5100', name: 'Labor Cost',             type: 'expense',  parent_id: '',   balance:  7200000, description: 'Wages and labor charges' },
  { id: 'x3',  code: '5200', name: 'Contract Work',          type: 'expense',  parent_id: '',   balance:  4500000, description: 'Sub-contractor payments' },
  { id: 'x4',  code: '5300', name: 'Administrative Expense', type: 'expense',  parent_id: '',   balance:  1800000, description: 'Office and admin costs' },
  { id: 'x5',  code: '5400', name: 'Finance Charges',        type: 'expense',  parent_id: '',   balance:   650000, description: 'Bank interest and fees' },
]

const TYPE_COLORS: Record<AccountType, string> = {
  asset:     'bg-blue-100 text-blue-700',
  liability: 'bg-red-100 text-red-700',
  equity:    'bg-purple-100 text-purple-700',
  revenue:   'bg-green-100 text-green-700',
  expense:   'bg-orange-100 text-orange-700',
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  code:        z.string().min(1, 'Required'),
  name:        z.string().min(1, 'Required'),
  type:        z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  description: z.string().optional(),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (a: Account) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { type: 'expense' },
  })
  return (
    <Modal open onClose={onClose} title="Add Account" size="sm">
      <form onSubmit={handleSubmit(d => {
        onAdd({ id: `acc${Date.now()}`, ...d, parent_id: '', balance: 0, description: d.description ?? '' })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Account Code</label>
            <input {...register('code')} className={inp} placeholder="5500" />
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
          </div>
          <div>
            <label className={lbl}>Type</label>
            <select {...register('type')} className={inp}>
              {(['asset', 'liability', 'equity', 'revenue', 'expense'] as AccountType[]).map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={lbl}>Account Name</label>
          <input {...register('name')} className={inp} placeholder="Account name" />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className={lbl}>Description</label>
          <input {...register('description')} className={inp} placeholder="Optional description" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Account</button>
        </div>
      </form>
    </Modal>
  )
}

const TYPES: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense']

export function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>(ACCOUNTS)
  const [showAdd, setShowAdd]   = useState(false)
  const [filter, setFilter]     = useState<string>('')

  const displayed = filter ? accounts.filter(a => a.type === filter) : accounts

  const totalAssets      = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = accounts.filter(a => a.type === 'liability').reduce((s, a) => s + a.balance, 0)
  const totalEquity      = accounts.filter(a => a.type === 'equity').reduce((s, a) => s + a.balance, 0)

  const grouped = TYPES.reduce((acc, t) => {
    acc[t] = displayed.filter(a => a.type === t)
    return acc
  }, {} as Record<string, Account[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Account categories and current balances</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Assets</p><p className="text-xl font-bold text-blue-600 mt-1">{fmt(totalAssets)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><BookOpen className="w-5 h-5 text-blue-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Liabilities</p><p className="text-xl font-bold text-red-600 mt-1">{fmt(totalLiabilities)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><BookOpen className="w-5 h-5 text-red-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Equity</p><p className="text-xl font-bold text-purple-600 mt-1">{fmt(totalEquity)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><BookOpen className="w-5 h-5 text-purple-600" /></div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['', ...TYPES] as const).map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium capitalize ${filter === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {t === '' ? 'All' : t}
          </button>
        ))}
      </div>

      {/* Grouped account tables */}
      {TYPES.map(type => {
        const rows = grouped[type]
        if (!rows || rows.length === 0) return null
        const subtotal = rows.reduce((s, a) => s + a.balance, 0)
        return (
          <div key={type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${TYPE_COLORS[type]}`}>{type}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">{rows.length} accounts</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{fmt(subtotal)}</span>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  {['Code', 'Account Name', 'Description', 'Balance'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 font-medium">{a.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{a.description}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 text-right">{fmt(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )
      })}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={a => setAccounts(p => [...p, a])} />}
    </div>
  )
}
