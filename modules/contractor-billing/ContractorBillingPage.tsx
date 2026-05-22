'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ContractorBill, BillItem } from '@/types'

function fmt(n: number) {
  return '৳' + n.toLocaleString('en-BD')
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  draft:     { label: 'Draft',     color: 'bg-slate-100 text-slate-600',   next: 'submit',  nextLabel: 'Submit' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700',     next: 'verify',  nextLabel: 'Verify' },
  verified:  { label: 'Verified',  color: 'bg-purple-100 text-purple-700', next: 'approve', nextLabel: 'Approve' },
  approved:  { label: 'Approved',  color: 'bg-orange-100 text-orange-700', next: 'pay',     nextLabel: 'Mark Paid' },
  paid:      { label: 'Paid',      color: 'bg-green-100 text-green-700' },
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color ?? 'text-slate-800'}`}>{value}</p>
    </div>
  )
}

export default function ContractorBillingPage() {
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<ContractorBill | null>(null)
  const qc = useQueryClient()

  const { data: billsRes, isLoading } = useQuery({
    queryKey: ['contractor-bills', projectFilter, statusFilter],
    queryFn: () => api.get('/contractor-bills', {
      params: { project_id: projectFilter || undefined, status: statusFilter || undefined },
    }).then(r => r.data),
  })
  const bills: ContractorBill[] = billsRes?.data ?? []

  const { data: summaryRes } = useQuery({
    queryKey: ['contractor-bills-summary'],
    queryFn: () => api.get('/contractor-bills/summary').then(r => r.data),
  })
  const summary = summaryRes?.data

  const { data: itemsRes } = useQuery({
    queryKey: ['bill-items', selected?.id],
    queryFn: () => selected ? api.get(`/contractor-bills/${selected.id}/items`).then(r => r.data) : null,
    enabled: !!selected,
  })
  const items: BillItem[] = itemsRes?.data ?? []

  const advanceMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/contractor-bills/${id}/${action}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractor-bills'] })
      setSelected(null)
    },
  })

  function handleAdvance(bill: ContractorBill) {
    const cfg = STATUS_CONFIG[bill.status]
    if (!cfg?.next) return
    advanceMutation.mutate({ id: bill.id, action: cfg.next })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Contractor Billing</h1>
        <p className="text-sm text-slate-500">Running bills, verification and payment approvals</p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard label="Total Billed" value={fmt(summary.total_billed)} />
          <SummaryCard label="Total Paid" value={fmt(summary.total_paid)} color="text-green-700" />
          <SummaryCard label="Outstanding" value={fmt(summary.outstanding)} color="text-orange-600" />
          <SummaryCard label="Retention Held" value={fmt(summary.total_retention_held)} color="text-purple-700" />
          <SummaryCard label="Pending Approval" value={String(summary.pending_approval_count)} color="text-blue-700" />
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
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
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Bills List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Bills ({bills.length})</h3>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading…</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {bills.map(bill => {
                const cfg = STATUS_CONFIG[bill.status]
                const paidPct = bill.net_payable > 0 ? Math.round((bill.paid_amount / bill.net_payable) * 100) : 0
                return (
                  <button
                    key={bill.id}
                    onClick={() => setSelected(selected?.id === bill.id ? null : bill)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === bill.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{bill.bill_number}</p>
                        <p className="text-xs text-slate-500">{bill.period_from} – {bill.period_to}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                      <span>Gross: {fmt(bill.gross_amount)}</span>
                      <span>Net: {fmt(bill.net_payable)}</span>
                    </div>
                    {bill.status !== 'draft' && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
                          <span>Paid</span><span>{paidPct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${paidPct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
              {bills.length === 0 && (
                <div className="p-8 text-center text-slate-400">No bills found</div>
              )}
            </div>
          )}
        </div>

        {/* Bill Detail */}
        <div className="lg:col-span-3 space-y-4">
          {!selected ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              Select a bill to view details
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{selected.bill_number}</h3>
                    <p className="text-sm text-slate-500">Period: {selected.period_from} to {selected.period_to}</p>
                    {selected.remarks && <p className="text-sm text-slate-600 mt-1 italic">"{selected.remarks}"</p>}
                  </div>
                  {STATUS_CONFIG[selected.status]?.next && (
                    <button
                      onClick={() => handleAdvance(selected)}
                      disabled={advanceMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {advanceMutation.isPending ? 'Processing…' : STATUS_CONFIG[selected.status].nextLabel}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-400">Gross Amount</p>
                    <p className="font-semibold text-slate-800">{fmt(selected.gross_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Retention ({selected.retention_pct}%)</p>
                    <p className="font-semibold text-orange-600">-{fmt(selected.retention_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Net Payable</p>
                    <p className="font-bold text-blue-700">{fmt(selected.net_payable)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Paid Amount</p>
                    <p className="font-semibold text-green-700">{fmt(selected.paid_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Balance Due</p>
                    <p className="font-semibold text-red-600">{fmt(selected.net_payable - selected.paid_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Status</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[selected.status].color}`}>
                      {STATUS_CONFIG[selected.status].label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill Items */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800">Bill Items</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right">Unit</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700">{item.description}</td>
                        <td className="px-4 py-2 text-right text-slate-500">{item.unit}</td>
                        <td className="px-4 py-2 text-right text-slate-700">{item.quantity.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-slate-700">{fmt(item.rate)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-800">{fmt(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-bold bg-slate-50">
                      <td colSpan={4} className="px-4 py-3 text-slate-700">Total</td>
                      <td className="px-4 py-3 text-right text-slate-800">{fmt(items.reduce((s, i) => s + i.amount, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
