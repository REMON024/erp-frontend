'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
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

      <div className="bg-surface rounded-xl border border-border-default p-4">
        <label className="block text-sm font-medium text-content mb-1">Select Account</label>
        <Select value={accountId} onChange={e => setAccountId(e.target.value)}
          className="w-full sm:max-w-md">
          <option value="">Choose an account…</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
        </Select>
      </div>

      {!accountId ? (
        <div className="py-16 text-center text-sm text-content-muted flex flex-col items-center gap-2">
          <BookOpen className="w-8 h-8 text-content-muted/50" />
          Select an account to view its ledger.
        </div>
      ) : (
        <DataState loading={isLoading} error={error ? 'Failed to load ledger.' : null} onRetry={refetch}>
          {ledger && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface rounded-xl border border-border-default p-4">
                  <p className="text-xs text-content-muted uppercase tracking-wide">Opening Balance</p>
                  <p className="text-xl font-bold text-content mt-1">{fmt(ledger.openingBalance)}</p>
                </div>
                <div className="bg-surface rounded-xl border border-border-default p-4">
                  <p className="text-xs text-content-muted uppercase tracking-wide">Transactions</p>
                  <p className="text-xl font-bold text-primary mt-1">{ledger.rows.length}</p>
                </div>
                <div className="bg-surface rounded-xl border border-border-default p-4">
                  <p className="text-xs text-content-muted uppercase tracking-wide">Closing Balance</p>
                  <p className="text-xl font-bold text-indigo-600 mt-1">{fmt(ledger.closingBalance)}</p>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-border-default overflow-hidden mt-4">
                <div className="px-5 py-3 border-b border-border-default">
                  <h3 className="font-semibold text-content text-sm">{ledger.accountName}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-surface-muted border-b border-border-default">
                      <tr>
                        {['Date', 'Voucher', 'Narration', 'Debit', 'Credit', 'Balance'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      <tr className="bg-surface-muted/50">
                        <td colSpan={5} className="px-4 py-2 text-xs font-medium text-content-muted">Opening Balance</td>
                        <td className="px-4 py-2 text-right font-semibold text-content">{fmt(ledger.openingBalance)}</td>
                      </tr>
                      {ledger.rows.map((r, i) => (
                        <tr key={i} className="hover:bg-surface-muted">
                          <td className="px-4 py-2.5 text-content-muted text-xs">{r.date}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-primary">{r.voucherNo}</td>
                          <td className="px-4 py-2.5 text-content-muted text-xs max-w-xs truncate">{r.narration ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-content">{r.debit ? fmt(r.debit) : '—'}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-content">{r.credit ? fmt(r.credit) : '—'}</td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold text-content">{fmt(r.balance)}</td>
                        </tr>
                      ))}
                      {ledger.rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-content-muted text-sm">No posted transactions for this account.</td></tr>}
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
