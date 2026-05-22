'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, DollarSign, TrendingUp, TrendingDown, AlertCircle, PieChart } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell,
} from 'recharts'

interface Budget {
  id: string; project: string; total_budget: number; actual_spent: number; committed: number
  status: 'on_track' | 'over_budget' | 'at_risk'; category: string
}

const MOCK_BUDGETS: Budget[] = [
  { id: 'b1', project: 'Skyline Tower',     total_budget: 5000000, actual_spent: 3200000, committed: 400000, status: 'on_track',   category: 'Residential' },
  { id: 'b2', project: 'Riverside Complex', total_budget: 8500000, actual_spent: 7100000, committed: 900000, status: 'over_budget', category: 'Commercial' },
  { id: 'b3', project: 'Metro Station',     total_budget: 12000000,actual_spent: 6800000, committed: 1200000,status: 'on_track',   category: 'Infrastructure' },
  { id: 'b4', project: 'Green Valley',      total_budget: 3500000, actual_spent: 3000000, committed: 450000, status: 'at_risk',    category: 'Residential' },
]

const CATEGORY_DATA = [
  { name: 'Labor',     value: 45, color: '#3b82f6' },
  { name: 'Materials', value: 35, color: '#10b981' },
  { name: 'Equipment', value: 5,  color: '#f59e0b' },
  { name: 'Overhead',  value: 15, color: '#8b5cf6' },
]

const MONTHLY_DATA = [
  { month: 'Aug', Budget: 2800000, Actual: 2600000 },
  { month: 'Sep', Budget: 3200000, Actual: 3100000 },
  { month: 'Oct', Budget: 3500000, Actual: 3800000 },
  { month: 'Nov', Budget: 4000000, Actual: 3900000 },
  { month: 'Dec', Budget: 4200000, Actual: 4100000 },
]

const STATUS_COLORS: Record<string, string> = {
  on_track:   'bg-green-100 text-green-700',
  over_budget:'bg-red-100 text-red-700',
  at_risk:    'bg-amber-100 text-amber-700',
}
const STATUS_LABELS: Record<string, string> = {
  on_track:   'On Track',
  over_budget:'Over Budget',
  at_risk:    'At Risk',
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  project:      z.string().min(1, 'Required'),
  category:     z.string().min(1, 'Required'),
  total_budget: z.coerce.number().min(1, 'Required'),
})
type Form = z.infer<typeof schema>

function AddBudgetModal({ onClose, onAdd }: { onClose: () => void; onAdd: (b: Budget) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) as any })
  return (
    <Modal open onClose={onClose} title="Add Budget" size="sm">
      <form onSubmit={handleSubmit(d => {
        onAdd({ id: `b${Date.now()}`, ...d, actual_spent: 0, committed: 0, status: 'on_track' })
        onClose()
      })} className="space-y-4 p-1">
        <div>
          <label className={lbl}>Project Name</label>
          <input {...register('project')} className={inp} placeholder="Project name" />
          {errors.project && <p className="text-xs text-red-600 mt-1">{errors.project.message}</p>}
        </div>
        <div>
          <label className={lbl}>Category</label>
          <select {...register('category')} className={inp}>
            <option value="">Select category</option>
            {['Residential', 'Commercial', 'Infrastructure', 'Industrial'].map(c => <option key={c}>{c}</option>)}
          </select>
          {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>}
        </div>
        <div>
          <label className={lbl}>Total Budget (৳)</label>
          <input type="number" {...register('total_budget')} className={inp} placeholder="5000000" />
          {errors.total_budget && <p className="text-xs text-red-600 mt-1">{errors.total_budget.message}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Budget</button>
        </div>
      </form>
    </Modal>
  )
}

export function FinancePage() {
  const [budgets, setBudgets] = useState<Budget[]>(MOCK_BUDGETS)
  const [showAdd, setShowAdd] = useState(false)
  const [tab, setTab]         = useState<'projects' | 'categories' | 'monthly'>('projects')

  const totalBudget  = budgets.reduce((s, b) => s + b.total_budget, 0)
  const totalSpent   = budgets.reduce((s, b) => s + b.actual_spent, 0)
  const totalVariance= totalBudget - totalSpent
  const budgetUsage  = Math.round((totalSpent / totalBudget) * 100)

  const fmt = (n: number) => `৳${(n / 1000000).toFixed(1)}M`

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Tracker</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor project budgets, spending and financial performance</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Budget
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Budget</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalBudget)}</p>
            <p className="text-xs text-gray-400 mt-1">All active projects</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-50">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Actual Spent</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalSpent)}</p>
            <p className="text-xs text-gray-400 mt-1">Expenses to date</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-amber-50">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Variance</p>
            <p className={`text-2xl font-bold mt-1 ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(Math.abs(totalVariance))}</p>
            <p className="text-xs text-gray-400 mt-1">{totalVariance >= 0 ? 'Under budget' : 'Over budget'}</p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${totalVariance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            {totalVariance >= 0 ? <TrendingDown className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Budget Usage</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{budgetUsage}%</p>
            <p className="text-xs text-gray-400 mt-1">Of total allocated</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-purple-50">
            <PieChart className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 border-b border-gray-200">
        {([
          { key: 'projects',   label: 'Project Budgets' },
          { key: 'categories', label: 'Category Breakdown' },
          { key: 'monthly',    label: 'Monthly Trends' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'projects' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {budgets.map(b => {
            const pct = Math.round((b.actual_spent / b.total_budget) * 100)
            const isOver = b.actual_spent > b.total_budget
            return (
              <div key={b.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{b.project}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{b.category}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[b.status]}`}>
                    {STATUS_LABELS[b.status]}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Spent: {fmt(b.actual_spent)} ({pct}%)</span>
                    <span>Budget: {fmt(b.total_budget)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs mb-3">
                  <div>
                    <span className="text-gray-400">Committed</span>
                    <p className="font-medium text-gray-700">{fmt(b.committed)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Remaining</span>
                    <p className={`font-medium ${b.total_budget - b.actual_spent - b.committed < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmt(Math.max(0, b.total_budget - b.actual_spent - b.committed))}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Variance</span>
                    <p className={`font-medium ${b.total_budget - b.actual_spent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {b.total_budget - b.actual_spent >= 0 ? '+' : ''}{fmt(b.total_budget - b.actual_spent)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium">View Details</button>
                  <button className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium">Cost Breakdown</button>
                  <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Update Budget</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'categories' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Cost Category Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RPieChart>
                <Pie data={CATEGORY_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                  {CATEGORY_DATA.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${v}%`} />
              </RPieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Category Breakdown</h3>
            <div className="space-y-4 mt-2">
              {CATEGORY_DATA.map(c => (
                <div key={c.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{c.name}</span>
                    <span className="font-semibold text-gray-900">{c.value}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.value}%`, backgroundColor: c.color }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(totalSpent * c.value / 100)} of total spend</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'monthly' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Budget vs Actual Spending</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={MONTHLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `৳${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => `৳${(v / 1000000).toFixed(2)}M`} />
              <Legend />
              <Bar dataKey="Budget" fill="#93c5fd" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Actual" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {showAdd && <AddBudgetModal onClose={() => setShowAdd(false)} onAdd={b => setBudgets(prev => [b, ...prev])} />}
    </div>
  )
}
