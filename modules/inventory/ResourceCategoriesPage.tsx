'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Ban, RotateCcw } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
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
import type { ResourceCategory } from '@/components/pickers/CategorySelect'
import type { ResourceType } from './ResourceMasterPage'

const TYPES: ResourceType[] = ['Material', 'Equipment', 'Service', 'Labour']

const schema = z.object({
  name:         z.string().min(1, 'Required').max(100),
  // Optional: blank means the server derives the slug from the name, matching what the
  // AddResourceCategoryMaster migration derived for pre-existing categories.
  code:         z.string().regex(/^[A-Za-z0-9_]*$/, 'Letters, digits and underscore only').max(50).optional(),
  resourceType: z.string().optional(),
  sortOrder:    z.coerce.number().min(0),
  isActive:     z.boolean().optional(),
})
type Form = z.infer<typeof schema>

function CategoryModal({ category, onClose, onSaved }: {
  category?: ResourceCategory; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!category
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: category
      ? {
          name: category.name, code: category.code,
          resourceType: category.resourceType ?? '',
          sortOrder: category.sortOrder, isActive: category.isActive,
        }
      : { name: '', code: '', resourceType: '', sortOrder: 0, isActive: true },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const body = {
        name: d.name,
        code: d.code?.trim() ? d.code.trim() : null,
        resourceType: d.resourceType || null,
        sortOrder: d.sortOrder,
        isActive: isEdit ? !!d.isActive : true,
      }
      if (isEdit) await api.put(`/resource-categories/${category!.id}`, body)
      else        await api.post('/resource-categories', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Category' : 'Add Category'} size="sm">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <Field label="Name" required error={errors.name?.message}>
          <Input {...register('name')} invalid={!!errors.name} placeholder="Cement" maxLength={100} />
        </Field>

        <Field label="Code" error={errors.code?.message}>
          <Input {...register('code')} invalid={!!errors.code} placeholder="CEMENT"
            className="font-mono" maxLength={50} />
        </Field>
        <p className="-mt-3 text-xs text-content-muted">Leave blank to derive it from the name.</p>

        <Field label="Applies to">
          <Select {...register('resourceType')}>
            <option value="">All types</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <p className="-mt-3 text-xs text-content-muted">
          A type-scoped category is only offered on resources of that type. Narrowing the scope is
          rejected if resources of another type already use it.
        </p>

        <Field label="Sort order" error={errors.sortOrder?.message}>
          <Input type="number" min={0} {...register('sortOrder')} invalid={!!errors.sortOrder} />
        </Field>

        {isEdit && (
          <div>
            <Label>Status</Label>
            <label className="flex items-center gap-2 text-sm text-content">
              <input type="checkbox" {...register('isActive')}
                className="rounded border-border-default accent-[var(--color-primary)]" />
              Active — offered when creating or editing a resource
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Add Category'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function ResourceCategoriesPage() {
  const qc = useQueryClient()
  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState<ResourceType | 'All'>('All')
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal]   = useState<'add' | 'edit' | null>(null)
  const [target, setTarget] = useState<ResourceCategory | null>(null)

  const { data: categories = [], isLoading, error, refetch } = useApiData<ResourceCategory[]>({
    url: '/resource-categories',
    params: {
      activeOnly: !showInactive,
      resourceType: typeFilter === 'All' ? undefined : typeFilter,
    },
    queryKey: ['resource-categories', typeFilter, showInactive],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['resource-categories'] })
    qc.invalidateQueries({ queryKey: ['resources'] })   // the Category column mirrors the name
  }

  // Search is client-side over name and code, matching ResourceRatesPage — the list is small
  // and a round trip per keystroke buys nothing.
  const q = search.trim().toLowerCase()
  const rows = q
    ? categories.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    : categories

  const setActive = async (c: ResourceCategory, active: boolean) => {
    if (active) {
      await api.put(`/resource-categories/${c.id}`, {
        name: c.name, code: c.code, resourceType: c.resourceType ?? null,
        sortOrder: c.sortOrder, isActive: true,
      })
    } else {
      const used = c.resourceCount === 1 ? '1 resource keeps it' : `${c.resourceCount} resources keep it`
      const msg = c.resourceCount > 0
        ? `Deactivate "${c.name}"? ${used} — they stay untouched, but it will no longer be offered on new resources.`
        : `Deactivate "${c.name}"? It will no longer be offered on new resources.`
      if (!window.confirm(msg)) return
      await api.delete(`/resource-categories/${c.id}`)
    }
    invalidate()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Categories"
        subtitle="The master list behind every resource's category"
        action={
          <PermissionGate module="RESOURCE_CATEGORIES">
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModal('add')}>
              Add Category
            </Button>
          </PermissionGate>
        }
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search name or code…" onRefresh={refetch}>
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value as ResourceType | 'All')}
          className="min-w-[160px]">
          <option value="All">All types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <label className="flex items-center gap-2 px-3 text-sm text-content-muted shrink-0">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
            className="rounded border-border-default accent-[var(--color-primary)]" />
          Show inactive
        </label>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load categories.' : null} onRetry={refetch}
        empty={rows.length === 0} emptyMessage="No categories yet.">
        <Table
          minWidth={800}
          head={
            <>
              <TH>Category</TH>
              <TH>Code</TH>
              <TH>Applies To</TH>
              <TH num>Resources</TH>
              <TH num>Sort</TH>
              <TH>Status</TH>
              <TH />
            </>
          }
        >
          {rows.map(c => (
            <TR key={c.id} className={c.isActive ? '' : 'opacity-60'}>
              <TD className="font-medium text-content">{c.name}</TD>
              <TD className="text-content-muted text-xs font-mono">{c.code}</TD>
              <TD className="text-content-muted text-xs">
                {c.resourceType ?? <span className="italic">All types</span>}
              </TD>
              <TD num className="text-content text-xs">{c.resourceCount.toLocaleString()}</TD>
              <TD num className="text-content-muted text-xs">{c.sortOrder}</TD>
              <TD>
                <Badge tone={statusTone(c.isActive ? 'Active' : 'Inactive')}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TD>
              <TD>
                <PermissionGate module="RESOURCE_CATEGORIES">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setTarget(c); setModal('edit') }}
                      title="Edit" className="text-content-muted hover:text-primary p-1">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {c.isActive ? (
                      <button onClick={() => setActive(c, false)}
                        title="Deactivate" className="text-content-muted hover:text-danger p-1">
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button onClick={() => setActive(c, true)}
                        title="Reactivate" className="text-content-muted hover:text-success p-1">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </PermissionGate>
              </TD>
            </TR>
          ))}
        </Table>
      </DataState>

      {modal === 'add' && <CategoryModal onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <CategoryModal category={target}
          onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
