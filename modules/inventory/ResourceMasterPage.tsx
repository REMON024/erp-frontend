'use client'
import { useEffect, useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Field } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { CategorySelect } from '@/components/pickers/CategorySelect'
import { CategoryQuickCreateModal } from '@/components/pickers/CategoryQuickCreateModal'
import { useApiData } from '@/hooks/useApiData'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, AlertTriangle, Boxes, HardHat, Wrench, ClipboardList } from 'lucide-react'
import api from '@/lib/api'

export type ResourceType = 'Material' | 'Equipment' | 'Service' | 'Labour'

export interface Resource {
  id: number; resourceCode: string; resourceName: string; resourceType: ResourceType
  /** Denormalised category name — what the reports and this table group by. */
  category?: string
  /** FK into the ResourceCategories master; what the form and filter send. */
  categoryId?: number
  unit: string; status: string; description?: string
  rateBasis?: string; standardRate?: number
  isStockTracked: boolean
  minimumStock: number; averageCost: number; currentStock: number; isLowStock: boolean
  ownershipType?: string; assetTag?: string; skillLevel?: string
}

const TYPES: ResourceType[] = ['Material', 'Equipment', 'Service', 'Labour']
const RATE_BASES = ['Unit', 'Hour', 'Day', 'Month', 'Shift', 'Lumpsum', 'Sqft', 'Percent']

const TYPE_META: Record<ResourceType, { icon: typeof Boxes; tone: string; blurb: string }> = {
  Material:  { icon: Boxes,         tone: 'bg-primary/10 text-primary', blurb: 'Stockable — flows through GRN, issue and transfer' },
  Equipment: { icon: Wrench,        tone: 'bg-info/10 text-info',       blurb: 'Plant and machinery, owned or hired' },
  Service:   { icon: ClipboardList, tone: 'bg-success/10 text-success', blurb: 'Bought-in services — testing, transport, consultancy' },
  Labour:    { icon: HardHat,       tone: 'bg-warning/10 text-warning', blurb: 'Trades and manpower charged by day or hour' },
}

function fmt(n?: number) { return n == null ? '—' : `৳${n.toLocaleString('en-BD')}` }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  resourceName:  z.string().min(1, 'Required'),
  unit:          z.string().min(1, 'Required'),
  resourceType:  z.string().min(1, 'Required'),
  // Kept as a string and coerced in onSubmit, like ResourceRatesPage does for vendorId:
  // z.coerce.number() would turn the empty-string "no selection" into 0.
  categoryId:    z.string().optional(),
  description:   z.string().optional(),
  rateBasis:     z.string().optional(),
  standardRate:  z.coerce.number().min(0).optional(),
  minimumStock:  z.coerce.number().min(0),
  averageCost:   z.coerce.number().min(0),
  ownershipType: z.string().optional(),
  assetTag:      z.string().optional(),
  skillLevel:    z.string().optional(),
  status:        z.string().optional(),
})
type Form = z.infer<typeof schema>

