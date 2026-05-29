'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLLECTION_STATUS = [
  { name: 'Collected', value: 68, color: '#10b981' },
  { name: 'Pending',   value: 22, color: '#f59e0b' },
  { name: 'Overdue',   value: 10, color: '#ef4444' },
]

interface ProjectRow { project: string; investment: number; cost: number; revenue: number }

export default function DashboardCharts({ data }: { data: ProjectRow[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Investment · Cost · Revenue by Project</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="project" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `৳${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: unknown) => `৳${((v as number) / 100000).toFixed(1)}L`} />
            <Legend />
            <Bar dataKey="investment" name="Investment" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="cost"       name="Cost"       fill="#f87171" radius={[3, 3, 0, 0]} />
            <Bar dataKey="revenue"    name="Revenue"    fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Sales Collection Status</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={COLLECTION_STATUS}
              cx="50%" cy="50%"
              innerRadius={55} outerRadius={85}
              dataKey="value"
              label={({ name, value }) => `${name} ${value}%`}
              labelLine={false}
            >
              {COLLECTION_STATUS.map((c, i) => <Cell key={i} fill={c.color} />)}
            </Pie>
            <Tooltip formatter={(v: unknown) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {COLLECTION_STATUS.map(c => (
            <div key={c.name} className="text-center">
              <p className="text-lg font-bold" style={{ color: c.color }}>{c.value}%</p>
              <p className="text-xs text-gray-500">{c.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
