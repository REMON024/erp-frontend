'use client'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Pencil, Trash2, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { useApiData } from '@/hooks/useApiData'
import api from '@/lib/api'
import { bandLabel, type ApprovalItemDto, type ApprovalTypeDto } from './ApprovalTypesPage'

/**
 * The step builder.
 *
 * The panel on the right is the reason this screen exists rather than a raw table: the two ways a
 * chain fails — an amount band nobody covers, and two approvers claiming the same band at one step —
 * are both completely silent in production. A gap does not throw; it leaves a document waiting in
 * nobody's queue. So the same check the server runs before it will let the chain be switched on runs
 * here as you type, against the draft rather than what is stored.
 */

interface ChainIssue { severity: 'Error' | 'Warning'; message: string; stepOrder: number | null }
interface ChainValidation { isValid: boolean; issues: ChainIssue[] }

interface RoleDto { id: string; name: string }
interface UserDto { id: string; fullName: string; email: string }
interface NodeLevelDto { id: number; name: string }

const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  stepOrder:   z.coerce.number().min(1, 'Step numbers start at 1'),
  approver:    z.string().min(1, 'Pick who signs at this step'),
  minAmount:   z.coerce.number().min(0, 'Cannot be negative'),
  maxAmount:   z.string().optional(),
  nodeLevelId: z.string().optional(),
  isMandatory: z.boolean(),
  canReject:   z.boolean(),
})
type Form = z.infer<typeof schema>

/** "role:abc" / "user:xyz" — one control, because a step is one or the other and never both. */
function splitApprover(v: string) {
  const [kind, ...rest] = v.split(':')
  const id = rest.join(':')
  return kind === 'user' ? { roleId: null, userId: id } : { roleId: id, userId: null }
}

function toRequest(typeId: number, d: Form) {
  const { roleId, userId } = splitApprover(d.approver)
  return {
    approvalTypeId: typeId,
    stepOrder:   Number(d.stepOrder),
    roleId, userId,
    minAmount:   Number(d.minAmount),
    maxAmount:   d.maxAmount?.trim() ? Number(d.maxAmount) : null,
    nodeLevelId: d.nodeLevelId ? Number(d.nodeLevelId) : null,
    isMandatory: d.isMandatory,
    canReject:   d.canReject,
  }
}

function itemToRequest(typeId: number, i: ApprovalItemDto) {
  return {
    approvalTypeId: typeId,
    stepOrder: i.stepOrder, roleId: i.roleId, userId: i.userId,
    minAmount: i.minAmount, maxAmount: i.maxAmount,
    nodeLevelId: i.nodeLevelId, isMandatory: i.isMandatory, canReject: i.canReject,
  }
}

