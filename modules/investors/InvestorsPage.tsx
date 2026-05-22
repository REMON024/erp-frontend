'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Phone, Mail, TrendingUp } from 'lucide-react'

export interface Investor {
  id: string; name: string; role: string; phone: string; email: string; address: string
  total_invested: number; status: 'active' | 'inactive'
}

export const INVESTORS: Investor[] = [
  { id: 'inv1', name: 'Mr. Abdur Rahman',  role: 'Managing Director', phone: '+880-171-1234567', email: 'md@constructco.bd',      address: 'Gulshan, Dhaka',   total_invested: 25000000, status: 'active' },
  { id: 'inv2', name: 'Mr. Kamal Hossain', role: 'Chairman',          phone: '+880-172-2345678', email: 'chairman@constructco.bd', address: 'Dhanmondi, Dhaka', total_invested: 18000000, status: 'active' },
  { id: 'inv3', name: 'Ms. Sumaiya Begum', role: 'Director',          phone: '+880-173-3456789', email: 'director1@constructco.bd',address: 'Uttara, Dhaka',    total_invested: 12000000, status: 'active' },
  { id: 'inv4', name: 'Mr. Rafiqul Islam', role: 'Director',          phone: '+880-174-4567890', email: 'director2@constructco.bd',address: 'Mirpur, Dhaka',    total_invested:  8000000, status: 'active' },
  { id: 'inv5', name: 'Mr. Nasir Uddin',   role: 'Investor',          phone: '+880-175-5678901', email: 'nasir@gmail.com',         address: 'Motijheel, Dhaka', total_invested:  5000000, status: 'active' },
]

const ROLES = ['Managing Director', 'Chairman', 'Director', 'Investor', 'Other']

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  name:    z.string().min(1, 'Required'),
  role:    z.string().min(1, 'Required'),
  phone:   z.string().min(1, 'Required'),
  email:   z.string().email('Invalid email'),
  address: z.string().optional(),
})
type Form = z.infer<typeof schema>

function AddInvestorModal({ onClose, onAdd }: { onClose: () => void; onAdd: (i: Investor) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) as any })
  return (
    <Modal open onClose={onClose} title="Add Investor" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({ id: `inv${Date.now()}`, ...d, address: d.address ?? '', total_invested: 0, status: 'active' })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Full Name</label>
            <input {...register('name')} className={inp} placeholder="Mr. Investor Name" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Role / Designation</label>
            <select {...register('role')} className={inp}>
              <option value="">Select role</option>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Phone</label>
            <input {...register('phone')} className={inp} placeholder="+880-171-0000000" />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" {...register('email')} className={inp} placeholder="email@example.com" />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Address</label>
          <input {...register('address')} className={inp} placeholder="City, Bangladesh" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Investor</button>
        </div>
      </form>
    </Modal>
  )
}

function fmt(n: number) { return `৳${(n / 100000).toFixed(1)}L` }

export function InvestorsPage() {
  const [investors, setInvestors] = useState<Investor[]>(INVESTORS)
  const [showAdd, setShowAdd] = useState(false)

  const total = investors.reduce((s, i) => s + i.total_invested, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investor Master</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage investors and their details</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Investor
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Investors</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{investors.filter(i => i.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Capital Invested</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Avg. per Investor</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{fmt(total / (investors.length || 1))}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Role', 'Contact', 'Address', 'Total Invested', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {investors.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {inv.name.split(' ').map(w => w[0]).slice(0,2).join('')}
                    </div>
                    <span className="font-medium text-gray-900">{inv.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-50 text-blue-700">{inv.role}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  <p className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{inv.phone}</p>
                  <p className="flex items-center gap-1 text-xs mt-0.5"><Mail className="w-3 h-3" />{inv.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{inv.address}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{fmt(inv.total_invested)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${inv.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setInvestors(p => p.filter(x => x.id !== inv.id))} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showAdd && <AddInvestorModal onClose={() => setShowAdd(false)} onAdd={i => setInvestors(p => [i, ...p])} />}
    </div>
  )
}
