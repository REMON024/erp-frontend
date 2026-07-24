'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
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
  Paid:    'bg-success/10 text-success',
  Partial: 'bg-warning/15 text-warning',
  Unpaid:  'bg-surface-muted text-content-muted',
  Overdue: 'bg-danger/10 text-danger',
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
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between border ${genResult.ok ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
          <span>{genResult.msg}</span>
          <button onClick={() => setGenResult(null)} className="ml-4 text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Installments', value: installments.length, color: 'text-content' },
          { label: 'Paid',               value: paidCount,           color: 'text-success' },
          { label: 'Total Collected',    value: fmt(totalPaid),      color: 'text-primary' },
          { label: 'Outstanding',        value: fmt(totalDue),       color: 'text-danger' },
        ].map(s => (
          <div key={s.label} className="bg-surface rounded-xl border border-border-default p-4">
            <p className="text-xs text-content-muted uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search booking no or client…" onRefresh={refetch}>
        <Select value={status} onChange={e => setStatus(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Status</option>
          {['Paid', 'Partial', 'Unpaid', 'Overdue'].map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load schedules.' : null} onRetry={refetch}
        empty={displayed.length === 0} emptyMessage="No installment schedules found.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Booking' }, { h: 'Client' }, { h: '#', align: 'center' as const }, { h: 'Due Date' },
                    { h: 'Amount', num: true }, { h: 'Paid', num: true }, { h: 'Due', num: true },
                    { h: 'Status' }, { h: '' },
                  ].map(({ h, num, align }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {displayed.map(i => (
                  <tr key={i.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{i.bookingNo}</td>
                    <td className="px-4 py-3 text-content text-sm">{i.customerName}</td>
                    <td className="px-4 py-3 text-content-muted text-center">{i.installmentNo}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">
                      <div className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{i.dueDate}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-content text-right tabular-nums">{fmt(i.amount)}</td>
                    <td className="px-4 py-3 text-success text-xs text-right tabular-nums">{fmt(i.paidAmount)}</td>
                    <td className="px-4 py-3 text-danger text-xs text-right tabular-nums">{fmt(i.dueAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[i.status] ?? 'bg-surface-muted text-content-muted'}`}>
                        {STATUS_ICON[i.status]} {i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {i.invoiceId ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                          <FileText className="w-3 h-3" /> Invoiced
                        </span>
                      ) : i.status !== 'Paid' ? (
                        <button
                          onClick={() => generateInvoice(i)}
                          disabled={generating === i.id}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-info/20 text-primary hover:bg-primary/10 disabled:opacity-50 font-medium"
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
