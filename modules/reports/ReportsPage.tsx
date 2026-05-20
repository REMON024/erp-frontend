'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts'
import api from '@/lib/api'
import { formatCurrency, formatNumber, formatDate } from '@/utils/format'

// ─── Report types ─────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  { id: 'financial',       label: 'Financial',          icon: '💰', description: 'Revenue, expenses, and cash flow by period' },
  { id: 'projects',        label: 'Project Progress',   icon: '📊', description: 'Budget variance and milestone completion' },
  { id: 'inventory',       label: 'Inventory',          icon: '📦', description: 'Stock levels, movements, and reorder alerts' },
  { id: 'equipment',       label: 'Equipment',          icon: '🏗️', description: 'Utilization rates and maintenance costs' },
  { id: 'contractors',     label: 'Contractors',        icon: '👷', description: 'Attendance, performance, and payment records' },
  { id: 'budget-variance', label: 'Budget Variance',    icon: '📉', description: 'Planned vs actual spend per category' },
]

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#eab308', '#14b8a6', '#ec4899']

// ─── Mock report data generators ─────────────────────────────────────────────

function useReportData(type: string, projectId: string, dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['report', type, projectId, dateFrom, dateTo],
    queryFn: () => {
      // All data generated from fixtures via MSW aggregation endpoints
      switch (type) {
        case 'financial':
          return api.get('/finance/cashflow').then((r) => ({ chart: r.data, type }))
        case 'projects':
          return api.get('/finance/profitability').then((r) => ({ rows: r.data, type }))
        case 'inventory':
          return api.get('/materials').then((r) => ({ rows: r.data?.data ?? [], type }))
        case 'equipment':
          return api.get('/equipment').then((r) => ({ rows: r.data?.data ?? [], type }))
        case 'contractors':
          return api.get('/contractors').then((r) => ({ rows: r.data?.data ?? [], type }))
        case 'budget-variance':
          return api.get('/finance/profitability').then((r) => ({ rows: r.data, type }))
        default:
          return Promise.resolve({ type })
      }
    },
    enabled: !!type,
  })
}

// ─── Report renderers ─────────────────────────────────────────────────────────

