'use client'
import { useState } from 'react'
import { Printer, TrendingUp, ShoppingCart, Receipt, Package, RefreshCw } from 'lucide-react'
import { useApiData } from '@/hooks/useApiData'

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function fmtL(n: number) { return `৳${(n / 100000).toFixed(1)}L` }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

const STATUS_COLORS: Record<string, string> = {
  Active:    'bg-green-100 text-green-700',
  Completed: 'bg-primary/10 text-primary',
  Planning:  'bg-surface-muted text-content-muted',
  OnHold:    'bg-amber-100 text-amber-700',
}
const INV_STATUS_STYLE: Record<string, string> = {
  Paid:      'bg-green-100 text-green-700',
  Partial:   'bg-yellow-100 text-yellow-700',
  Overdue:   'bg-red-100 text-red-700',
  Sent:      'bg-primary/10 text-primary',
  Draft:     'bg-surface-muted text-content-muted',
  Cancelled: 'bg-surface-muted text-content-muted',
}

function Spinner() { return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-content-muted animate-spin" /></div> }

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
          { label: 'Total Est. Revenue', value: fmtL(totalRevenue),   color: 'text-primary'  },
          { label: 'Total Billed',       value: fmt(totalBilled),     color: 'text-green-600' },
          { label: 'Total Collected',    value: fmt(totalCollected),  color: 'text-teal-600'  },
        ].map(k => (
          <div key={k.label} className="bg-surface-muted rounded-xl border border-border-default p-4">
            <p className="text-xs text-content-muted">{k.label}</p>
            <p className={`text-base sm:text-lg font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-content-muted text-center py-8">No projects found.</p>
      ) : (
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <Table minW={640}>
            <thead className="bg-surface-muted border-b border-border-default">
              <tr>
                {['Project', 'Status', 'Est. Cost', 'Est. Revenue', 'Net'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {projects.map(p => {
                const net = (p.estimatedRevenue ?? 0) - (p.estimatedCost ?? 0)
                return (
                  <tr key={p.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <p className="font-medium text-content text-xs">{p.projectName}</p>
                      <p className="text-[10px] text-content-muted font-mono">{p.projectCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[p.status] ?? 'bg-surface-muted text-content-muted'}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-red-700 font-medium text-xs">{p.estimatedCost   ? fmtL(p.estimatedCost)   : '—'}</td>
                    <td className="px-4 py-3 text-primary font-medium text-xs">{p.estimatedRevenue ? fmtL(p.estimatedRevenue) : '—'}</td>
                    <td className="px-4 py-3">
                      {p.estimatedRevenue && p.estimatedCost
                        ? <span className={`text-xs font-bold ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>{net >= 0 ? '+' : ''}{fmtL(net)}</span>
                        : <span className="text-content-muted text-xs">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-surface-muted border-t border-border-default">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-xs font-bold text-content uppercase">Totals</td>
                <td className="px-4 py-3 text-red-700 font-bold text-xs">{fmtL(totalCost)}</td>
                <td className="px-4 py-3 text-primary font-bold text-xs">{fmtL(totalRevenue)}</td>
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
    Draft:    'bg-surface-muted text-content-muted',
    Approved: 'bg-green-100 text-green-700',
    Received: 'bg-primary/10 text-primary',
    Cancelled:'bg-red-100 text-red-600',
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total PO Value', value: fmt(totalAmt), color: 'text-content',  pctVal: 100 },
          { label: 'Approved',       value: fmt(approved), color: 'text-green-700', pctVal: pct(approved, totalAmt) },
          { label: 'Draft / Pending',value: fmt(draft),    color: 'text-amber-700', pctVal: pct(draft, totalAmt) },
        ].map(k => (
          <div key={k.label} className="bg-surface-muted rounded-xl border border-border-default p-4">
            <p className="text-xs text-content-muted">{k.label}</p>
            <p className={`text-base sm:text-lg font-bold mt-1 ${k.color}`}>{k.value}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-surface-muted rounded-full">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${k.pctVal}%` }} />
              </div>
              <span className="text-xs text-content-muted shrink-0">{k.pctVal}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default">
            <h3 className="font-semibold text-content text-sm">Spend by Vendor</h3>
            <p className="text-xs text-content-muted mt-0.5">Total: {fmt(totalAmt)}</p>
          </div>
          {vendorRows.length === 0
            ? <p className="px-4 py-8 text-sm text-content-muted text-center">No purchase orders found.</p>
            : <Table>
                <thead className="bg-surface-muted border-b border-border-default">
                  <tr>{['Vendor', 'Type', 'Orders', 'Amount'].map(h => (
                    <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-content-muted uppercase ${h !== 'Vendor' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {vendorRows.map(([name, d]) => (
                    <tr key={name} className="hover:bg-surface-muted">
                      <td className="px-4 py-2.5 text-xs font-medium text-content">{name}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-content-muted">{d.type}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-content-muted">{d.count}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-content">{fmt(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-muted border-t border-border-default">
                  <tr>
                    <td colSpan={2} className="px-4 py-2.5 text-xs font-bold text-content">Total</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold">{orders.length}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold">{fmt(totalAmt)}</td>
                  </tr>
                </tfoot>
              </Table>
          }
        </div>

        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default">
            <h3 className="font-semibold text-content text-sm">Recent Purchase Orders</h3>
          </div>
          {orders.length === 0
            ? <p className="px-4 py-8 text-sm text-content-muted text-center">No orders found.</p>
            : <Table>
                <thead className="bg-surface-muted border-b border-border-default">
                  <tr>{['PO No.', 'Vendor', 'Date', 'Amount', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-content-muted uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {[...orders].sort((a, b) => b.poDate.localeCompare(a.poDate)).slice(0, 8).map(o => (
                    <tr key={o.id} className="hover:bg-surface-muted">
                      <td className="px-3 py-2.5 font-mono text-xs text-primary font-semibold">{o.poNumber}</td>
                      <td className="px-3 py-2.5 text-xs text-content">{o.vendorName}</td>
                      <td className="px-3 py-2.5 text-xs text-content-muted">{o.poDate}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-content">{fmt(o.totalAmount)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PO_STATUS[o.status] ?? 'bg-surface-muted text-content-muted'}`}>{o.status}</span>
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
        <div className="bg-surface-muted rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted">Total Revenue Billed</p>
          <p className="text-base sm:text-lg font-bold text-content mt-1">{fmt(totalRevenue)}</p>
        </div>
        <div className="bg-surface-muted rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted">Total Collected</p>
          <p className="text-base sm:text-lg font-bold text-green-700 mt-1">{fmt(totalCollected)}</p>
          <p className="text-xs text-content-muted mt-1">Collection rate: {pct(totalCollected, totalRevenue)}%</p>
        </div>
        <div className="bg-surface-muted rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted">Outstanding Balance</p>
          <p className="text-base sm:text-lg font-bold text-red-600 mt-1">{fmt(outstanding)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default">
            <h3 className="font-semibold text-content text-sm">Invoice Aging Summary</h3>
          </div>
          {aging.length === 0
            ? <p className="px-4 py-8 text-sm text-content-muted text-center">No invoices found.</p>
            : <Table>
                <thead className="bg-surface-muted border-b border-border-default">
                  <tr>{['Status', 'Count', 'Amount', 'Collected'].map(h => (
                    <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-content-muted uppercase ${h !== 'Status' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {aging.map(a => (
                    <tr key={a.status} className="hover:bg-surface-muted">
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${INV_STATUS_STYLE[a.status] ?? 'bg-surface-muted text-content-muted'}`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold">{a.count}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-content">{fmt(a.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-green-700">{fmt(a.collected)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-muted border-t border-border-default">
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-bold text-content">Total</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold">{invoices.length}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold">{fmt(totalRevenue)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-green-700">{fmt(totalCollected)}</td>
                  </tr>
                </tfoot>
              </Table>
          }
        </div>

        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default">
            <h3 className="font-semibold text-content text-sm">Outstanding Balance by Client</h3>
          </div>
          {customerBalance.length === 0
            ? <p className="px-4 py-8 text-sm text-content-muted text-center">No outstanding balances.</p>
            : <Table>
                <thead className="bg-surface-muted border-b border-border-default">
                  <tr>{['Client', 'Invoices', 'Balance Due'].map(h => (
                    <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-content-muted uppercase ${h === 'Balance Due' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {customerBalance.slice(0, 10).map(c => (
                    <tr key={c.id} className="hover:bg-surface-muted">
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium text-content">{c.fullName}</p>
                        <p className="text-[10px] text-content-muted">{c.mobile}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-content-muted">{c.invoiceCount}</td>
                      <td className={`px-4 py-2.5 text-right text-xs font-bold ${c.balance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {c.balance > 0 ? fmt(c.balance) : 'Settled'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-muted border-t border-border-default">
                  <tr>
                    <td colSpan={2} className="px-4 py-2.5 text-xs font-bold text-content">Total Outstanding</td>
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

      <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <h3 className="font-semibold text-content text-sm">Stock Movement Summary</h3>
          <p className="text-xs text-content-muted mt-0.5">Stock In → Issued → Current Balance</p>
        </div>
        {rows.length === 0
          ? <p className="px-4 py-8 text-sm text-content-muted text-center">No materials found.</p>
          : <Table minW={680}>
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {['Material', 'Unit', 'Stock In', 'Issued', 'Current Stock', 'Reorder', 'Avg Cost', 'Status'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${
                      ['Stock In','Issued','Current Stock','Reorder','Avg Cost'].includes(h) ? 'text-right' : 'text-left'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {rows.map(r => (
                  <tr key={r.id} className={`hover:bg-surface-muted ${r.isLowStock ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-content text-xs">{r.materialName}</td>
                    <td className="px-4 py-2.5 text-content-muted text-xs">{r.unit}</td>
                    <td className="px-4 py-2.5 text-right text-green-700 font-medium text-xs">+{r.totalIn.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-orange-600 font-medium text-xs">−{r.totalOut.toLocaleString()}</td>
                    <td className={`px-4 py-2.5 text-right font-bold text-xs ${r.isLowStock ? 'text-red-600' : 'text-content'}`}>
                      {r.currentStock.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-content-muted text-xs">{r.minimumStock.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-content-muted text-xs">{fmt(r.averageCost)}</td>
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
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default">
            <h3 className="font-semibold text-content text-sm">Material Issues by Project</h3>
          </div>
          <Table minW={400}>
            <thead className="bg-surface-muted border-b border-border-default">
              <tr>{['Project', 'Transactions', 'Total Qty Issued'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-content-muted uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {projectConsumption.map(([name, d]) => (
                <tr key={name} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-medium text-content text-xs">{name}</td>
                  <td className="px-4 py-3 text-center font-bold text-content text-xs">{d.count}</td>
                  <td className="px-4 py-3 font-semibold text-content text-xs">{d.qty.toLocaleString()}</td>
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
          <h1 className="text-xl sm:text-2xl font-bold text-content">Reports</h1>
          <p className="text-sm text-content-muted mt-0.5">Operational and financial reports across all modules</p>
        </div>
        <button onClick={() => window.print()}
          className="shrink-0 px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted font-medium flex items-center gap-2 text-content-muted">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      <div className="flex gap-1 flex-wrap border-b border-border-default">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors -mb-px ${
                tab === t.id
                  ? 'bg-surface border-border-default border-b-white text-primary'
                  : 'border-transparent text-content-muted hover:text-content hover:bg-surface-muted'
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
