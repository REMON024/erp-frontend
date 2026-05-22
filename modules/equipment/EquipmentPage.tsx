'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Equipment } from '@/types'
import { formatDate } from '@/utils/format'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wrench, CheckCircle, AlertCircle, Edit2, Trash2, BarChart2 } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  available:   'bg-green-100 text-green-700',
  allocated:   'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-700',
  retired:     'bg-gray-100 text-gray-500',
}

const CATEGORIES = ['Crane', 'Mixer', 'Excavator', 'Loader', 'Generator', 'Pump', 'Scaffolding', 'Welding', 'Vehicle', 'Road Equipment', 'Heavy Machinery', 'Other']

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

// ── Upcoming Maintenance (static mock) ────────────────────────────────────────
const UPCOMING_MAINTENANCE = [
  { id: 'm1', equipment: 'Tower Crane TC-01',   date: '2025-12-28', type: 'Repair',            assignee: 'tom-rodriguez', hours: 4 },
  { id: 'm2', equipment: 'Concrete Pump CP-50', date: '2025-12-30', type: 'Pump Seal Replace',  assignee: 'ahmed-ali',     hours: 6 },
  { id: 'm3', equipment: 'Generator Gen-02',    date: '2026-01-05', type: 'Routine Service',    assignee: 'raj-patel',     hours: 2 },
]

// ── Modals ────────────────────────────────────────────────────────────────────
const equipSchema = z.object({
  name:          z.string().min(1, 'Required'),
  code:          z.string().min(1, 'Required'),
  category:      z.string().min(1, 'Required'),
  purchase_date: z.string().min(1, 'Required'),
  location:      z.string().optional(),
})
type EquipForm = z.infer<typeof equipSchema>

function AddEquipmentModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<EquipForm>({ resolver: zodResolver(equipSchema) as any })
  const mut = useMutation({
    mutationFn: (d: unknown) => api.post('/equipment', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Add Equipment" size="md">
      <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Name</label>
            <input {...register('name')} className={inp} placeholder="Tower Crane TC-01" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>ID Code</label>
            <input {...register('code')} className={inp} placeholder="EQ-001" />
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Category</label>
            <select {...register('category')} className={inp}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>}
          </div>
          <div>
            <label className={lbl}>Purchase Date</label>
            <input type="date" {...register('purchase_date')} className={inp} />
            {errors.purchase_date && <p className="text-xs text-red-600 mt-1">{errors.purchase_date.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Location</label>
          <input {...register('location')} className={inp} placeholder="Site A, Floor 2" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
            {mut.isPending ? 'Saving...' : 'Add Equipment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

const maintainSchema = z.object({
  service_date:   z.string().min(1, 'Required'),
  description:    z.string().min(1, 'Required'),
  cost:           z.string().min(1, 'Required'),
  next_service:   z.string().optional(),
})
type MaintainForm = z.infer<typeof maintainSchema>

function MaintainModal({ equipment, onClose }: { equipment: Equipment; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<MaintainForm>({
    resolver: zodResolver(maintainSchema) as any,
    defaultValues: { service_date: new Date().toISOString().split('T')[0] },
  })
  const mut = useMutation({
    mutationFn: (d: unknown) => api.post(`/equipment/${equipment.id}/maintenance`, d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title={`Maintain: ${equipment.name}`} size="md">
      <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Service Date</label>
            <input type="date" {...register('service_date')} className={inp} />
            {errors.service_date && <p className="text-xs text-red-600 mt-1">{errors.service_date.message}</p>}
          </div>
          <div>
            <label className={lbl}>Cost</label>
            <input {...register('cost')} className={inp} placeholder="5000" type="number" />
            {errors.cost && <p className="text-xs text-red-600 mt-1">{errors.cost.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Description</label>
          <textarea rows={3} {...register('description')} className={inp + ' resize-none'} placeholder="Maintenance description..." />
          {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
        </div>
        <div>
          <label className={lbl}>Next Service Date</label>
          <input type="date" {...register('next_service')} className={inp} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 font-medium">
            {mut.isPending ? 'Saving...' : 'Save Maintenance'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

const scheduleSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  start_date: z.string().min(1, 'Required'),
  end_date:   z.string().min(1, 'Required'),
})
type ScheduleForm = z.infer<typeof scheduleSchema>

function ScheduleModal({ equipment, onClose }: { equipment: Equipment; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<ScheduleForm>({ resolver: zodResolver(scheduleSchema) as any })
  const mut = useMutation({
    mutationFn: (d: unknown) => api.post(`/equipment/${equipment.id}/allocate`, d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title={`Schedule: ${equipment.name}`} size="sm">
      <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-4 p-1">
        <div>
          <label className={lbl}>Project ID</label>
          <input {...register('project_id')} className={inp} placeholder="p1" />
          {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Start Date</label>
            <input type="date" {...register('start_date')} className={inp} />
          </div>
          <div>
            <label className={lbl}>End Date</label>
            <input type="date" {...register('end_date')} className={inp} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
            {mut.isPending ? 'Saving...' : 'Schedule'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function EquipmentPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd]         = useState(false)
  const [maintaining, setMaintaining] = useState<Equipment | null>(null)
  const [scheduling, setScheduling]   = useState<Equipment | null>(null)
  const [maintenance, setMaintenance] = useState(UPCOMING_MAINTENANCE)

  const { data } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.get('/equipment').then(r => r.data),
  })

  const release = useMutation({
    mutationFn: (id: string) => api.post(`/equipment/${id}/release`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  })

  const deleteEquip = useMutation({
    mutationFn: (id: string) => api.delete(`/equipment/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  })

  const equipment: Equipment[] = data?.data ?? []
  const counts = {
    total:       equipment.length,
    available:   equipment.filter(e => e.status === 'available').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
    critical:    equipment.filter(e => e.status === 'maintenance').length,
  }

  const utilPct = counts.total > 0 ? Math.round((counts.available / counts.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track machinery, vehicles, and maintenance schedules</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2">
            <BarChart2 className="w-4 h-4" /> Utilization Report
          </button>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            + Add Equipment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Equipment',    value: counts.total,       sub: '+5 new units',           iconBg: 'bg-blue-50',   iconColor: 'text-blue-500',   Icon: Wrench },
          { label: 'Available',          value: counts.available,   sub: `${utilPct}% utilization`, iconBg: 'bg-green-50',  iconColor: 'text-green-500',  Icon: CheckCircle },
          { label: 'Under Maintenance',  value: counts.maintenance, sub: 'Scheduled repairs',       iconBg: 'bg-orange-50', iconColor: 'text-orange-500', Icon: Wrench },
          { label: 'Critical Alerts',    value: counts.critical,    sub: 'Needs attention',         iconBg: 'bg-red-50',    iconColor: 'text-red-500',    Icon: AlertCircle },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">{k.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{k.value}</p>
              <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${k.iconBg}`}>
              <k.Icon className={`w-5 h-5 ${k.iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipment Fleet */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">🔧 Equipment Fleet</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {equipment.map(eq => (
              <div key={eq.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{eq.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase shrink-0 ${STATUS_COLORS[eq.status]}`}>
                        {eq.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{eq.category} · ID: {eq.code}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Last Service: {eq.last_service_date ? formatDate(eq.last_service_date) : 'N/A'}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button className="text-gray-400 hover:text-blue-600 p-1 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteEquip.mutate(eq.id)} className="text-gray-400 hover:text-red-600 p-1 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setScheduling(eq)}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 flex items-center gap-1"
                  >
                    📅 Schedule
                  </button>
                  <button
                    onClick={() => setMaintaining(eq)}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 flex items-center gap-1"
                  >
                    🔧 Maintain
                  </button>
                  {eq.status === 'allocated' && (
                    <button
                      onClick={() => release.mutate(eq.id)}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Release
                    </button>
                  )}
                </div>
              </div>
            ))}
            {equipment.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">No equipment found</div>
            )}
          </div>
        </div>

        {/* Upcoming Maintenance */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">🔑 Upcoming Maintenance</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {maintenance.map(m => (
              <div key={m.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{m.equipment}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.type}</p>
                    <p className="text-xs text-gray-400 mt-0.5">👤 {m.assignee} &nbsp;·&nbsp; ⏱ {m.hours} hours</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">📅 {m.date}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setMaintenance(prev => prev.filter(x => x.id !== m.id))}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => setMaintenance(prev => prev.filter(x => x.id !== m.id))}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Activate
                  </button>
                </div>
              </div>
            ))}
            {maintenance.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">No upcoming maintenance</div>
            )}
          </div>
        </div>
      </div>

      {showAdd     && <AddEquipmentModal onClose={() => setShowAdd(false)} />}
      {maintaining && <MaintainModal equipment={maintaining} onClose={() => setMaintaining(null)} />}
      {scheduling  && <ScheduleModal  equipment={scheduling}  onClose={() => setScheduling(null)} />}
    </div>
  )
}
