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

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

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
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className={lbl}>Name <span className="text-danger">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="Main Store" />
        </div>
        <div>
          <label className={lbl}>Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)} className={inp} placeholder="Mirpur, Dhaka" />
        </div>
        <label className="flex items-center gap-2 text-sm text-content">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" /> Active
        </label>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button onClick={save} disabled={saving || !name} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
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
          <button onClick={() => setModal({})} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Warehouse
          </button>
        } />

      <DataState loading={isLoading} error={error ? 'Failed to load warehouses.' : null} onRetry={refetch}
        empty={warehouses.length === 0} emptyMessage="No warehouses yet. Create one to track per-warehouse stock.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map(w => (
            <div key={w.id} className="bg-surface rounded-xl border border-border-default p-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center"><WarehouseIcon className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-content">{w.name}</p>
                  <p className="text-xs text-content-muted">{w.location || '—'}</p>
                  <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full ${w.isActive ? 'bg-success/10 text-success' : 'bg-surface-muted text-content-muted'}`}>{w.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <button onClick={() => setModal({ wh: w })} className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg"><Edit2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </DataState>

      {modal && <WarehouseModal wh={modal.wh} onClose={() => setModal(null)} onSaved={invalidate} />}
    </div>
  )
}
