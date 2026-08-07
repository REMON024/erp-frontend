'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input, Field, Label } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Table, TH, TR, TD } from '@/components/ui/Table'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { useApiData } from '@/hooks/useApiData'
import api from '@/lib/api'

export interface NodeLevel {
  id: number
  code: string
  name: string
  depth: number
  isSellableLevel: boolean
  isAreaBearing: boolean
  allowedParentCodes: string | null
  sortOrder: number
  isActive: boolean
  nodeCount: number
}

const schema = z.object({
  name:            z.string().min(1, 'Required').max(80),
  // Blank means the server derives the slug from the name, matching what the migration derived.
  code:            z.string().regex(/^[A-Za-z0-9_]*$/, 'Letters, digits and underscore only').max(30).optional(),
  depth:           z.coerce.number().min(0).max(20),
  isSellableLevel: z.boolean().optional(),
  isAreaBearing:   z.boolean().optional(),
  allowedParents:  z.string().max(200).optional(),
  sortOrder:       z.coerce.number().min(0),
  isActive:        z.boolean().optional(),
})
type Form = z.infer<typeof schema>

function LevelModal({ level, levels, onClose, onSaved }: {
  level?: NodeLevel; levels: NodeLevel[]; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!level
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: level
      ? {
          name: level.name, code: level.code, depth: level.depth,
          isSellableLevel: level.isSellableLevel, isAreaBearing: level.isAreaBearing,
          allowedParents: level.allowedParentCodes ?? '',
          sortOrder: level.sortOrder, isActive: level.isActive,
        }
      : {
          name: '', code: '', depth: 1, isSellableLevel: false, isAreaBearing: true,
          allowedParents: '', sortOrder: 0, isActive: true,
        },
  })

  const areaBearing = watch('isAreaBearing')

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const body = {
        name: d.name,
        code: d.code?.trim() ? d.code.trim() : null,
        depth: d.depth,
        isSellableLevel: !!d.isSellableLevel,
        isAreaBearing: !!d.isAreaBearing,
        allowedParentCodes: d.allowedParents?.trim() ? d.allowedParents.trim() : null,
        sortOrder: d.sortOrder,
        isActive: isEdit ? !!d.isActive : true,
      }
      if (isEdit) await api.put(`/node-levels/${level!.id}`, body)
      else        await api.post('/node-levels', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  // ROOT is offered even though no level is created at it — it is the sentinel meaning
  // "may be a root node", which is how a Block declares it hangs directly off the project.
  const parentOptions = ['ROOT', ...levels.filter(l => l.code !== 'ROOT' && l.id !== level?.id).map(l => l.code)]

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Level' : 'Add Level'} size="sm">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <Field label="Name" required error={errors.name?.message}>
          <Input {...register('name')} invalid={!!errors.name} placeholder="Wing" maxLength={80} />
        </Field>

        <Field label="Code" error={errors.code?.message}>
          <Input {...register('code')} invalid={!!errors.code} placeholder="WING"
            className="font-mono" maxLength={30} disabled={isEdit && (level?.nodeCount ?? 0) > 0} />
        </Field>
        <p className="-mt-3 text-xs text-content-muted">
          {isEdit && (level?.nodeCount ?? 0) > 0
            ? 'Locked — nodes already use this code, and reports switch on it.'
            : 'Leave blank to derive it from the name.'}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Depth" error={errors.depth?.message}>
            <Input type="number" min={0} max={20} {...register('depth')} invalid={!!errors.depth} />
          </Field>
          <Field label="Sort order" error={errors.sortOrder?.message}>
            <Input type="number" min={0} {...register('sortOrder')} invalid={!!errors.sortOrder} />
          </Field>
        </div>
        <p className="-mt-3 text-xs text-content-muted">
          Depth is the level&apos;s usual position, used for ordering and labels. It is not a rule —
          a project may skip a level entirely.
        </p>

        <Field label="Allowed parents" error={errors.allowedParents?.message}>
          <Input {...register('allowedParents')} className="font-mono"
            placeholder="FLOOR,WING" maxLength={200} />
        </Field>
        <p className="-mt-3 text-xs text-content-muted">
          Comma-separated codes this level may sit under — leave blank to allow any parent.
          Available: {parentOptions.join(', ')}
        </p>

        <div className="space-y-2">
          <Label>Behaviour</Label>
          <label className="flex items-start gap-2 text-sm text-content">
            <input type="checkbox" {...register('isSellableLevel')}
              className="mt-0.5 rounded border-border-default accent-[var(--color-primary)]" />
            <span>
              Sellable — nodes at this level can be sold, and start marked as such
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-content">
            <input type="checkbox" {...register('isAreaBearing')}
              className="mt-0.5 rounded border-border-default accent-[var(--color-primary)]" />
            <span>
              Carries construction area — takes part in area-based cost allocation
            </span>
          </label>
          {!areaBearing && (
            <p className="text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
              Nodes at this level are excluded from per-sqft cost allocation and cannot have
              materials issued to them. Use this for anything measured in something other than
              area — parking bays, man-days.
            </p>
          )}
        </div>

        {isEdit && (
          <div>
            <Label>Status</Label>
            <label className="flex items-center gap-2 text-sm text-content">
              <input type="checkbox" {...register('isActive')}
                className="rounded border-border-default accent-[var(--color-primary)]" />
              Active — offered when adding a node
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Add Level'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function NodeLevelsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal]   = useState<'add' | 'edit' | null>(null)
  const [target, setTarget] = useState<NodeLevel | null>(null)

  const { data: levels = [], isLoading, error, refetch } = useApiData<NodeLevel[]>({
    url: '/node-levels',
    params: { activeOnly: !showInactive },
    queryKey: ['node-levels', showInactive],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['node-levels'] })
    qc.invalidateQueries({ queryKey: ['project-tree'] })   // level names show on every node row
  }

  // Client-side search: the list is a handful of rows and a round trip per keystroke buys nothing.
  const q = search.trim().toLowerCase()
  const rows = q
    ? levels.filter(l => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q))
    : levels

  return (
    <div className="space-y-6">
      <PageHeader
        title="Structure Levels"
        subtitle="What kinds of node a project tree may contain"
        action={
          <PermissionGate module="NODE_LEVELS" action="create">
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModal('add')}>
              Add Level
            </Button>
          </PermissionGate>
        }
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search name or code…" onRefresh={refetch}>
        <label className="flex items-center gap-2 px-3 text-sm text-content-muted shrink-0">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
            className="rounded border-border-default accent-[var(--color-primary)]" />
          Show inactive
        </label>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load levels.' : null} onRetry={refetch}
        empty={rows.length === 0} emptyMessage="No levels yet.">
        <Table
          minWidth={900}
          head={
            <>
              <TH>Level</TH>
              <TH>Code</TH>
              <TH num>Depth</TH>
              <TH>Allowed Parents</TH>
              <TH>Sellable</TH>
              <TH>Area</TH>
              <TH num>Nodes</TH>
              <TH>Status</TH>
              <TH />
            </>
          }
        >
          {rows.map(l => (
            <TR key={l.id} className={l.isActive ? '' : 'opacity-60'}>
              <TD className="font-medium text-content">{l.name}</TD>
              <TD className="text-content-muted text-xs font-mono">{l.code}</TD>
              <TD num className="text-content-muted text-xs">{l.depth}</TD>
              <TD className="text-content-muted text-xs font-mono">
                {l.allowedParentCodes ?? <span className="italic font-sans">Any</span>}
              </TD>
              <TD>
                {l.isSellableLevel
                  ? <Badge tone="success">Sellable</Badge>
                  : <span className="text-content-muted/50 text-xs">—</span>}
              </TD>
              <TD>
                {l.isAreaBearing
                  ? <span className="text-content-muted text-xs">sqft</span>
                  : <Badge tone="warning">No area</Badge>}
              </TD>
              <TD num className="text-content text-xs">{l.nodeCount.toLocaleString()}</TD>
              <TD>
                <Badge tone={statusTone(l.isActive ? 'Active' : 'Inactive')}>
                  {l.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TD>
              <TD>
                <PermissionGate module="NODE_LEVELS" action="edit">
                  <button onClick={() => { setTarget(l); setModal('edit') }}
                    title="Edit" className="text-content-muted hover:text-primary p-1">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </PermissionGate>
              </TD>
            </TR>
          ))}
        </Table>
      </DataState>

      {modal === 'add' && (
        <LevelModal levels={levels} onClose={() => setModal(null)} onSaved={invalidate} />
      )}
      {modal === 'edit' && target && (
        <LevelModal level={target} levels={levels}
          onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
