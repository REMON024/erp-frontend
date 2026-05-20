'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Equipment } from '@/types'
import { formatDate, formatCurrency } from '@/utils/format'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700',
  allocated: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-700',
  retired: 'bg-gray-100 text-gray-500',
}

const CATEGORY_ICONS: Record<string, string> = {
  Crane: '🏗️', Mixer: '🔄', Excavator: '⛏️', Loader: '🚜',
  Generator: '⚡', Pump: '💧', Scaffolding: '🔩', Welding: '🔥',
}

const equipmentSchema = z.object({
  name: z.string().min(1, 'Required'),
  code: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  purchase_date: z.string().min(1, 'Required'),
})
type EquipmentFormData = z.infer<typeof equipmentSchema>

const allocateSchema = z.object({ project_id: z.string().min(1, 'Required') })
type AllocateForm = z.infer<typeof allocateSchema>

const CATEGORIES = ['Crane', 'Mixer', 'Excavator', 'Loader', 'Generator', 'Pump', 'Scaffolding', 'Welding', 'Other']

function AddEquipmentModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema) as any,
  })
  const mutation = useMutation({
    mutationFn: (data: unknown) => api.post('/equipment', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Add Equipment" size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input {...register('name')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Tower Crane TC-01" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input {...register('code')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="EQ-009" />
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select {...register('category')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
            <input type="date" {...register('purchase_date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {errors.purchase_date && <p className="text-xs text-red-600 mt-1">{errors.purchase_date.message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
            {mutation.isPending ? 'Saving...' : 'Add Equipment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AllocateModal({ equipment, onClose }: { equipment: Equipment; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<AllocateForm>({
    resolver: zodResolver(allocateSchema) as any,
  })
  const mutation = useMutation({
    mutationFn: (data: unknown) => api.post(`/equipment/${equipment.id}/allocate`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title={`Allocate: ${equipment.name}`} size="sm">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
          <input {...register('project_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. p1" />
          {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
            {mutation.isPending ? 'Allocating...' : 'Allocate'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function EquipmentPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [allocating, setAllocating] = useState<Equipment | null>(null)

  const { data } = useQuery({
    queryKey: ['equipment', statusFilter, categoryFilter, search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      if (search) params.set('search', search)
      return api.get(`/equipment?${params}`).then((r) => r.data)
    },
  })

  const { data: alerts } = useQuery({
    queryKey: ['equipment-alerts'],
    queryFn: () => api.get('/equipment/alerts').then((r) => r.data),
  })

  const release = useMutation({
    mutationFn: (id: string) => api.post(`/equipment/${id}/release`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  })

  const equipment: Equipment[] = data?.data ?? []
  const maintenanceAlerts: Equipment[] = alerts ?? []

  const counts = {
    available: equipment.filter((e) => e.status === 'available').length,
    allocated: equipment.filter((e) => e.status === 'allocated').length,
    maintenance: equipment.filter((e) => e.status === 'maintenance').length,
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Equipment</h1>
          <p className="text-sm text-gray-500 mt-1">Track allocation, maintenance, and status</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium self-start sm:self-auto">
          + Add Equipment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Equipment', value: equipment.length, color: 'text-blue-600' },
          { label: 'Available', value: counts.available, color: 'text-emerald-600' },
          { label: 'Allocated', value: counts.allocated, color: 'text-blue-600' },
          { label: 'In Maintenance', value: counts.maintenance, color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Maintenance alert banner */}
      {maintenanceAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-amber-500 text-xl">⚠</span>
          <div>
            <p className="font-medium text-amber-800">{maintenanceAlerts.length} equipment item(s) currently in maintenance</p>
            <p className="text-sm text-amber-600">{maintenanceAlerts.map((e) => e.name).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search equipment..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-56" />
        <div className="flex gap-1">
          {['', 'available', 'allocated', 'maintenance', 'retired'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipment.map((eq) => (
          <div key={eq.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">
                  {CATEGORY_ICONS[eq.category] ?? '🔧'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{eq.name}</p>
                  <p className="text-xs text-gray-500">{eq.code}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[eq.status]}`}>
                {eq.status}
              </span>
            </div>

            <div className="mt-3 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Category</span>
                <span className="font-medium text-gray-700">{eq.category}</span>
              </div>
              <div className="flex justify-between">
                <span>Purchased</span>
                <span className="font-medium text-gray-700">{formatDate(eq.purchase_date)}</span>
              </div>
              {eq.allocated_project_id && (
                <div className="flex justify-between">
                  <span>Project</span>
                  <span className="font-medium text-blue-700">{eq.allocated_project_id}</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
              <button onClick={() => router.push(`/equipment/${eq.id}`)}
                className="flex-1 text-xs py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                Details
              </button>
              {eq.status === 'available' && (
                <button onClick={() => setAllocating(eq)}
                  className="flex-1 text-xs py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center">
                  Allocate
                </button>
              )}
              {eq.status === 'allocated' && (
                <button onClick={() => release.mutate(eq.id)}
                  className="flex-1 text-xs py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 text-center">
                  Release
                </button>
              )}
            </div>
          </div>
        ))}
        {equipment.length === 0 && (
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 py-16 text-center text-gray-400">No equipment found</div>
        )}
      </div>

      {showAdd && <AddEquipmentModal onClose={() => setShowAdd(false)} />}
      {allocating && <AllocateModal equipment={allocating} onClose={() => setAllocating(null)} />}
    </div>
  )
}
