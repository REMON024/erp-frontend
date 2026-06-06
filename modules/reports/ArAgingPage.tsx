'use client'
import { useState } from 'react'
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
  'Current':    'bg-green-100 text-green-700',
  '1-30 days':  'bg-yellow-100 text-yellow-700',
  '31-60 days': 'bg-orange-100 text-orange-700',
  '61-90 days': 'bg-red-100 text-red-700',
  '90+ days':   'bg-red-200 text-red-800',
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
          <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
          <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <button onClick={() => { setSubmitted(true); refetch() }}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          Run Report
        </button>
      </div>

      {!submitted && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Click "Run Report" to generate the AR aging analysis</p>
        </div>
      )}

      {submitted && (
        <DataState loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
          empty={!isLoading && data?.rows.length === 0} emptyMessage="No outstanding invoices found.">
          <>
            {/* Bucket summary */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(BUCKET_COLOR).map(([bucket, cls]) => (
                <div key={bucket} className={`rounded-xl border border-gray-200 p-4 ${cls.replace('text-', 'bg-').replace('700', '50').replace('800', '50').replace('bg-', 'bg-')}`}>
                  <p className="text-xs font-semibold uppercase">{bucket}</p>
                  <p className="text-lg font-bold mt-1">{fmt(bucketTotals[bucket] ?? 0)}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Invoice Detail</h3>
                <span className="text-sm font-bold text-red-700">Total Outstanding: {fmt(data?.totalOutstanding ?? 0)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Invoice No', 'Customer', 'Invoice Date', 'Due Date', 'Total', 'Paid', 'Outstanding', 'Days Overdue', 'Bucket'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data?.rows.map(r => (
                      <tr key={r.invoiceId} className={r.daysOverdue > 90 ? 'bg-red-50/40' : r.daysOverdue > 60 ? 'bg-orange-50/40' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-2 font-medium text-blue-700">{r.invoiceNo}</td>
                        <td className="px-3 py-2 text-gray-800">{r.customerName}</td>
                        <td className="px-3 py-2 text-gray-500">{r.invoiceDate}</td>
                        <td className="px-3 py-2 text-gray-500">{r.dueDate || '—'}</td>
                        <td className="px-3 py-2 text-right">{fmt(r.totalAmount)}</td>
                        <td className="px-3 py-2 text-right text-green-700">{fmt(r.paidAmount)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-700">{fmt(r.outstanding)}</td>
                        <td className="px-3 py-2 text-center">
                          {r.daysOverdue > 0 && (
                            <span className="flex items-center gap-1 justify-center text-red-600">
                              <AlertTriangle className="w-3 h-3" /> {r.daysOverdue}d
                            </span>
                          )}
                          {r.daysOverdue === 0 && <span className="text-green-600">Current</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BUCKET_COLOR[r.agingBucket] ?? 'bg-gray-100 text-gray-600'}`}>{r.agingBucket}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-xs uppercase text-gray-700">Total Outstanding</td>
                      <td className="px-3 py-2 text-right text-red-700">{fmt(data?.totalOutstanding ?? 0)}</td>
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
