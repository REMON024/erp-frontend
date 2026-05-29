'use client'
import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Home, RefreshCw, Search, Building2 } from 'lucide-react'

// ── Shared static data (used by InvoicesPage and BookingsPage) ────────────────
export const PROJECTS = [
  { id: 'p1', name: 'Block-A — Mirpur 12' },
  { id: 'p2', name: 'Block-B — Mohammadpur' },
  { id: 'p3', name: 'Block-C — Uttara Sector 7' },
  { id: 'p4', name: 'Block-D — Bashundhara' },
]

export type UnitType   = 'apartment' | 'villa' | 'commercial' | 'plot'
export type UnitStatus = 'available' | 'booked' | 'sold' | 'reserved'

export interface ProjectUnit {
  id: string; project_id: string; unit_no: string
  type: UnitType; floor: number | null; area_sqft: number
  price: number; facing: string; status: UnitStatus; remarks: string
}

export let UNITS: ProjectUnit[] = [
  { id: 'u1',  project_id: 'p1', unit_no: 'A-101', type: 'apartment', floor: 1,    area_sqft: 1200, price: 5600000,  facing: 'South', status: 'sold',      remarks: '' },
  { id: 'u2',  project_id: 'p1', unit_no: 'A-102', type: 'apartment', floor: 1,    area_sqft: 1200, price: 5600000,  facing: 'North', status: 'booked',    remarks: '' },
  { id: 'u3',  project_id: 'p1', unit_no: 'A-201', type: 'apartment', floor: 2,    area_sqft: 1400, price: 6500000,  facing: 'South', status: 'sold',      remarks: '' },
  { id: 'u4',  project_id: 'p1', unit_no: 'A-202', type: 'apartment', floor: 2,    area_sqft: 1400, price: 6500000,  facing: 'East',  status: 'available', remarks: '' },
  { id: 'u5',  project_id: 'p1', unit_no: 'A-301', type: 'apartment', floor: 3,    area_sqft: 1200, price: 5800000,  facing: 'South', status: 'available', remarks: '' },
  { id: 'u6',  project_id: 'p1', unit_no: 'A-302', type: 'apartment', floor: 3,    area_sqft: 1200, price: 5800000,  facing: 'West',  status: 'reserved',  remarks: 'Hold for VIP' },
  { id: 'u7',  project_id: 'p2', unit_no: 'B-101', type: 'apartment', floor: 1,    area_sqft: 1100, price: 4800000,  facing: 'South', status: 'sold',      remarks: '' },
  { id: 'u8',  project_id: 'p2', unit_no: 'B-102', type: 'apartment', floor: 1,    area_sqft: 1100, price: 4800000,  facing: 'North', status: 'booked',    remarks: '' },
  { id: 'u9',  project_id: 'p2', unit_no: 'B-201', type: 'apartment', floor: 2,    area_sqft: 1300, price: 5500000,  facing: 'East',  status: 'available', remarks: '' },
  { id: 'u10', project_id: 'p3', unit_no: 'C-101', type: 'apartment', floor: 1,    area_sqft: 1600, price: 8000000,  facing: 'South', status: 'booked',    remarks: '' },
  { id: 'u11', project_id: 'p3', unit_no: 'C-201', type: 'apartment', floor: 2,    area_sqft: 1600, price: 8200000,  facing: 'South', status: 'available', remarks: '' },
  { id: 'u12', project_id: 'p3', unit_no: 'C-G01', type: 'commercial', floor: 0,   area_sqft: 800,  price: 4000000,  facing: 'East',  status: 'available', remarks: 'Ground floor shop' },
  { id: 'u13', project_id: 'p4', unit_no: 'D-101', type: 'apartment', floor: 1,    area_sqft: 900,  price: 3600000,  facing: 'North', status: 'booked',    remarks: '' },
  { id: 'u14', project_id: 'p4', unit_no: 'D-PL1', type: 'plot',       floor: null, area_sqft: 2400, price: 12000000, facing: '—',     status: 'available', remarks: 'Corner plot' },
]

