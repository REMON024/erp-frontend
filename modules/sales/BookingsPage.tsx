'use client'
import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Edit2, FileText, Search, RefreshCw,
  CheckCircle, Clock, XCircle, CalendarDays,
} from 'lucide-react'
import { CLIENTS } from './ClientsPage'
import { UNITS, PROJECTS, setUnitStatus, type ProjectUnit } from './UnitsPage'

export type BookingStatus = 'active' | 'cancelled' | 'completed'

export interface Booking {
  id: string; booking_no: string; client_id: string
  unit_id: string; project_id: string
  agreed_price: number; booking_date: string
  status: BookingStatus; notes: string
}

const now = new Date()
function isoDate(d: Date) { return d.toISOString().split('T')[0] }
function monthsAgo(n: number) { const d = new Date(now); d.setMonth(d.getMonth() - n); return isoDate(d) }

export let BOOKINGS: Booking[] = [
  { id: 'bk1', booking_no: 'BK-2025-001', client_id: 'c1', unit_id: 'u1',  project_id: 'p1', agreed_price: 5600000,  booking_date: monthsAgo(8), status: 'completed', notes: 'Full payment received' },
  { id: 'bk2', booking_no: 'BK-2025-002', client_id: 'c2', unit_id: 'u2',  project_id: 'p1', agreed_price: 5600000,  booking_date: monthsAgo(6), status: 'active',    notes: '' },
  { id: 'bk3', booking_no: 'BK-2025-003', client_id: 'c3', unit_id: 'u3',  project_id: 'p1', agreed_price: 6500000,  booking_date: monthsAgo(7), status: 'completed', notes: '' },
  { id: 'bk4', booking_no: 'BK-2025-004', client_id: 'c4', unit_id: 'u4',  project_id: 'p1', agreed_price: 6300000,  booking_date: monthsAgo(5), status: 'active',    notes: 'Negotiated price' },
  { id: 'bk5', booking_no: 'BK-2025-005', client_id: 'c5', unit_id: 'u7',  project_id: 'p2', agreed_price: 4800000,  booking_date: monthsAgo(4), status: 'completed', notes: '' },
  { id: 'bk6', booking_no: 'BK-2025-006', client_id: 'c6', unit_id: 'u8',  project_id: 'p2', agreed_price: 4800000,  booking_date: monthsAgo(3), status: 'active',    notes: '' },
  { id: 'bk7', booking_no: 'BK-2025-007', client_id: 'c7', unit_id: 'u10', project_id: 'p3', agreed_price: 7800000,  booking_date: monthsAgo(2), status: 'active',    notes: 'Corner unit preference' },
  { id: 'bk8', booking_no: 'BK-2025-008', client_id: 'c8', unit_id: 'u13', project_id: 'p4', agreed_price: 3600000,  booking_date: monthsAgo(1), status: 'active',    notes: '' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; icon: React.ReactNode }> = {
  active:    { label: 'Active',    color: 'bg-blue-100 text-blue-700',  icon: <Clock      className="w-3 h-3" /> },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600',    icon: <XCircle    className="w-3 h-3" /> },
}
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function getClient(id: string)  { return CLIENTS.find(c => c.id === id) }
function getProject(id: string) { return PROJECTS.find(p => p.id === id) }
function getUnit(id: string)    { return UNITS.find(u => u.id === id) }

// ── Form ──────────────────────────────────────────────────────────────────────
const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  client_id:     z.string().min(1, 'Required'),
  project_id:    z.string().min(1, 'Required'),
  unit_id:       z.string().min(1, 'Required'),
  agreed_price:  z.coerce.number().min(1, 'Required'),
  booking_date:  z.string().min(1, 'Required'),
  notes:         z.string().optional(),
})
type Form = z.infer<typeof schema>

