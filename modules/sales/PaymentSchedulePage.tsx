'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { CheckCircle, Clock, AlertTriangle, CalendarDays, FileText } from 'lucide-react'
import api from '@/lib/api'

interface Installment {
  id: number; bookingId: number; bookingNo: string
  customerId: number; customerName: string; projectId: number
  installmentNo: number; dueDate: string; amount: number
  paidAmount: number; dueAmount: number; penaltyAmount: number
  status: string; invoiceId?: number
}

const STATUS_COLORS: Record<string, string> = {
  Paid:    'bg-green-100 text-green-700',
  Partial: 'bg-yellow-100 text-yellow-700',
  Unpaid:  'bg-gray-100 text-gray-600',
  Overdue: 'bg-red-100 text-red-700',
}
const STATUS_ICON: Record<string, React.ReactNode> = {
  Paid:    <CheckCircle className="w-3 h-3" />,
  Partial: <Clock className="w-3 h-3" />,
  Unpaid:  <Clock className="w-3 h-3" />,
  Overdue: <AlertTriangle className="w-3 h-3" />,
}
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

export function PaymentSchedulePage() {
  const qc = useQueryClient()
  const [search, setSearch]       = useState('')
  const [status, setStatus]       = useState('')
  const [generating, setGenerating] = useState<number | null>(null)
  const [genResult, setGenResult] = useState<{ id: number; ok: boolean; msg: string } | null>(null)

  const { data: installments = [], isLoading, error, refetch } = useApiData<Installment[]>({
    url: '/installments',
    params: { status: status || undefined },
    queryKey: ['installments', status],
  })

  const generateInvoice = async (inst: Installment) => {
    setGenerating(inst.id)
    setGenResult(null)
    try {
      await api.post('/invoices', {
        customerId:  inst.customerId,
        projectId:   inst.projectId,
        bookingId:   inst.bookingId,
        invoiceType: 'Installment',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate:     inst.dueDate,
        subTotal:    inst.amount,
        discountAmount: 0,
        vatAmount:   0,
        taxAmount:   0,
      })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['installments'] })
      setGenResult({ id: inst.id, ok: true, msg: `Invoice generated for installment #${inst.installmentNo}` })
    } catch (e: any) {
      setGenResult({ id: inst.id, ok: false, msg: e.response?.data?.errors?.[0] ?? 'Failed to generate invoice' })
    } finally {
      setGenerating(null)
    }
  }

  const displayed = installments.filter(i =>
    !search ||
    i.bookingNo.toLowerCase().includes(search.toLowerCase()) ||
    i.customerName.toLowerCase().includes(search.toLowerCase()))

  const totalDue  = installments.reduce((s, i) => s + i.dueAmount, 0)
  const totalPaid = installments.reduce((s, i) => s + i.paidAmount, 0)
  const paidCount = installments.filter(i => i.status === 'Paid').length

  return (
    <div className="space-y-6">
      <PageHeader title="Payment Schedules" subtitle="Installment schedules across all active bookings" />

      {genResult && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between border ${genResult.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <span>{genResult.msg}</span>
          <button onClick={() => setGenResult(null)} className="ml-4 text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Installments', value: installments.length, color: 'text-gray-900' },
          { label: 'Paid',               value: paidCount,           color: 'text-green-600' },
          { label: 'Total Collected',    value: fmt(totalPaid),      color: 'text-blue-600' },
          { label: 'Outstanding',        value: fmt(totalDue),       color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search booking no or client…" onRefresh={refetch}>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Status</option>
          {['Paid', 'Partial', 'Unpaid', 'Overdue'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load schedules.' : null} onRetry={refetch}
        empty={displayed.length === 0} emptyMessage="No installment schedules found.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Booking', 'Client', '#', 'Due Date', 'Amount', 'Paid', 'Due', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{i.bookingNo}</td>
                    <td className="px-4 py-3 text-gray-900 text-sm">{i.customerName}</td>
                    <td className="px-4 py-3 text-gray-500 text-center">{i.installmentNo}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <div className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{i.dueDate}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(i.amount)}</td>
                    <td className="px-4 py-3 text-green-700 text-xs">{fmt(i.paidAmount)}</td>
                    <td className="px-4 py-3 text-red-600 text-xs">{fmt(i.dueAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[i.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_ICON[i.status]} {i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {i.invoiceId ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                          <FileText className="w-3 h-3" /> Invoiced
                        </span>
                      ) : i.status !== 'Paid' ? (
                        <button
                          onClick={() => generateInvoice(i)}
                          disabled={generating === i.id}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 font-medium"
                        >
                          <FileText className="w-3 h-3" />
                          {generating === i.id ? 'Generating…' : 'Generate Invoice'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>
    </div>
  )
}
