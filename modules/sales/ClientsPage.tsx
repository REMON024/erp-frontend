'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Phone, Mail, Home } from 'lucide-react'

export interface Client {
  id: string; name: string; phone: string; email: string; address: string
  nid: string; profession: string; status: 'active' | 'inactive'
}

export const CLIENTS: Client[] = [
  { id: 'c1',  name: 'Mr. Zahirul Islam',    phone: '+880-171-1000001', email: 'zahir@gmail.com',       address: 'Mirpur 12, Dhaka',    nid: '1991-1234567', profession: 'Businessman',   status: 'active' },
  { id: 'c2',  name: 'Mrs. Taslima Khanam',  phone: '+880-172-2000002', email: 'taslima@yahoo.com',     address: 'Dhanmondi 27, Dhaka', nid: '1988-2345678', profession: 'Doctor',        status: 'active' },
  { id: 'c3',  name: 'Mr. Sabbir Ahmed',     phone: '+880-173-3000003', email: 'sabbir@hotmail.com',    address: 'Gulshan 1, Dhaka',    nid: '1985-3456789', profession: 'Engineer',      status: 'active' },
  { id: 'c4',  name: 'Mr. Moniruzzaman',     phone: '+880-174-4000004', email: 'monir@gmail.com',       address: 'Uttara, Dhaka',       nid: '1990-4567890', profession: 'Service',       status: 'active' },
  { id: 'c5',  name: 'Ms. Farida Begum',     phone: '+880-175-5000005', email: 'farida@gmail.com',      address: 'Motijheel, Dhaka',    nid: '1983-5678901', profession: 'Teacher',       status: 'active' },
  { id: 'c6',  name: 'Mr. Alamgir Hossain',  phone: '+880-176-6000006', email: 'alamgir@gmail.com',     address: 'Mohammadpur, Dhaka',  nid: '1979-6789012', profession: 'Retired',       status: 'active' },
  { id: 'c7',  name: 'Mr. Shahinur Rahman',  phone: '+880-177-7000007', email: 'shahin@gmail.com',      address: 'Bashundhara, Dhaka',  nid: '1992-7890123', profession: 'IT Professional',status: 'active' },
  { id: 'c8',  name: 'Mrs. Nasreen Sultana', phone: '+880-178-8000008', email: 'nasreen@gmail.com',     address: 'Wari, Dhaka',         nid: '1987-8901234', profession: 'Housewife',     status: 'inactive' },
]

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  name:       z.string().min(1, 'Required'),
  phone:      z.string().min(1, 'Required'),
  email:      z.string().email('Invalid email'),
  address:    z.string().optional(),
  nid:        z.string().optional(),
  profession: z.string().optional(),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Client) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) as any })
  return (
    <Modal open onClose={onClose} title="Add Client" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({ id: `c${Date.now()}`, ...d, address: d.address ?? '', nid: d.nid ?? '', profession: d.profession ?? '', status: 'active' })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Full Name</label>
            <input {...register('name')} className={inp} placeholder="Mr. Client Name" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <input {...register('phone')} className={inp} placeholder="+880-171-0000000" />
            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Email</label>
            <input type="email" {...register('email')} className={inp} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className={lbl}>Profession</label>
            <input {...register('profession')} className={inp} placeholder="Businessman" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>NID / Passport No.</label>
            <input {...register('nid')} className={inp} placeholder="1991-1234567" />
          </div>
          <div>
            <label className={lbl}>Address</label>
            <input {...register('address')} className={inp} placeholder="Area, Dhaka" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Client</button>
        </div>
      </form>
    </Modal>
  )
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(CLIENTS)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch]   = useState('')

  const displayed = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Master</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all unit buyers and their contact details</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Clients</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{clients.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{clients.filter(c => c.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Inactive</p>
          <p className="text-2xl font-bold text-gray-400 mt-1">{clients.filter(c => c.status === 'inactive').length}</p>
        </div>
      </div>

      {/* Search + table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none max-w-xs w-full" />
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Contact', 'Address', 'Profession', 'NID', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {c.name.split(' ').map(w => w[0]).slice(0,2).join('')}
                    </div>
                    <span className="font-medium text-gray-900">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  <p className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{c.phone}</p>
                  <p className="flex items-center gap-1 text-xs mt-0.5"><Mail className="w-3 h-3" />{c.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  <div className="flex items-center gap-1"><Home className="w-3 h-3" />{c.address}</div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{c.profession}</td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{c.nid}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setClients(p => p.filter(x => x.id !== c.id))} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={c => setClients(p => [c, ...p])} />}
    </div>
  )
}
