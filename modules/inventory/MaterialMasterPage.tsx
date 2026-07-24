'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'

interface Material {
  id: number; materialCode: string; materialName: string; category?: string
  unit: string; minimumStock: number; averageCost: number
  currentStock: number; status: string; isLowStock: boolean
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  materialName: z.string().min(1, 'Required'),
  unit:         z.string().min(1, 'Required'),
  category:     z.string().optional(),
  minimumStock: z.coerce.number().min(0),
  averageCost:  z.coerce.number().min(0),
  status:       z.string().optional(),
})
type Form = z.infer<typeof schema>

function MaterialModal({ material, onClose, onSaved }: {
  material?: Material; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!material
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: material ?? { status: 'Active', minimumStock: 0, averageCost: 0 },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const body = { ...d, status: d.status || 'Active' }
      if (isEdit) await api.put(`/materials/${material!.id}`, body)
      else        await api.post('/materials', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Material' : 'Add Material'} size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Material Name <span className="text-danger">*</span></label>
            <input {...register('materialName')} className={inp} placeholder="Cement" />
            {errors.materialName && <p className="text-xs text-danger mt-1">{errors.materialName.message}</p>}
          </div>
          <div>
            <label className={lbl}>Unit <span className="text-danger">*</span></label>
            <input {...register('unit')} className={inp} placeholder="Bag / Ton / Pcs" />
            {errors.unit && <p className="text-xs text-danger mt-1">{errors.unit.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Category</label>
          <input {...register('category')} className={inp} placeholder="Structural / Electrical / Finishing" />
        </div>
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
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Material'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function MaterialMasterPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState<'add' | 'edit' | null>(null)
  const [target, setTarget] = useState<Material | null>(null)

  const { data: materials = [], isLoading, error, refetch } = useApiData<Material[]>({
    url: '/materials',
    params: { search: search || undefined },
    queryKey: ['materials', search],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['materials'] })
    qc.invalidateQueries({ queryKey: ['materials-list'] })
  }
  const lowStock = materials.filter(m => m.isLowStock).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Master"
        subtitle="Manage construction material catalogue"
        action={
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Material
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Total Materials</p>
          <p className="text-2xl font-bold text-primary mt-1">{materials.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-danger mt-1">{lowStock}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Stock Value</p>
          <p className="text-2xl font-bold text-info mt-1">
            {fmt(materials.reduce((s, m) => s + m.currentStock * m.averageCost, 0))}
          </p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search material name or code…" onRefresh={refetch} />

      <DataState loading={isLoading} error={error ? 'Failed to load materials.' : null} onRetry={refetch}
        empty={materials.length === 0} emptyMessage="No materials yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Material' }, { h: 'Code' }, { h: 'Category' }, { h: 'Unit' },
                    { h: 'Stock', num: true }, { h: 'Reorder', num: true }, { h: 'Avg Cost', num: true },
                    { h: 'Status' }, { h: '' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {materials.map(m => (
                  <tr key={m.id} className={`hover:bg-surface-muted ${m.isLowStock ? 'bg-danger/10' : ''}`}>
                    <td className="px-4 py-3 font-medium text-content">{m.materialName}</td>
                    <td className="px-4 py-3 text-content-muted text-xs font-mono">{m.materialCode}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{m.category ?? '—'}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{m.unit}</td>
                    <td className={`px-4 py-3 font-bold text-right tabular-nums ${m.isLowStock ? 'text-danger' : 'text-content'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {m.isLowStock && <AlertTriangle className="w-3.5 h-3.5" />}
                        {m.currentStock.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs text-right tabular-nums">{m.minimumStock.toLocaleString()}</td>
                    <td className="px-4 py-3 text-content text-xs text-right tabular-nums">{fmt(m.averageCost)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${m.status === 'Active' ? 'bg-success/10 text-success' : 'bg-surface-muted text-content-muted'}`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setTarget(m); setModal('edit') }} className="text-content-muted hover:text-primary p-1">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      <SubstitutionsPanel materials={materials} />

      {modal === 'add' && <MaterialModal onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <MaterialModal material={target} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}

interface Substitution {
  id: number
  originalMaterialId: number; originalMaterialName: string
  substituteMaterialId: number; substituteMaterialName: string
}

// Material-substitution mapping (PRD-02 FR-EST-14): equivalents that count toward the
// original's BOQ actuals so they are not flagged as variance.
function SubstitutionsPanel({ materials }: { materials: Material[] }) {
  const qc = useQueryClient()
  const { data: subs = [] } = useApiData<Substitution[]>({ url: '/material-substitutions', queryKey: ['material-substitutions'] })
  const [original, setOriginal] = useState('')
  const [substitute, setSubstitute] = useState('')
  const invalidate = () => qc.invalidateQueries({ queryKey: ['material-substitutions'] })

  const add = async () => {
    if (!original || !substitute || original === substitute) return
    try {
      await api.post('/material-substitutions', { originalMaterialId: Number(original), substituteMaterialId: Number(substitute) })
      setOriginal(''); setSubstitute(''); invalidate()
    } catch (err: unknown) {
      window.alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Could not add substitution.')
    }
  }
  const remove = async (id: number) => { try { await api.delete(`/material-substitutions/${id}`); invalidate() } catch { /* noop */ } }

  return (
    <div className="bg-surface rounded-xl border border-border-default p-5">
      <h3 className="font-semibold text-content text-sm">Material Substitutions</h3>
      <p className="text-xs text-content-muted mt-1">Approved equivalents are excluded from EPL variance.</p>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <Select value={original} onChange={e => setOriginal(e.target.value)} className="min-w-[150px]">
          <option value="">Original material…</option>
          {materials.map(m => <option key={m.id} value={m.id}>{m.materialName}</option>)}
        </Select>
        <span className="text-content-muted text-sm">→ may be replaced by →</span>
        <Select value={substitute} onChange={e => setSubstitute(e.target.value)} className="min-w-[150px]">
          <option value="">Substitute material…</option>
          {materials.map(m => <option key={m.id} value={m.id}>{m.materialName}</option>)}
        </Select>
        <button onClick={add} className="px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">Add</button>
      </div>
      <div className="mt-4 divide-y divide-border-default">
        {subs.length === 0 && <p className="text-xs text-content-muted">No substitutions defined.</p>}
        {subs.map(s => (
          <div key={s.id} className="flex items-center justify-between py-2 text-sm">
            <span>{s.originalMaterialName} <span className="text-content-muted">→</span> {s.substituteMaterialName}</span>
            <button onClick={() => remove(s.id)} className="text-content-muted hover:text-danger text-xs">Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}
