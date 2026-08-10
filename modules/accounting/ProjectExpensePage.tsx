'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, AlertCircle, Info } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { DateField } from '@/components/ui/DateField'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { useApiData } from '@/hooks/useApiData'
import { ResourcePicker } from '@/components/pickers/ResourcePicker'
import { ScopePicker, scopeToParams, EMPTY_SCOPE, type ScopeValue } from '@/components/pickers/ScopePicker'
import api from '@/lib/api'

/**
 * Costs that belong to no work order and no purchase order — RAJUK approval, water and gas line
 * connections, consultancy fees.
 *
 * The voucher screen could always record these, but only by asking for two balancing accounts and
 * a voucher type. This asks for one amount and one fee, and writes the same voucher underneath, so
 * the ledger, the BOQ and the cost rollup all see it without a second source of truth.
 */

interface Account {
  id: number; accountCode: string; accountName: string
  isPosting: boolean; accountType: string; isIndirectCost: boolean
}

interface ProjectExpense {
  id: number; voucherNo: string; expenseDate: string
  projectId: number | null; nodeId: number | null; scopeLabel: string | null
  resourceId: number | null; resourceName: string | null
  expenseAccountId: number; expenseAccountCode: string; expenseAccountName: string
  isIndirect: boolean
  amount: number; allocationBasis: string | null
  referenceNo: string | null; narration: string | null
  status: string; isPosted: boolean
}