// Allow BookingsPage to mutate status
export function setUnitStatus(unitId: string, status: UnitStatus) {
  UNITS = UNITS.map(u => u.id === unitId ? { ...u, status } : u)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<UnitType, string> = {
  apartment:  'bg-blue-100 text-blue-700',
  villa:      'bg-purple-100 text-purple-700',
  commercial: 'bg-amber-100 text-amber-700',
  plot:       'bg-green-100 text-green-700',
}
const STATUS_COLORS: Record<UnitStatus, string> = {
  available: 'bg-emerald-100 text-emerald-700',
  booked:    'bg-blue-100 text-blue-700',
  sold:      'bg-gray-100 text-gray-500',
  reserved:  'bg-yellow-100 text-yellow-700',
}
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

// ── Form schema ───────────────────────────────────────────────────────────────
const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  project_id: z.string().min(1, 'Required'),
  unit_no:    z.string().min(1, 'Required').max(20),
  type:       z.enum(['apartment', 'villa', 'commercial', 'plot']),
  floor:      z.coerce.number().nullable(),
  area_sqft:  z.coerce.number().min(1, 'Required'),
  price:      z.coerce.number().min(1, 'Required'),
  facing:     z.string().optional(),
  status:     z.enum(['available', 'booked', 'sold', 'reserved']),
  remarks:    z.string().optional(),
})
type Form = z.infer<typeof schema>