function BookingModal({ booking, onClose, onSaved }: {
  booking?: Booking; onClose: () => void
  onSaved: (b: Booking, prevUnitId?: string) => void
}) {
  const isEdit = !!booking
  const [selectedProject, setSelectedProject] = useState(booking?.project_id ?? '')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: booking
      ? { ...booking }
      : { booking_date: isoDate(now) },
  })

  const watchedProject = watch('project_id') || selectedProject

  // Only show available units (+ the currently booked unit if editing)
  const eligibleUnits = UNITS.filter(u =>
    u.project_id === watchedProject &&
    (u.status === 'available' || (isEdit && u.id === booking?.unit_id))
  )

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Booking' : 'New Booking'} size="lg">
      <form onSubmit={handleSubmit(d => {
        const seq = String(BOOKINGS.length + 1).padStart(3, '0')
        const saved: Booking = {
          id:           booking?.id ?? `bk${Date.now()}`,
          booking_no:   booking?.booking_no ?? `BK-${new Date().getFullYear()}-${seq}`,
          client_id:    d.client_id,
          unit_id:      d.unit_id,
          project_id:   d.project_id,
          agreed_price: d.agreed_price,
          booking_date: d.booking_date,
          status:       booking?.status ?? 'active',
          notes:        d.notes ?? '',
        }
        onSaved(saved, booking?.unit_id)
        onClose()
      })} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Client</label>
            <select {...register('client_id')} className={inp}>
              <option value="">Select client</option>
              {CLIENTS.filter(c => c.status === 'active').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.client_id && <p className="text-xs text-red-600 mt-1">{errors.client_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Booking Date</label>
            <input type="date" {...register('booking_date')} className={inp} />
            {errors.booking_date && <p className="text-xs text-red-600 mt-1">{errors.booking_date.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Project</label>
          <select {...register('project_id')} className={inp}
            onChange={e => { setValue('project_id', e.target.value); setValue('unit_id', ''); setSelectedProject(e.target.value) }}>
            <option value="">Select project</option>
            {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
        </div>
        <div>
          <label className={lbl}>Unit <span className="text-gray-400 font-normal">(only available units shown)</span></label>
          <select {...register('unit_id')} className={inp}
            onChange={e => {
              setValue('unit_id', e.target.value)
              const u = UNITS.find(u => u.id === e.target.value)
              if (u) setValue('agreed_price', u.price)
            }}>
            <option value="">Select unit</option>
            {eligibleUnits.map(u => (
              <option key={u.id} value={u.id}>
                {u.unit_no} — {u.type} | Floor {u.floor ?? 'G'} | {u.area_sqft} sqft | {fmt(u.price)}
              </option>
            ))}
          </select>
          {eligibleUnits.length === 0 && watchedProject && (
            <p className="text-xs text-amber-600 mt-1">No available units in this project</p>
          )}
          {errors.unit_id && <p className="text-xs text-red-600 mt-1">{errors.unit_id.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Agreed Price (৳)</label>
            <input type="number" {...register('agreed_price')} className={inp} placeholder="Auto-filled from unit" />
            {errors.agreed_price && <p className="text-xs text-red-600 mt-1">{errors.agreed_price.message}</p>}
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <input {...register('notes')} className={inp} placeholder="Optional…" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            {isEdit ? 'Save Changes' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function BookingsPage() {
  const [bookings,      setBookings]      = useState<Booking[]>(BOOKINGS)
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [modal,         setModal]         = useState<'new' | 'edit' | 'cancel' | null>(null)
  const [target,        setTarget]        = useState<Booking | null>(null)

  const filtered = useMemo(() => bookings.filter(b => {
    if (statusFilter  && b.status     !== statusFilter)  return false
    if (projectFilter && b.project_id !== projectFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const client = getClient(b.client_id)
      const unit   = getUnit(b.unit_id)
      if (!b.booking_no.toLowerCase().includes(q) &&
          !client?.name.toLowerCase().includes(q) &&
          !unit?.unit_no.toLowerCase().includes(q)) return false
    }
    return true
  }), [bookings, search, statusFilter, projectFilter])

  const saveBooking = (saved: Booking, prevUnitId?: string) => {
    // Update unit status
    if (prevUnitId && prevUnitId !== saved.unit_id) {
      setUnitStatus(prevUnitId, 'available')    // release old unit
    }
    if (saved.status !== 'cancelled') {
      setUnitStatus(saved.unit_id, saved.status === 'completed' ? 'sold' : 'booked')
    }

    setBookings(prev => {
      const exists = prev.find(b => b.id === saved.id)
      const next = exists ? prev.map(b => b.id === saved.id ? saved : b) : [saved, ...prev]
      BOOKINGS = next
      return next
    })
  }

  const cancelBooking = () => {
    if (!target) return
    const cancelled = { ...target, status: 'cancelled' as BookingStatus }
    setUnitStatus(target.unit_id, 'available')
    setBookings(prev => { const next = prev.map(b => b.id === target.id ? cancelled : b); BOOKINGS = next; return next })
    setModal(null); setTarget(null)
  }

  const markComplete = (b: Booking) => {
    const completed = { ...b, status: 'completed' as BookingStatus }
    setUnitStatus(b.unit_id, 'sold')
    setBookings(prev => { const next = prev.map(x => x.id === b.id ? completed : x); BOOKINGS = next; return next })
  }

  // Stats
  const totalValue    = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.agreed_price, 0)
  const activeCount   = bookings.filter(b => b.status === 'active').length
  const completedCount = bookings.filter(b => b.status === 'completed').length
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage unit bookings and sales agreements</p>
        </div>
        <button onClick={() => setModal('new')}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Booking Value',  value: fmt(totalValue),    color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Active Bookings',      value: activeCount,        color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Completed (Sold)',     value: completedCount,     color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Cancelled',            value: cancelledCount,     color: 'text-red-500',    bg: 'bg-red-50'    },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-gray-200 p-5 ${s.bg}`}>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search booking no, client, unit…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Projects</option>
          {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={() => { setSearch(''); setProjectFilter(''); setStatusFilter('') }}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Booking No.', 'Client', 'Project / Unit', 'Unit Details', 'Agreed Price', 'Booking Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No bookings found</td></tr>
              ) : filtered.map(b => {
                const client  = getClient(b.client_id)
                const unit    = getUnit(b.unit_id)
                const project = getProject(b.project_id)
                const sc      = STATUS_CONFIG[b.status]
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{b.booking_no}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">{client?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{client?.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-xs">{project?.name}</p>
                      <p className="text-xs text-gray-500 font-semibold mt-0.5">{unit?.unit_no}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <p className="capitalize">{unit?.type} · Floor {unit?.floor ?? 'G'}</p>
                      <p>{unit?.area_sqft.toLocaleString()} sqft · {unit?.facing}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(b.agreed_price)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {b.booking_date}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${sc.color}`}>
                        {sc.icon} {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {b.status === 'active' && (<>
                          <button onClick={() => { setTarget(b); setModal('edit') }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => markComplete(b)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Mark as Sold">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setTarget(b); setModal('cancel') }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancel Booking">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>)}
                        <button
                          onClick={() => window.location.href = '/sales/schedules'}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Payment Schedule">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'new' || modal === 'edit') && (
        <BookingModal
          booking={modal === 'edit' ? target ?? undefined : undefined}
          onClose={() => { setModal(null); setTarget(null) }}
          onSaved={saveBooking} />
      )}

      {modal === 'cancel' && target && (
        <Modal open onClose={() => { setModal(null); setTarget(null) }} title="Cancel Booking" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Cancel booking <strong>{target.booking_no}</strong> for{' '}
              <strong>{getClient(target.client_id)?.name}</strong>?
              The unit <strong>{getUnit(target.unit_id)?.unit_no}</strong> will be released back to available.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setModal(null); setTarget(null) }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Keep Booking</button>
              <button onClick={cancelBooking}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Cancel Booking</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
