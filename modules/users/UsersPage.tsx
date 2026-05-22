'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Shield, User, Eye, EyeOff } from 'lucide-react'

type UserRole = 'super_admin' | 'operations' | 'inventory'

interface AppUser {
  id: string; name: string; email: string; role: UserRole
  phone: string; last_login: string; status: 'active' | 'inactive'
}

const MOCK_USERS: AppUser[] = [
  { id: 'u1', name: 'Mr. Abdur Rahman',  email: 'md@constructco.bd',        role: 'super_admin', phone: '+880-171-1234567', last_login: '2025-11-01', status: 'active' },
  { id: 'u2', name: 'Mr. Kamal Hossain', email: 'chairman@constructco.bd',  role: 'super_admin', phone: '+880-172-2345678', last_login: '2025-10-28', status: 'active' },
  { id: 'u3', name: 'Mr. Arif Operations',email: 'arif@constructco.bd',     role: 'operations',  phone: '+880-173-1111111', last_login: '2025-11-01', status: 'active' },
  { id: 'u4', name: 'Mr. Rashed Ops',    email: 'rashed@constructco.bd',    role: 'operations',  phone: '+880-174-2222222', last_login: '2025-10-30', status: 'active' },
  { id: 'u5', name: 'Mr. Salam Store',   email: 'salam@constructco.bd',     role: 'inventory',   phone: '+880-175-3333333', last_login: '2025-11-01', status: 'active' },
  { id: 'u6', name: 'Mr. Jamal Store',   email: 'jamal@constructco.bd',     role: 'inventory',   phone: '+880-176-4444444', last_login: '2025-10-25', status: 'inactive' },
]

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  operations:  'Operations',
  inventory:   'Inventory',
}
const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  operations:  'bg-blue-100 text-blue-700',
  inventory:   'bg-orange-100 text-orange-700',
}
const ROLE_ACCESS: Record<UserRole, string[]> = {
  super_admin: ['All modules', 'User management', 'System settings'],
  operations:  ['Projects', 'Investors', 'Purchase', 'Sales', 'Accounting', 'Profit Distribution'],
  inventory:   ['Stock Levels', 'Stock In', 'Issue to Project'],
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  name:     z.string().min(1, 'Required'),
  email:    z.string().email('Invalid email'),
  role:     z.enum(['super_admin', 'operations', 'inventory']),
  phone:    z.string().min(1, 'Required'),
  password: z.string().min(6, 'Min 6 characters'),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (u: AppUser) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { role: 'operations' },
  })
  const [showPass, setShowPass] = useState(false)
  return (
    <Modal open onClose={onClose} title="Add User" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({ id: `u${Date.now()}`, name: d.name, email: d.email, role: d.role, phone: d.phone, last_login: '—', status: 'active' })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Full Name</label>
            <input {...register('name')} className={inp} placeholder="User name" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Role</label>
            <select {...register('role')} className={inp}>
              <option value="super_admin">Super Admin</option>
              <option value="operations">Operations</option>
              <option value="inventory">Inventory</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Email</label>
            <input type="email" {...register('email')} className={inp} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <input {...register('phone')} className={inp} placeholder="+880-171-0000000" />
          </div>
        </div>
        <div>
          <label className={lbl}>Password</label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} {...register('password')} className={inp} placeholder="Min 6 characters" />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add User</button>
        </div>
      </form>
    </Modal>
  )
}

export function UsersPage() {
  const [users, setUsers]   = useState<AppUser[]>(MOCK_USERS)
  const [showAdd, setShowAdd] = useState(false)

  const activeCount = users.filter(u => u.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage system users and role-based access (Super Admin only)</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
        </div>
        {(['super_admin', 'operations', 'inventory'] as UserRole[]).map(role => (
          <div key={role} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{ROLE_LABELS[role]}</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{users.filter(u => u.role === role).length}</p>
          </div>
        ))}
      </div>

      {/* Role access reference */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['super_admin', 'operations', 'inventory'] as UserRole[]).map(role => (
          <div key={role} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-gray-500" />
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
            </div>
            <ul className="space-y-1">
              {ROLE_ACCESS[role].map(access => (
                <li key={access} className="text-xs text-gray-600 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  {access}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['User', 'Email', 'Phone', 'Role', 'Last Login', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {u.name.split(' ').map(w => w[0]).slice(0,2).join('')}
                    </div>
                    <span className="font-medium text-gray-900">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.phone}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{u.last_login}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setUsers(p => p.filter(x => x.id !== u.id))} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={u => setUsers(p => [u, ...p])} />}
    </div>
  )
}