function UnitModal({ unit, onClose, onSaved }: {
  unit?: ProjectUnit; onClose: () => void; onSaved: (u: ProjectUnit) => void
}) {
  const isEdit = !!unit
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: unit
      ? { ...unit, floor: unit.floor ?? undefined }
      : { type: 'apartment', status: 'available', floor: undefined },
  })

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Unit' : 'Add Unit'} size="lg">
      <form onSubmit={handleSubmit(d => {
        const saved: ProjectUnit = {
          id:         unit?.id ?? `u${Date.now()}`,
          project_id: d.project_id,
          unit_no:    d.unit_no,
          type:       d.type,
          floor:      d.floor ?? null,
          area_sqft:  d.area_sqft,
          price:      d.price,
          facing:     d.facing ?? '—',
          status:     d.status,
          remarks:    d.remarks ?? '',
        }
        onSaved(saved)
        onClose()
      })} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project</label>
            <select {...register('project_id')} className={inp}>
              <option value="">Select project</option>
              {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Unit No.</label>
            <input {...register('unit_no')} className={inp} placeholder="e.g. A-101" />
            {errors.unit_no && <p className="text-xs text-red-600 mt-1">{errors.unit_no.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Type</label>
            <select {...register('type')} className={inp}>
              <option value="apartment">Apartment</option>
              <option value="villa">Villa</option>
              <option value="commercial">Commercial</option>
              <option value="plot">Plot</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Floor <span className="text-gray-400 font-normal">(0 = Ground)</span></label>
            <input type="number" {...register('floor')} className={inp} placeholder="e.g. 3" />
          </div>
          <div>
            <label className={lbl}>Area (sqft)</label>
            <input type="number" {...register('area_sqft')} className={inp} placeholder="1200" />
            {errors.area_sqft && <p className="text-xs text-red-600 mt-1">{errors.area_sqft.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Price (৳)</label>
            <input type="number" {...register('price')} className={inp} placeholder="5000000" />
            {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price.message}</p>}
          </div>
          <div>
            <label className={lbl}>Facing</label>
            <select {...register('facing')} className={inp}>
              <option value="">—</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="North-East">North-East</option>
              <option value="South-West">South-West</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Status</label>
            <select {...register('status')} className={inp}>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="booked">Booked</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </div>
        <div>
          <label className={lbl}>Remarks</label>
          <input {...register('remarks')} className={inp} placeholder="Optional notes…" />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            {isEdit ? 'Save Changes' : 'Add Unit'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function UnitsPage() {
  const [units,         setUnits]         = useState<ProjectUnit[]>(UNITS)
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter,    setTypeFilter]    = useState('')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [search,        setSearch]        = useState('')
  const [modal,         setModal]         = useState<'add' | 'edit' | 'delete' | null>(null)
  const [target,        setTarget]        = useState<ProjectUnit | null>(null)

  const filtered = useMemo(() => units.filter(u => {
    if (projectFilter && u.project_id !== projectFilter) return false
    if (typeFilter    && u.type       !== typeFilter)    return false
    if (statusFilter  && u.status     !== statusFilter)  return false
    if (search && !u.unit_no.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [units, projectFilter, typeFilter, statusFilter, search])

  const save = (saved: ProjectUnit) => {
    setUnits(prev => {
      const exists = prev.find(u => u.id === saved.id)
      const next = exists ? prev.map(u => u.id === saved.id ? saved : u) : [saved, ...prev]
      UNITS = next
      return next
    })
  }

  const remove = () => {
    if (!target) return
    setUnits(prev => { const next = prev.filter(u => u.id !== target.id); UNITS = next; return next })
    setModal(null); setTarget(null)
  }

  const getProject = (id: string) => PROJECTS.find(p => p.id === id)

  // Stats
  const total     = units.length
  const available = units.filter(u => u.status === 'available').length
  const booked    = units.filter(u => u.status === 'booked').length
  const sold      = units.filter(u => u.status === 'sold').length
  const reserved  = units.filter(u => u.status === 'reserved').length
  const totalValue = units.filter(u => u.status === 'available').reduce((s, u) => s + u.price, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unit Configuration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define and manage sellable units across all projects</p>
        </div>
        <button onClick={() => setModal('add')}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Unit
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Units',  value: total,          color: 'text-gray-900',    bg: 'bg-white' },
          { label: 'Available',    value: available,      color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Booked',       value: booked,         color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: 'Sold',         value: sold,           color: 'text-gray-500',    bg: 'bg-gray-50' },
          { label: 'Reserved',     value: reserved,       color: 'text-yellow-600',  bg: 'bg-yellow-50' },
          { label: 'Available Value', value: fmt(totalValue), color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-gray-200 p-4 ${s.bg}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide leading-tight">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search unit no…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Projects</option>
          {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Types</option>
          <option value="apartment">Apartment</option>
          <option value="villa">Villa</option>
          <option value="commercial">Commercial</option>
          <option value="plot">Plot</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="booked">Booked</option>
          <option value="sold">Sold</option>
          <option value="reserved">Reserved</option>
        </select>
        <button onClick={() => { setSearch(''); setProjectFilter(''); setTypeFilter(''); setStatusFilter('') }}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">{filtered.length} unit{filtered.length !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Building2 className="w-3.5 h-3.5" /> Project units
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Unit No.', 'Project', 'Type', 'Floor', 'Area (sqft)', 'Price', 'Facing', 'Status', 'Remarks', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">No units found</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{u.unit_no}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{getProject(u.project_id)?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${TYPE_COLORS[u.type]}`}>{u.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-center">{u.floor ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{u.area_sqft.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{fmt(u.price)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.facing}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[u.status]}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">{u.remarks || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setTarget(u); setModal('edit') }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setTarget(u); setModal('delete') }}
                        disabled={u.status === 'booked' || u.status === 'sold'}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={u.status === 'booked' || u.status === 'sold' ? 'Cannot delete a booked/sold unit' : 'Delete'}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <UnitModal unit={modal === 'edit' ? target ?? undefined : undefined}
          onClose={() => { setModal(null); setTarget(null) }}
          onSaved={save} />
      )}

      {modal === 'delete' && target && (
        <Modal open onClose={() => { setModal(null); setTarget(null) }} title="Delete Unit" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Delete unit <strong>{target.unit_no}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setModal(null); setTarget(null) }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={remove} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
