'use client'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { DashboardSummary, Material, Equipment } from '@/types'
import { formatCurrency, formatPercent, timeAgo } from '@/utils/format'
import { cn } from '@/utils/cn'
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from 'recharts'
import {
  FolderKanban, CheckSquare, TrendingUp, AlertTriangle,
  Package, Wrench, ArrowUpRight, ArrowDownRight, Clock,
} from 'lucide-react'

// ─── Data hooks ──────────────────────────────────────────────────────────────
const useDashboard = () =>
  useQuery<DashboardSummary>({ queryKey: ['dashboard'], queryFn: () => api.get('/dashboard/summary').then((r) => r.data) })

const useInventoryAlerts = () =>
  useQuery<{ data: Material[] }>({ queryKey: ['materials-alerts'], queryFn: () => api.get('/materials/alerts').then((r) => r.data) })

// ─── Shared components ────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string; trend?: 'up' | 'down'
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <div className="flex items-end gap-2 mt-0.5">
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {trend && (
            <span className={cn('flex items-center text-xs font-medium pb-0.5', trend === 'up' ? 'text-green-600' : 'text-red-500')}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            </span>
          )}
        </div>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {action}
    </div>
  )
}

// ─── Widget: Cash Flow Chart ──────────────────────────────────────────────────
function CashFlowChart({ data }: { data: DashboardSummary['cash_flow_monthly'] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <SectionHeader title="Cash Flow (Monthly)" />
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="inflow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="outflow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} width={35} />
          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
          <Legend iconType="circle" iconSize={8} />
          <Area type="monotone" dataKey="inflow"  stroke="#3b82f6" fill="url(#inflow)"  strokeWidth={2} name="Inflow" dot={false} />
          <Area type="monotone" dataKey="outflow" stroke="#ef4444" fill="url(#outflow)" strokeWidth={2} name="Outflow" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Widget: Contractor Performance ──────────────────────────────────────────
function ContractorPerformanceChart({ data }: { data: DashboardSummary['contractor_performance'] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <SectionHeader title="Contractor Performance" />
      <ResponsiveContainer width="100%" height={190}>
        <RadarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
          <PolarGrid />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
          <Radar name="Attendance" dataKey="attendance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
          <Radar name="Quality"    dataKey="quality"    stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
          <Radar name="Timeliness" dataKey="timeliness" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
          <Legend iconType="circle" iconSize={8} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Widget: Inventory Alerts ─────────────────────────────────────────────────
function InventoryAlertsWidget({ materials }: { materials: Material[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <SectionHeader
        title="Inventory Alerts"
        action={<span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{materials.length} items low</span>}
      />
      <ul className="space-y-2.5">
        {materials.map((m) => {
          const pct = Math.round((m.stock_quantity / m.reorder_level) * 100)
          return (
            <li key={m.id}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 truncate">{m.name}</span>
                <span className="text-slate-400 shrink-0 ml-2">{m.stock_quantity} {m.unit} / min {m.reorder_level}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full">
                <div className="h-1.5 bg-amber-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </li>
          )
        })}
        {materials.length === 0 && <p className="text-sm text-slate-400">All stock levels OK</p>}
      </ul>
    </div>
  )
}

// ─── Widget: Equipment Alerts ─────────────────────────────────────────────────
function EquipmentAlertsWidget() {
  const alerts = [
    { name: 'Excavator CAT 320',    code: 'EQ-003', issue: 'Hydraulic overhaul in progress' },
    { name: 'Concrete Pump CP-50',  code: 'EQ-006', issue: 'Pump seal replacement' },
  ]
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <SectionHeader
        title="Equipment Alerts"
        action={<span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{alerts.length} in maintenance</span>}
      />
      <ul className="space-y-3">
        {alerts.map((eq) => (
          <li key={eq.code} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
              <Wrench className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{eq.name}</p>
              <p className="text-xs text-slate-400">{eq.code} · {eq.issue}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Widget: Budget Overview ──────────────────────────────────────────────────
function BudgetOverviewWidget({ data }: { data: DashboardSummary }) {
  const budgetPct = Math.round((data.budget_utilized / data.budget_total) * 100)
  const projects = [
    { name: 'Skyline Tower',         pct: 45 },
    { name: 'Riverside Residences',  pct: 20 },
    { name: 'Metro Commercial Hub',  pct: 95 },
    { name: 'Green Valley Villas',   pct: 5 },
  ]
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <SectionHeader title="Budget Overview" />
      <div className="flex items-end gap-3 mb-4">
        <span className="text-3xl font-bold text-slate-900">{formatPercent(budgetPct)}</span>
        <span className="text-sm text-slate-400 pb-0.5">of {formatCurrency(data.budget_total)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full mb-4">
        <div className={cn('h-2 rounded-full transition-all', budgetPct > 85 ? 'bg-red-500' : 'bg-blue-500')} style={{ width: `${budgetPct}%` }} />
      </div>
      <div className="space-y-2.5">
        {projects.map((p) => (
          <div key={p.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 truncate">{p.name}</span>
              <span className="font-medium text-slate-700 ml-2">{p.pct}%</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full">
              <div className={cn('h-1 rounded-full', p.pct > 90 ? 'bg-red-400' : 'bg-blue-400')} style={{ width: `${p.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Widget: Recent Activity ──────────────────────────────────────────────────
function RecentActivityWidget({ activities }: { activities: DashboardSummary['recent_activities'] }) {
  const MODULE_COLORS: Record<string, string> = {
    Procurement: 'bg-purple-400',
    Tasks:       'bg-blue-400',
    Inventory:   'bg-amber-400',
    Finance:     'bg-green-400',
    Projects:    'bg-cyan-400',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <SectionHeader title="Recent Activity" />
      <ul className="space-y-3">
        {activities.map((a) => (
          <li key={a.id} className="flex gap-3">
            <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', MODULE_COLORS[a.module] ?? 'bg-slate-400')} />
            <div className="min-w-0">
              <p className="text-sm text-slate-700 leading-snug">{a.action}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-slate-300" />
                <p className="text-xs text-slate-400">{a.user} · {timeAgo(a.time)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Pending Tasks Widget ─────────────────────────────────────────────────────
function PendingTasksWidget({ pending, overdue }: { pending: number; overdue: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <SectionHeader title="Task Status" />
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
          <p className="text-xs text-amber-700 mt-0.5">Pending</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{overdue}</p>
          <p className="text-xs text-red-700 mt-0.5">Overdue</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        <span>{overdue} task{overdue !== 1 ? 's' : ''} past due date and unresolved</span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const { data: alertData } = useInventoryAlerts()

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-60 bg-slate-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const budgetPct = Math.round((data.budget_utilized / data.budget_total) * 100)
  const inventoryAlerts = alertData?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of all active operations</p>
      </div>

      {/* Row 1 — stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Projects" value={`${data.active_projects} / ${data.total_projects}`} sub="projects running" icon={FolderKanban} color="bg-blue-500" trend="up" />
        <StatCard label="Pending Tasks" value={data.pending_tasks} sub={`${data.overdue_tasks} overdue`} icon={CheckSquare} color="bg-amber-500" />
        <StatCard label="Budget Utilized" value={formatPercent(budgetPct)} sub={formatCurrency(data.budget_utilized)} icon={TrendingUp} color={budgetPct > 85 ? 'bg-red-500' : 'bg-green-500'} />
        <StatCard label="Open Alerts" value={inventoryAlerts.length + data.equipment_alerts} sub={`${inventoryAlerts.length} inventory · ${data.equipment_alerts} equipment`} icon={AlertTriangle} color="bg-red-500" />
      </div>

      {/* Row 2 — charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashFlowChart data={data.cash_flow_monthly} />
        <ContractorPerformanceChart data={data.contractor_performance} />
      </div>

      {/* Row 3 — alerts + budget */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <InventoryAlertsWidget materials={inventoryAlerts} />
        <EquipmentAlertsWidget />
        <BudgetOverviewWidget data={data} />
      </div>

      {/* Row 4 — activity + tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityWidget activities={data.recent_activities} />
        <PendingTasksWidget pending={data.pending_tasks} overdue={data.overdue_tasks} />
      </div>
    </div>
  )
}
