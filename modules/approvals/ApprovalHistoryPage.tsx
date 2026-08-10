'use client'
import { Fragment, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { useApiData } from '@/hooks/useApiData'
import { fmt, statusChip, type ApprovalRequestDto } from './ApprovalInboxPage'
import type { ApprovalTypeDto } from '@/modules/settings/ApprovalTypesPage'

/**
 * Every decision the chains have made, whoever made it.
 *
 * Expanding a row shows the trail including SKIPPED steps, which is the part an auditor actually
 * needs: "this ৳40,000 order never went to the director because the chain says it did not have to"
 * is a different fact from "somebody forgot", and only a written row can tell them apart.
 */
export function ApprovalHistoryPage() {
  const [typeCode, setTypeCode] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  const { data: types = [] } = useApiData<ApprovalTypeDto[]>({
    url: '/approvals/types', queryKey: ['approval-types'],
  })

  const { data: rows = [], isLoading, error, refetch } = useApiData<ApprovalRequestDto[]>({
    url: '/approvals/history',
    params: {
      typeCode: typeCode || undefined,
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
    },
    queryKey: ['approval-history', typeCode, status, from, to],
  })

  return (
    <div className="space-y-6">
      <Link href="/approvals/inbox"
        className="inline-flex items-center gap-1.5 text-sm text-content-muted hover:text-content">
        <ArrowLeft className="w-4 h-4" /> Back to inbox
      </Link>

      <PageHeader title="Approval History" subtitle="Every decision, including the steps that were skipped" />

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-content mb-1">Document</label>
          <Select value={typeCode} onChange={e => setTypeCode(e.target.value)} className="min-w-[180px]">
            <option value="">All</option>
            {types.map(t => <option key={t.id} value={t.code}>{t.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-content mb-1">Outcome</label>
          <Select value={status} onChange={e => setStatus(e.target.value)} className="min-w-[140px]">
            <option value="">All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-content mb-1">From</label>
          <DateField value={from} onChange={e => setFrom(e.target.value)} className="min-w-[150px]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-content mb-1">To</label>
          <DateField value={to} onChange={e => setTo(e.target.value)} className="min-w-[150px]" />
        </div>
      </div>

      <DataState
        loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && rows.length === 0}
        emptyMessage="No approvals match these filters."
      >
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  {['', 'Raised', 'Document', 'Scope', 'Amount', 'Outcome', 'Completed'].map((c, i) => (
                    <th key={c || i}
                      className={`px-3 py-2 text-xs font-semibold text-content-muted uppercase tracking-wide ${
                        i === 4 ? 'text-right' : 'text-left'}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {rows.map(r => (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-surface-muted/50 cursor-pointer"
                      onClick={() => setOpen(open === r.id ? null : r.id)}>
                      <td className="px-3 py-2 text-content-muted">
                        {open === r.id
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />}
                      </td>
                      <td className="px-3 py-2 text-content-muted text-xs">
                        {new Date(r.requestedAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-content">{r.typeName}</div>
                        <div className="text-xs text-content-muted">#{r.entityId}</div>
                      </td>
                      <td className="px-3 py-2 text-content-muted text-xs">
                        {[r.projectName, r.nodeName].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-content">{fmt(r.amount)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusChip(r.status)}`}>
                          {r.status}
                          {r.status === 'Pending' && ` · step ${r.currentStep}`}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-content-muted text-xs">
                        {r.completedAt ? new Date(r.completedAt).toLocaleDateString('en-GB') : '—'}
                      </td>
                    </tr>

                    {open === r.id && (
                      <tr className="bg-surface-muted/40">
                        <td colSpan={7} className="px-6 py-3">
                          {r.actions.length === 0 ? (
                            <p className="text-xs text-content-muted">
                              No decisions recorded yet — this document is at its first step.
                            </p>
                          ) : (
                            <ol className="space-y-1.5">
                              {r.actions.map((a, k) => (
                                <li key={k} className="flex flex-wrap items-baseline gap-2 text-xs">
                                  <span className="w-5 h-5 rounded-full bg-surface grid place-items-center
                                                   font-semibold text-content">{a.stepOrder}</span>
                                  <span className={`px-2 py-0.5 rounded-full font-medium ${statusChip(a.action)}`}>
                                    {a.action}
                                  </span>
                                  <span className="text-content">{a.actedByName ?? 'Automatic'}</span>
                                  <span className="text-content-muted">
                                    {new Date(a.actedAt).toLocaleString('en-GB')}
                                  </span>
                                  {a.comment && <span className="text-content-muted">— {a.comment}</span>}
                                </li>
                              ))}
                            </ol>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>
    </div>
  )
}