function ResourceModal({ resource, defaultType, onClose, onSaved }: {
  resource?: Resource; defaultType: ResourceType; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!resource
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [quickCreate, setQuickCreate] = useState(false)
  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: resource
      ? { ...resource, categoryId: resource.categoryId ? String(resource.categoryId) : '' }
      : { status: 'Active', minimumStock: 0, averageCost: 0, resourceType: defaultType, categoryId: '' },
  })

  // Type drives which field groups are relevant. It is fixed once created: changing it would
  // strand stock balances and existing document lines that assume the original semantics.
  const type = (watch('resourceType') || defaultType) as ResourceType
  const isMaterial = type === 'Material'

  // A type-scoped category must not survive a switch to another type — the server rejects it.
  // Only in add mode; on edit the type is locked, so this would only clobber a valid selection.
  useEffect(() => {
    if (!isEdit) setValue('categoryId', '')
  }, [type, isEdit, setValue])

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const body = {
        ...d,
        status: d.status || 'Active',
        categoryId: d.categoryId ? Number(d.categoryId) : null,
      }
      if (isEdit) await api.put(`/resources/${resource!.id}`, body)
      else        await api.post('/resources', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? `Edit ${resource!.resourceType}` : 'Add Resource'} size="lg">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Resource Type <span className="text-danger">*</span></label>
            <Select {...register('resourceType')} disabled={isEdit}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <p className="text-xs text-content-muted mt-1">
              {isEdit ? 'Type cannot be changed after creation.' : TYPE_META[type].blurb}
            </p>
          </div>
          <div>
            <label className={lbl}>Unit <span className="text-danger">*</span></label>
            <input {...register('unit')} className={inp}
              placeholder={isMaterial ? 'Bag / Ton / Pcs' : 'Day / Hour / Lumpsum'} />
            {errors.unit && <p className="text-xs text-danger mt-1">{errors.unit.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Name <span className="text-danger">*</span></label>
            <input {...register('resourceName')} className={inp}
              placeholder={isMaterial ? 'Ordinary Portland Cement' : type === 'Labour' ? 'Mason (Rajmistri)' : 'Excavator (0.9 cum)'} />
            {errors.resourceName && <p className="text-xs text-danger mt-1">{errors.resourceName.message}</p>}
          </div>
          <Controller name="categoryId" control={control} render={({ field }) => (
            <Field label="Category">
              <CategorySelect
                resourceType={type}
                // An existing resource may sit in a retired category; the form must still show it
                // (and the server allows keeping it, it just blocks moving onto one).
                includeInactive={isEdit}
                value={field.value ? Number(field.value) : ''}
                onChange={id => field.onChange(id === '' ? '' : String(id))}
                allowCreate
                onRequestCreate={() => setQuickCreate(true)}
              />
            </Field>
          )} />
        </div>

        <div>
          <label className={lbl}>Description</label>
          <input {...register('description')} className={inp} placeholder="Optional notes" />
        </div>

        {/* Rate basis + standard rate apply to every type; the rate table can override per vendor. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Rate Basis</label>
            <Select {...register('rateBasis')}>
              <option value="">—</option>
              {RATE_BASES.map(b => <option key={b} value={b}>{b}</option>)}
            </Select>
          </div>
          <div>
            <label className={lbl}>Standard Rate (৳)</label>
            <input type="number" step="0.0001" {...register('standardRate')} className={inp} placeholder="0" />
            <p className="text-xs text-content-muted mt-1">Used when no vendor rate applies.</p>
          </div>
        </div>

        {isMaterial && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Reorder Level</label>
              <input type="number" {...register('minimumStock')} className={inp} placeholder="100" />
            </div>
            <div>
              <label className={lbl}>Average Cost (৳)</label>
              <input type="number" {...register('averageCost')} className={inp} placeholder="0" />
            </div>
          </div>
        )}

        {type === 'Equipment' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Ownership</label>
              <Select {...register('ownershipType')}>
                <option value="">—</option>
                <option value="Owned">Owned</option>
                <option value="Rented">Rented</option>
                <option value="Leased">Leased</option>
              </Select>
            </div>
            <div>
              <label className={lbl}>Asset Tag</label>
              <input {...register('assetTag')} className={inp} placeholder="EQ-TAG-001" />
            </div>
          </div>
        )}

        {type === 'Labour' && (
          <div>
            <label className={lbl}>Skill Level</label>
            <Select {...register('skillLevel')}>
              <option value="">—</option>
              <option value="Skilled">Skilled</option>
              <option value="Semi-Skilled">Semi-Skilled</option>
              <option value="Unskilled">Unskilled</option>
              <option value="Supervisor">Supervisor</option>
            </Select>
          </div>
        )}

        {isEdit && (
          <div>
            <label className={lbl}>Status</label>
            <Select {...register('status')}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Resource'}
          </button>
        </div>
      </form>

      {quickCreate && (
        <CategoryQuickCreateModal
          defaultResourceType={type}
          onClose={() => setQuickCreate(false)}
          onCreated={c => { setValue('categoryId', String(c.id), { shouldDirty: true }); setQuickCreate(false) }}
        />
      )}
    </Modal>
  )
}

export function ResourceMasterPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [tab, setTab]       = useState<ResourceType | 'All'>('All')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [modal, setModal]   = useState<'add' | 'edit' | null>(null)
  const [target, setTarget] = useState<Resource | null>(null)

  const { data: resources = [], isLoading, error, refetch } = useApiData<Resource[]>({
    url: '/resources',
    params: {
      search: search || undefined,
      types: tab === 'All' ? undefined : tab,
      categoryId: categoryId || undefined,
    },
    queryKey: ['resources', search, tab, categoryId],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['resources'] })
    qc.invalidateQueries({ queryKey: ['materials'] })      // the deprecated alias feeds older pages
    qc.invalidateQueries({ queryKey: ['materials-list'] })
    qc.invalidateQueries({ queryKey: ['resource-categories'] })  // resourceCount changes
  }

  // A type-scoped category may not survive a change of tab, so clear the filter with it.
  const selectTab = (t: ResourceType | 'All') => { setTab(t); setCategoryId('') }

  const lowStock = resources.filter(r => r.isLowStock).length
  const countOf = (t: ResourceType) => resources.filter(r => r.resourceType === t).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Master"
        subtitle="Materials, equipment, services and labour in one catalogue"
        action={
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Resource
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {TYPES.map(t => {
          const Icon = TYPE_META[t].icon
          return (
            <button key={t} onClick={() => selectTab(tab === t ? 'All' : t)}
              className={`text-left bg-surface rounded-xl border p-4 transition ${
                tab === t ? 'border-primary ring-2 ring-primary/30' : 'border-border-default hover:border-primary/50'}`}>
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${TYPE_META[t].tone}`}><Icon className="w-4 h-4" /></span>
                <p className="text-sm text-content-muted">{t}</p>
              </div>
              <p className="text-2xl font-bold text-content mt-2">
                {tab === 'All' || tab === t ? countOf(t) : '—'}
              </p>
            </button>
          )
        })}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search resource name or code…" onRefresh={refetch}>
        <Select value={tab} onChange={e => selectTab(e.target.value as ResourceType | 'All')} className="min-w-[150px]">
          <option value="All">All types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <CategorySelect
          value={categoryId}
          onChange={setCategoryId}
          resourceType={tab === 'All' ? undefined : tab}
          placeholder="All categories"
          className="min-w-[180px]"
        />
      </SearchBar>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Total Resources</p>
          <p className="text-2xl font-bold text-primary mt-1">{resources.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-danger mt-1">{lowStock}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Stock Value</p>
          {/* Only stock-tracked resources carry a balance, so the rest contribute nothing. */}
          <p className="text-2xl font-bold text-info mt-1">
            {fmt(resources.reduce((s, r) => s + (r.isStockTracked ? r.currentStock * r.averageCost : 0), 0))}
          </p>
        </div>
      </div>

      {lowStock > 0 && (
        <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 inline-flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {lowStock} material{lowStock === 1 ? '' : 's'} at or below reorder level
        </p>
      )}

      <DataState loading={isLoading} error={error ? 'Failed to load resources.' : null} onRetry={refetch}
        empty={resources.length === 0} emptyMessage="No resources yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Resource' }, { h: 'Code' }, { h: 'Type' }, { h: 'Category' }, { h: 'Unit' },
                    { h: 'Std Rate', num: true }, { h: 'Stock', num: true },
                    { h: 'Reorder', num: true }, { h: 'Avg Cost', num: true },
                    { h: 'Status' }, { h: '' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {resources.map(r => {
                  const Icon = TYPE_META[r.resourceType]?.icon ?? Boxes
                  return (
                    <tr key={r.id} className={`hover:bg-surface-muted ${r.isLowStock ? 'bg-danger/10' : ''}`}>
                      <td className="px-4 py-3 font-medium text-content">{r.resourceName}</td>
                      <td className="px-4 py-3 text-content-muted text-xs font-mono">{r.resourceCode}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1 ${TYPE_META[r.resourceType]?.tone ?? ''}`}>
                          <Icon className="w-3 h-3" />{r.resourceType}
                        </span>
                      </td>
                      {/* Reads the denormalised name, which the handlers keep exact against the master. */}
                      <td className="px-4 py-3">
                        {r.category
                          ? <Badge tone="neutral">{r.category}</Badge>
                          : <span className="text-content-muted text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-content-muted text-xs">
                        {r.unit}{r.rateBasis && r.rateBasis !== r.unit ? ` · per ${r.rateBasis.toLowerCase()}` : ''}
                      </td>
                      <td className="px-4 py-3 text-content text-xs text-right tabular-nums">
                        {fmt(r.standardRate ?? (r.averageCost > 0 ? r.averageCost : undefined))}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums ${r.isLowStock ? 'text-danger font-bold' : 'text-content'}`}>
                        {/* Non-stock resources have no balance — show a dash, never a misleading 0. */}
                        {r.isStockTracked ? (
                          <div className="flex items-center justify-end gap-1">
                            {r.isLowStock && <AlertTriangle className="w-3.5 h-3.5" />}
                            {r.currentStock.toLocaleString()}
                          </div>
                        ) : <span className="text-content-muted text-xs">n/a</span>}
                      </td>
                      {/* Reorder level and average cost are stock concepts — blank for the
                          other resource types rather than a misleading zero. */}
                      <td className="px-4 py-3 text-content-muted text-xs text-right tabular-nums">
                        {r.isStockTracked ? r.minimumStock.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-content text-xs text-right tabular-nums">
                        {r.isStockTracked ? fmt(r.averageCost) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${r.status === 'Active' ? 'bg-success/10 text-success' : 'bg-surface-muted text-content-muted'}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setTarget(r); setModal('edit') }} className="text-content-muted hover:text-primary p-1">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {modal === 'add' && (
        <ResourceModal defaultType={tab === 'All' ? 'Material' : tab}
          onClose={() => setModal(null)} onSaved={invalidate} />
      )}
      {modal === 'edit' && target && (
        <ResourceModal resource={target} defaultType={target.resourceType}
          onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