const fmt = (n: number) => `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const isoToday = () => new Date().toISOString().split('T')[0]

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const BASIS_LABEL: Record<string, string> = { area: 'By area', equal: 'Equally per unit' }

interface FormValues {
  expenseDate: string
  resourceId: string
  expenseAccountId: string
  paidFromAccountId: string
  amount: string
  referenceNo: string
  narration: string
  allocationBasis: string
}

// ── New expense modal ──────────────────────────────────────────────────────────
function NewExpenseModal({ accounts, onClose, onSaved }: {
  accounts: Account[]
  onClose: () => void
  onSaved: (warning: string | null) => void
}) {
  const [scope, setScope] = useState<ScopeValue>(EMPTY_SCOPE)
  const [err, setErr]     = useState('')
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      expenseDate: isoToday(), resourceId: '', expenseAccountId: '', paidFromAccountId: '',
      amount: '', referenceNo: '', narration: '', allocationBasis: '',
    },
  })

  const posting  = accounts.filter(a => a.isPosting)
  const expenses = posting.filter(a => a.accountType === 'Expense')
  // Cash and bank are where the money leaves from. The server's PV rule rejects anything else,
  // so offering the full asset list here would only produce a confusing failure.
  const funding  = posting.filter(a => a.accountType === 'Asset')

  const chosenExpense = accounts.find(a => a.id === Number(watch('expenseAccountId')))
  // A charge pinned to a sellable node is borne by that node alone — there is nothing beneath it
  // to split across, so the choice would be meaningless.
  const splitApplies = !scope.nodeId

  const onSubmit = async (d: FormValues) => {
    if (!scope.projectId) { setErr('Choose the project this cost belongs to.'); return }
    if (!(parseFloat(d.amount) > 0)) { setErr('Enter an amount greater than zero.'); return }

    setSaving(true); setErr('')
    try {
      const res = await api.post('/project-expenses', {
        expenseDate:       d.expenseDate,
        projectId:         Number(scope.projectId),
        nodeId:            scope.nodeId ? Number(scope.nodeId) : undefined,
        resourceId:        d.resourceId ? Number(d.resourceId) : undefined,
        expenseAccountId:  Number(d.expenseAccountId),
        paidFromAccountId: Number(d.paidFromAccountId),
        amount:            parseFloat(d.amount),
        referenceNo:       d.referenceNo || undefined,
        narration:         d.narration || undefined,
        allocationBasis:   splitApplies && d.allocationBasis ? d.allocationBasis : undefined,
        postImmediately:   true,
      })
      const body = (res.data as any)?.data ?? res.data
      onSaved(body?.warning ?? null)
      onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Record Project Expense" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {err && (
          <div className="flex items-center gap-2 px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />{err}
          </div>
        )}

        <div>
          <label className={lbl}>Charge to <span className="text-danger">*</span></label>
          <ScopePicker value={scope} onChange={setScope} mode="form" />
          <p className="text-xs text-content-muted mt-1">
            Leave the node blank for a charge on the whole development — the cost rollup then splits
            it down to every unit.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Date <span className="text-danger">*</span></label>
            <DateField {...register('expenseDate')} />
          </div>
          <div>
            <label className={lbl}>Amount <span className="text-danger">*</span></label>
            <input {...register('amount')} type="number" step="0.01" min="0" className={inp} placeholder="0.00" />
          </div>
          <div>
            <label className={lbl}>Reference No</label>
            <input {...register('referenceNo')} className={inp} placeholder="Receipt / challan no" />
          </div>
        </div>

        <div>
          <label className={lbl}>Fee type</label>
          {/* Service and Labour only: this screen exists for fees and charges, and offering the
              material catalogue here would invite spend that belongs on a purchase order. */}
          <ResourcePicker
            value={watch('resourceId') ? Number(watch('resourceId')) : ''}
            onChange={id => setValue('resourceId', id ? String(id) : '')}
            types={['Service', 'Labour']}
            placeholder="Not against a specific budget line"
          />
          <p className="text-xs text-content-muted mt-1">
            Naming the fee puts it on the cost rollup by name and against its own budget line. Left
            blank, the amount is spread across the covering estimate.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Expense account <span className="text-danger">*</span></label>
            <Select {...register('expenseAccountId')}>
              <option value="">Select…</option>
              {expenses.map(a => <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
            </Select>
          </div>
          <div>
            <label className={lbl}>Paid from <span className="text-danger">*</span></label>
            <Select {...register('paidFromAccountId')}>
              <option value="">Select…</option>
              {funding.map(a => <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
            </Select>
          </div>
        </div>

        {chosenExpense?.isIndirectCost && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
            <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <span className="text-content">
              <strong>{chosenExpense.accountName}</strong> is an indirect cost account. It will only
              reach unit cost if &ldquo;include indirect cost&rdquo; is switched on in Settings.
            </span>
          </div>
        )}

        {splitApplies && (
          <div>
            <label className={lbl}>Split across units</label>
            <Select {...register('allocationBasis')}>
              <option value="">Use the company setting</option>
              <option value="area">By area — larger flats bear more</option>
              <option value="equal">Equally per unit — every flat bears the same</option>
            </Select>
            <p className="text-xs text-content-muted mt-1">
              Leave as the company setting unless the charge is genuinely per flat. A connection or
              utility charge scales with area; a per-flat government fee does not.
            </p>
          </div>
        )}

        <div>
          <label className={lbl}>Narration</label>
          <input {...register('narration')} className={inp} placeholder="What this payment was for…" />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border-default text-content hover:bg-surface-muted">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-white font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Record & Post'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export function ProjectExpensePage() {
  const [scope, setScope]   = useState<ScopeValue>(EMPTY_SCOPE)
  const [showNew, setShowNew] = useState(false)
  const [notice, setNotice]   = useState<string | null>(null)
  const qc = useQueryClient()

  const { data: accounts = [] } = useApiData<Account[]>({ url: '/accounts', queryKey: ['accounts-list'] })

  const { data = [], isLoading, error, refetch } = useApiData<ProjectExpense[]>({
    url: '/project-expenses',
    params: scopeToParams(scope),
    queryKey: ['project-expenses', scope.projectId, scope.nodeId],
  })

  const total = data.reduce((s, e) => s + e.amount, 0)

  const onSaved = (warning: string | null) => {
    setNotice(warning)
    // The rollup and the BOQ both move when an expense posts, so neither may be left stale.
    qc.invalidateQueries({ queryKey: ['project-expenses'] })
    qc.invalidateQueries({ queryKey: ['cost-rollup'] })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Expenses"
        subtitle="Fees and charges that arrive outside any order — approval fees, utility connections, consultancy"
        action={
          <PermissionGate module="PROJECT_EXPENSES" action="create">
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">
              <Plus className="w-4 h-4" /> Record Expense
            </button>
          </PermissionGate>
        }
      />

      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <span className="text-content flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} className="text-xs text-content-muted hover:text-content">Dismiss</button>
        </div>
      )}

      <div className="flex items-end gap-3 flex-wrap">
        <label className="text-sm font-medium text-content shrink-0 pb-2">Scope:</label>
        <ScopePicker value={scope} onChange={setScope} mode="filter" />
      </div>

      <DataState
        loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && data.length === 0}
        emptyMessage="No expenses recorded against this scope yet."
      >
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {['Date', 'Voucher', 'Fee', 'Charged to', 'Account', 'Split', 'Status', 'Amount'].map(h => (
                    <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {data.map(e => (
                  <tr key={e.id} className="hover:bg-surface-muted">
                    <td className="px-3 py-2 text-content-muted">{e.expenseDate}</td>
                    <td className="px-3 py-2 text-content">{e.voucherNo}</td>
                    <td className="px-3 py-2 font-medium text-content">{e.resourceName ?? '—'}</td>
                    {/* No node means the whole development, which is the common case for a fee. */}
                    <td className="px-3 py-2 text-content-muted">{e.scopeLabel ?? 'Whole project'}</td>
                    <td className="px-3 py-2 text-content-muted">
                      {e.expenseAccountCode}
                      {e.isIndirect && <span className="ml-1 text-xs text-warning">indirect</span>}
                    </td>
                    <td className="px-3 py-2 text-content-muted">
                      {e.nodeId ? 'Charged directly' : (BASIS_LABEL[e.allocationBasis ?? ''] ?? 'Company setting')}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${e.isPosted ? 'bg-success/10 text-success' : 'bg-warning/15 text-warning'}`}>
                        {e.isPosted ? 'Posted' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-content tabular-nums">{fmt(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-muted border-t border-border-default">
                <tr>
                  <td colSpan={7} className="px-3 py-2 text-xs font-bold text-content uppercase">Total</td>
                  <td className="px-3 py-2 text-right font-bold text-content tabular-nums">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="px-4 py-2.5 text-xs text-content-muted border-t border-border-default">
            Only posted expenses reach the cost rollup and the BOQ. A charge left at project level is
            shared down to every unit; one pinned to a node is borne by that node alone.
          </p>
        </div>
      </DataState>

      {showNew && (
        <NewExpenseModal accounts={accounts} onClose={() => setShowNew(false)} onSaved={onSaved} />
      )}
    </div>
  )
}
