'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { GitBranch, Settings2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { useApiData } from '@/hooks/useApiData'
import api from '@/lib/api'

/**
 * Which documents need signing off, and by whom.
 *
 * Every type ships DISABLED, and a disabled type behaves exactly as the system did before approvals
 * existed — the document's own approve button does what it always did, in one step. Turning one on
 * is the moment the chain starts routing, which is why it cannot be turned on until the chain
 * covers every amount.
 */

export interface ApprovalItemDto {
  id: number; stepOrder: number
  roleId: string | null; roleName: string | null
  userId: string | null; userName: string | null
  minAmount: number; maxAmount: number | null
  nodeLevelId: number | null; nodeLevelName: string | null
  isMandatory: boolean; canReject: boolean
}

export interface ApprovalTypeDto {
  id: number; code: string; name: string; entityName: string; menuCode: string
  isEnabled: boolean; allowSelfApprove: boolean
  stepCount: number; openRequests: number
  items: ApprovalItemDto[]
}

export function fmtMoney(n: number) {
  return `৳${n.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`
}

export function bandLabel(i: { minAmount: number; maxAmount: number | null }) {
  if (i.minAmount === 0 && i.maxAmount == null) return 'Any amount'
  if (i.maxAmount == null) return `${fmtMoney(i.minAmount)} and above`
  return `${fmtMoney(i.minAmount)} – ${fmtMoney(i.maxAmount)}`
}

export function ApprovalTypesPage() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState<number | null>(null)
  const [err, setErr] = useState('')

  const { data: types = [], isLoading, error, refetch } = useApiData<ApprovalTypeDto[]>({
    url: '/approvals/types', queryKey: ['approval-types'],
  })

  const toggle = async (t: ApprovalTypeDto) => {
    if (t.isEnabled && t.openRequests > 0 && !window.confirm(
      `${t.openRequests} document(s) are part-way through this chain.\n\n`
      + 'Switching it off leaves them pending — they will not be signed off automatically. Continue?'
    )) return

    setBusy(t.id); setErr('')
    try {
      await api.put(`/approvals/types/${t.id}/enabled`, { isEnabled: !t.isEnabled })
      qc.invalidateQueries({ queryKey: ['approval-types'] })
    } catch (e: any) {
      // The server refuses to enable a chain with a gap. Its message names the uncovered band, so
      // it is shown verbatim rather than replaced with something vaguer.
      setErr((e.response?.data?.errors ?? ['Could not change this approval type.']).join(' '))
    } finally { setBusy(null) }
  }

  const setSelfApprove = async (t: ApprovalTypeDto, allow: boolean) => {
    setBusy(t.id); setErr('')
    try {
      await api.put(`/approvals/types/${t.id}/enabled`, {
        isEnabled: t.isEnabled, allowSelfApprove: allow,
      })
      qc.invalidateQueries({ queryKey: ['approval-types'] })
    } catch (e: any) {
      setErr((e.response?.data?.errors ?? ['Could not save.']).join(' '))
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        subtitle="Which documents need signing off, by whom, and above what amount"
      />

      {err && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
          {err}
        </p>
      )}

      <DataState
        loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && types.length === 0}
        emptyMessage="No approval types are configured."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {types.map(t => (
            <div key={t.id} className="rounded-xl border border-border-default bg-surface p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-content-muted" />
                    <h3 className="font-semibold text-content">{t.name}</h3>
                  </div>
                  <p className="text-xs text-content-muted mt-1">
                    {t.stepCount === 0
                      ? 'No steps configured yet'
                      : `${t.stepCount} step${t.stepCount === 1 ? '' : 's'}`}
                    {t.openRequests > 0 && ` · ${t.openRequests} in flight`}
                  </p>
                </div>

                <PermissionGate module="APPROVALS" action="edit">
                  <button
                    onClick={() => toggle(t)}
                    disabled={busy === t.id}
                    title={t.isEnabled ? 'Switch off' : 'Switch on'}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                      t.isEnabled
                        ? 'bg-success/15 text-success hover:bg-success/25'
                        : 'bg-surface-muted text-content-muted hover:bg-border-default'
                    }`}
                  >
                    {t.isEnabled ? 'On' : 'Off'}
                  </button>
                </PermissionGate>
              </div>

              {t.items.length > 0 && (
                <ol className="space-y-1">
                  {t.items.map(i => (
                    <li key={i.id} className="flex items-center gap-2 text-xs text-content-muted">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-surface-muted grid place-items-center
                                       font-semibold text-content">{i.stepOrder}</span>
                      <span className="text-content">{i.roleName ?? i.userName ?? '—'}</span>
                      <span>·</span>
                      <span>{bandLabel(i)}</span>
                      {!i.isMandatory && <span className="italic">(optional)</span>}
                    </li>
                  ))}
                </ol>
              )}

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-default">
                <PermissionGate module="APPROVALS" action="edit">
                  <label className="flex items-center gap-2 text-xs text-content-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.allowSelfApprove}
                      disabled={busy === t.id}
                      onChange={e => setSelfApprove(t, e.target.checked)}
                    />
                    Raiser may approve their own
                  </label>
                </PermissionGate>

                <Link
                  href={`/settings/approvals/chain?type=${t.id}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Settings2 className="w-3.5 h-3.5" /> Configure chain
                </Link>
              </div>

              {t.isEnabled && t.stepCount > 0 && (
                <p className="flex items-start gap-1.5 text-xs text-success">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Live — these documents now route through the chain above.
                </p>
              )}
              {!t.isEnabled && (
                <p className="flex items-start gap-1.5 text-xs text-content-muted">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Off — approving one of these still takes a single signature, as it does today.
                </p>
              )}
            </div>
          ))}
        </div>
      </DataState>
    </div>
  )
}
