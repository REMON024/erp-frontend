'use client'
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { AlertTriangle, TrendingDown, Package, DollarSign } from 'lucide-react'

interface WastageRecord {
  id: string; material: string; project: string; ordered: number; used: number
  wasted: number; unit: string; waste_pct: number; cost_per_unit: number; waste_cost: number
  reason: string; date: string
}

const MOCK: WastageRecord[] = [
  { id: 'w1', material: 'Cement',    project: 'Skyline Tower',    ordered: 500,  used: 460,  wasted: 40,   unit: 'Bags',   waste_pct: 8.0,  cost_per_unit: 380,  waste_cost: 15200,  reason: 'Excess mixing',       date: '2025-11-10' },
  { id: 'w2', material: 'Steel',     project: 'Riverside Complex',ordered: 120,  used: 108,  wasted: 12,   unit: 'Tons',   waste_pct: 10.0, cost_per_unit: 58000,waste_cost: 696000, reason: 'Cutting waste',       date: '2025-11-12' },
  { id: 'w3', material: 'Sand',      project: 'Skyline Tower',    ordered: 200,  used: 195,  wasted: 5,    unit: 'Tons',   waste_pct: 2.5,  cost_per_unit: 1200, waste_cost: 6000,   reason: 'Spillage',            date: '2025-11-15' },
  { id: 'w4', material: 'Bricks',    project: 'Metro Station',    ordered: 10000,used: 9200, wasted: 800,  unit: 'Pieces', waste_pct: 8.0,  cost_per_unit: 8,    waste_cost: 6400,   reason: 'Breakage during transit',date: '2025-11-18' },
  { id: 'w5', material: 'Paint',     project: 'Riverside Complex',ordered: 300,  used: 270,  wasted: 30,   unit: 'Liters', waste_pct: 10.0, cost_per_unit: 250,  waste_cost: 7500,   reason: 'Over-application',    date: '2025-11-20' },
  { id: 'w6', material: 'Gravel',    project: 'Skyline Tower',    ordered: 80,   used: 77,   wasted: 3,    unit: 'Tons',   waste_pct: 3.75, cost_per_unit: 900,  waste_cost: 2700,   reason: 'Overordering',        date: '2025-11-22' },
]

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4']

const chartData = MOCK.map(w => ({
  material: w.material,
  Used: w.used,
  Wasted: w.wasted,
}))

const pieData = MOCK.map(w => ({ name: w.material, value: w.waste_cost }))

export function WastageAnalysisPage() {
  const [view, setView] = useState<'table' | 'chart'>('table')

  const totalWasteCost  = MOCK.reduce((s, w) => s + w.waste_cost, 0)
  const avgWastePct     = (MOCK.reduce((s, w) => s + w.waste_pct, 0) / MOCK.length).toFixed(1)
  const highWaste       = MOCK.filter(w => w.waste_pct >= 8).length
  const topMaterial     = MOCK.reduce((a, b) => a.waste_cost > b.waste_cost ? a : b).material

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wastage Analysis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track material wastage and identify cost reduction opportunities</p>
        </div>
        <div className="flex gap-2">
          {(['table', 'chart'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 text-sm rounded-lg font-medium border ${view === v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {v === 'table' ? 'Table View' : 'Chart View'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Waste Cost</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">৳{(totalWasteCost / 1000).toFixed(0)}K</p>
            <p className="text-xs text-gray-400 mt-1">This month</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-red-50">
            <DollarSign className="w-5 h-5 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Avg Wastage Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{avgWastePct}%</p>
            <p className="text-xs text-gray-400 mt-1">Across all materials</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-amber-50">
            <TrendingDown className="w-5 h-5 text-amber-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">High Waste Materials</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{highWaste}</p>
            <p className="text-xs text-gray-400 mt-1">Above 8% threshold</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-orange-50">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Top Waste Material</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{topMaterial}</p>
            <p className="text-xs text-gray-400 mt-1">Highest cost impact</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-50">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      {view === 'chart' ? (
        <div className="grid grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Usage vs Wastage by Material</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="material" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Used"   fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Wasted" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Waste Cost Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                  dataKey="value" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `৳${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Material', 'Project', 'Ordered', 'Used', 'Wasted', 'Waste %', 'Waste Cost (৳)', 'Reason', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK.map(w => (
                <tr key={w.id} className={`hover:bg-gray-50 ${w.waste_pct >= 8 ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{w.material}</td>
                  <td className="px-4 py-3 text-gray-600">{w.project}</td>
                  <td className="px-4 py-3 text-gray-700">{w.ordered} {w.unit}</td>
                  <td className="px-4 py-3 text-gray-700">{w.used} {w.unit}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{w.wasted} {w.unit}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${w.waste_pct >= 8 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {w.waste_pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">৳{w.waste_cost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{w.reason}</td>
                  <td className="px-4 py-3 text-gray-500">{w.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* High waste alert */}
      {highWaste > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-800 font-medium">
            {highWaste} material(s) have wastage above 8% threshold — review procurement and site handling practices to reduce costs.
          </p>
        </div>
      )}
    </div>
  )
}
