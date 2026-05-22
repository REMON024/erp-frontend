'use client'
import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const MONTHLY = [
  { month: 'Jun', Inflow: 4200000, Outflow: 3800000, Net: 400000 },
  { month: 'Jul', Inflow: 5100000, Outflow: 4600000, Net: 500000 },
  { month: 'Aug', Inflow: 4800000, Outflow: 5200000, Net: -400000 },
  { month: 'Sep', Inflow: 6200000, Outflow: 5400000, Net: 800000 },
  { month: 'Oct', Inflow: 5900000, Outflow: 6100000, Net: -200000 },
  { month: 'Nov', Inflow: 7100000, Outflow: 6200000, Net: 900000 },
  { month: 'Dec', Inflow: 6800000, Outflow: 5900000, Net: 900000 },
]

interface Transaction {
  id: string; type: 'inflow' | 'outflow'; description: string
  amount: number; date: string; category: string; project: string
}

const TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'inflow',  description: 'Client Payment — Skyline Tower Phase 2',  amount: 2500000, date: '2025-11-28', category: 'Client Payment',   project: 'Skyline Tower' },
  { id: 't2', type: 'outflow', description: 'Contractor Payment — Aman Asati',           amount: 850000,  date: '2025-11-27', category: 'Contractor',      project: 'Metro Station' },
  { id: 't3', type: 'inflow',  description: 'Advance Receipt — Green Valley',            amount: 1200000, date: '2025-11-25', category: 'Client Payment',   project: 'Green Valley' },
  { id: 't4', type: 'outflow', description: 'Material Purchase — Bharat Steel Corp',    amount: 620000,  date: '2025-11-24', category: 'Materials',       project: 'Riverside Complex' },
  { id: 't5', type: 'outflow', description: 'Equipment Rental — JCB Excavators',        amount: 180000,  date: '2025-11-22', category: 'Equipment',       project: 'Metro Station' },
  { id: 't6', type: 'inflow',  description: 'Milestone Billing — Riverside Complex',    amount: 3100000, date: '2025-11-20', category: 'Milestone',       project: 'Riverside Complex' },
  { id: 't7', type: 'outflow', description: 'Labour Wages — Week 47',                   amount: 420000,  date: '2025-11-18', category: 'Labour',          project: 'Skyline Tower' },
]

const fmt = (n: number) => `৳${(n / 1000000).toFixed(2)}M`

export function CashFlowPage() {
  const [filter, setFilter] = useState<'all' | 'inflow' | 'outflow'>('all')

  const totalInflow  = MONTHLY.reduce((s, m) => s + m.Inflow, 0)
  const totalOutflow = MONTHLY.reduce((s, m) => s + m.Outflow, 0)
  const netFlow      = totalInflow - totalOutflow
  const lastMonth    = MONTHLY[MONTHLY.length - 1]

  const displayed = filter === 'all' ? TRANSACTIONS : TRANSACTIONS.filter(t => t.type === filter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cash Flow</h1>
        <p className="text-sm text-gray-500 mt-0.5">Monitor cash inflows, outflows and net position</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Inflow</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalInflow)}</p>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />+12% vs last period</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-green-50">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Outflow</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalOutflow)}</p>
            <p className="text-xs text-red-500 mt-1 flex items-center gap-0.5"><ArrowDownRight className="w-3 h-3" />+8% vs last period</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-red-50">
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Net Cash Flow</p>
            <p className={`text-2xl font-bold mt-1 ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(Math.abs(netFlow))}</p>
            <p className="text-xs text-gray-400 mt-1">{netFlow >= 0 ? 'Positive' : 'Negative'} flow</p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${netFlow >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
            <DollarSign className={`w-5 h-5 ${netFlow >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">This Month Net</p>
            <p className={`text-2xl font-bold mt-1 ${lastMonth.Net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {lastMonth.Net >= 0 ? '+' : ''}{fmt(lastMonth.Net)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Dec 2025</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-purple-50">
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Area Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Cash Flow Trend (6 Months)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={MONTHLY}>
            <defs>
              <linearGradient id="inflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `৳${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => fmt(v)} />
            <Legend />
            <Area type="monotone" dataKey="Inflow"  stroke="#10b981" fill="url(#inflow)"  strokeWidth={2} />
            <Area type="monotone" dataKey="Outflow" stroke="#ef4444" fill="url(#outflow)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Net Flow Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Net Cash Flow by Month</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={MONTHLY}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `৳${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => fmt(v)} />
            <Bar dataKey="Net" radius={[4, 4, 0, 0]}
              fill="#3b82f6"
              label={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
            <p className="text-xs text-gray-400">All cash movements</p>
          </div>
          <div className="flex gap-2">
            {(['all', 'inflow', 'outflow'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-full border font-medium ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {displayed.map(t => (
            <div key={t.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.type === 'inflow' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {t.type === 'inflow'
                    ? <ArrowUpRight className="w-4 h-4 text-green-600" />
                    : <ArrowDownRight className="w-4 h-4 text-red-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.description}</p>
                  <p className="text-xs text-gray-400">{t.category} · {t.project} · {t.date}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${t.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                {t.type === 'inflow' ? '+' : '-'}{fmt(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
