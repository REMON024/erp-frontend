'use client'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { DashboardSummary, Material, Project } from '@/types'
import { formatCurrency } from '@/utils/format'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Building2, DollarSign, TrendingUp, Users, Package, AlertTriangle } from 'lucide-react'

const useDashboard = () =>
  useQuery<DashboardSummary>({ queryKey: ['dashboard'], queryFn: () => api.get('/dashboard/summary').then(r => r.data) })

const useProjects = () =>
  useQuery<{ data: Project[] }>({ queryKey: ['projects-list'], queryFn: () => api.get('/projects').then(r => r.data) })

const useInventoryAlerts = () =>
  useQuery<{ data: Material[] }>({ queryKey: ['materials-alerts'], queryFn: () => api.get('/materials/alerts').then(r => r.data) })

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, iconBg, iconColor }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; iconBg: string; iconColor: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  )
}

// ── Cost Breakdown Pie ────────────────────────────────────────────────────────
const COST_DATA = [
  { name: 'Labor',     value: 45, color: '#3b82f6' },
  { name: 'Materials', value: 35, color: '#60a5fa' },
  { name: 'Equipment', value: 5,  color: '#f59e0b' },
  { name: 'Overhead',  value: 15, color: '#1e293b' },
]

function CostBreakdown() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-1">Cost Breakdown</h3>
      <p className="text-xs text-gray-400 mb-4">Distribution of project costs by category</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={COST_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
            {COST_DATA.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend iconType="square" iconSize={10} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Material Usage & Wastage Bar ──────────────────────────────────────────────
const WASTAGE_DATA = [
  { material: 'Cement', used: 1200, wasted: 80 },
  { material: 'Steel',  used: 1800, wasted: 120 },
  { material: 'Bricks', used: 5800, wasted: 300 },
  { material: 'Sand',   used: 900,  wasted: 60 },
  { material: 'Gravel', used: 700,  wasted: 40 },
]

function WastageChart() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-1">Material Usage & Wastage</h3>
      <p className="text-xs text-gray-400 mb-4">Comparison of material usage vs wastage across projects</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={WASTAGE_DATA} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="material" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend iconType="square" iconSize={10} />
          <Bar dataKey="used"   name="Used (tons)"   fill="#3b82f6" radius={[3,3,0,0]} />
          <Bar dataKey="wasted" name="Wasted (tons)" fill="#ef4444" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Active Projects List ──────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  active:      'bg-green-100 text-green-700',
  planning:    'bg-blue-100 text-blue-700',
  on_hold:     'bg-amber-100 text-amber-700',
  completed:   'bg-gray-100 text-gray-600',
  cancelled:   'bg-red-100 text-red-700',
}

function ActiveProjects({ projects }: { projects: Project[] }) {
  const active = projects.filter(p => p.status === 'active').slice(0, 5)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">Active Projects</h3>
        <p className="text-xs text-gray-400">Overview of ongoing construction projects</p>
      </div>
      <div className="space-y-3">
        {active.map(p => {
          const pct = Math.round(((p.budget_spent ?? 0) / (p.budget_total ?? 1)) * 100) || 0
          return (
            <div key={p.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize shrink-0 ${STATUS_COLORS[p.status]}`}>
                    {p.status === 'active' ? 'In Progress' : p.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  📍 {p.location} &nbsp;·&nbsp; 📅 {p.end_date?.slice(0, 7) ?? '—'}
                </p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="font-semibold text-gray-900 text-sm">{formatCurrency(p.budget_total ?? p.budget)}</p>
                <p className="text-xs text-gray-400">{pct}% budget used</p>
              </div>
            </div>
          )
        })}
        {active.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No active projects</p>}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const { data: projectsData } = useProjects()
  const { data: alertData } = useInventoryAlerts()

  const projects: Project[] = projectsData?.data ?? []
  const alerts: Material[] = alertData?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({length: 6}).map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const budgetPct = Math.round((data.budget_utilized / data.budget_total) * 100) || 0
  const activeCount = projects.filter(p => p.status === 'active').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here's what's happening with your projects today.</p>
      </div>

      {/* 6 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Active Projects"    value={activeCount}           sub="+2 from last month"     icon={Building2}     iconBg="bg-blue-50"   iconColor="text-blue-500" />
        <KPICard label="Budget Utilization" value={`${budgetPct}%`}       sub="+5.2% this quarter"     icon={DollarSign}    iconBg="bg-green-50"  iconColor="text-green-500" />
        <KPICard label="Project Progress"   value="64.2%"                 sub="On track"               icon={TrendingUp}    iconBg="bg-purple-50" iconColor="text-purple-500" />
        <KPICard label="Labor Attendance"   value="94.8%"                 sub="+1.2% vs average"       icon={Users}         iconBg="bg-orange-50" iconColor="text-orange-500" />
        <KPICard label="Material Stock"     value={`${87 - alerts.length}%`} sub={`${alerts.length} items low stock`} icon={Package} iconBg="bg-cyan-50" iconColor="text-cyan-500" />
        <KPICard label="Safety Incidents"   value={data.equipment_alerts ?? 2} sub="-50% this month"   icon={AlertTriangle} iconBg="bg-red-50"    iconColor="text-red-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostBreakdown />
        <WastageChart />
      </div>

      {/* Active Projects */}
      <ActiveProjects projects={projects} />
    </div>
  )
}
