'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { CompliancePermit } from '@/types'
import { formatDate } from '@/utils/format'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, Percent, Clock, AlertTriangle, Edit2, Trash2, CheckCircle } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Inspection {
  id: string; title: string; type: string; project_id: string
  inspector: string; scheduled_time: string; scheduled_date: string; status: string
}

// ── Static mock inspections ───────────────────────────────────────────────────
const MOCK_INSPECTIONS: Inspection[] = [
  { id: 'i1', title: 'Building Permit Inspection',      type: 'Building Permit',      project_id: 'p1', inspector: 'John Lahari',     scheduled_time: '2:00 PM', scheduled_date: '2025-12-20', status: 'scheduled' },
  { id: 'i2', title: 'Environmental Permit Inspection', type: 'Environmental Permit',  project_id: 'p1', inspector: 'Diksha Kushwah',   scheduled_time: '11:00 AM', scheduled_date: '2025-11-28', status: 'scheduled' },
  { id: 'i3', title: 'Building Permit Review',          type: 'Building Permit',      project_id: 'p2', inspector: 'Aman Asati',       scheduled_time: '3:30 PM', scheduled_date: '2025-12-05', status: 'scheduled' },
  { id: 'i4', title: 'Environmental Follow-up',         type: 'Environmental Permit',  project_id: 'p2', inspector: 'Ravi Kumar',        scheduled_time: '10:00 AM', scheduled_date: '2025-12-15', status: 'scheduled' },
]

// ── Schemas ───────────────────────────────────────────────────────────────────
const permitSchema = z.object({
  project_id:       z.string().min(1, 'Required'),
  title:            z.string().min(1, 'Required'),
  permit_number:    z.string().min(1, 'Required'),
  issuing_authority:z.string().min(1, 'Required'),
  issue_date:       z.string().min(1, 'Required'),
  expiry_date:      z.string().min(1, 'Required'),
})
type PermitForm = z.infer<typeof permitSchema>

const inspectionSchema = z.object({
  title:      z.string().min(1, 'Required'),
  type:       z.string().min(1, 'Required'),
  project_id: z.string().min(1, 'Required'),
  inspector:  z.string().min(1, 'Required'),
  scheduled_date: z.string().min(1, 'Required'),
  scheduled_time: z.string().min(1, 'Required'),
})
type InspectionForm = z.infer<typeof inspectionSchema>

// ── Input style ───────────────────────────────────────────────────────────────
const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

