'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Phone, Mail, MapPin } from 'lucide-react'

interface Supplier {
  id: string; name: string; contact_person: string; phone: string; email: string
  address: string; category: string; materials: string[]; status: 'active' | 'inactive' | 'pending'
  rating: number; lead_time: string; payment_terms: string
}

const MOCK: Supplier[] = [
  { id: 's1', name: 'Bharat Steel Corp',    contact_person: 'Rajesh Kumar',  phone: '+91-98765-43210', email: 'rajesh@bharatsteel.com',   address: 'Mumbai, Maharashtra',  category: 'Steel & Iron',     materials: ['Steel Rods', 'TMT Bars', 'Steel Pipes'],     status: 'active',   rating: 92, lead_time: '5-7 days',   payment_terms: 'Net 30' },
  { id: 's2', name: 'ACC Cement Ltd',       contact_person: 'Priya Singh',   phone: '+91-87654-32109', email: 'priya@acccement.com',        address: 'Ahmedabad, Gujarat',   category: 'Cement & Other',  materials: ['OPC Cement', 'PPC Cement', 'White Cement'],  status: 'active',   rating: 88, lead_time: '2-3 days',   payment_terms: 'Net 15' },
  { id: 's3', name: 'Nirmaan Sand Supply',  contact_person: 'Mohan Patel',   phone: '+91-76543-21098', email: 'mohan@nirmaansand.com',      address: 'Pune, Maharashtra',    category: 'Sand',            materials: ['River Sand', 'M-Sand', 'Coarse Sand'],       status: 'active',   rating: 79, lead_time: '1-2 days',   payment_terms: 'Advance' },
  { id: 's4', name: 'Pioneer Timber Works', contact_person: 'Anil Sharma',   phone: '+91-65432-10987', email: 'anil@pioneertimber.com',     address: 'Bangalore, Karnataka', category: 'Wood',            materials: ['Plywood', 'Timber', 'Shuttering Ply'],       status: 'pending',  rating: 75, lead_time: '7-10 days',  payment_terms: 'Net 45' },
  { id: 's5', name: 'QuickBuild Bricks',    contact_person: 'Sita Devi',     phone: '+91-54321-09876', email: 'sita@quickbuildbricks.com',  address: 'Delhi, NCR',           category: 'Solid',           materials: ['Red Bricks', 'Fly Ash Bricks', 'Concrete Blocks'], status: 'inactive', rating: 65, lead_time: '3-5 days',   payment_terms: 'Net 30' },
]

const STATUS_COLORS: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  pending:  'bg-amber-100 text-amber-700',
}

const CATEGORIES = ['Steel & Iron', 'Cement & Other', 'Fire and mining', 'Solid', 'Wood', 'Sand', 'Gravel', 'Other']

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  name:           z.string().min(1, 'Required'),
  contact_person: z.string().min(1, 'Required'),
  phone:          z.string().min(1, 'Required'),
  email:          z.string().email('Invalid email'),
  address:        z.string().min(1, 'Required'),
  category:       z.string().min(1, 'Required'),
  lead_time:      z.string().min(1, 'Required'),
  payment_terms:  z.string().min(1, 'Required'),
  materials:      z.string().min(1, 'Required'),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (s: Supplier) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) as any })
  return (
    <Modal open onClose={onClose} title="Add Supplier" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({
          id: `s${Date.now()}`, ...d, rating: 80, status: 'pending',
          materials: d.materials.split(',').map(m => m.trim()),
        })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Supplier Name</label>
            <input {...register('name')} className={inp} placeholder="Company name" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Contact Person</label>
            <input {...register('contact_person')} className={inp} placeholder="Contact name" />
            {errors.contact_person && <p className="text-xs text-red-600 mt-1">{errors.contact_person.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Phone</label>
            <input {...register('phone')} className={inp} placeholder="+91-98765-43210" />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" {...register('email')} className={inp} placeholder="email@example.com" />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Address</label>
          <input {...register('address')} className={inp} placeholder="City, State" />
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
            <label className={lbl}>Payment Terms</label>
            <select {...register('payment_terms')} className={inp}>
              {['Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Lead Time</label>
            <input {...register('lead_time')} className={inp} placeholder="5-7 days" />
          </div>
          <div>
            <label className={lbl}>Materials Supplied</label>
            <input {...register('materials')} className={inp} placeholder="Steel, TMT Bars (comma separated)" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Supplier</button>
        </div>
      </form>
    </Modal>
  )
}

function RatingBar({ value }: { value: number }) {
  const color = value >= 85 ? 'bg-green-500' : value >= 70 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value}%</span>
    </div>
  )
}

export function SupplierIntegrationPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK)
  const [showAdd, setShowAdd]     = useState(false)
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('')

  const displayed = suppliers.filter(s => {
    const q = search.toLowerCase()
    return (
      (!q || s.name.toLowerCase().includes(q) || s.contact_person.toLowerCase().includes(q)) &&
      (!category || s.category === category)
    )
  })

  const active   = suppliers.filter(s => s.status === 'active').length
  const pending  = suppliers.filter(s => s.status === 'pending').length
  const avgRating = Math.round(suppliers.reduce((a, s) => a + s.rating, 0) / suppliers.length)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Integration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage material suppliers and procurement partners</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Suppliers', value: suppliers.length, color: 'text-blue-600' },
          { label: 'Active',          value: active,           color: 'text-green-600' },
          { label: 'Pending Review',  value: pending,          color: 'text-amber-600' },
          { label: 'Avg Rating',      value: `${avgRating}%`,  color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
          className={inp + ' max-w-xs'} />
        <select value={category} onChange={e => setCategory(e.target.value)} className={inp + ' max-w-xs'}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Supplier Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {displayed.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                <button className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setSuppliers(prev => prev.filter(x => x.id !== s.id))} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="space-y-1 mb-3">
              <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone className="w-3 h-3" />{s.phone}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail className="w-3 h-3" />{s.email}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin className="w-3 h-3" />{s.address}</p>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1">Supplier Rating</p>
              <RatingBar value={s.rating} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div>
                <span className="text-gray-400">Contact Person</span>
                <p className="font-medium text-gray-700">{s.contact_person}</p>
              </div>
              <div>
                <span className="text-gray-400">Lead Time</span>
                <p className="font-medium text-gray-700">{s.lead_time}</p>
              </div>
              <div>
                <span className="text-gray-400">Payment Terms</span>
                <p className="font-medium text-gray-700">{s.payment_terms}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1.5">Materials Supplied</p>
              <div className="flex flex-wrap gap-1">
                {s.materials.map(m => (
                  <span key={m} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">{m}</span>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, status: 'active' } : x))}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                disabled={s.status === 'active'}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Activate
              </button>
              <button
                onClick={() => setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, status: 'inactive' } : x))}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium"
                disabled={s.status === 'inactive'}
              >
                <XCircle className="w-3.5 h-3.5" /> Deactivate
              </button>
            </div>
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="col-span-2 py-16 text-center text-gray-400">No suppliers found</div>
        )}
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={s => setSuppliers(prev => [s, ...prev])} />}
    </div>
  )
}
