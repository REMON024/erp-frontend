'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Shield, Eye, EyeOff, Search, ToggleLeft, ToggleRight, UserCheck } from 'lucide-react'

type UserRole = 'super_admin' | 'operations' | 'inventory'
type UserStatus = 'active' | 'inactive'

interface AppUser {
  id: string; firstName: string; lastName: string
  email: string; role: UserRole; phone: string
  lastLogin: string; status: UserStatus; createdAt: string
}

const MOCK_USERS: AppUser[] = [
  { id: 'u1', firstName: 'Abdur',  lastName: 'Rahman',  email: 'admin@constructerp.bd',   role: 'super_admin', phone: '+880-171-1234567', lastLogin: '2026-05-22 09:12', status: 'active',   createdAt: '2024-01-01' },
  { id: 'u2', firstName: 'Kamal',  lastName: 'Hossain', email: 'kamal@constructerp.bd',   role: 'super_admin', phone: '+880-172-2345678', lastLogin: '2026-05-20 14:30', status: 'active',   createdAt: '2024-01-05' },
  { id: 'u3', firstName: 'Arif',   lastName: 'Ahmed',   email: 'arif@constructerp.bd',    role: 'operations',  phone: '+880-173-1111111', lastLogin: '2026-05-22 11:00', status: 'active',   createdAt: '2024-02-10' },
  { id: 'u4', firstName: 'Rashed', lastName: 'Khan',    email: 'rashed@constructerp.bd',  role: 'operations',  phone: '+880-174-2222222', lastLogin: '2026-05-21 08:45', status: 'active',   createdAt: '2024-02-15' },
  { id: 'u5', firstName: 'Salam',  lastName: 'Miah',    email: 'salam@constructerp.bd',   role: 'inventory',   phone: '+880-175-3333333', lastLogin: '2026-05-22 07:30', status: 'active',   createdAt: '2024-03-01' },
  { id: 'u6', firstName: 'Jamal',  lastName: 'Uddin',   email: 'jamal@constructerp.bd',   role: 'inventory',   phone: '+880-176-4444444', lastLogin: '2026-04-10 16:00', status: 'inactive', createdAt: '2024-03-10' },
]

const ROLE_META: Record<UserRole, { label: string; color: string; bg: string }> = {
  super_admin: { label: 'Super Admin', color: 'text-purple-700', bg: 'bg-purple-100' },
  operations:  { label: 'Operations',  color: 'text-blue-700',   bg: 'bg-blue-100'   },
  inventory:   { label: 'Inventory',   color: 'text-orange-700', bg: 'bg-orange-100' },
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

// ── Add / Edit modal ────────────────────────────────────────────────────────
const addSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
  email:     z.string().email('Invalid email'),
  role:      z.enum(['super_admin', 'operations', 'inventory']),
  phone:     z.string().min(1, 'Required'),
  password:  z.string().min(8, 'Min 8 characters').regex(/[A-Z]/, 'Need uppercase').regex(/[0-9]/, 'Need digit'),
})
const editSchema = addSchema.omit({ password: true }).extend({
  password: z.string().optional().refine(v => !v || v.length >= 8, 'Min 8 characters'),
})
type AddForm  = z.infer<typeof addSchema>
type EditForm = z.infer<typeof editSchema>

