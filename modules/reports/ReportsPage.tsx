'use client'
import { useState } from 'react'
import { Printer, TrendingUp, ShoppingCart, Receipt, Package, RefreshCw } from 'lucide-react'
import { useApiData } from '@/hooks/useApiData'

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function fmtL(n: number) { return `৳${(n / 100000).toFixed(1)}L` }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

const STATUS_COLORS: Record<string, string> = {
  Active:    'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
  Planning:  'bg-gray-100 text-gray-600',
  OnHold:    'bg-amber-100 text-amber-700',
}
const INV_STATUS_STYLE: Record<string, string> = {
  Paid:      'bg-green-100 text-green-700',
  Partial:   'bg-yellow-100 text-yellow-700',
  Overdue:   'bg-red-100 text-red-700',
  Sent:      'bg-blue-100 text-blue-700',
  Draft:     'bg-gray-100 text-gray-600',
  Cancelled: 'bg-gray-100 text-gray-400',
}

function Spinner() { return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-gray-400 animate-spin" /></div> }

function Table({ children, minW = 640 }: { children: React.ReactNode; minW?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: minW }}>{children}</table>
    </div>
  )
}

// ─── Tab: Project Summary ─────────────────────────────────────────────────────
interface Project { id: number; projectCode: string; projectName: string; status: string; estimatedCost?: number; estimatedRevenue?: number }
interface Invoice { id: number; totalAmount: number; paidAmount: number; dueAmount: number; status: string; customerName: string }

