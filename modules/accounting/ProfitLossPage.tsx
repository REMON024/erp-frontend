'use client'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'

const PROJECTS = [
  { id: 'p1', name: 'Block-A', fullName: 'Block-A — Mirpur 12' },
  { id: 'p2', name: 'Block-B', fullName: 'Block-B — Mohammadpur' },
  { id: 'p3', name: 'Block-C', fullName: 'Block-C — Uttara Sector 7' },
  { id: 'p4', name: 'Block-D', fullName: 'Block-D — Bashundhara' },
]

interface ProjectPL {
  project_id: string
  revenue:    number
  material_cost:  number
  labor_cost:     number
  contract_cost:  number
  admin_expense:  number
  finance_charge: number
}

const PL_DATA: ProjectPL[] = [
  { project_id: 'p1', revenue: 23500000, material_cost: 4200000, labor_cost: 3800000, contract_cost: 2200000, admin_expense: 800000, finance_charge: 300000 },
  { project_id: 'p2', revenue: 9600000,  material_cost: 2100000, labor_cost: 1800000, contract_cost: 1100000, admin_expense: 420000, finance_charge: 150000 },
  { project_id: 'p3', revenue: 8000000,  material_cost: 3800000, labor_cost: 2900000, contract_cost: 1800000, admin_expense: 580000, finance_charge: 200000 },
  { project_id: 'p4', revenue: 0,        material_cost:  950000, labor_cost:  400000, contract_cost:   350000, admin_expense: 120000, finance_charge:  50000 },
]

function totalCost(pl: ProjectPL) {
  return pl.material_cost + pl.labor_cost + pl.contract_cost + pl.admin_expense + pl.finance_charge
}
function grossProfit(pl: ProjectPL) { return pl.revenue - totalCost(pl) }

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function fmtShort(n: number) { return `৳${(n/100000).toFixed(1)}L` }

const CHART_DATA = PL_DATA.map(pl => ({
  name:     PROJECTS.find(p => p.id === pl.project_id)?.name,
  Revenue:  pl.revenue,
  Cost:     totalCost(pl),
  Profit:   Math.max(0, grossProfit(pl)),
  Loss:     Math.min(0, grossProfit(pl)),
}))