function IssuePanel({ result }: { result: ChainValidation | null }) {
  if (!result) return null

  const errors   = result.issues.filter(i => i.severity === 'Error')
  const warnings = result.issues.filter(i => i.severity === 'Warning')

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 className="w-4 h-4" /> Every amount has an approver.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-danger">
            <AlertTriangle className="w-4 h-4" />
            {errors.length === 1 ? 'One problem' : `${errors.length} problems`} — this chain cannot be switched on
          </p>
          <ul className="space-y-1">
            {errors.map((e, k) => (
              <li key={k} className="text-xs text-content">• {e.message}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-warning">
            <Info className="w-4 h-4" /> Worth checking
          </p>
          <ul className="space-y-1">
            {warnings.map((w, k) => (
              <li key={k} className="text-xs text-content">• {w.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function StepModal({
  typeId, existing, siblings, roles, users, levels, onClose, onSaved,
}: {
  typeId: number
  existing: ApprovalItemDto | null
  siblings: ApprovalItemDto[]
  roles: RoleDto[]
  users: UserDto[]
  levels: NodeLevelDto[]
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [preview, setPreview] = useState<ChainValidation | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      stepOrder:   existing?.stepOrder ?? (Math.max(0, ...siblings.map(s => s.stepOrder)) + 1),
      approver:    existing
        ? (existing.userId ? `user:${existing.userId}` : `role:${existing.roleId}`)
        : '',
      minAmount:   existing?.minAmount ?? 0,
      maxAmount:   existing?.maxAmount != null ? String(existing.maxAmount) : '',
      nodeLevelId: existing?.nodeLevelId != null ? String(existing.nodeLevelId) : '',
      isMandatory: existing?.isMandatory ?? true,
      canReject:   existing?.canReject ?? true,
    },
  })

  const draftValues = watch()

  // What the chain WOULD look like with this step in it. Checking the draft rather than what is
  // stored is the point: a gap you only discover after saving is a gap you have already shipped.
  useEffect(() => {
    if (!draftValues.approver) { setPreview(null); return }

    const others = siblings
      .filter(s => s.id !== existing?.id)
      .map(s => itemToRequest(typeId, s))
    const draft = [...others, toRequest(typeId, draftValues as Form)]

    const timer = setTimeout(() => {
      api.post(`/approvals/types/${typeId}/validate`, draft)
        .then(r => setPreview((r.data as any)?.data ?? r.data))
        .catch(() => setPreview(null))
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(draftValues), siblings, existing?.id, typeId])

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const body = toRequest(typeId, d)
      if (existing) await api.put(`/approvals/items/${existing.id}`, body)
      else          await api.post('/approvals/items', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr((e.response?.data?.errors ?? ['Save failed']).join(' '))
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={existing ? 'Edit step' : 'Add step'} size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Step <span className="text-danger">*</span></label>
            <Input type="number" min={1} {...register('stepOrder')} invalid={!!errors.stepOrder} />
            {errors.stepOrder && <p className="text-xs text-danger mt-1">{errors.stepOrder.message}</p>}
            <p className="text-xs text-content-muted mt-1">Signed in ascending order.</p>
          </div>
          <div>
            <label className={lbl}>Only for scope level</label>
            <Select {...register('nodeLevelId')}>
              <option value="">Any</option>
              {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <label className={lbl}>Who signs <span className="text-danger">*</span></label>
          <Select {...register('approver')}>
            <option value="">Select…</option>
            <optgroup label="Anyone holding this role">
              {roles.map(r => <option key={r.id} value={`role:${r.id}`}>{r.name}</option>)}
            </optgroup>
            <optgroup label="This person only">
              {users.map(u => (
                <option key={u.id} value={`user:${u.id}`}>{u.fullName || u.email}</option>
              ))}
            </optgroup>
          </Select>
          {errors.approver && <p className="text-xs text-danger mt-1">{errors.approver.message}</p>}
          <p className="text-xs text-content-muted mt-1">
            A role survives someone leaving; a named person does not. Prefer a role unless the
            authority genuinely belongs to one individual.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>From amount <span className="text-danger">*</span></label>
            <Input type="number" step="1" min={0} {...register('minAmount')} invalid={!!errors.minAmount} />
            {errors.minAmount && <p className="text-xs text-danger mt-1">{errors.minAmount.message}</p>}
          </div>
          <div>
            <label className={lbl}>Up to <span className="text-content-muted font-normal">(exclusive)</span></label>
            <Input type="number" step="1" min={0} {...register('maxAmount')} placeholder="No limit" />
            <p className="text-xs text-content-muted mt-1">
              Blank means no ceiling. The next band starts exactly here.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-content cursor-pointer">
            <input type="checkbox" {...register('isMandatory')} /> Signature required
          </label>
          <label className="flex items-center gap-2 text-sm text-content cursor-pointer">
            <input type="checkbox" {...register('canReject')} /> May reject
          </label>
        </div>

        <IssuePanel result={preview} />

        <div className="flex justify-end gap-2 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-content-muted hover:text-content">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save step'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function ApprovalChainPage() {
  const qc = useQueryClient()
  const [typeId, setTypeId] = useState<number | null>(null)
  const [modal, setModal] = useState<{ item: ApprovalItemDto | null } | null>(null)
  const [validation, setValidation] = useState<ChainValidation | null>(null)

  // output: 'export' rules out useSearchParams, so the house idiom is to read the query string
  // once the component is on the client.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('type')
    setTypeId(raw ? Number(raw) : null)
  }, [])

  const { data: types = [], isLoading, error, refetch } = useApiData<ApprovalTypeDto[]>({
    url: '/approvals/types', queryKey: ['approval-types'],
  })
  const { data: roles = [] } = useApiData<RoleDto[]>({ url: '/roles', queryKey: ['roles-list'] })
  const { data: levels = [] } = useApiData<NodeLevelDto[]>({ url: '/node-levels', queryKey: ['node-levels-list'] })
  const { data: userPage } = useApiData<{ items: UserDto[] }>({
    url: '/users', params: { page: 1, pageSize: 200 }, queryKey: ['users-for-approvals'],
  })
  const users = userPage?.items ?? []

  const type = useMemo(() => types.find(t => t.id === typeId) ?? null, [types, typeId])
  const items = useMemo(
    () => [...(type?.items ?? [])].sort((a, b) => a.stepOrder - b.stepOrder || a.minAmount - b.minAmount),
    [type],
  )

  // The stored chain, checked whenever it changes — the same call the enable button will make.
  useEffect(() => {
    if (!typeId) return
    api.post(`/approvals/types/${typeId}/validate`, null)
      .then(r => setValidation((r.data as any)?.data ?? r.data))
      .catch(() => setValidation(null))
  }, [typeId, items])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['approval-types'] })

  const remove = async (i: ApprovalItemDto) => {
    if (!window.confirm(
      `Remove step ${i.stepOrder} (${i.roleName ?? i.userName})?\n\n`
      + 'Documents already part-way through this chain keep the signatures they have.'
    )) return
    try {
      await api.delete(`/approvals/items/${i.id}`)
      invalidate()
    } catch (e: any) {
      window.alert((e.response?.data?.errors ?? ['Delete failed']).join(' '))
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/settings/approvals"
        className="inline-flex items-center gap-1.5 text-sm text-content-muted hover:text-content">
        <ArrowLeft className="w-4 h-4" /> All approval types
      </Link>

      <PageHeader
        title={type ? `${type.name} chain` : 'Approval chain'}
        subtitle="Who signs, in what order, and for which amounts"
        action={type ? (
          <PermissionGate module="APPROVALS" action="create">
            <button onClick={() => setModal({ item: null })}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium">
              <Plus className="w-4 h-4" /> Add step
            </button>
          </PermissionGate>
        ) : undefined}
      />

      <DataState
        loading={isLoading || typeId === null}
        error={error ? 'Failed to load.' : (types.length > 0 && !type ? 'That approval type does not exist.' : null)}
        onRetry={refetch}
        empty={!!type && items.length === 0}
        emptyMessage="No steps yet. Add one to describe who signs off on these documents."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem] items-start">
          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted">
                  <tr>
                    {['Step', 'Who signs', 'Amounts', 'Scope level', 'Rules', ''].map((c, i) => (
                      <th key={c || i}
                        className="px-3 py-2 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {items.map(i => (
                    <tr key={i.id} className="hover:bg-surface-muted/50">
                      <td className="px-3 py-2">
                        <span className="w-6 h-6 rounded-full bg-surface-muted grid place-items-center
                                         text-xs font-semibold text-content">{i.stepOrder}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-content">{i.roleName ?? i.userName ?? '—'}</div>
                        <div className="text-xs text-content-muted">
                          {i.userId ? 'Named person' : 'Any holder of this role'}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-content">{bandLabel(i)}</td>
                      <td className="px-3 py-2 text-content-muted">{i.nodeLevelName ?? 'Any'}</td>
                      <td className="px-3 py-2 text-xs text-content-muted">
                        {i.isMandatory ? 'Required' : 'Optional'}
                        {i.canReject ? ' · may reject' : ' · cannot reject'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <PermissionGate module="APPROVALS" action="edit">
                            <button onClick={() => setModal({ item: i })} title="Edit"
                              className="p-1.5 text-content-muted hover:text-primary">
                              <Pencil className="w-4 h-4" />
                            </button>
                          </PermissionGate>
                          <PermissionGate module="APPROVALS" action="delete">
                            <button onClick={() => remove(i)} title="Remove"
                              className="p-1.5 text-content-muted hover:text-danger">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <IssuePanel result={validation} />
            {type && !type.isEnabled && validation?.isValid && (
              <p className="text-xs text-content-muted">
                This chain is complete but still switched off. Turn it on from the approvals list
                when you are ready for it to start routing documents.
              </p>
            )}
          </div>
        </div>
      </DataState>

      {modal && type && (
        <StepModal
          typeId={type.id}
          existing={modal.item}
          siblings={items}
          roles={roles}
          users={users}
          levels={levels}
          onClose={() => setModal(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  )
}
