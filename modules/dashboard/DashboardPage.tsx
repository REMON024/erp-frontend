'use client'
import dynamic from 'next/dynamic'
import { FolderKanban, TrendingUp, ShoppingCart, Package, Receipt, PieChart as PieIcon } from 'lucide-react'

// Lazy — recharts is heavy; load it after the KPI cards are already visible
const Charts = dynamic(() => import('./DashboardCharts'), { ssr: false, loading: () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {[0, 1].map(i => (
      <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-[320px] animate-pulse" />
    ))}
  </div>
)})

const INVESTMENT_BY_PROJECT = [
  { project: 'Block-A', investment: 12000000, cost: 8500000, revenue: 14000000 },
  { project: 'Block-B', investment: 8000000,  cost: 6200000, revenue: 9500000 },
  { project: 'Block-C', investment: 15000000, cost: 11000000, revenue: 0 },
  { project: 'Block-D', investment: 5000000,  cost: 2100000, revenue: 0 },
]

const RECENT_ACTIVITY = [
  { id: 1, action: 'Investment recorded',   detail: 'MD invested ৳20,00,000 in Block-C',           time: '10 min ago',  type: 'investment' },
  { id: 2, action: 'Purchase added',        detail: '500 bags cement purchased for Block-A',        time: '1 hr ago',    type: 'purchase' },
  { id: 3, action: 'Stock issued',          detail: '200 bags cement issued to Block-B',            time: '2 hrs ago',   type: 'inventory' },
  { id: 4, action: 'Payment collected',     detail: 'Mr. Karim paid ৳5,00,000 installment',         time: '3 hrs ago',   type: 'sales' },
  { id: 5, action: 'Invoice generated',     detail: 'Invoice #INV-2026-012 for Block-A Unit 4B',    time: 'Yesterday',   type: 'sales' },
  { id: 6, action: 'Profit distributed',   detail: 'Block-B profit ৳3,30,000 distributed',         time: '2 days ago',  type: 'profit' },
]

const ACTIVITY_COLORS: Record<string, string> = {
  investment: 'bg-blue-100 text-blue-600',
  purchase:   'bg-orange-100 text-orange-600',
  inventory:  'bg-purple-100 text-purple-600',
  sales:      'bg-green-100 text-green-600',
  profit:     'bg-yellow-100 text-yellow-600',
}

const totalInvestment = INVESTMENT_BY_PROJECT.reduce((s, p) => s + p.investment, 0)
const totalCost       = INVESTMENT_BY_PROJECT.reduce((s, p) => s + p.cost, 0)
const totalRevenue    = INVESTMENT_BY_PROJECT.reduce((s, p) => s + p.revenue, 0)
const netProfit       = totalRevenue - totalCost

function fmt(n: number) { return `৳${(n / 100000).toFixed(1)}L` }

function KpiCard({ label, value, sub, icon: Icon, iconBg, iconColor }: {
  label: string; value: string; sub: string
  icon: React.ElementType; iconBg: string; iconColor: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  )
}

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here's your construction business overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <KpiCard label="Active Projects"    value="4"             sub="2 in progress · 2 planning" icon={FolderKanban} iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <KpiCard label="Total Investment"   value={fmt(totalInvestment)} sub="Across all projects"   icon={TrendingUp}   iconBg="bg-green-50"  iconColor="text-green-600" />
        <KpiCard label="Total Purchase Cost"value={fmt(totalCost)}       sub="Materials + contracts" icon={ShoppingCart}  iconBg="bg-orange-50" iconColor="text-orange-600" />
        <KpiCard label="Total Revenue"      value={fmt(totalRevenue)}    sub="From unit sales"       icon={Receipt}       iconBg="bg-purple-50" iconColor="text-purple-600" />
        <KpiCard label="Net Profit"         value={fmt(netProfit)}       sub="Revenue minus costs"   icon={PieIcon}       iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <KpiCard label="Stock Items"        value="18"            sub="4 below reorder level"  icon={Package}      iconBg="bg-red-50"    iconColor="text-red-600" />
      </div>

      {/* Charts load after KPI cards are visible */}
      <Charts data={INVESTMENT_BY_PROJECT} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Project Financial Summary</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {INVESTMENT_BY_PROJECT.map(p => {
              const profit = p.revenue - p.cost
              const hasRevenue = p.revenue > 0
              return (
                <div key={p.project} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900 text-sm">{p.project}</p>
                    {hasRevenue
                      ? <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {profit >= 0 ? `+${fmt(profit)}` : fmt(profit)} profit
                        </span>
                      : <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">In Progress</span>
                    }
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Invested: <span className="font-medium text-gray-700">{fmt(p.investment)}</span></span>
                    <span>Spent: <span className="font-medium text-gray-700">{fmt(p.cost)}</span></span>
                    {hasRevenue && <span>Revenue: <span className="font-medium text-gray-700">{fmt(p.revenue)}</span></span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {RECENT_ACTIVITY.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${ACTIVITY_COLORS[a.type]}`}>
                  {a.type === 'investment' ? '₊' : a.type === 'purchase' ? '₱' : a.type === 'inventory' ? '▣' : a.type === 'sales' ? '৳' : '%'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{a.action}</p>
                  <p className="text-xs text-gray-500 truncate">{a.detail}</p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">{a.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
