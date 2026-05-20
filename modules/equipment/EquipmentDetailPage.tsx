'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Equipment, EquipmentMaintenance } from '@/types'
import { formatDate, formatCurrency } from '@/utils/format'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const maintSchema = z.object({
  service_date: z.string().min(1, 'Required'),
  cost: z.coerce.number().min(0, 'Required'),
  remarks: z.string().min(1, 'Required'),
  next_service_date: z.string().optional(),
})
type MaintForm = z.infer<typeof maintSchema>

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700',
  allocated: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-700',
  retired: 'bg-gray-100 text-gray-500',
}

function AddMaintenanceModal({ equipmentId, onClose }: { equipmentId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<MaintForm>({
    resolver: zodResolver(maintSchema) as any,
  })
  const mutation = useMutation({
    mutationFn: (data: unknown) => api.post(`/equipment/${equipmentId}/maintenance`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-maintenance', equipmentId] })
      qc.invalidateQueries({ queryKey: ['equipment-detail', equipmentId] })
      onClose()
    },
  })
  return (
    <Modal open onClose={onClose} title="Log Maintenance" size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Date</label>
            <input type="date" {...register('service_date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {errors.service_date && <p className="text-xs text-red-600 mt-1">{errors.service_date.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost (BDT)</label>
            <input type="number" {...register('cost')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {errors.cost && <p className="text-xs text-red-600 mt-1">{errors.cost.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea rows={3} {...register('remarks')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Describe the maintenance work..." />
          {errors.remarks && <p className="text-xs text-red-600 mt-1">{errors.remarks.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Next Service Date</label>
          <input type="date" {...register('next_service_date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 font-medium">
            {mutation.isPending ? 'Saving...' : 'Log Maintenance'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function EquipmentDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [showMaintModal, setShowMaintModal] = useState(false)

  const { data: eq, isLoading } = useQuery<Equipment>({
    queryKey: ['equipment-detail', id],
    queryFn: () => api.get(`/equipment/${id}`).then((r) => r.data),
  })

  const { data: maintRecords } = useQuery<EquipmentMaintenance[]>({
    queryKey: ['equipment-maintenance', id],
    queryFn: () => api.get(`/equipment/${id}/maintenance`).then((r) => r.data),
  })

  const completeMaint = useMutation({
    mutationFn: (maintId: string) => api.put(`/maintenance/${maintId}/complete`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-detail', id] })
      qc.invalidateQueries({ queryKey: ['equipment-maintenance', id] })
    },
  })

  if (isLoading) return <div className="p-6 text-gray-500">Loading...</div>
  if (!eq) return <div className="p-6 text-red-600">Equipment not found.</div>

  const totalMaintCost = (maintRecords ?? []).reduce((s, r) => s + r.cost, 0)

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline mb-2 block">← Back to Equipment</button>
          <h1 className="text-2xl font-bold text-gray-900">{eq.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{eq.code} · {eq.category}</p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${STATUS_COLORS[eq.status]}`}>
          {eq.status}
        </span>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Purchased</p>
          <p className="font-semibold text-gray-900 mt-1">{formatDate(eq.purchase_date)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Allocated To</p>
          <p className="font-semibold text-gray-900 mt-1">{eq.allocated_project_id ?? '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Maintenance Cost</p>
          <p className="font-semibold text-gray-900 mt-1">{formatCurrency(totalMaintCost)}</p>
        </div>
      </div>

      {/* Maintenance history */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Maintenance History</h2>
          <button onClick={() => setShowMaintModal(true)}
            className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
            + Log Maintenance
          </button>
        </div>
        {maintRecords && maintRecords.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {maintRecords.map((r) => (
              <div key={r.id} className="px-6 py-4 flex items-start justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{r.remarks}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Serviced: {formatDate(r.service_date)}
                    {r.next_service_date && ` · Next: ${formatDate(r.next_service_date)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="font-semibold text-gray-900 text-sm">{formatCurrency(r.cost)}</span>
                  {eq.status === 'maintenance' && (
                    <button onClick={() => completeMaint.mutate(r.id)}
                      className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-400">No maintenance records yet</div>
        )}
      </div>

      {showMaintModal && <AddMaintenanceModal equipmentId={id} onClose={() => setShowMaintModal(false)} />}
    </div>
  )
}
