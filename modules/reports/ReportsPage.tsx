'use client'
import { useState } from 'react'
import { Printer, TrendingUp, ShoppingCart, Receipt, Package } from 'lucide-react'
import { INVOICES } from '@/modules/sales/InvoicesPage'
import { CLIENTS } from '@/modules/sales/ClientsPage'
import { STOCK_ITEMS } from '@/modules/inventory/StockLevelsPage'
import { PURCHASES } from '@/modules/purchase/PurchasePage'

// ─── shared data ──────────────────────────────────────────────────────────────

const PROJECTS = [
  { id: 'p1', code: 'BLK-A-001', name: 'Block-A Residential', location: 'Mirpur 12',      status: 'completed', units_total: 12, units_sold: 10, budget: 9000000,  cost_spent: 8500000,  investment: 12000000, progress: 100 },
  { id: 'p2', code: 'BLK-B-001', name: 'Block-B Residential', location: 'Mohammadpur',    status: 'completed', units_total: 8,  units_sold: 6,  budget: 6500000,  cost_spent: 6200000,  investment: 8000000,  progress: 100 },
  { id: 'p3', code: 'BLK-C-001', name: 'Block-C Residential', location: 'Uttara Sec 7',   status: 'active',    units_total: 16, units_sold: 4,  budget: 14000000, cost_spent: 11000000, investment: 15000000, progress: 65  },
  { id: 'p4', code: 'BLK-D-001', name: 'Block-D Residential', location: 'Bashundhara R/A',status: 'planning',  units_total: 10, units_sold: 2,  budget: 10000000, cost_spent: 2100000,  investment: 5000000,  progress: 18  },
]

const STOCK_IN = [
  { material_id: 'm1', qty: 500,  date: '2025-01-10', supplier: 'Bashundhara Cement' },
  { material_id: 'm3', qty: 10000,date: '2025-01-15', supplier: 'Rupa Bricks Ltd.' },
  { material_id: 'm2', qty: 15,   date: '2025-01-20', supplier: 'BSRM Steel' },
  { material_id: 'm8', qty: 1000, date: '2025-02-05', supplier: 'Energypac' },
  { material_id: 'm1', qty: 300,  date: '2025-03-01', supplier: 'Crown Cement' },
  { material_id: 'm6', qty: 600,  date: '2025-04-10', supplier: 'RAK Ceramics' },
  { material_id: 'm7', qty: 100,  date: '2025-04-12', supplier: 'Berger Paints' },
  { material_id: 'm9', qty: 200,  date: '2025-05-01', supplier: 'RFL Plastics' },
  { material_id: 'm4', qty: 800,  date: '2025-06-01', supplier: 'Local Sand Supplier' },
  { material_id: 'm5', qty: 400,  date: '2025-06-05', supplier: 'Gravel Corp BD' },
]

const ISSUES = [
  { material_id: 'm1', project_id: 'p1', qty: 200, date: '2025-01-20' },
  { material_id: 'm3', project_id: 'p1', qty: 5000,date: '2025-01-22' },
  { material_id: 'm2', project_id: 'p1', qty: 8,   date: '2025-02-01' },
  { material_id: 'm1', project_id: 'p2', qty: 150, date: '2025-03-10' },
  { material_id: 'm4', project_id: 'p1', qty: 700, date: '2025-03-15' },
  { material_id: 'm5', project_id: 'p2', qty: 300, date: '2025-04-01' },
  { material_id: 'm8', project_id: 'p3', qty: 600, date: '2025-04-20' },
  { material_id: 'm6', project_id: 'p1', qty: 300, date: '2025-05-05' },
  { material_id: 'm9', project_id: 'p2', qty: 180, date: '2025-05-12' },
  { material_id: 'm7', project_id: 'p3', qty: 80,  date: '2025-06-01' },
]

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-blue-100 text-blue-700',
  active:    'bg-green-100 text-green-700',
  planning:  'bg-gray-100 text-gray-600',
  on_hold:   'bg-amber-100 text-amber-700',
}

type Tab = 'projects' | 'purchase' | 'sales' | 'stock'

// ─── Tab: Project Summary ─────────────────────────────────────────────────────

