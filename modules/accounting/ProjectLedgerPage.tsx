'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { BookOpen } from 'lucide-react'

interface Account { id: number; accountCode: string; accountName: string }
interface LedgerRow { date: string; voucherNo: string; narration?: string; debit: number; credit: number; balance: number }
interface Ledger { accountName: string; openingBalance: number; rows: LedgerRow[]; closingBalance: number }

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

export function ProjectLedgerPage() {
  const [accountId, setAccountId] = useState('')

  const { data: accounts = [] } = useApiData<Account[]>({ url: '/accounts', queryKey: ['accounts-list'] })

  const { data: ledger, isLoading, error, refetch } = useApiData<Ledger>({
    url: '/reports/ledger',
    params: { accountId: accountId || undefined },
    queryKey: ['ledger', accountId],
    enabled: !!accountId,
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Account Ledger" subtitle="Posted transactions for a selected account" />

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Account</label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)}
          className="w-full sm:max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">Choose an account…</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
        </select>
      </div>

      {!accountId ? (
        <div className="py-16 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
          <BookOpen className="w-8 h-8 text-gray-300" />
          Select an account to view its ledger.
        </div>
      ) : (
        <DataState loading={isLoading} error={error ? 'Failed to load ledger.' : null} onRetry={refetch}>
          {ledger && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Opening Balance</p>
                  <p className="text-xl font-bold text-gray-700 mt-1">{fmt(ledger.openingBalance)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Transactions</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">{ledger.rows.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Closing Balance</p>
                  <p className="text-xl font-bold text-indigo-600 mt-1">{fmt(ledger.closingBalance)}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">{ledger.accountName}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Date', 'Voucher', 'Narration', 'Debit', 'Credit', 'Balance'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="bg-gray-50/50">
                        <td colSpan={5} className="px-4 py-2 text-xs font-medium text-gray-500">Opening Balance</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-700">{fmt(ledger.openingBalance)}</td>
                      </tr>
                      {ledger.rows.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{r.date}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-blue-600">{r.voucherNo}</td>
                          <td className="px-4 py-2.5 text-gray-600 text-xs max-w-xs truncate">{r.narration ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-gray-900">{r.debit ? fmt(r.debit) : '—'}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-gray-900">{r.credit ? fmt(r.credit) : '—'}</td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900">{fmt(r.balance)}</td>
                        </tr>
                      ))}
                      {ledger.rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No posted transactions for this account.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </DataState>
      )}
    </div>
  )
}
