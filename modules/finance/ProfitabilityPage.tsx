'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { TrendingUp, DollarSign, Percent, Award } from 'lucide-react'

interface ProjectProfit {
  id: string; project: string; category: string; revenue: number; cost: number
  profit: number; margin: number; status: string
}

const PROJECTS: ProjectProfit[] = [
  { id: 'p1', project: 'Skyline Tower',     category: 'Residential',    revenue: 8500000,  cost: 6200000,  profit: 2300000,  margin: 27.1, status: 'active' },
  { id: 'p2', project: 'Riverside Complex', category: 'Commercial',     revenue: 12000000, cost: 9800000,  profit: 2200000,  margin: 18.3, status: 'active' },
  { id: 'p3', project: 'Metro Station',     category: 'Infrastructure', revenue: 18000000, cost: 13500000, profit: 4500000,  margin: 25.0, status: 'active' },
  { id: 'p4', project: 'Green Valley',      category: 'Residential',    revenue: 5500000,  cost: 4800000,  profit: 700000,   margin: 12.7, status: 'at_risk' },
  { id: 'p5', project: 'Tech Park Alpha',   category: 'Commercial',     revenue: 9200000,  cost: 6900000,  profit: 2300000,  margin: 25.0, status: 'completed' },
]

const MONTHLY_TREND = [
  { month: 'Jul', Revenue: 9200000,  Cost: 7100000,  Profit: 2100000 },
  { month: 'Aug', Revenue: 10500000, Cost: 8200000,  Profit: 2300000 },
  { month: 'Sep', Revenue: 11200000, Cost: 8900000,  Profit: 2300000 },
  { month: 'Oct', Revenue: 12800000, Cost: 9600000,  Profit: 3200000 },
  { month: 'Nov', Revenue: 14100000, Cost: 10800000, Profit: 3300000 },
  { month: 'Dec', Revenue: 15200000, Cost: 11500000, Profit: 3700000 },
]

const fmt = (n: number) => `৳${(n / 1000000).toFixed(2)}M`

export function ProfitabilityPage() {
  const totalRevenue = PROJECTS.reduce((s, p) => s + p.revenue, 0)
  const totalCost    = PROJECTS.reduce((s, p) => s + p.cost, 0)
  const totalProfit  = PROJECTS.reduce((s, p) => s + p.profit, 0)
  const avgMargin    = (PROJECTS.reduce((s, p) => s + p.margin, 0) / PROJECTS.length).toFixed(1)
  const bestProject  = [...PROJECTS].sort((a, b) => b.margin - a.margin)[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profitability</h1>
        <p className="text-sm text-gray-500 mt-0.5">Project revenue, cost and profit margin analysis</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalRevenue)}</p>
            <p className="text-xs text-green-500 mt-1">+18% vs last quarter</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-green-50">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Profit</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalProfit)}</p>
            <p className="text-xs text-green-500 mt-1">+22% vs last quarter</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-50">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Avg Margin</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{avgMargin}%</p>
            <p className="text-xs text-gray-400 mt-1">Across all projects</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-purple-50">
            <Percent className="w-5 h-5 text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Best Margin</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{bestProject.margin}%</p>
            <p className="text-xs text-gray-400 mt-1">{bestProject.project}</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-amber-50">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue vs Cost by Project</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={PROJECTS} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tickFormatter={v => `৳${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="project" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[0, 3, 3, 0]} />
              <Bar dataKey="cost"    name="Cost"    fill="#f87171" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Profit Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={MONTHLY_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `৳${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Cost"    stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Profit"  stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project profitability table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Project Profitability Breakdown</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Project', 'Category', 'Revenue', 'Cost', 'Profit', 'Margin', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {PROJECTS.sort((a, b) => b.margin - a.margin).map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.project}</td>
                <td className="px-4 py-3 text-gray-500">{p.category}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{fmt(p.revenue)}</td>
                <td className="px-4 py-3 text-gray-700">{fmt(p.cost)}</td>
                <td className="px-4 py-3 font-semibold text-green-600">{fmt(p.profit)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.margin >= 20 ? 'bg-green-100 text-green-700' : p.margin >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {p.margin}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${p.status === 'completed' ? 'bg-gray-100 text-gray-600' : p.status === 'at_risk' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {p.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
