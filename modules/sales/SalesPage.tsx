'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Sale, Customer, Unit, PaymentSchedule, Collection } from '@/types'

type Tab = 'overview' | 'customers' | 'units' | 'collections' | 'aging'

function fmt(n: number) {
  return '৳' + n.toLocaleString('en-BD')
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    active: 'bg-blue-100 text-blue-700',
    booked: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    pending: 'bg-slate-100 text-slate-600',
    available: 'bg-green-100 text-green-700',
    reserved: 'bg-orange-100 text-orange-700',
    sold: 'bg-slate-200 text-slate-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function OverviewTab() {
  const { data: salesRes } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api.get('/sales').then(r => r.data),
  })
  const { data: summaryRes } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => api.get('/sales/summary').then(r => r.data),
  })
  const { data: schedulesAllRes } = useQuery({
    queryKey: ['schedules-all'],
    queryFn: () => Promise.all([
      api.get('/sales/sale1/schedules').then(r => r.data),
      api.get('/sales/sale2/schedules').then(r => r.data),
      api.get('/sales/sale3/schedules').then(r => r.data),
      api.get('/sales/sale4/schedules').then(r => r.data),
      api.get('/sales/sale5/schedules').then(r => r.data),
    ]).then(results => results.flatMap(r => r.data ?? [])),
  })

  const sales: Sale[] = salesRes?.data ?? []
  const summary = summaryRes?.data
  const allSchedules: PaymentSchedule[] = schedulesAllRes ?? []
  const overdue = allSchedules.filter(s => s.status === 'overdue')
  const upcoming = allSchedules.filter(s => s.status === 'pending').slice(0, 5)

  const [selectedSale, setSelectedSale] = useState<string | null>(null)
  const { data: saleSchedulesRes } = useQuery({
    queryKey: ['schedules', selectedSale],
    queryFn: () => selectedSale ? api.get(`/sales/${selectedSale}/schedules`).then(r => r.data) : null,
    enabled: !!selectedSale,
  })
  const saleSchedules: PaymentSchedule[] = saleSchedulesRes?.data ?? []

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard label="Total Sales" value={String(summary.total_sales)} color="text-slate-800" />
          <SummaryCard label="Total Revenue" value={fmt(summary.total_revenue)} color="text-blue-700" />
          <SummaryCard label="Collected" value={fmt(summary.total_collected)} color="text-green-700" />
          <SummaryCard label="Outstanding" value={fmt(summary.outstanding)} color="text-orange-600" />
          <SummaryCard label="Overdue" value={fmt(summary.overdue_amount)} color="text-red-600" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sales List */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">All Sales</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {sales.map(sale => (
              <button
                key={sale.id}
                onClick={() => setSelectedSale(selectedSale === sale.id ? null : sale.id)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selectedSale === sale.id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{(sale as any).customer?.name ?? sale.customer_id}</p>
                    <p className="text-xs text-slate-500">{(sale as any).unit?.unit_number ?? sale.unit_id} · {sale.sale_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">{fmt(sale.net_price)}</p>
                    <StatusBadge status={sale.status} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Schedule or Upcoming */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">
              {selectedSale ? 'Payment Schedule' : 'Upcoming Installments'}
            </h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {(selectedSale ? saleSchedules : upcoming).map(sch => (
              <div key={sch.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{sch.description}</p>
                  <p className="text-xs text-slate-400">Due: {sch.due_date}{sch.paid_date ? ` · Paid: ${sch.paid_date}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{fmt(sch.amount)}</p>
                  <StatusBadge status={sch.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-700 mb-3">Overdue Installments ({overdue.length})</h3>
          <div className="space-y-2">
            {overdue.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-red-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">{s.description} — Sale #{s.sale_id}</p>
                  <p className="text-xs text-red-500">Due: {s.due_date}</p>
                </div>
                <p className="text-sm font-bold text-red-600">{fmt(s.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CustomersTab() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => api.get('/customers', { params: { search } }).then(r => r.data),
  })
  const customers: Customer[] = data?.data ?? []

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {isLoading ? (
        <div className="p-8 text-center text-slate-400">Loading…</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">NID</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                <td className="px-4 py-3 text-slate-600">{c.email}</td>
                <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{c.address}</td>
                <td className="px-4 py-3 text-slate-500 font-mono">{c.nid ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">{c.created_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function UnitsTab() {
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['units', projectFilter, statusFilter],
    queryFn: () => api.get('/units', { params: { project_id: projectFilter || undefined, status: statusFilter || undefined } }).then(r => r.data),
  })
  const units: Unit[] = data?.data ?? []

  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    booked: 'bg-yellow-100 text-yellow-700',
    sold: 'bg-slate-200 text-slate-700',
    reserved: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Projects</option>
          <option value="p1">Residential Complex (P1)</option>
          <option value="p2">Luxury Villas (P2)</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="booked">Booked</option>
          <option value="sold">Sold</option>
          <option value="reserved">Reserved</option>
        </select>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {units.map(unit => (
            <div key={unit.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="font-bold text-slate-800 text-lg">{unit.unit_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[unit.status]}`}>
                  {unit.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 capitalize mb-1">{unit.type} · Floor {unit.floor}</p>
              <p className="text-xs text-slate-500 mb-2">{unit.area_sqft.toLocaleString()} sqft</p>
              <p className="text-sm font-semibold text-blue-700">{fmt(unit.price)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CollectionsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: () => api.get('/collections').then(r => r.data),
  })
  const collections: Collection[] = data?.data ?? []

  const methodBadge: Record<string, string> = {
    bank_transfer: 'bg-blue-100 text-blue-700',
    cheque: 'bg-purple-100 text-purple-700',
    cash: 'bg-green-100 text-green-700',
    online: 'bg-teal-100 text-teal-700',
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Payment Collections</h3>
        <span className="text-sm text-slate-500">Total: {fmt(collections.reduce((s, c) => s + c.amount, 0))}</span>
      </div>
      {isLoading ? (
        <div className="p-8 text-center text-slate-400">Loading…</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Sale</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {collections.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{c.payment_date}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{(c as any).customer?.name ?? c.customer_id}</td>
                <td className="px-4 py-3 text-slate-500 font-mono">{c.sale_id}</td>
                <td className="px-4 py-3 font-semibold text-green-700">{fmt(c.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${methodBadge[c.payment_method] ?? 'bg-slate-100 text-slate-600'}`}>
                    {c.payment_method.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 font-mono">{c.reference_no ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ARAgingTab() {
  const today = new Date()
  const saleIds = ['sale1', 'sale2', 'sale3', 'sale4', 'sale5']

  const { data } = useQuery({
    queryKey: ['schedules-aging'],
    queryFn: () => Promise.all(
      saleIds.map(id => api.get(`/sales/${id}/schedules`).then(r => r.data.data ?? []))
    ).then(results => results.flat()),
  })
  const { data: salesRes } = useQuery({ queryKey: ['sales'], queryFn: () => api.get('/sales').then(r => r.data) })
  const { data: collectionsRes } = useQuery({ queryKey: ['collections'], queryFn: () => api.get('/collections').then(r => r.data) })

  const allSchedules = data ?? []
  const sales = salesRes?.data ?? []
  const collections = collectionsRes?.data ?? []

  type AgingBucket = { label: string; days: [number, number]; color: string; bg: string }
  const buckets: AgingBucket[] = [
    { label: 'Current (not due)', days: [0, 0], color: 'text-slate-700', bg: 'bg-slate-50' },
    { label: '1–30 days overdue',  days: [1, 30],  color: 'text-yellow-700', bg: 'bg-yellow-50' },
    { label: '31–60 days overdue', days: [31, 60],  color: 'text-orange-700', bg: 'bg-orange-50' },
    { label: '61–90 days overdue', days: [61, 90],  color: 'text-red-600',    bg: 'bg-red-50' },
    { label: '90+ days overdue',   days: [91, 9999], color: 'text-red-800',   bg: 'bg-red-100' },
  ]

  const overdue = allSchedules.filter((s: any) => s.status === 'overdue' || (s.status === 'pending' && s.due_date < today.toISOString().slice(0, 10)))

  function daysOverdue(dueDate: string) {
    return Math.floor((today.getTime() - new Date(dueDate).getTime()) / 86400000)
  }

  function getBucket(s: any) {
    const d = daysOverdue(s.due_date)
    if (d <= 0) return 0
    if (d <= 30) return 1
    if (d <= 60) return 2
    if (d <= 90) return 3
    return 4
  }

  const bucketed = buckets.map((b, i) => ({
    ...b,
    items: i === 0
      ? allSchedules.filter((s: any) => s.status === 'pending' && s.due_date >= today.toISOString().slice(0, 10))
      : overdue.filter((s: any) => getBucket(s) === i),
    total: i === 0
      ? allSchedules.filter((s: any) => s.status === 'pending' && s.due_date >= today.toISOString().slice(0, 10)).reduce((sum: number, s: any) => sum + s.amount, 0)
      : overdue.filter((s: any) => getBucket(s) === i).reduce((sum: number, s: any) => sum + s.amount, 0),
  }))

  const totalAR = allSchedules.filter((s: any) => s.status !== 'paid').reduce((sum: number, s: any) => sum + s.amount, 0)
  const totalOverdue = overdue.reduce((sum: number, s: any) => sum + s.amount, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Outstanding AR</p>
          <p className="text-xl font-bold text-blue-700">{fmt(totalAR)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Overdue</p>
          <p className="text-xl font-bold text-red-600">{fmt(totalOverdue)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Overdue Installments</p>
          <p className="text-2xl font-bold text-orange-600">{overdue.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Overdue % of AR</p>
          <p className="text-2xl font-bold text-slate-800">{totalAR > 0 ? Math.round((totalOverdue / totalAR) * 100) : 0}%</p>
        </div>
      </div>

      {bucketed.map((bucket, i) => (
        <div key={i} className={`rounded-xl border border-slate-200 overflow-hidden`}>
          <div className={`px-4 py-3 flex items-center justify-between ${bucket.bg}`}>
            <h3 className={`font-semibold text-sm ${bucket.color}`}>{bucket.label}</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{bucket.items.length} items</span>
              <span className={`font-bold text-sm ${bucket.color}`}>{fmt(bucket.total)}</span>
            </div>
          </div>
          {bucket.items.length > 0 && (
            <table className="w-full text-sm bg-white">
              <tbody className="divide-y divide-slate-50">
                {(bucket.items as any[]).map((s: any) => {
                  const sale = sales.find((sl: any) => sl.id === s.sale_id)
                  const d = i > 0 ? daysOverdue(s.due_date) : null
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700 font-medium">{sale?.customer?.name ?? s.sale_id}</td>
                      <td className="px-4 py-2 text-slate-500 text-xs">{s.description}</td>
                      <td className="px-4 py-2 text-slate-500">Due: {s.due_date}</td>
                      <td className="px-4 py-2 font-semibold text-slate-800">{fmt(s.amount)}</td>
                      {d !== null && <td className="px-4 py-2 text-xs text-red-500">{d} days late</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  )
}

export default function SalesPage() {
  const [tab, setTab] = useState<Tab>('overview')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview & Schedules' },
    { id: 'customers', label: 'Customers' },
    { id: 'units', label: 'Units' },
    { id: 'collections', label: 'Collections' },
    { id: 'aging', label: 'AR Aging' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales Management</h1>
          <p className="text-sm text-slate-500">Manage property sales, payment schedules and collections</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'units' && <UnitsTab />}
      {tab === 'collections' && <CollectionsTab />}
      {tab === 'aging' && <ARAgingTab />}
    </div>
  )
}