function ProjectSummaryReport() {
  const { data: projects = [], isLoading: lP } = useApiData<Project[]>({ url: '/projects', queryKey: ['rep-projects'] })
  const { data: invoices = [], isLoading: lI } = useApiData<Invoice[]>({ url: '/invoices',  queryKey: ['rep-invoices'] })

  if (lP || lI) return <Spinner />

  const totalCost      = projects.reduce((s, p) => s + (p.estimatedCost ?? 0), 0)
  const totalRevenue   = projects.reduce((s, p) => s + (p.estimatedRevenue ?? 0), 0)
  const totalBilled    = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Est. Cost',    value: fmtL(totalCost),      color: 'text-red-600'   },
          { label: 'Total Est. Revenue', value: fmtL(totalRevenue),   color: 'text-blue-600'  },
          { label: 'Total Billed',       value: fmt(totalBilled),     color: 'text-green-600' },
          { label: 'Total Collected',    value: fmt(totalCollected),  color: 'text-teal-600'  },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-base sm:text-lg font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No projects found.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Table minW={640}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Project', 'Status', 'Est. Cost', 'Est. Revenue', 'Net'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map(p => {
                const net = (p.estimatedRevenue ?? 0) - (p.estimatedCost ?? 0)
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">{p.projectName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{p.projectCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-red-700 font-medium text-xs">{p.estimatedCost   ? fmtL(p.estimatedCost)   : '—'}</td>
                    <td className="px-4 py-3 text-blue-700 font-medium text-xs">{p.estimatedRevenue ? fmtL(p.estimatedRevenue) : '—'}</td>
                    <td className="px-4 py-3">
                      {p.estimatedRevenue && p.estimatedCost
                        ? <span className={`text-xs font-bold ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>{net >= 0 ? '+' : ''}{fmtL(net)}</span>
                        : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Totals</td>
                <td className="px-4 py-3 text-red-700 font-bold text-xs">{fmtL(totalCost)}</td>
                <td className="px-4 py-3 text-blue-700 font-bold text-xs">{fmtL(totalRevenue)}</td>
                <td className="px-4 py-3 font-bold text-xs">
                  <span className={totalRevenue - totalCost >= 0 ? 'text-green-700' : 'text-red-600'}>
                    {totalRevenue - totalCost >= 0 ? '+' : ''}{fmtL(totalRevenue - totalCost)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </Table>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Purchase & Vendor Report ───────────────────────────────────────────
interface PO     { id: number; poNumber: string; vendorName: string; totalAmount: number; status: string; poDate: string }
interface Vendor { id: number; vendorName: string; vendorType: string }

function PurchaseVendorReport() {
  const { data: orders  = [], isLoading: lO } = useApiData<PO[]>    ({ url: '/purchase-orders', queryKey: ['rep-pos'] })
  const { data: vendors = [], isLoading: lV } = useApiData<Vendor[]>({ url: '/vendors',         queryKey: ['rep-vendors'] })

  if (lO || lV) return <Spinner />

  const totalAmt   = orders.reduce((s, o) => s + o.totalAmount, 0)
  const approved   = orders.filter(o => o.status === 'Approved').reduce((s, o) => s + o.totalAmount, 0)
  const draft      = orders.filter(o => o.status === 'Draft').reduce((s, o) => s + o.totalAmount, 0)

  // Vendor spend map
  const vendorSpend: Record<string, { count: number; amount: number; type: string }> = {}
  orders.forEach(o => {
    if (!vendorSpend[o.vendorName]) {
      const v = vendors.find(v => v.vendorName === o.vendorName)
      vendorSpend[o.vendorName] = { count: 0, amount: 0, type: v?.vendorType ?? '—' }
    }
    vendorSpend[o.vendorName].count++
    vendorSpend[o.vendorName].amount += o.totalAmount
  })
  const vendorRows = Object.entries(vendorSpend).sort((a, b) => b[1].amount - a[1].amount)

  const PO_STATUS: Record<string, string> = {
    Draft:    'bg-gray-100 text-gray-600',
    Approved: 'bg-green-100 text-green-700',
    Received: 'bg-blue-100 text-blue-700',
    Cancelled:'bg-red-100 text-red-600',
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total PO Value', value: fmt(totalAmt), color: 'text-gray-900',  pctVal: 100 },
          { label: 'Approved',       value: fmt(approved), color: 'text-green-700', pctVal: pct(approved, totalAmt) },
          { label: 'Draft / Pending',value: fmt(draft),    color: 'text-amber-700', pctVal: pct(draft, totalAmt) },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-base sm:text-lg font-bold mt-1 ${k.color}`}>{k.value}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${k.pctVal}%` }} />
              </div>
              <span className="text-xs text-gray-500 shrink-0">{k.pctVal}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Spend by Vendor</h3>
            <p className="text-xs text-gray-400 mt-0.5">Total: {fmt(totalAmt)}</p>
          </div>
          {vendorRows.length === 0
            ? <p className="px-4 py-8 text-sm text-gray-400 text-center">No purchase orders found.</p>
            : <Table>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{['Vendor', 'Type', 'Orders', 'Amount'].map(h => (
                    <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase ${h !== 'Vendor' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vendorRows.map(([name, d]) => (
                    <tr key={name} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{name}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-500">{d.type}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-500">{d.count}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900">{fmt(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-2.5 text-xs font-bold text-gray-700">Total</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold">{orders.length}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold">{fmt(totalAmt)}</td>
                  </tr>
                </tfoot>
              </Table>
          }
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Purchase Orders</h3>
          </div>
          {orders.length === 0
            ? <p className="px-4 py-8 text-sm text-gray-400 text-center">No orders found.</p>
            : <Table>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{['PO No.', 'Vendor', 'Date', 'Amount', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...orders].sort((a, b) => b.poDate.localeCompare(a.poDate)).slice(0, 8).map(o => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-mono text-xs text-blue-600 font-semibold">{o.poNumber}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-900">{o.vendorName}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{o.poDate}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-gray-900">{fmt(o.totalAmount)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PO_STATUS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          }
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Sales & Collections Report ─────────────────────────────────────────
interface Customer { id: number; fullName: string; mobile: string }

function SalesCollectionsReport() {
  const { data: invoices  = [], isLoading: lI } = useApiData<Invoice[]> ({ url: '/invoices',  queryKey: ['rep-inv-sales'] })
  const { data: customers = [], isLoading: lC } = useApiData<Customer[]>({ url: '/customers', queryKey: ['rep-customers'] })

  if (lI || lC) return <Spinner />

  const totalRevenue   = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const outstanding    = totalRevenue - totalCollected

  // Outstanding by customer
  const customerBalance = customers.map(c => {
    const invs    = invoices.filter(i => i.customerName === c.fullName)
    const balance = invs.reduce((s, i) => s + i.dueAmount, 0)
    return { ...c, balance, invoiceCount: invs.length }
  }).filter(c => c.invoiceCount > 0).sort((a, b) => b.balance - a.balance)

  // Aging by status
  const statuses = ['Paid', 'Sent', 'Overdue', 'Draft', 'Cancelled'] as const
  const aging = statuses.map(status => {
    const rows = invoices.filter(i => i.status === status)
    return { status, count: rows.length, amount: rows.reduce((s, i) => s + i.totalAmount, 0), collected: rows.reduce((s, i) => s + i.paidAmount, 0) }
  }).filter(a => a.count > 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Revenue Billed</p>
          <p className="text-base sm:text-lg font-bold text-gray-900 mt-1">{fmt(totalRevenue)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Collected</p>
          <p className="text-base sm:text-lg font-bold text-green-700 mt-1">{fmt(totalCollected)}</p>
          <p className="text-xs text-gray-400 mt-1">Collection rate: {pct(totalCollected, totalRevenue)}%</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Outstanding Balance</p>
          <p className="text-base sm:text-lg font-bold text-red-600 mt-1">{fmt(outstanding)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Invoice Aging Summary</h3>
          </div>
          {aging.length === 0
            ? <p className="px-4 py-8 text-sm text-gray-400 text-center">No invoices found.</p>
            : <Table>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{['Status', 'Count', 'Amount', 'Collected'].map(h => (
                    <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase ${h !== 'Status' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {aging.map(a => (
                    <tr key={a.status} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${INV_STATUS_STYLE[a.status] ?? 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold">{a.count}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-900">{fmt(a.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-green-700">{fmt(a.collected)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-700">Total</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold">{invoices.length}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold">{fmt(totalRevenue)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-green-700">{fmt(totalCollected)}</td>
                  </tr>
                </tfoot>
              </Table>
          }
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Outstanding Balance by Client</h3>
          </div>
          {customerBalance.length === 0
            ? <p className="px-4 py-8 text-sm text-gray-400 text-center">No outstanding balances.</p>
            : <Table>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{['Client', 'Invoices', 'Balance Due'].map(h => (
                    <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase ${h === 'Balance Due' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerBalance.slice(0, 10).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium text-gray-900">{c.fullName}</p>
                        <p className="text-[10px] text-gray-400">{c.mobile}</p>
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
              </Table>
          }
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Stock Movement Report ───────────────────────────────────────────────
interface StockMaterial { id: number; materialName: string; unit: string; currentStock: number; minimumStock: number; isLowStock: boolean; averageCost: number }
interface StockTx { id: number; materialId: number; materialName: string; transactionType: string; qty: number; unitCost: number; totalCost: number; transactionDate: string; projectName?: string }

function StockMovementReport() {
  const { data: materials = [], isLoading: lM } = useApiData<StockMaterial[]>({ url: '/materials',          queryKey: ['rep-mats'] })
  const { data: txIn      = [], isLoading: lI } = useApiData<StockTx[]>      ({ url: '/stock-transactions', params: { type: 'In' },  queryKey: ['rep-tx-in'] })
  const { data: txOut     = [], isLoading: lO } = useApiData<StockTx[]>      ({ url: '/stock-transactions', params: { type: 'Out' }, queryKey: ['rep-tx-out'] })

  if (lM || lI || lO) return <Spinner />

  const lowCount = materials.filter(m => m.isLowStock).length

  // Build movement rows
  const rows = materials.map(m => {
    const totalIn  = txIn.filter(t => t.materialId === m.id).reduce((s, t) => s + t.qty, 0)
    const totalOut = txOut.filter(t => t.materialId === m.id).reduce((s, t) => s + t.qty, 0)
    return { ...m, totalIn, totalOut }
  })

  // Project consumption from out transactions
  const projectMap: Record<string, { count: number; qty: number }> = {}
  txOut.forEach(t => {
    const key = t.projectName ?? 'Unassigned'
    if (!projectMap[key]) projectMap[key] = { count: 0, qty: 0 }
    projectMap[key].count++
    projectMap[key].qty += t.qty
  })
  const projectConsumption = Object.entries(projectMap).sort((a, b) => b[1].qty - a[1].qty)

  return (
    <div className="space-y-5">
      {lowCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Package className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">{lowCount} material(s) at or below reorder level — replenishment required.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Stock Movement Summary</h3>
          <p className="text-xs text-gray-400 mt-0.5">Stock In → Issued → Current Balance</p>
        </div>
        {rows.length === 0
          ? <p className="px-4 py-8 text-sm text-gray-400 text-center">No materials found.</p>
          : <Table minW={680}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Material', 'Unit', 'Stock In', 'Issued', 'Current Stock', 'Reorder', 'Avg Cost', 'Status'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${
                      ['Stock In','Issued','Current Stock','Reorder','Avg Cost'].includes(h) ? 'text-right' : 'text-left'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50 ${r.isLowStock ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.materialName}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{r.unit}</td>
                    <td className="px-4 py-2.5 text-right text-green-700 font-medium text-xs">+{r.totalIn.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-orange-600 font-medium text-xs">−{r.totalOut.toLocaleString()}</td>
                    <td className={`px-4 py-2.5 text-right font-bold text-xs ${r.isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                      {r.currentStock.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{r.minimumStock.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{fmt(r.averageCost)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {r.isLowStock ? 'Low' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
        }
      </div>

      {projectConsumption.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Material Issues by Project</h3>
          </div>
          <Table minW={400}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Project', 'Transactions', 'Total Qty Issued'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projectConsumption.map(([name, d]) => (
                <tr key={name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 text-xs">{name}</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-700 text-xs">{d.count}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 text-xs">{d.qty.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
type Tab = 'projects' | 'purchase' | 'sales' | 'stock'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'projects', label: 'Project Summary',    icon: TrendingUp   },
  { id: 'purchase', label: 'Purchase & Vendor',   icon: ShoppingCart },
  { id: 'sales',    label: 'Sales & Collections', icon: Receipt      },
  { id: 'stock',    label: 'Stock Movement',       icon: Package      },
]

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('projects')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Operational and financial reports across all modules</p>
        </div>
        <button onClick={() => window.print()}
          className="shrink-0 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 text-gray-600">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      <div className="flex gap-1 flex-wrap border-b border-gray-200">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors -mb-px ${
                tab === t.id
                  ? 'bg-white border-gray-200 border-b-white text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      {tab === 'projects' && <ProjectSummaryReport />}
      {tab === 'purchase' && <PurchaseVendorReport />}
      {tab === 'sales'    && <SalesCollectionsReport />}
      {tab === 'stock'    && <StockMovementReport />}
    </div>
  )
}