// ── Modals ────────────────────────────────────────────────────────────────────
function NewPermitModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<PermitForm>({ resolver: zodResolver(permitSchema) as any })
  const mut = useMutation({
    mutationFn: (d: unknown) => api.post('/compliance/permits', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compliance-permits'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="New Permit Request" size="md">
      <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project ID</label>
            <input {...register('project_id')} className={inp} placeholder="p1" />
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Permit Number</label>
            <input {...register('permit_number')} className={inp} placeholder="RAJUK-2025-001" />
            {errors.permit_number && <p className="text-xs text-red-600 mt-1">{errors.permit_number.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Title</label>
          <input {...register('title')} className={inp} placeholder="Building Construction Permit" />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <label className={lbl}>Issuing Authority</label>
          <input {...register('issuing_authority')} className={inp} placeholder="RAJUK" />
          {errors.issuing_authority && <p className="text-xs text-red-600 mt-1">{errors.issuing_authority.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Issue Date</label>
            <input type="date" {...register('issue_date')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Expiry Date</label>
            <input type="date" {...register('expiry_date')} className={inp} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
            {mut.isPending ? 'Saving...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AddInspectionModal({ onClose }: { onClose: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<InspectionForm>({
    resolver: zodResolver(inspectionSchema) as any,
    defaultValues: { scheduled_date: new Date().toISOString().split('T')[0], scheduled_time: '10:00 AM' },
  })
  const [saved, setSaved] = useState(false)

  if (saved) return null

  return (
    <Modal open onClose={onClose} title="Add Inspection" size="md">
      <form onSubmit={handleSubmit(() => { setSaved(true); onClose() })} className="space-y-4 p-1">
        <div>
          <label className={lbl}>Inspection Title</label>
          <input {...register('title')} className={inp} placeholder="Building Permit Inspection" />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Type</label>
            <select {...register('type')} className={inp}>
              <option value="">Select type</option>
              <option>Building Permit</option>
              <option>Environmental Permit</option>
              <option>Safety Inspection</option>
              <option>Fire Safety</option>
              <option>Structural Inspection</option>
            </select>
            {errors.type && <p className="text-xs text-red-600 mt-1">{errors.type.message}</p>}
          </div>
          <div>
            <label className={lbl}>Project ID</label>
            <input {...register('project_id')} className={inp} placeholder="p1" />
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Inspector Name</label>
          <input {...register('inspector')} className={inp} placeholder="Inspector name" />
          {errors.inspector && <p className="text-xs text-red-600 mt-1">{errors.inspector.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Scheduled Date</label>
            <input type="date" {...register('scheduled_date')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Scheduled Time</label>
            <input {...register('scheduled_time')} className={inp} placeholder="2:00 PM" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Add Inspection
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CompliancePage() {
  const qc = useQueryClient()
  const [showPermit, setShowPermit]       = useState(false)
  const [showInspection, setShowInspection] = useState(false)
  const [inspections, setInspections]     = useState<Inspection[]>(MOCK_INSPECTIONS)

  const { data: permitsData } = useQuery({
    queryKey: ['compliance-permits'],
    queryFn: () => api.get('/compliance/permits').then(r => r.data),
  })

  const deletePermit = useMutation({
    mutationFn: (id: string) => api.delete(`/compliance/permits/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-permits'] }),
  })

  const permits: CompliancePermit[] = permitsData?.data ?? []
  const activePermits  = permits.filter(p => p.status === 'active').length
  const pendingPermits = permits.filter(p => p.status === 'pending').length
  const safetyViolations = 2

  const complianceRate = permits.length > 0
    ? Math.round((activePermits / permits.length) * 100)
    : 0

  function markComplete(id: string) {
    setInspections(prev => prev.map(i => i.id === id ? { ...i, status: 'completed' } : i))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor permits, inspections, and regulatory compliance</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" /> Compliance Report
          </button>
          <button onClick={() => setShowPermit(true)} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
            New Permit Request
          </button>
          <button onClick={() => setShowInspection(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            + Add Inspection
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Permits & Licenses', value: activePermits,    icon: FileText,       iconBg: 'bg-blue-50',   iconColor: 'text-blue-500' },
          { label: 'Compliance Rate',           value: `${complianceRate}%`, icon: Percent,   iconBg: 'bg-green-50',  iconColor: 'text-green-500' },
          { label: 'Pending Permits',           value: pendingPermits,   icon: Clock,          iconBg: 'bg-orange-50', iconColor: 'text-orange-500' },
          { label: 'Safety Violations',         value: safetyViolations, icon: AlertTriangle,  iconBg: 'bg-red-50',    iconColor: 'text-red-500' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">{k.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{k.value}</p>
              <p className="text-xs text-gray-400 mt-1">This month</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${k.iconBg}`}>
              <k.icon className={`w-5 h-5 ${k.iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Permits */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Active Permits & Licenses</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {permits.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">No permits found</div>
            )}
            {permits.map(p => {
              const statusColors: Record<string, string> = {
                active:   'bg-green-100 text-green-700',
                expired:  'bg-red-100 text-red-700',
                pending:  'bg-amber-100 text-amber-700',
                pending_renewal: 'bg-orange-100 text-orange-700',
              }
              return (
                <div key={p.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm">{p.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.permit_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.issuing_authority} · Project: {p.project_id}</p>
                      {p.expiry_date && (
                        <p className="text-xs text-gray-400 mt-0.5">Expires: {formatDate(p.expiry_date)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${statusColors[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                      <button className="text-gray-400 hover:text-blue-600 p-1 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deletePermit.mutate(p.id)} className="text-gray-400 hover:text-red-600 p-1 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming Inspections */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Upcoming Inspections</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {inspections.map(ins => (
              <div key={ins.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 text-sm">{ins.title}</p>
                      <span className="text-xs text-gray-400">{ins.scheduled_time}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{ins.inspector}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ins.scheduled_date}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {ins.status !== 'completed' ? (
                    <>
                      <button
                        onClick={() => markComplete(ins.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Mark Complete
                      </button>
                      <button className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                        View Details
                      </button>
                      <button className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                        Reschedule
                      </button>
                    </>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold">Completed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showPermit     && <NewPermitModal    onClose={() => setShowPermit(false)} />}
      {showInspection && <AddInspectionModal onClose={() => setShowInspection(false)} />}
    </div>
  )
}
