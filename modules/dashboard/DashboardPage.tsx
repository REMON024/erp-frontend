'use client'
import dynamic from 'next/dynamic'
import { FolderKanban, TrendingUp, ShoppingCart, Package, Receipt, PieChart as PieIcon, RefreshCw } from 'lucide-react'
import { useApiData } from '@/hooks/useApiData'

const Charts = dynamic(() => import('./DashboardCharts'), { ssr: false, loading: () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {[0, 1].map(i => (
      <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-[320px] animate-pulse" />
    ))}
  </div>
)})

function fmt(n: number) { return `৳${(n / 100000).toFixed(1)}L` }
function fmtFull(n: number) { return `৳${n.toLocaleString('en-BD')}` }

interface Project   { id: number; projectCode: string; projectName: string; status: string; estimatedCost?: number; estimatedRevenue?: number }
interface Estimate  { id: number; totalEstimated: number; totalActual: number; status: string }
interface Invoice   { id: number; totalAmount: number; paidAmount: number; dueAmount: number; status: string; invoiceDate: string; customerName: string; invoiceNo: string }
interface Payment   { id: number; paymentNo: string; customerName: string; amount: number; paymentDate: string; method: string }
interface Material  { id: number; materialName: string; currentStock: number; minimumStock: number; isLowStock: boolean }
interface Booking   { id: number; bookingNo: string; customerName: string; netAmount: number; bookingDate: string; unitNo: string }