export function ProfitLossPage() {
  const [selectedProject, setProject] = useState<string>('all')

  const filteredPL = selectedProject === 'all' ? PL_DATA : PL_DATA.filter(p => p.project_id === selectedProject)

  const totalRevenue  = filteredPL.reduce((s, p) => s + p.revenue, 0)
  const totalMatCost  = filteredPL.reduce((s, p) => s + p.material_cost, 0)
  const totalLabCost  = filteredPL.reduce((s, p) => s + p.labor_cost, 0)
  const totalConCost  = filteredPL.reduce((s, p) => s + p.contract_cost, 0)
  const totalAdmExp   = filteredPL.reduce((s, p) => s + p.admin_expense, 0)
  const totalFinChg   = filteredPL.reduce((s, p) => s + p.finance_charge, 0)
  const grandCost     = totalMatCost + totalLabCost + totalConCost + totalAdmExp + totalFinChg
  const netProfit     = totalRevenue - grandCost
  const margin        = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">P&L Statement</h1>
        <p className="text-sm text-gray-500 mt-0.5">Profit & loss analysis by project</p>
      </div>

      {/* Project selector */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setProject('all')}
          className={`px-4 py-2 text-sm rounded-lg border font-medium ${selectedProject === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400 bg-white'}`}>
          All Projects
        </button>
        {PROJECTS.map(p => (
          <button key={p.id} onClick={() => setProject(p.id)}
            className={`px-4 py-2 text-sm rounded-lg border font-medium ${selectedProject === p.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400 bg-white'}`}>
            {p.name}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Revenue</p><p className="text-xl font-bold text-blue-600 mt-1">{fmt(totalRevenue)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Cost</p><p className="text-xl font-bold text-red-600 mt-1">{fmt(grandCost)}</p></div>
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-red-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Net Profit</p><p className={`text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(netProfit)}</p></div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <TrendingUp className={`w-5 h-5 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Profit Margin</p><p className={`text-xl font-bold mt-1 ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margin.toFixed(1)}%</p></div>
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-600" /></div>
        </div>
      </div>

      {/* Chart + per-project table side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue vs Cost vs Profit</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `৳${(v/100000).toFixed(0)}L`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => `৳${(v/100000).toFixed(1)}L`} />
              <Legend />
              <Bar dataKey="Revenue" fill="#3b82f6" radius={[3,3,0,0]} />
              <Bar dataKey="Cost"    fill="#f87171" radius={[3,3,0,0]} />
              <Bar dataKey="Profit"  fill="#10b981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Material Cost',   amount: totalMatCost,  color: 'bg-orange-500' },
              { label: 'Labor Cost',      amount: totalLabCost,  color: 'bg-red-500' },
              { label: 'Contract Work',   amount: totalConCost,  color: 'bg-purple-500' },
              { label: 'Admin Expense',   amount: totalAdmExp,   color: 'bg-gray-500' },
              { label: 'Finance Charges', amount: totalFinChg,   color: 'bg-yellow-500' },
            ].map(item => {
              const pct = grandCost > 0 ? (item.amount / grandCost) * 100 : 0
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{item.label}</span>
                    <span className="font-semibold text-gray-900">{fmtShort(item.amount)} · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Per-project P&L table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Detailed P&L by Project</h3>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Project', 'Revenue', 'Material', 'Labor', 'Contracts', 'Admin', 'Finance', 'Total Cost', 'Net Profit', 'Margin'].map(h => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Project' ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {PL_DATA.map(pl => {
              const cost   = totalCost(pl)
              const profit = grossProfit(pl)
              const marg   = pl.revenue > 0 ? (profit / pl.revenue) * 100 : null
              const proj   = PROJECTS.find(p => p.id === pl.project_id)
              return (
                <tr key={pl.project_id} className={`hover:bg-gray-50 ${pl.revenue === 0 ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900 text-xs">{proj?.fullName}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">{pl.revenue > 0 ? fmtShort(pl.revenue) : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600 text-xs">{fmtShort(pl.material_cost)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 text-xs">{fmtShort(pl.labor_cost)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 text-xs">{fmtShort(pl.contract_cost)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 text-xs">{fmtShort(pl.admin_expense)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 text-xs">{fmtShort(pl.finance_charge)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{fmtShort(cost)}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    {pl.revenue === 0
                      ? <span className="text-xs text-gray-400">In Progress</span>
                      : <span className={profit >= 0 ? 'text-green-700' : 'text-red-700'}>{fmtShort(profit)}</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    {marg !== null
                      ? <span className={`text-xs font-bold ${marg >= 0 ? 'text-green-700' : 'text-red-700'}`}>{marg.toFixed(1)}%</span>
                      : <span className="text-xs text-gray-400">—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td className="px-4 py-3 font-bold text-gray-700 uppercase text-xs">Total</td>
              <td className="px-4 py-3 text-right font-bold text-blue-700">{fmtShort(totalRevenue)}</td>
              <td className="px-4 py-3 text-right font-bold text-gray-600 text-xs">{fmtShort(totalMatCost)}</td>
              <td className="px-4 py-3 text-right font-bold text-gray-600 text-xs">{fmtShort(totalLabCost)}</td>
              <td className="px-4 py-3 text-right font-bold text-gray-600 text-xs">{fmtShort(totalConCost)}</td>
              <td className="px-4 py-3 text-right font-bold text-gray-600 text-xs">{fmtShort(totalAdmExp)}</td>
              <td className="px-4 py-3 text-right font-bold text-gray-600 text-xs">{fmtShort(totalFinChg)}</td>
              <td className="px-4 py-3 text-right font-bold text-red-700">{fmtShort(grandCost)}</td>
              <td className={`px-4 py-3 text-right font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtShort(netProfit)}</td>
              <td className={`px-4 py-3 text-right font-bold text-xs ${margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>{margin.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
      </div>
    </div>
  )
}
