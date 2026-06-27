'use client'
import { useApiData } from '@/hooks/useApiData'
import { Modal } from '@/components/ui/Modal'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Loader2, ShoppingCart, Receipt, TrendingUp } from 'lucide-react'

interface PoLine { id: number; poNumber: string; poDate: string; status: string; totalAmount: number; receivedAmount: number; projectName?: string }
interface PayLine { id: number; paymentNo: string; paymentDate: string; amount: number; method: string; referenceNo?: string }
interface VendorHistory {
  vendorId: number; vendorName: string; vendorType: string
  contactPerson?: string; mobile?: string; email?: string
  totalOrders: number; totalOrderValue: number; totalPaid: number; outstandingPayable: number
  purchaseOrders: PoLine[]; payments: PayLine[]
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 0 })}` }

const STATUS_COLORS: Record<string, string> = {
  Draft:     'bg-gray-100 text-gray-600',
  Approved:  'bg-green-100 text-green-700',
  Received:  'bg-blue-100 text-blue-700',
  Cancelled: 'bg-red-100 text-red-600',
}
const METHOD_COLORS: Record<string, string> = {
  Cash:   'bg-green-100 text-green-700',
  Bank:   'bg-blue-100 text-blue-700',
  Cheque: 'bg-amber-100 text-amber-700',
  Online: 'bg-purple-100 text-purple-700',
}

export function VendorHistoryModal({ vendorId, vendorName, onClose }: {
  vendorId: number; vendorName: string; onClose: () => void
}) {
  const { data, isLoading } = useApiData<VendorHistory>({
    url: `/vendors/${vendorId}/history`,
    queryKey: ['vendor-history', vendorId],
  })

  // Monthly spend from POs
  const monthlySpend = (() => {
    if (!data) return []
    const map: Record<string, number> = {}
    data.purchaseOrders.forEach(po => {
      const m = po.poDate.slice(0, 7)
      map[m] = (map[m] || 0) + po.totalAmount
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([month, amount]) => ({ month, amount }))
  })()

  return (
    <Modal open onClose={onClose} title={`Vendor History — ${vendorName}`} size="xl">
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.totalOrders}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-blue-50 p-4">
              <p className="text-xs text-blue-600 uppercase tracking-wide">Total PO Value</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{fmt(data.totalOrderValue)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-green-50 p-4">
              <p className="text-xs text-green-600 uppercase tracking-wide">Total Paid</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{fmt(data.totalPaid)}</p>
            </div>
            <div className={`rounded-xl border p-4 ${data.outstandingPayable > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-xs uppercase tracking-wide ${data.outstandingPayable > 0 ? 'text-red-600' : 'text-gray-500'}`}>Outstanding</p>
              <p className={`text-2xl font-bold mt-1 ${data.outstandingPayable > 0 ? 'text-red-900' : 'text-gray-900'}`}>{fmt(data.outstandingPayable)}</p>
            </div>
          </div>

          {/* Monthly spend chart */}
          {monthlySpend.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-800">Monthly Purchase Spend</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlySpend} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [`৳${Number(v ?? 0).toLocaleString('en-BD')}`, 'PO Value']} />
                  <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Purchase orders */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <ShoppingCart className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Purchase Orders ({data.purchaseOrders.length})</h3>
            </div>
            {data.purchaseOrders.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No purchase orders found.</p>
              : <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>{['PO No.', 'Date', 'Project', 'Amount', 'Status'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.purchaseOrders.map(po => (
                        <tr key={po.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-600">{po.poNumber}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{po.poDate}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{po.projectName ?? '—'}</td>
                          <td className="px-4 py-2.5 font-semibold text-gray-900">{fmt(po.totalAmount)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-600'}`}>{po.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-xs font-bold text-gray-700">Total</td>
                        <td className="px-4 py-2 font-bold text-gray-900">{fmt(data.totalOrderValue)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>}
          </div>

          {/* Vendor payments */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <Receipt className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Payments Made ({data.payments.length})</h3>
            </div>
            {data.payments.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No payments recorded for this vendor.</p>
              : <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>{['Payment No.', 'Date', 'Amount', 'Method', 'Reference'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.payments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-600">{p.paymentNo}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{p.paymentDate}</td>
                          <td className="px-4 py-2.5 font-semibold text-green-700">{fmt(p.amount)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${METHOD_COLORS[p.method] ?? 'bg-gray-100'}`}>{p.method}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-400">{p.referenceNo ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 bg-gray-50">
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-700">Total Paid</td>
                        <td className="px-4 py-2 font-bold text-green-800">{fmt(data.totalPaid)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>}
          </div>
        </div>
      )}
    </Modal>
  )
}