function UserModal({
  user, onClose, onSave,
}: { user?: AppUser; onClose: () => void; onSave: (u: AppUser) => void }) {
  const isEdit = !!user
  const [showPass, setShowPass] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<AddForm>({
    resolver: zodResolver(isEdit ? (editSchema as any) : addSchema) as any,
    defaultValues: user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, phone: user.phone, password: '' } : { role: 'operations' },
  })

  const onSubmit = (d: AddForm) => {
    onSave(isEdit
      ? { ...user!, ...d }
      : { id: `u${Date.now()}`, ...d, lastLogin: '—', status: 'active', createdAt: new Date().toISOString().slice(0,10) })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit User' : 'Add New User'} size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>First Name</label>
            <input {...register('firstName')} className={inp} placeholder="First name" />
            {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className={lbl}>Last Name</label>
            <input {...register('lastName')} className={inp} placeholder="Last name" />
            {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Email</label>
            <input type="email" {...register('email')} className={inp} placeholder="user@company.com" />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <input {...register('phone')} className={inp} placeholder="+880-171-0000000" />
          </div>
        </div>

        <div>
          <label className={lbl}>Role</label>
          <select {...register('role')} className={inp}>
            <option value="super_admin">Super Admin</option>
            <option value="operations">Operations</option>
            <option value="inventory">Inventory</option>
          </select>
        </div>

        <div>
          <label className={lbl}>{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} {...register('password')} className={inp}
              placeholder={isEdit ? 'Leave blank to keep current' : 'Min 8 chars, 1 uppercase, 1 digit'} />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            {isEdit ? 'Save Changes' : 'Add User'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Assign Role modal ───────────────────────────────────────────────────────
function AssignRoleModal({ user, onClose, onSave }: { user: AppUser; onClose: () => void; onSave: (role: UserRole) => void }) {
  const [role, setRole] = useState<UserRole>(user.role)
  return (
    <Modal open onClose={onClose} title="Assign Role" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Changing role for <strong>{user.firstName} {user.lastName}</strong></p>
        <div className="space-y-2">
          {(Object.keys(ROLE_META) as UserRole[]).map(r => (
            <label key={r} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${role === r ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
              <Shield className={`w-4 h-4 ${role === r ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${role === r ? 'text-blue-700' : 'text-gray-700'}`}>{ROLE_META[r].label}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onSave(role); onClose() }} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Assign</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export function UsersPage() {
  const [users,   setUsers]   = useState<AppUser[]>(MOCK_USERS)
  const [search,  setSearch]  = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [modal,   setModal]   = useState<'add' | 'edit' | 'role' | null>(null)
  const [target,  setTarget]  = useState<AppUser | null>(null)
  const [delId,   setDelId]   = useState<string | null>(null)

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q)
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const openEdit = (u: AppUser) => { setTarget(u); setModal('edit') }
  const openRole = (u: AppUser) => { setTarget(u); setModal('role') }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage system users and access control</p>
        </div>
        <button onClick={() => setModal('add')}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Users</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{users.filter(u => u.status === 'active').length}</p>
        </div>
        {(['super_admin', 'operations'] as UserRole[]).map(role => (
          <div key={role} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{ROLE_META[role].label}</p>
            <p className={`text-3xl font-bold mt-1 ${ROLE_META[role].color}`}>{users.filter(u => u.role === role).length}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="operations">Operations</option>
          <option value="inventory">Inventory</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['User', 'Email', 'Phone', 'Role', 'Last Login', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => {
                const rm = ROLE_META[u.role]
                const initials = `${u.firstName[0]}${u.lastName[0]}`
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 ${u.status === 'inactive' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-400">Since {u.createdAt}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${rm.bg} ${rm.color}`}>{rm.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{u.lastLogin}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x))}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${u.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {u.status === 'active' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {u.status}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openRole(u)} title="Assign role" className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDelId(u.id)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modal === 'add' && (
        <UserModal onClose={() => setModal(null)} onSave={u => setUsers(p => [u, ...p])} />
      )}
      {modal === 'edit' && target && (
        <UserModal user={target} onClose={() => { setModal(null); setTarget(null) }}
          onSave={u => setUsers(p => p.map(x => x.id === u.id ? u : x))} />
      )}
      {modal === 'role' && target && (
        <AssignRoleModal user={target} onClose={() => { setModal(null); setTarget(null) }}
          onSave={role => setUsers(p => p.map(x => x.id === target.id ? { ...x, role } : x))} />
      )}

      {/* Delete confirm */}
      {delId && (
        <Modal open onClose={() => setDelId(null)} title="Delete User" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => { setUsers(p => p.filter(x => x.id !== delId)); setDelId(null) }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
