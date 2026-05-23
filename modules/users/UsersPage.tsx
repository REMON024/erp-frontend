'use client'
import { useEffect, useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Shield, Eye, EyeOff, Search, ToggleLeft, ToggleRight, UserCheck, RefreshCw, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

interface UserDto {
  id: string; firstName: string; lastName: string; fullName: string
  email: string; phoneNumber: string | null; role: string; roleId: string
  isActive: boolean; createdAt: string; lastLoginAt: string | null
}

interface RoleDto { id: string; name: string; description: string | null; isActive: boolean; userCount: number }

const ROLE_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: 'Super Admin', color: 'text-purple-700', bg: 'bg-purple-100' },
  operations:  { label: 'Operations',  color: 'text-blue-700',   bg: 'bg-blue-100'   },
  inventory:   { label: 'Inventory',   color: 'text-orange-700', bg: 'bg-orange-100' },
}
const roleMeta = (name: string) => ROLE_COLORS[name] ?? {
  label: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  color: 'text-gray-700', bg: 'bg-gray-100',
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const addSchema = z.object({
  firstName:   z.string().min(1, 'Required'),
  lastName:    z.string().min(1, 'Required'),
  email:       z.string().email('Invalid email'),
  role:        z.string().min(1, 'Required'),
  phoneNumber: z.string().optional(),
  password:    z.string().min(8, 'Min 8 chars').regex(/[A-Z]/, 'Need uppercase').regex(/[0-9]/, 'Need digit'),
})
const editSchema = addSchema.omit({ password: true }).extend({
  password: z.string().optional().refine(v => !v || v.length >= 8, 'Min 8 chars'),
})
type AddForm  = z.infer<typeof addSchema>

function UserModal({ user, roles, onClose, onSaved }: {
  user?: UserDto; roles: RoleDto[]
  onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!user
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<AddForm>({
    resolver: zodResolver(isEdit ? (editSchema as any) : addSchema) as any,
    defaultValues: user
      ? { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, phoneNumber: user.phoneNumber ?? '', password: '' }
      : { role: roles[0]?.name ?? '' },
  })

  const onSubmit = async (d: AddForm) => {
    setSaving(true); setErr('')
    try {
      if (isEdit) {
        await api.put(`/users/${user!.id}`, { firstName: d.firstName, lastName: d.lastName, phone: d.phoneNumber })
        if (d.role !== user!.role)
          await api.patch(`/users/${user!.id}/assign-role`, { roleName: d.role })
      } else {
        await api.post('/users', d)
      }
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? e.response?.data?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit User' : 'Add New User'} size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
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
            <input type="email" {...register('email')} className={inp} placeholder="user@company.com" disabled={isEdit} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <input {...register('phoneNumber')} className={inp} placeholder="+880-171-0000000" />
          </div>
        </div>
        <div>
          <label className={lbl}>Role</label>
          <select {...register('role')} className={inp}>
            {roles.map(r => <option key={r.id} value={r.name}>{roleMeta(r.name).label}</option>)}
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
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add User'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AssignRoleModal({ user, roles, onClose, onSaved }: {
  user: UserDto; roles: RoleDto[]; onClose: () => void; onSaved: () => void
}) {
  const [role, setRole]     = useState(user.role)
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const save = async () => {
    setSaving(true); setErr('')
    try {
      await api.patch(`/users/${user.id}/assign-role`, { roleName: role })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to assign role')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Assign Role" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Changing role for <strong>{user.fullName}</strong></p>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="space-y-2">
          {roles.map(r => (
            <label key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${role === r.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" value={r.name} checked={role === r.name} onChange={() => setRole(r.name)} className="sr-only" />
              <Shield className={`w-4 h-4 ${role === r.name ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${role === r.name ? 'text-blue-700' : 'text-gray-700'}`}>{roleMeta(r.name).label}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Assign'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function UsersPage() {
  const [users,      setUsers]      = useState<UserDto[]>([])
  const [roles,      setRoles]      = useState<RoleDto[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [modal,      setModal]      = useState<'add' | 'edit' | 'role' | null>(null)
  const [target,     setTarget]     = useState<UserDto | null>(null)
  const [page,       setPage]       = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 20

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users', { params: { page, pageSize: PAGE_SIZE, search: search || undefined } }),
        api.get('/roles'),
      ])
      setUsers(usersRes.data.items)
      setTotalCount(usersRes.data.totalCount)
      setRoles(rolesRes.data)
    } catch {
      setError('Failed to load data. Please check your connection and try again.')
    } finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { loadUsers() }, [loadUsers])

  const toggleStatus = async (u: UserDto) => {
    try {
      await api.patch(`/users/${u.id}/toggle-status`)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x))
    } catch { /* ignore */ }
  }

  const filtered = roleFilter === 'all' ? users : users.filter(u => u.role === roleFilter)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
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
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{users.filter(u => u.isActive).length}</p>
        </div>
        {roles.slice(0, 2).map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{roleMeta(r.name).label}</p>
            <p className={`text-3xl font-bold mt-1 ${roleMeta(r.name).color}`}>{r.userCount}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name or email…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="all">All Roles</option>
          {roles.map(r => <option key={r.id} value={r.name}>{roleMeta(r.name).label}</option>)}
        </select>
        <button onClick={loadUsers} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        <div className="px-4 py-3 border-b border-gray-100">
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
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.map(u => {
                const rm = roleMeta(u.role)
                const initials = `${u.firstName[0]}${u.lastName[0]}`
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.fullName}</p>
                          <p className="text-xs text-gray-400">Since {u.createdAt.slice(0, 10)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.phoneNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${rm.bg} ${rm.color}`}>{rm.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleStatus(u)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${u.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {u.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {u.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setTarget(u); setModal('edit') }} title="Edit"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setTarget(u); setModal('role') }} title="Assign role"
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 disabled:opacity-40">Previous</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {modal === 'add' && (
        <UserModal roles={roles} onClose={() => setModal(null)} onSaved={loadUsers} />
      )}
      {modal === 'edit' && target && (
        <UserModal user={target} roles={roles}
          onClose={() => { setModal(null); setTarget(null) }} onSaved={loadUsers} />
      )}
      {modal === 'role' && target && (
        <AssignRoleModal user={target} roles={roles}
          onClose={() => { setModal(null); setTarget(null) }} onSaved={loadUsers} />
      )}
    </div>
  )
}
