'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { Plus, Warehouse as WarehouseIcon, Edit2 } from 'lucide-react'
import api from '@/lib/api'

interface Warehouse { id: number; name: string; location: string | null; isActive: boolean }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

function WarehouseModal({ wh, onClose, onSaved }: { wh?: Warehouse; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!wh
  const [name, setName] = useState(wh?.name ?? '')
  const [location, setLocation] = useState(wh?.location ?? '')
  const [isActive, setIsActive] = useState(wh?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    setSaving(true); setErr('')
    try {
      const body = { name, location, isActive }
      if (isEdit) await api.put(`/warehouses/${wh!.id}`, body)
      else await api.post('/warehouses', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Warehouse' : 'New Warehouse'} size="sm">
      <div className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className={lbl}>Name <span className="text-red-500">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="Main Store" />
        </div>
        <div>
          <label className={lbl}>Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)} className={inp} placeholder="Mirpur, Dhaka" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" /> Active
        </label>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !name} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function WarehousesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ wh?: Warehouse } | null>(null)
  const { data: warehouses = [], isLoading, error, refetch } = useApiData<Warehouse[]>({ url: '/warehouses', queryKey: ['warehouses'] })

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); qc.invalidateQueries({ queryKey: ['warehouses-list'] }) }

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouses" subtitle="Storage locations for stock balances"
        action={
          <button onClick={() => setModal({})} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Warehouse
          </button>
        } />

      <DataState loading={isLoading} error={error ? 'Failed to load warehouses.' : null} onRetry={refetch}
        empty={warehouses.length === 0} emptyMessage="No warehouses yet. Create one to track per-warehouse stock.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map(w => (
            <div key={w.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center"><WarehouseIcon className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-gray-900">{w.name}</p>
                  <p className="text-xs text-gray-500">{w.location || '—'}</p>
                  <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full ${w.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{w.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <button onClick={() => setModal({ wh: w })} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </DataState>

      {modal && <WarehouseModal wh={modal.wh} onClose={() => setModal(null)} onSaved={invalidate} />}
    </div>
  )
}