function FinancialReport({ data }: { data: any[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {['Total Income', 'Total Expense', 'Net Profit'].map((label, i) => {
          const income = data.reduce((s: number, r: any) => s + r.income, 0)
          const expense = data.reduce((s: number, r: any) => s + r.expense, 0)
          const values = [income, expense, income - expense]
          const colors = ['text-emerald-600', 'text-orange-600', values[2] >= 0 ? 'text-blue-600' : 'text-red-600']
          return (
            <div key={label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-lg font-bold mt-1 ${colors[i]}`}>{formatCurrency(values[i])}</p>
            </div>
          )
        })}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} width={42} />
          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
          <Legend />
          <Bar dataKey="income"  name="Income"  fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ProjectsReport({ data }: { data: any[] }) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Project', 'Budget', 'Spent', 'Remaining', 'Invoiced', 'Margin', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => {
              const remaining = row.budget - row.spent
              const pct = Math.round((row.spent / row.budget) * 100)
              return (
                <tr key={row.project} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 text-xs">{row.project}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(row.budget)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(row.spent)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(remaining)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(row.invoiced)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${row.margin >= 35 ? 'text-emerald-600' : 'text-amber-600'}`}>{row.margin}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InventoryReport({ data }: { data: any[] }) {
  const categories = [...new Set(data.map((d: any) => d.category).filter(Boolean))]
  const catData = categories.map((cat) => ({
    name: cat,
    count: data.filter((d: any) => d.category === cat).length,
    low: data.filter((d: any) => d.category === cat && d.stock_quantity < d.reorder_level).length,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Total Materials</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{data.length}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-xs text-gray-500">Low Stock Items</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{data.filter((d: any) => d.stock_quantity < d.reorder_level).length}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-xs text-gray-500">Healthy Stock</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{data.filter((d: any) => d.stock_quantity >= d.reorder_level).length}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Stock by Category</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={catData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                {catData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Low Stock by Category</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip />
              <Bar dataKey="low" name="Low Stock" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function EquipmentReport({ data }: { data: any[] }) {
  const statusCounts = ['available', 'allocated', 'maintenance', 'retired'].map((s) => ({
    name: s, value: data.filter((e: any) => e.status === s).length,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statusCounts.map((s, i) => (
          <div key={s.name} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 capitalize">{s.name}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: PIE_COLORS[i] }}>{s.value}</p>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={statusCounts.filter((s) => s.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
            {statusCounts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Code', 'Category', 'Status', 'Allocated To'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((eq: any) => (
              <tr key={eq.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 text-sm">{eq.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs font-mono">{eq.code}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{eq.category}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    eq.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                    eq.status === 'allocated' ? 'bg-blue-100 text-blue-700' :
                    eq.status === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>{eq.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{eq.allocated_project_id ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ContractorsReport({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Contractor', 'Specialty', 'Rating', 'Projects', 'Status'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((c: any) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{c.company_name}</td>
              <td className="px-4 py-3 text-gray-600 text-xs">{c.specialty}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {'★'.repeat(Math.round(c.rating ?? 0))}{'☆'.repeat(5 - Math.round(c.rating ?? 0))}
                  <span className="text-xs text-gray-500 ml-1">{c.rating?.toFixed(1)}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600 text-xs">{c.active_projects ?? 0}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BudgetVarianceReport({ data }: { data: any[] }) {
  const chartData = data.map((row: any) => ({
    name: row.project.split(' (')[0],
    budget: row.budget,
    actual: row.spent,
    variance: row.budget - row.spent,
  }))

  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 11 }} width={42} />
          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
          <Legend />
          <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="actual" name="Actual Spend" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Project', 'Budget', 'Actual', 'Variance', 'Utilization'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {chartData.map((row) => {
              const utilPct = Math.round((row.actual / row.budget) * 100)
              return (
                <tr key={row.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 text-xs">{row.name}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(row.budget)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(row.actual)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${row.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {row.variance >= 0 ? '+' : ''}{formatCurrency(row.variance)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${utilPct > 90 ? 'bg-red-500' : utilPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(utilPct, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{utilPct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [selectedType, setSelectedType] = useState<string>('')
  const [projectId, setProjectId]       = useState('')
  const [dateFrom, setDateFrom]         = useState('2025-01-01')
  const [dateTo, setDateTo]             = useState('2025-12-31')
  const [generated, setGenerated]       = useState(false)

  const { data, isFetching } = useReportData(
    generated ? selectedType : '',
    projectId, dateFrom, dateTo
  )

  function handleGenerate() {
    if (!selectedType) return
    setGenerated(true)
  }

  function handleExport() {
    const label = REPORT_TYPES.find((r) => r.id === selectedType)?.label ?? 'Report'
    const blob = new Blob([`${label} — Mock export (${dateFrom} to ${dateTo})\n\nReal CSV export will be available in Phase 2 backend integration.`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${label.replace(/\s+/g, '_')}_${dateFrom}.txt`
    a.click(); URL.revokeObjectURL(url)
  }

  function renderReport() {
    if (!data) return null
    const d = data as any
    switch (d.type) {
      case 'financial':       return <FinancialReport data={d.chart ?? []} />
      case 'projects':        return <ProjectsReport data={d.rows ?? []} />
      case 'inventory':       return <InventoryReport data={d.rows ?? []} />
      case 'equipment':       return <EquipmentReport data={d.rows ?? []} />
      case 'contractors':     return <ContractorsReport data={d.rows ?? []} />
      case 'budget-variance': return <BudgetVarianceReport data={d.rows ?? []} />
      default: return null
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Generate and export reports across all modules</p>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.id}
            onClick={() => { setSelectedType(rt.id); setGenerated(false) }}
            className={`text-left p-4 rounded-xl border transition-all ${
              selectedType === rt.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            <span className="text-2xl block mb-2">{rt.icon}</span>
            <p className="font-semibold text-gray-900 text-sm">{rt.label}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{rt.description}</p>
          </button>
        ))}
      </div>

      {/* Filters bar */}
      {selectedType && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setGenerated(false) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setGenerated(false) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project (optional)</label>
            <input value={projectId} onChange={(e) => { setProjectId(e.target.value); setGenerated(false) }}
              placeholder="p1, p2…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32" />
          </div>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <button onClick={handleGenerate} disabled={isFetching}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
              {isFetching ? 'Generating…' : 'Generate'}
            </button>
            {generated && data && (
              <button onClick={handleExport}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                Export CSV
              </button>
            )}
          </div>
        </div>
      )}

      {/* Report output */}
      {generated && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="font-semibold text-gray-900">
                {REPORT_TYPES.find((r) => r.id === selectedType)?.label} Report
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{dateFrom} — {dateTo}</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">Generated</span>
          </div>
          <div className="p-4 sm:p-6">
            {isFetching ? (
              <div className="py-16 text-center text-gray-400">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p>Generating report…</p>
              </div>
            ) : renderReport()}
          </div>
        </div>
      )}

      {!selectedType && (
        <div className="py-12 text-center text-gray-400">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-sm">Select a report type above to get started</p>
        </div>
      )}
    </div>
  )
}