function KpiCard({ label, value, sub, icon: Icon, iconBg, iconColor, loading }: {
  label: string; value: string; sub: string
  icon: React.ElementType; iconBg: string; iconColor: string; loading?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        {loading
          ? <div className="h-7 w-24 bg-gray-100 rounded animate-pulse mt-1" />
          : <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>}
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { data: projects = [],  isLoading: loadP  } = useApiData<Project[]>  ({ url: '/projects',  queryKey: ['dash-projects']  })
  const { data: invoices = [],  isLoading: loadI  } = useApiData<Invoice[]>  ({ url: '/invoices',  queryKey: ['dash-invoices']  })
  const { data: payments = [],  isLoading: loadPy } = useApiData<Payment[]>  ({ url: '/payments',  queryKey: ['dash-payments']  })
  const { data: materials = [], isLoading: loadM  } = useApiData<Material[]> ({ url: '/materials', queryKey: ['dash-materials'] })
  const { data: bookings = [],   isLoading: loadB  } = useApiData<Booking[]>  ({ url: '/bookings',       queryKey: ['dash-bookings']  })
  const { data: estimates = [],  isLoading: loadE  } = useApiData<Estimate[]> ({ url: '/cost-estimates', params: { status: 'Approved' }, queryKey: ['dash-estimates'] })

  const loading = loadP || loadI || loadM

  const activeProjects = projects.filter(p => p.status === 'Active').length
  const totalRevenue   = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const totalCost      = projects.reduce((s, p) => s + (p.estimatedCost ?? 0), 0)
  const lowStockCount  = materials.filter(m => m.isLowStock).length
  const totalBudget      = estimates.reduce((s, e) => s + e.totalEstimated, 0)
  const totalActualCost  = estimates.reduce((s, e) => s + e.totalActual, 0)
  const budgetUtilPct    = totalBudget > 0 ? Math.round(totalActualCost / totalBudget * 100) : 0
  const overBudgetCount  = estimates.filter(e => e.totalActual > e.totalEstimated && e.totalActual > 0).length

  const collectionStats = {
    collected: invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.paidAmount, 0),
    pending:   invoices.filter(i => i.status === 'Sent' || i.status === 'Draft').reduce((s, i) => s + i.dueAmount, 0),
    overdue:   invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.dueAmount, 0),
  }

  // Build chart data from real projects
  const chartData = projects.map(p => ({
    project:    p.projectCode,
    investment: p.estimatedCost ?? 0,
    cost:       p.estimatedCost ?? 0,
    revenue:    p.estimatedRevenue ?? 0,
  }))

  // Build recent activity from latest payments + bookings
  const recentPayments = [...payments]
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
    .slice(0, 3)
    .map(p => ({ key: `pay-${p.id}`, action: 'Payment collected', detail: `${p.customerName} paid ${fmtFull(p.amount)}`, type: 'sales', date: p.paymentDate }))

  const recentBookings = [...bookings]
    .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate))
    .slice(0, 3)
    .map(b => ({ key: `book-${b.id}`, action: 'Booking confirmed', detail: `${b.customerName} booked ${b.unitNo}`, type: 'investment', date: b.bookingDate }))

  const activity = [...recentPayments, ...recentBookings]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  const ACTIVITY_COLORS: Record<string, string> = {
    investment: 'bg-blue-100 text-blue-600',
    sales:      'bg-green-100 text-green-600',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here's your construction business overview.</p>
        </div>
        {loading && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <KpiCard label="Active Projects"     value={String(activeProjects)}    sub={`${projects.length} total`}        icon={FolderKanban} iconBg="bg-blue-50"   iconColor="text-blue-600"   loading={loadP} />
        <KpiCard label="Total Revenue Billed"value={fmt(totalRevenue)}          sub="From all invoices"                 icon={Receipt}      iconBg="bg-green-50"  iconColor="text-green-600"  loading={loadI} />
        <KpiCard label="Collected"           value={fmt(totalCollected)}        sub={`${totalRevenue > 0 ? Math.round(totalCollected / totalRevenue * 100) : 0}% collection rate`} icon={TrendingUp} iconBg="bg-teal-50" iconColor="text-teal-600" loading={loadI} />
        <KpiCard label="Budget Utilization"
          value={totalBudget > 0 ? `${budgetUtilPct}%` : '—'}
          sub={overBudgetCount > 0 ? `⚠ ${overBudgetCount} estimate(s) over budget` : `${fmt(totalBudget)} total budgeted`}
          icon={ShoppingCart} iconBg={overBudgetCount > 0 ? 'bg-red-50' : 'bg-orange-50'}
          iconColor={overBudgetCount > 0 ? 'text-red-600' : 'text-orange-600'} loading={loadE} />
        <KpiCard label="Outstanding Balance" value={fmt(totalRevenue - totalCollected)} sub="Unpaid invoices"
          icon={PieIcon} iconBg="bg-yellow-50" iconColor="text-yellow-600" loading={loadI} />
        <KpiCard label="Low Stock Alerts"    value={String(lowStockCount)}
          sub={`${materials.length} materials tracked`}
          icon={Package} iconBg="bg-red-50" iconColor="text-red-600" loading={loadM} />
      </div>

      {chartData.length > 0 && <Charts data={chartData} collectionStats={collectionStats} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project financial summary */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Project Overview</h3>
          </div>
          {loadP ? (
            <div className="divide-y divide-gray-100">
              {[1,2,3].map(i => <div key={i} className="px-5 py-4 h-14 animate-pulse bg-gray-50" />)}
            </div>
          ) : projects.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No projects yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {projects.slice(0, 6).map(p => (
                <div key={p.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-medium text-gray-900 text-sm">{p.projectName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      p.status === 'Active' ? 'bg-green-100 text-green-700' :
                      p.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{p.status}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span className="font-mono text-gray-400">{p.projectCode}</span>
                    {p.estimatedCost   && <span>Est. Cost: <strong className="text-gray-700">{fmt(p.estimatedCost)}</strong></span>}
                    {p.estimatedRevenue && <span>Est. Revenue: <strong className="text-gray-700">{fmt(p.estimatedRevenue)}</strong></span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          {(loadPy || loadB) ? (
            <div className="divide-y divide-gray-100">
              {[1,2,3].map(i => <div key={i} className="px-5 py-4 h-14 animate-pulse bg-gray-50" />)}
            </div>
          ) : activity.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No recent activity.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {activity.map(a => (
                <div key={a.key} className="px-5 py-3 flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${ACTIVITY_COLORS[a.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {a.type === 'sales' ? '৳' : '★'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{a.action}</p>
                    <p className="text-xs text-gray-500 truncate">{a.detail}</p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">{a.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
