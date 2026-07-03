'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

interface ProjectRow { project: string; investment: number; cost: number; revenue: number }

export default function DashboardCharts({ data, collectionStats }: {
  data: ProjectRow[]
  collectionStats?: { collected: number; pending: number; overdue: number }
}) {
  const cs = collectionStats ?? { collected: 0, pending: 0, overdue: 0 }
  const total = cs.collected + cs.pending + cs.overdue || 1
  const pieData = [
    { name: 'Collected', value: Math.round(cs.collected / total * 100), color: 'rgb(var(--success))' },
    { name: 'Pending',   value: Math.round(cs.pending   / total * 100), color: 'rgb(var(--warning))' },
    { name: 'Overdue',   value: Math.round(cs.overdue   / total * 100), color: 'rgb(var(--danger))' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-surface rounded-xl border border-border-default p-5">
        <h3 className="font-semibold text-content mb-4">Estimated Cost · Revenue by Project</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
            <XAxis dataKey="project" tick={{ fontSize: 12, fill: 'rgb(var(--content-muted))' }} stroke="rgb(var(--border))" />
            <YAxis tickFormatter={v => `৳${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 11, fill: 'rgb(var(--content-muted))' }} stroke="rgb(var(--border))" />
            <Tooltip
              cursor={{ fill: 'rgb(var(--primary) / 0.06)' }}
              contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border))', borderRadius: 12, color: 'rgb(var(--content))' }}
              formatter={(v: unknown) => `৳${((v as number) / 100000).toFixed(1)}L`} />
            <Bar dataKey="cost"    name="Est. Cost"    fill="rgb(var(--info))"    radius={[3, 3, 0, 0]} />
            <Bar dataKey="revenue" name="Est. Revenue" fill="rgb(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface rounded-xl border border-border-default p-5">
        <h3 className="font-semibold text-content mb-4">Sales Collection Status</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
              dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
              {pieData.map((c, i) => <Cell key={i} fill={c.color} />)}
            </Pie>
            <Tooltip formatter={(v: unknown) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {pieData.map(c => (
            <div key={c.name} className="text-center">
              <p className="text-lg font-bold" style={{ color: c.color }}>{c.value}%</p>
              <p className="text-xs text-content-muted">{c.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
