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

export interface ProjectUnit {
  id: number
  code: string
  name: string
  symbol: string | null
  decimals: number
  isActive: boolean
  nodeCount: number
}

const schema = z.object({
  name:     z.string().min(1, 'Required').max(60),
  code:     z.string().regex(/^[A-Za-z0-9_]*$/, 'Letters, digits and underscore only').max(20).optional(),
  symbol:   z.string().max(10).optional(),
  decimals: z.coerce.number().min(0).max(6),
  isActive: z.boolean().optional(),
})
type Form = z.infer<typeof schema>

function UnitModal({ unit, onClose, onSaved }: {
  unit?: ProjectUnit; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!unit
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: unit
      ? { name: unit.name, code: unit.code, symbol: unit.symbol ?? '', decimals: unit.decimals, isActive: unit.isActive }
      : { name: '', code: '', symbol: '', decimals: 2, isActive: true },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const body = {
        name: d.name,
        code: d.code?.trim() ? d.code.trim() : null,
        symbol: d.symbol?.trim() ? d.symbol.trim() : null,
        decimals: d.decimals,
        isActive: isEdit ? !!d.isActive : true,
      }
      if (isEdit) await api.put(`/project-units/${unit!.id}`, body)
      else        await api.post('/project-units', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Unit' : 'Add Unit'} size="sm">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <Field label="Name" required error={errors.name?.message}>
          <Input {...register('name')} invalid={!!errors.name} placeholder="Square Feet" maxLength={60} />
        </Field>

        <Field label="Code" error={errors.code?.message}>
          <Input {...register('code')} invalid={!!errors.code} placeholder="SQFT"
            className="font-mono" maxLength={20} disabled={isEdit && (unit?.nodeCount ?? 0) > 0} />
        </Field>
        <p className="-mt-3 text-xs text-content-muted">
          {isEdit && (unit?.nodeCount ?? 0) > 0
            ? 'Locked — nodes already measured in this unit.'
            : 'Leave blank to derive it from the name.'}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Symbol" error={errors.symbol?.message}>
            <Input {...register('symbol')} placeholder="sq ft" maxLength={10} />
          </Field>
          <Field label="Decimals" error={errors.decimals?.message}>
            <Input type="number" min={0} max={6} {...register('decimals')} invalid={!!errors.decimals} />
          </Field>
        </div>
        <p className="-mt-3 text-xs text-content-muted">
          Decimal places to show. A headcount wants 0; a volume wants 3.
        </p>

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
          <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Add Unit'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function ProjectUnitsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal]   = useState<'add' | 'edit' | null>(null)
  const [target, setTarget] = useState<ProjectUnit | null>(null)

  const { data: units = [], isLoading, error, refetch } = useApiData<ProjectUnit[]>({
    url: '/project-units',
    params: { activeOnly: !showInactive },
    queryKey: ['project-units', showInactive],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['project-units'] })
    qc.invalidateQueries({ queryKey: ['project-tree'] })
  }

  const q = search.trim().toLowerCase()
  const rows = q
    ? units.filter(u => u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q))
    : units

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Units"
        subtitle="What a node's quantity is measured in — square feet, man-days, bays"
        action={
          <PermissionGate module="PROJECT_UNITS" action="create">
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModal('add')}>
              Add Unit
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

      <DataState loading={isLoading} error={error ? 'Failed to load units.' : null} onRetry={refetch}
        empty={rows.length === 0} emptyMessage="No units yet.">
        <Table
          minWidth={700}
          head={
            <>
              <TH>Unit</TH>
              <TH>Code</TH>
              <TH>Symbol</TH>
              <TH num>Decimals</TH>
              <TH num>Nodes</TH>
              <TH>Status</TH>
              <TH />
            </>
          }
        >
          {rows.map(u => (
            <TR key={u.id} className={u.isActive ? '' : 'opacity-60'}>
              <TD className="font-medium text-content">{u.name}</TD>
              <TD className="text-content-muted text-xs font-mono">{u.code}</TD>
              <TD className="text-content-muted text-xs">{u.symbol ?? '—'}</TD>
              <TD num className="text-content-muted text-xs">{u.decimals}</TD>
              <TD num className="text-content text-xs">{u.nodeCount.toLocaleString()}</TD>
              <TD>
                <Badge tone={statusTone(u.isActive ? 'Active' : 'Inactive')}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TD>
              <TD>
                <PermissionGate module="PROJECT_UNITS" action="edit">
                  <button onClick={() => { setTarget(u); setModal('edit') }}
                    title="Edit" className="text-content-muted hover:text-primary p-1">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </PermissionGate>
              </TD>
            </TR>
          ))}
        </Table>
      </DataState>

      {modal === 'add' && <UnitModal onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <UnitModal unit={target}
          onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
