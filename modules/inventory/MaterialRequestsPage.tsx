'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, CheckCircle, XCircle } from 'lucide-react'

interface MaterialRequest {
  id: string; requester: string; project_id: string; material: string
  quantity: number; unit: string; urgency: 'low' | 'medium' | 'high'
  date: string; status: 'pending' | 'approved' | 'rejected' | 'fulfilled'
  notes?: string
}

const MOCK: MaterialRequest[] = [
  { id: 'mr1', requester: 'Aman Asati',    project_id: 'p1', material: 'Steel',   quantity: 50,  unit: 'Tons',  urgency: 'high',   date: '2025-11-20', status: 'pending',   notes: 'Required for foundation work' },
  { id: 'mr2', requester: 'John Lahari',   project_id: 'p2', material: 'Cement',  quantity: 200, unit: 'Bags',  urgency: 'medium', date: '2025-11-22', status: 'approved',  notes: 'Phase 2 plastering' },
  { id: 'mr3', requester: 'Diksha Kushwah',project_id: 'p1', material: 'Bricks',  quantity: 5000,unit: 'Pieces',urgency: 'low',    date: '2025-11-25', status: 'pending',   notes: 'Wall construction' },
  { id: 'mr4', requester: 'Ravi Kumar',    project_id: 'p2', material: 'Sand',    quantity: 30,  unit: 'Tons',  urgency: 'medium', date: '2025-11-18', status: 'fulfilled', notes: 'Ready mix concrete' },
  { id: 'mr5', requester: 'Priya Sharma',  project_id: 'p1', material: 'Paint',   quantity: 100, unit: 'Liters',urgency: 'low',    date: '2025-11-28', status: 'rejected',  notes: 'Interior finishing' },
]

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-blue-100 text-blue-700',
  rejected:  'bg-red-100 text-red-700',
  fulfilled: 'bg-green-100 text-green-700',
}
const URG_COLORS: Record<string, string> = {
  low:    'bg-gray-100 text-gray-600',
  medium: 'bg-orange-100 text-orange-700',
  high:   'bg-red-100 text-red-700',
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  requester:  z.string().min(1, 'Required'),
  project_id: z.string().min(1, 'Required'),
  material:   z.string().min(1, 'Required'),
  quantity:   z.coerce.number().min(1, 'Required'),
  unit:       z.string().min(1, 'Required'),
  urgency:    z.enum(['low', 'medium', 'high']),
  notes:      z.string().optional(),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (r: MaterialRequest) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { urgency: 'medium' },
  })
  return (
    <Modal open onClose={onClose} title="New Material Request" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({ id: `mr${Date.now()}`, ...d, date: new Date().toISOString().split('T')[0], status: 'pending' })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Requester Name</label>
            <input {...register('requester')} className={inp} placeholder="Your name" />
            {errors.requester && <p className="text-xs text-red-600 mt-1">{errors.requester.message}</p>}
          </div>
          <div>
            <label className={lbl}>Project ID</label>
            <input {...register('project_id')} className={inp} placeholder="p1" />
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Material Name</label>
            <input {...register('material')} className={inp} placeholder="Steel, Cement, Sand..." />
            {errors.material && <p className="text-xs text-red-600 mt-1">{errors.material.message}</p>}
          </div>
          <div>
            <label className={lbl}>Urgency</label>
            <select {...register('urgency')} className={inp}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Quantity</label>
            <input type="number" {...register('quantity')} className={inp} placeholder="100" />
            {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className={lbl}>Unit</label>
            <select {...register('unit')} className={inp}>
              {['Tons', 'Kg', 'Bags', 'Cubic Meter', 'Meter', 'Liters', 'Pieces'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={lbl}>Notes</label>
          <textarea rows={2} {...register('notes')} className={inp + ' resize-none'} placeholder="Purpose and additional details..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Submit Request</button>
        </div>
      </form>
    </Modal>
  )
}

export function MaterialRequestsPage() {
  const [requests, setRequests] = useState<MaterialRequest[]>(MOCK)
  const [showAdd, setShowAdd]   = useState(false)
  const [filter, setFilter]     = useState('')

  const displayed = filter ? requests.filter(r => r.status === filter) : requests

  function approve(id: string) { setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r)) }
  function reject(id: string)  { setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r)) }
  function fulfill(id: string) { setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'fulfilled' } : r)) }

  const pending = requests.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Material Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Site material requisitions and approval workflow</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: requests.length,                                          color: 'text-blue-600' },
          { label: 'Pending',        value: pending,                                                   color: 'text-amber-600' },
          { label: 'Approved',       value: requests.filter(r => r.status === 'approved').length,     color: 'text-green-600' },
          { label: 'Fulfilled',      value: requests.filter(r => r.status === 'fulfilled').length,    color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'pending', 'approved', 'rejected', 'fulfilled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'pending' && pending > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5">{pending}</span>}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {displayed.map(r => (
          <div key={r.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{r.material}</p>
                  <span className="font-bold text-gray-700">{r.quantity} {r.unit}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${URG_COLORS[r.urgency]}`}>{r.urgency} priority</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">By {r.requester} · Project: {r.project_id} · {r.date}</p>
                {r.notes && <p className="text-xs text-gray-400 mt-0.5">{r.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLORS[r.status]}`}>{r.status}</span>
              </div>
            </div>
            {r.status === 'pending' && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => approve(r.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </button>
                <button onClick={() => reject(r.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            )}
            {r.status === 'approved' && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => fulfill(r.id)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Mark Fulfilled
                </button>
              </div>
            )}
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="py-12 text-center text-gray-400">No material requests found</div>
        )}
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={r => setRequests(prev => [r, ...prev])} />}
    </div>
  )
}
