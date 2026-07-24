'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

interface TbRow { accountCode: string; accountName: string; accountType: string; debit: number; credit: number }
interface TrialBalance { rows: TbRow[]; totalDebit: number; totalCredit: number }

interface ReconCheck { label: string; sourceTotal: number; ledgerTotal: number; difference: number; isBalanced: boolean }
interface Reconciliation { allBalanced: boolean; totalDebit: number; totalCredit: number; checks: ReconCheck[] }

function fmt(n: number) { return n === 0 ? '—' : `৳${n.toLocaleString('en-BD')}` }

export function TrialBalancePage() {
  const tb = useApiData<TrialBalance>({ url: '/reports/trial-balance', queryKey: ['report-tb'] })
  const recon = useApiData<Reconciliation>({ url: '/reports/reconciliation', queryKey: ['report-recon'] })

  const data = tb.data ?? { rows: [], totalDebit: 0, totalCredit: 0 }
  const r = recon.data
  const balanced = data.totalDebit === data.totalCredit

  return (
    <div className="space-y-6">
      <PageHeader title="Trial Balance" subtitle="Account balances from posted vouchers with source-module reconciliation" />

      {/* Reconciliation banner (PRD-07 FR-ACC-10) */}
      {r && (
        <div className={`rounded-xl border p-4 ${r.allBalanced ? 'bg-success/10 border-success/20' : 'bg-warning/15 border-warning/20'}`}>
          <div className="flex items-center gap-2">
            {r.allBalanced
              ? <CheckCircle2 className="w-5 h-5 text-success" />
              : <AlertTriangle className="w-5 h-5 text-warning" />}
            <h3 className={`font-semibold text-sm ${r.allBalanced ? 'text-success' : 'text-warning'}`}>
              {r.allBalanced ? 'Ledger reconciled — all checks balanced' : 'Reconciliation mismatch detected'}
            </h3>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {r.checks.map((c) => (
              <div key={c.label} className="flex items-center justify-between rounded-lg bg-surface border border-border-default px-3 py-2 text-sm">
                <span className="text-content">{c.label}</span>
                <span className={c.isBalanced ? 'text-success font-medium' : 'text-danger font-semibold'}>
                  {c.isBalanced ? 'OK' : `Δ ${fmt(c.difference)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataState loading={tb.isLoading} error={tb.error ? 'Failed to load trial balance.' : null} onRetry={tb.refetch}>
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-content-muted">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Code</th>
                <th className="text-left px-4 py-2 font-medium">Account</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-right px-4 py-2 font-medium">Debit</th>
                <th className="text-right px-4 py-2 font-medium">Credit</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.accountCode} className="border-t border-border-default">
                  <td className="px-4 py-2 text-content-muted">{row.accountCode}</td>
                  <td className="px-4 py-2 text-content">{row.accountName}</td>
                  <td className="px-4 py-2 text-content-muted">{row.accountType}</td>
                  <td className="px-4 py-2 text-right">{fmt(row.debit)}</td>
                  <td className="px-4 py-2 text-right">{fmt(row.credit)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 font-semibold ${balanced ? 'border-success/20 bg-success/10' : 'border-danger/20 bg-danger/10'}`}>
                <td className="px-4 py-2" colSpan={3}>Total {balanced ? '(Dr = Cr)' : '(out of balance!)'}</td>
                <td className="px-4 py-2 text-right">{fmt(data.totalDebit)}</td>
                <td className="px-4 py-2 text-right">{fmt(data.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </DataState>
    </div>
  )
}
