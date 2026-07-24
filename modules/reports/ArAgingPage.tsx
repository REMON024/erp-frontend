'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { AlertTriangle, Clock } from 'lucide-react'

interface ArAgingRow {
  invoiceId: number; invoiceNo: string; customerName: string
  invoiceDate: string; dueDate: string
  totalAmount: number; paidAmount: number; outstanding: number
  daysOverdue: number; agingBucket: string
}
interface ArAgingDto { rows: ArAgingRow[]; totalOutstanding: number }

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

const BUCKET_COLOR: Record<string, string> = {
  'Current':    'bg-success/10 text-success',
  '1-30 days':  'bg-warning/15 text-warning',
  '31-60 days': 'bg-warning/15 text-warning',
  '61-90 days': 'bg-danger/10 text-danger',
  '90+ days':   'bg-danger text-danger',
}

export function ArAgingPage() {
  const [asOfDate, setAsOfDate] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { data, isLoading, error, refetch } = useApiData<ArAgingDto>({
    url: `/reports/ar-aging`,
    params: { asOfDate: asOfDate || undefined },
    queryKey: ['ar-aging', asOfDate, submitted],
    enabled: submitted,
  })

  const bucketTotals: Record<string, number> = {}
  data?.rows.forEach(r => { bucketTotals[r.agingBucket] = (bucketTotals[r.agingBucket] ?? 0) + r.outstanding })

  return (
    <div className="space-y-6">
      <PageHeader title="AR Aging Report" subtitle="Outstanding invoices grouped by age from due date" />

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-content mb-1">As of Date</label>
          <DateField value={asOfDate} onChange={e => setAsOfDate(e.target.value)}
            className="min-w-[150px]" />
        </div>
        <button onClick={() => { setSubmitted(true); refetch() }}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium">
          Run Report
        </button>
      </div>

      {!submitted && (
        <div className="rounded-xl border border-dashed border-border-default bg-surface-muted p-12 text-center">
          <Clock className="w-10 h-10 text-content-muted/50 mx-auto mb-3" />
          <p className="text-sm text-content-muted">Click "Run Report" to generate the AR aging analysis</p>
        </div>
      )}

      {submitted && (
        <DataState loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
          empty={!isLoading && data?.rows.length === 0} emptyMessage="No outstanding invoices found.">
          <>
            {/* Bucket summary */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(BUCKET_COLOR).map(([bucket, cls]) => (
                <div key={bucket} className={`rounded-xl border border-border-default p-4 ${cls.replace('text-', 'bg-').replace('700', '50').replace('800', '50').replace('bg-', 'bg-')}`}>
                  <p className="text-xs font-semibold uppercase">{bucket}</p>
                  <p className="text-lg font-bold mt-1">{fmt(bucketTotals[bucket] ?? 0)}</p>
                </div>
              ))}
            </div>

            <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
              <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
                <h3 className="font-semibold text-content">Invoice Detail</h3>
                <span className="text-sm font-bold text-danger">Total Outstanding: {fmt(data?.totalOutstanding ?? 0)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-sm">
                  <thead className="bg-surface-muted border-b border-border-default">
                    <tr>
                      {['Invoice No', 'Customer', 'Invoice Date', 'Due Date', 'Total', 'Paid', 'Outstanding', 'Days Overdue', 'Bucket'].map(h => (
                        <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${['Total','Paid','Outstanding'].includes(h) ? 'text-right' : h === 'Days Overdue' ? 'text-center' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {data?.rows.map(r => (
                      <tr key={r.invoiceId} className={r.daysOverdue > 90 ? 'bg-danger/10' : r.daysOverdue > 60 ? 'bg-warning/15' : 'hover:bg-surface-muted'}>
                        <td className="px-3 py-2 font-medium text-primary">{r.invoiceNo}</td>
                        <td className="px-3 py-2 text-content">{r.customerName}</td>
                        <td className="px-3 py-2 text-content-muted">{r.invoiceDate}</td>
                        <td className="px-3 py-2 text-content-muted">{r.dueDate || '—'}</td>
                        <td className="px-3 py-2 text-right">{fmt(r.totalAmount)}</td>
                        <td className="px-3 py-2 text-right text-success">{fmt(r.paidAmount)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-danger">{fmt(r.outstanding)}</td>
                        <td className="px-3 py-2 text-center">
                          {r.daysOverdue > 0 && (
                            <span className="flex items-center gap-1 justify-center text-danger">
                              <AlertTriangle className="w-3 h-3" /> {r.daysOverdue}d
                            </span>
                          )}
                          {r.daysOverdue === 0 && <span className="text-success">Current</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BUCKET_COLOR[r.agingBucket] ?? 'bg-surface-muted text-content-muted'}`}>{r.agingBucket}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-border-default bg-surface-muted font-bold">
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-xs uppercase text-content">Total Outstanding</td>
                      <td className="px-3 py-2 text-right text-danger">{fmt(data?.totalOutstanding ?? 0)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        </DataState>
      )}
    </div>
  )
}
