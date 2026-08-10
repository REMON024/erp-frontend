'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Check, X, Inbox, History, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import api from '@/lib/api'
import { useApiData } from '@/hooks/useApiData'

/**
 * What is waiting on me.
 *
 * The inbox is a queue, not an authority. Acting on a row posts to that document's OWN approve
 * endpoint — the same one its screen calls — so every guard the document already has stays where it
 * was written: a bill still refuses unless it is pending, a budget still refuses without a baseline,
 * and the journal is still posted by the command that owns it.
 */

export interface ApprovalActionDto {
  stepOrder: number; action: string
  actedByName: string | null; actedAt: string; comment: string | null
}

export interface ApprovalRequestDto {
  id: number
  typeCode: string; typeName: string; entityName: string; menuCode: string
  entityId: number
  projectId: number | null; projectName: string | null
  nodeId: number | null; nodeName: string | null
  amount: number
  currentStep: number; status: string
  requestedBy: string | null; requestedAt: string; completedAt: string | null
  isMine: boolean
  actions: ApprovalActionDto[]
}

export function fmt(n: number) {
  return `৳${n.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`
}

/** Where each document's own approve endpoint lives. Rejection is only wired where one exists. */
const ENDPOINTS: Record<string, { approve: (id: number) => string; reject?: (id: number) => string; page: string }> = {
  COST_ESTIMATE:  { approve: id => `/cost-estimates/${id}/approve`,
                    reject:  id => `/cost-estimates/${id}/reject`,
                    page: '/estimates' },
  PURCHASE_ORDER: { approve: id => `/orders/Purchase/${id}/approve`, page: '/orders' },
  WORK_ORDER:     { approve: id => `/orders/Work/${id}/approve`,     page: '/orders' },
  WORK_ORDER_BILL:{ approve: id => `/work-order-bills/${id}/approve`, page: '/orders' },
  VOUCHER:        { approve: id => `/vouchers/${id}/post`,           page: '/accounting/vouchers' },
  PROJECT_BUDGET: { approve: id => `/projects/${id}/budget/approve`, page: '/projects' },
}

export function statusChip(status: string) {
  const map: Record<string, string> = {
    Pending:   'bg-warning/15 text-warning',
    Approved:  'bg-success/15 text-success',
    Rejected:  'bg-danger/15 text-danger',
    Cancelled: 'bg-surface-muted text-content-muted',
    Skipped:   'bg-surface-muted text-content-muted',
  }
  return map[status] ?? 'bg-surface-muted text-content-muted'
}

export function ApprovalInboxPage() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState<number | null>(null)
  const [err, setErr] = useState('')

  const { data: rows = [], isLoading, error, refetch } = useApiData<ApprovalRequestDto[]>({
    url: '/approvals/inbox', queryKey: ['approval-inbox'],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['approval-inbox'] })
    qc.invalidateQueries({ queryKey: ['approval-history'] })
    // The underlying documents may have just changed status.
    qc.invalidateQueries({ queryKey: ['orders'] })
    qc.invalidateQueries({ queryKey: ['cost-estimates'] })
    qc.invalidateQueries({ queryKey: ['vouchers'] })
  }

  const act = async (r: ApprovalRequestDto, kind: 'approve' | 'reject') => {
    const ep = ENDPOINTS[r.typeCode]
    if (!ep) { setErr(`No action is wired for ${r.typeName}.`); return }

    if (kind === 'reject' && !ep.reject) {
      setErr(`${r.typeName} has no reject action — open the document to decline it.`); return
    }

    let reason: string | null = null
    if (kind === 'reject') {
      reason = window.prompt(`Why is this ${r.typeName.toLowerCase()} being rejected?`)
      if (reason === null) return
    }

    setBusy(r.id); setErr('')
    try {
      if (kind === 'approve') await api.post(ep.approve(r.entityId))
      else                    await api.post(ep.reject!(r.entityId), { reason })
      invalidate()
    } catch (e: any) {
      // The document's own refusal, shown as it wrote it — "Only pending bills can be approved"
      // says more than anything this page could substitute.
      setErr((e.response?.data?.errors ?? ['Action failed.']).join(' '))
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Inbox"
        subtitle="Documents waiting on your signature"
        action={
          <Link href="/approvals/history"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-default text-sm
                       text-content hover:bg-surface-muted">
            <History className="w-4 h-4" /> History
          </Link>
        }
      />

      {err && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">{err}</p>
      )}

      <DataState
        loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && rows.length === 0}
        emptyMessage="Nothing is waiting on you."
      >
        <div className="space-y-3">
          {rows.map(r => {
            const ep = ENDPOINTS[r.typeCode]
            return (
              <div key={r.id} className="rounded-xl border border-border-default bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Inbox className="w-4 h-4 text-content-muted shrink-0" />
                      <span className="font-semibold text-content">{r.typeName}</span>
                      <span className="text-content-muted text-sm">#{r.entityId}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusChip(r.status)}`}>
                        Step {r.currentStep}
                      </span>
                    </div>
                    <p className="text-sm text-content-muted mt-1">
                      {[r.projectName, r.nodeName].filter(Boolean).join(' · ') || 'No project scope'}
                    </p>
                    <p className="text-xs text-content-muted mt-1">
                      Raised {new Date(r.requestedAt).toLocaleDateString('en-GB')}
                      {r.requestedBy && ` by ${r.requestedBy}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-content">{fmt(r.amount)}</p>
                    <p className="text-xs text-content-muted">
                      Amount when raised
                    </p>
                  </div>
                </div>

                {r.actions.length > 0 && (
                  <ul className="mt-3 pt-3 border-t border-border-default space-y-1">
                    {r.actions.map((a, k) => (
                      <li key={k} className="text-xs text-content-muted">
                        Step {a.stepOrder} ·{' '}
                        <span className={a.action === 'Skipped' ? 'italic' : 'text-content'}>{a.action}</span>
                        {a.actedByName && ` by ${a.actedByName}`}
                        {a.comment && ` — ${a.comment}`}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 pt-3 border-t border-border-default flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => act(r, 'approve')}
                    disabled={busy === r.id || !ep}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white
                               text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  {ep?.reject && (
                    <button
                      onClick={() => act(r, 'reject')}
                      disabled={busy === r.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/30
                                 text-danger text-sm font-medium hover:bg-danger/10 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  )}
                  {ep && (
                    <Link href={ep.page}
                      className="flex items-center gap-1.5 text-sm text-content-muted hover:text-content ml-auto">
                      <ExternalLink className="w-3.5 h-3.5" /> Open the document
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </DataState>
    </div>
  )
}