function ProjectSummaryReport() {
  const totalInvestment = PROJECTS.reduce((s, p) => s + p.investment, 0)
  const totalCost       = PROJECTS.reduce((s, p) => s + p.cost_spent, 0)
  const totalRevenue    = INVOICES.reduce((s, i) => s + i.total_amount, 0)
  const totalCollected  = INVOICES.reduce((s, i) => s + i.paid_amount, 0)

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Investment',  value: fmt(totalInvestment), color: 'text-blue-600' },
          { label: 'Total Cost Spent',  value: fmt(totalCost),       color: 'text-red-600'  },
          { label: 'Total Revenue',     value: fmt(totalRevenue),    color: 'text-green-600'},
          { label: 'Total Collected',   value: fmt(totalCollected),  color: 'text-teal-600' },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-lg font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Per-project table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Project', 'Status', 'Units (Sold/Total)', 'Progress', 'Investment', 'Cost Spent', 'Budget', 'Budget Used %'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PROJECTS.map(p => {
                const budgetPct = pct(p.cost_spent, p.budget)
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">{p.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{p.code} — {p.location}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLORS[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-900">{p.units_sold}/{p.units_total}</td>
                    <td className="px-4 py-3 w-28">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                          <div className={`h-1.5 rounded-full ${p.progress === 100 ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-blue-700 font-medium text-xs">{fmt(p.investment)}</td>
                    <td className="px-4 py-3 text-red-700 font-medium text-xs">{fmt(p.cost_spent)}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{fmt(p.budget)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${budgetPct > 90 ? 'text-red-600' : 'text-green-700'}`}>{budgetPct}%</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Totals</td>
                <td className="px-4 py-3 text-blue-700 font-bold text-xs">{fmt(totalInvestment)}</td>
                <td className="px-4 py-3 text-red-700 font-bold text-xs">{fmt(totalCost)}</td>
                <td className="px-4 py-3 text-gray-700 font-bold text-xs">{fmt(PROJECTS.reduce((s, p) => s + p.budget, 0))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Purchase & Vendor Report ───────────────────────────────────────────

function PurchaseVendorReport() {
  const totalAmt  = PURCHASES.reduce((s, r) => s + r.amount, 0)
  const materials = PURCHASES.filter(r => r.category === 'material').reduce((s, r) => s + r.amount, 0)
  const contracts = PURCHASES.filter(r => r.category === 'contract').reduce((s, r) => s + r.amount, 0)
  const other     = PURCHASES.filter(r => r.category === 'other').reduce((s, r) => s + r.amount, 0)

  // Group by vendor
  const vendorMap: Record<string, { count: number; amount: number }> = {}
  PURCHASES.forEach(r => {
    if (!vendorMap[r.vendor]) vendorMap[r.vendor] = { count: 0, amount: 0 }
    vendorMap[r.vendor].count++
    vendorMap[r.vendor].amount += r.amount
  })
  const vendors = Object.entries(vendorMap).sort((a, b) => b[1].amount - a[1].amount)

  // Group by project
  const projectMap: Record<string, { materials: number; contracts: number; other: number; total: number }> = {}
  PURCHASES.forEach(r => {
    if (!projectMap[r.project_id]) projectMap[r.project_id] = { materials: 0, contracts: 0, other: 0, total: 0 }
    if (r.category === 'material')  projectMap[r.project_id].materials += r.amount
    if (r.category === 'contract')  projectMap[r.project_id].contracts += r.amount
    if (r.category === 'other')     projectMap[r.project_id].other     += r.amount
    projectMap[r.project_id].total += r.amount
  })

  return (
    <div className="space-y-5">
      {/* Category breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Materials Purchased', value: fmt(materials), pct: pct(materials, totalAmt), color: 'bg-blue-500'   },
          { label: 'Contract Payments',   value: fmt(contracts), pct: pct(contracts, totalAmt), color: 'bg-purple-500' },
          { label: 'Other Purchases',     value: fmt(other),     pct: pct(other, totalAmt),     color: 'bg-gray-400'   },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{k.value}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                <div className={`h-1.5 rounded-full ${k.color}`} style={{ width: `${k.pct}%` }} />
              </div>
              <span className="text-xs text-gray-500 shrink-0">{k.pct}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By Vendor */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Purchase by Vendor</h3>
            <p className="text-xs text-gray-400 mt-0.5">Total: {fmt(totalAmt)}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Vendor', 'Orders', 'Amount', '%'].map(h => (
                  <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase ${h !== 'Vendor' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.map(([name, data]) => (
                <tr key={name} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{name}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-gray-500">{data.count}</td>
                  <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900">{fmt(data.amount)}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-gray-500">{pct(data.amount, totalAmt)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td className="px-4 py-2.5 text-xs font-bold text-gray-700">Total</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold">{PURCHASES.length}</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-900">{fmt(totalAmt)}</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* By Project */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Purchase by Project</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Project', 'Materials', 'Contracts', 'Other', 'Total'].map(h => (
                  <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase ${h !== 'Project' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PROJECTS.filter(p => projectMap[p.id]).map(p => {
                const d = projectMap[p.id]
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-blue-700">{d.materials ? fmt(d.materials) : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-purple-700">{d.contracts ? fmt(d.contracts) : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-500">{d.other ? fmt(d.other) : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-900">{fmt(d.total)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td className="px-4 py-2.5 text-xs font-bold text-gray-700">Total</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-blue-700">{fmt(materials)}</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-purple-700">{fmt(contracts)}</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-500">{fmt(other)}</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-900">{fmt(totalAmt)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Sales & Collections Report ─────────────────────────────────────────

function SalesCollectionsReport() {
  const totalRevenue   = INVOICES.reduce((s, i) => s + i.total_amount, 0)
  const totalCollected = INVOICES.reduce((s, i) => s + i.paid_amount, 0)
  const outstanding    = totalRevenue - totalCollected

  const statusCounts = {
    paid:    INVOICES.filter(i => i.status === 'paid').length,
    partial: INVOICES.filter(i => i.status === 'partial').length,
    overdue: INVOICES.filter(i => i.status === 'overdue').length,
    issued:  INVOICES.filter(i => i.status === 'issued').length,
    draft:   INVOICES.filter(i => i.status === 'draft').length,
  }

  const STATUS_STYLE: Record<string, string> = {
    paid:    'bg-green-100 text-green-700',
    partial: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-700',
    issued:  'bg-blue-100 text-blue-700',
    draft:   'bg-gray-100 text-gray-600',
  }

  // Outstanding by client
  const clientOutstanding = CLIENTS.map(c => {
    const clientInvoices = INVOICES.filter(i => i.client_id === c.id)
    const balance = clientInvoices.reduce((s, i) => s + (i.total_amount - i.paid_amount), 0)
    const invoiceCount = clientInvoices.length
    return { ...c, balance, invoiceCount }
  }).filter(c => c.invoiceCount > 0).sort((a, b) => b.balance - a.balance)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Revenue Billed</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{fmt(totalRevenue)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Collected</p>
          <p className="text-lg font-bold text-green-700 mt-1">{fmt(totalCollected)}</p>
          <p className="text-xs text-gray-400 mt-1">Collection rate: {pct(totalCollected, totalRevenue)}%</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Outstanding Balance</p>
          <p className="text-lg font-bold text-red-600 mt-1">{fmt(outstanding)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Invoice aging */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Invoice Aging Summary</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Status', 'Count', 'Amount', 'Collected'].map(h => (
                  <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase ${h !== 'Status' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(['paid', 'partial', 'overdue', 'issued', 'draft'] as const).map(status => {
                const rows = INVOICES.filter(i => i.status === status)
                if (!rows.length) return null
                const amount    = rows.reduce((s, i) => s + i.total_amount, 0)
                const collected = rows.reduce((s, i) => s + i.paid_amount, 0)
                return (
                  <tr key={status} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_STYLE[status]}`}>{status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold">{rows.length}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-900">{fmt(amount)}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-green-700">{fmt(collected)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td className="px-4 py-2.5 text-xs font-bold text-gray-700">Total</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold">{INVOICES.length}</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold">{fmt(totalRevenue)}</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-green-700">{fmt(totalCollected)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Outstanding by client */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Outstanding Balance by Client</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Client', 'Invoices', 'Balance Due'].map(h => (
                  <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase ${h === 'Balance Due' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientOutstanding.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-medium text-gray-900">{c.name}</p>
                    <p className="text-[10px] text-gray-400">{c.phone}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{c.invoiceCount}</td>
                  <td className={`px-4 py-2.5 text-right text-xs font-bold ${c.balance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {c.balance > 0 ? fmt(c.balance) : 'Settled'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-2.5 text-xs font-bold text-gray-700">Total Outstanding</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-red-600">{fmt(outstanding)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Stock Movement Report ───────────────────────────────────────────────

function StockMovementReport() {
  const rows = STOCK_ITEMS.map(item => {
    const totalIn  = STOCK_IN.filter(r => r.material_id === item.id).reduce((s, r) => s + r.qty, 0)
    const totalOut = ISSUES.filter(r => r.material_id === item.id).reduce((s, r) => s + r.qty, 0)
    const closing  = item.current_stock
    const opening  = closing + totalOut - totalIn
    const isLow    = closing <= item.reorder_level
    return { ...item, totalIn, totalOut, opening, closing, isLow }
  })

  const lowCount = rows.filter(r => r.isLow).length

  // Per-project consumption
  const projectConsumption = PROJECTS.map(p => {
    const issues = ISSUES.filter(r => r.project_id === p.id)
    const count  = issues.length
    const qty    = issues.reduce((s, r) => s + r.qty, 0)
    return { ...p, issueCount: count, totalQty: qty }
  }).filter(p => p.issueCount > 0)

  return (
    <div className="space-y-5">
      {lowCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Package className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">{lowCount} material(s) at or below reorder level — replenishment required.</p>
        </div>
      )}

      {/* Movement table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Stock Movement Summary</h3>
          <p className="text-xs text-gray-400 mt-0.5">Opening → Stock In → Issued → Closing Balance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Material', 'Unit', 'Opening', 'Stock In', 'Issued', 'Closing', 'Reorder Level', 'Status'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${['Opening','Stock In','Issued','Closing','Reorder Level'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 ${r.isLow ? 'bg-red-50/50' : ''}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.name}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{r.unit}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{r.opening.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-green-700 font-medium text-xs">+{r.totalIn.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-orange-600 font-medium text-xs">−{r.totalOut.toLocaleString()}</td>
                  <td className={`px-4 py-2.5 text-right font-bold text-xs ${r.isLow ? 'text-red-600' : 'text-gray-900'}`}>
                    {r.closing.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{r.reorder_level.toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {r.isLow ? 'Low' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consumption by project */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Material Issues by Project</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Project', 'Issue Transactions', 'Materials Issued by Type'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projectConsumption.map(p => {
                const details = ISSUES.filter(r => r.project_id === p.id).reduce<Record<string, number>>((acc, r) => {
                  const mat = STOCK_ITEMS.find(s => s.id === r.material_id)
                  if (mat) acc[mat.name] = (acc[mat.name] || 0) + r.qty
                  return acc
                }, {})
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 text-xs">{p.name}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">{p.issueCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(details).map(([name, qty]) => (
                          <span key={name} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {name}: {qty.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'projects', label: 'Project Summary',         icon: TrendingUp  },
  { id: 'purchase', label: 'Purchase & Vendor',        icon: ShoppingCart},
  { id: 'sales',    label: 'Sales & Collections',      icon: Receipt     },
  { id: 'stock',    label: 'Stock Movement',            icon: Package     },
]

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('projects')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Operational and financial reports across all modules</p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 text-gray-600"
        >
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 flex-wrap border-b border-gray-200 pb-0">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors -mb-px ${
                tab === t.id
                  ? 'bg-white border-gray-200 border-b-white text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'projects' && <ProjectSummaryReport />}
      {tab === 'purchase' && <PurchaseVendorReport />}
      {tab === 'sales'    && <SalesCollectionsReport />}
      {tab === 'stock'    && <StockMovementReport />}
    </div>
  )
}
