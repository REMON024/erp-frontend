'use client'
import { useState } from 'react'
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

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

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
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Material Name <span className="text-red-500">*</span></label>
            <input {...register('materialName')} className={inp} placeholder="Cement" />
            {errors.materialName && <p className="text-xs text-red-600 mt-1">{errors.materialName.message}</p>}
          </div>
          <div>
            <label className={lbl}>Unit <span className="text-red-500">*</span></label>
            <input {...register('unit')} className={inp} placeholder="Bag / Ton / Pcs" />
            {errors.unit && <p className="text-xs text-red-600 mt-1">{errors.unit.message}</p>}
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
            <select {...register('status')} className={inp}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
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
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Material
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Materials</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{materials.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{lowStock}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Stock Value</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {fmt(materials.reduce((s, m) => s + m.currentStock * m.averageCost, 0))}
          </p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search material name or code…" onRefresh={refetch} />

      <DataState loading={isLoading} error={error ? 'Failed to load materials.' : null} onRetry={refetch}
        empty={materials.length === 0} emptyMessage="No materials yet.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Material', 'Code', 'Category', 'Unit', 'Stock', 'Reorder', 'Avg Cost', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materials.map(m => (
                  <tr key={m.id} className={`hover:bg-gray-50 ${m.isLowStock ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{m.materialName}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{m.materialCode}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{m.category ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{m.unit}</td>
                    <td className={`px-4 py-3 font-bold ${m.isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                      <div className="flex items-center gap-1">
                        {m.isLowStock && <AlertTriangle className="w-3.5 h-3.5" />}
                        {m.currentStock.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{m.minimumStock.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{fmt(m.averageCost)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${m.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setTarget(m); setModal('edit') }} className="text-gray-400 hover:text-blue-600 p-1">
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

      {modal === 'add' && <MaterialModal onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <MaterialModal material={target} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
