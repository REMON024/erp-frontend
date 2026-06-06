'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface PlRow { accountName: string; amount: number }
interface ProfitLoss {
  revenue: PlRow[]; totalRevenue: number
  expenses: PlRow[]; totalExpenses: number
  netProfit: number
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

export function ProfitLossPage() {
  const { data, isLoading, error, refetch } = useApiData<ProfitLoss>({
    url: '/reports/profit-loss', queryKey: ['report-pl'],
  })

  const pl = data ?? { revenue: [], totalRevenue: 0, expenses: [], totalExpenses: 0, netProfit: 0 }
  const isProfit = pl.netProfit >= 0

  return (
    <div className="space-y-6">
      <PageHeader title="Profit & Loss Statement" subtitle="Revenue and expense summary from posted vouchers" />

      <DataState loading={isLoading} error={error ? 'Failed to load P&L.' : null} onRetry={refetch}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{fmt(pl.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{fmt(pl.totalExpenses)}</p>
          </div>
          <div className={`rounded-xl border p-5 ${isProfit ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              {isProfit ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
              Net {isProfit ? 'Profit' : 'Loss'}
            </p>
            <p className={`text-2xl font-bold mt-1 ${isProfit ? 'text-green-700' : 'text-red-700'}`}>{fmt(Math.abs(pl.netProfit))}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-green-50">
              <h3 className="font-semibold text-green-800 text-sm">Revenue</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {pl.revenue.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5 text-gray-700">{r.accountName}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-900">{fmt(r.amount)}</td>
                  </tr>
                ))}
                {pl.revenue.length === 0 && <tr><td className="px-5 py-6 text-center text-gray-400 text-sm" colSpan={2}>No revenue posted</td></tr>}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr><td className="px-5 py-2.5 font-bold text-gray-700">Total Revenue</td><td className="px-5 py-2.5 text-right font-bold text-green-700">{fmt(pl.totalRevenue)}</td></tr>
              </tfoot>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-red-50">
              <h3 className="font-semibold text-red-800 text-sm">Expenses</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {pl.expenses.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5 text-gray-700">{r.accountName}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-900">{fmt(r.amount)}</td>
                  </tr>
                ))}
                {pl.expenses.length === 0 && <tr><td className="px-5 py-6 text-center text-gray-400 text-sm" colSpan={2}>No expenses posted</td></tr>}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr><td className="px-5 py-2.5 font-bold text-gray-700">Total Expenses</td><td className="px-5 py-2.5 text-right font-bold text-red-700">{fmt(pl.totalExpenses)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      </DataState>
    </div>
  )
}
