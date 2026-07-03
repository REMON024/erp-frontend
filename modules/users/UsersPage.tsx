'use client'
import { useEffect, useState, useCallback } from 'react'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Shield, Eye, EyeOff, Search, ToggleLeft, ToggleRight, UserCheck, RefreshCw, AlertCircle, KeyRound } from 'lucide-react'
import api from '@/lib/api'
import { effectiveAccess } from '@/utils/permissions'
import { Role } from '@/types'

interface UserDto {
  id: string; firstName: string; lastName: string; fullName: string
  email: string; phoneNumber: string | null; role: string; roleId: string
  roles?: string[]; roleIds?: string[]
  isActive: boolean; createdAt: string; lastLoginAt: string | null
}

interface RoleDto { id: string; name: string; description: string | null; isActive: boolean; userCount: number }
interface ProjectOpt { id: number; name: string }

// Modules previewed in the effective-access panel (union of the selected role set).
const PREVIEW_MODULES = [
  'projects', 'estimation', 'investment', 'purchase', 'inventory',
  'sales', 'accounting', 'profit-distribution', 'reports',
]

const ROLE_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  super_admin:   { label: 'Super Admin',   color: 'text-purple-700', bg: 'bg-purple-100' },
  operations:    { label: 'Operations',    color: 'text-primary',   bg: 'bg-primary/10'   },
  inventory:     { label: 'Inventory',     color: 'text-orange-700', bg: 'bg-orange-100' },
  engineer:      { label: 'Engineer',      color: 'text-teal-700',   bg: 'bg-teal-100'   },
}
const roleMeta = (name: string) => ROLE_COLORS[name] ?? {
  label: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  color: 'text-content', bg: 'bg-surface-muted',
}

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

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
        // Profile only — role set is managed via the dedicated "Assign Roles" modal.
        await api.put(`/users/${user!.id}`, { firstName: d.firstName, lastName: d.lastName, phone: d.phoneNumber })
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        {!isEdit && (
          <div>
            <label className={lbl}>Initial Role <span className="text-content-muted font-normal">(add more via Assign Roles)</span></label>
            <Select {...register('role')}>
              {roles.map(r => <option key={r.id} value={r.name}>{roleMeta(r.name).label}</option>)}
            </Select>
          </div>
        )}
        <div>
          <label className={lbl}>{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} {...register('password')} className={inp}
              placeholder={isEdit ? 'Leave blank to keep current' : 'Min 8 chars, 1 uppercase, 1 digit'} />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-2.5 text-content-muted hover:text-content-muted">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add User'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Multi-role assignment: a user holds a SET of roles; effective access is the union.
// Shows a live effective-access preview and (iff Engineer is selected) project scoping.
function AssignRoleModal({ user, roles, onClose, onSaved }: {
  user: UserDto; roles: RoleDto[]; onClose: () => void; onSaved: () => void
}) {
  const initial = user.roles?.length ? user.roles : (user.role ? [user.role] : [])
  const [selected, setSelected] = useState<string[]>(initial)
  const [projects, setProjects] = useState<ProjectOpt[]>([])
  const [assignedProjects, setAssignedProjects] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const hasEngineer = selected.includes('engineer')

  useEffect(() => {
    // Load existing project scoping + the project list when Engineer is in play.
    Promise.all([
      api.get(`/users/${user.id}/projects`).catch(() => ({ data: [] })),
      api.get('/projects', { params: { pageSize: 200 } }).catch(() => ({ data: { items: [] } })),
    ]).then(([asg, projRes]) => {
      setAssignedProjects(Array.isArray(asg.data) ? asg.data : (asg.data?.items ?? []))
      const items = projRes.data?.items ?? projRes.data ?? []
      setProjects(items.map((p: any) => ({ id: p.id, name: p.name ?? p.projectName ?? `Project ${p.id}` })))
    })
  }, [user.id])

  const toggle = (name: string) =>
    setSelected(s => s.includes(name) ? s.filter(x => x !== name) : [...s, name])

  const toggleProject = (id: number) =>
    setAssignedProjects(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const save = async () => {
    setSaving(true); setErr('')
    try {
      await api.put(`/users/${user.id}/roles`, { roleNames: selected })
      if (hasEngineer)
        await api.put(`/users/${user.id}/projects`, { projectIds: assignedProjects })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to save roles')
    } finally { setSaving(false) }
  }

  const previewRoles = selected as Role[]

  return (
    <Modal open onClose={onClose} title="Assign Roles" size="md">
      <div className="space-y-4">
        <p className="text-sm text-content-muted">Role set for <strong>{user.fullName}</strong> — effective access is the union of all selected roles.</p>
        {err && <p className="text-xs text-red-600">{err}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {roles.map(r => {
            const on = selected.includes(r.name)
            return (
              <label key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${on ? 'border-primary bg-primary/10' : 'border-border-default hover:border-border-default'}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(r.name)} className="w-4 h-4" />
                <Shield className={`w-4 h-4 ${on ? 'text-primary' : 'text-content-muted'}`} />
                <span className={`text-sm font-medium ${on ? 'text-primary' : 'text-content'}`}>{roleMeta(r.name).label}</span>
              </label>
            )
          })}
        </div>

        {/* Effective-access preview (union) */}
        <div className="rounded-lg border border-border-default p-3">
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2">Effective module access (preview)</p>
          {selected.length === 0 ? (
            <p className="text-xs text-content-muted">No roles selected — user has no access.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {PREVIEW_MODULES.map(m => {
                const granted = effectiveAccess(previewRoles, m) === 'FULL'
                return (
                  <span key={m} className={`text-xs px-2 py-0.5 rounded-full ${granted ? 'bg-green-100 text-green-700' : 'bg-surface-muted text-content-muted line-through'}`}>
                    {m}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Engineer project scoping */}
        {hasEngineer && (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">Assigned projects (Engineer scope)</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {projects.length === 0 && <p className="text-xs text-content-muted">No projects available.</p>}
              {projects.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-content">
                  <input type="checkbox" checked={assignedProjects.includes(p.id)} onChange={() => toggleProject(p.id)} className="w-4 h-4" />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Roles'}
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

  const resetPassword = async (u: UserDto) => {
    const newPassword = window.prompt(`Set a new password for ${u.fullName} (min 6 chars):`)
    if (!newPassword) return
    try {
      await api.put(`/users/${u.id}/reset-password`, { newPassword })
      window.alert('Password has been reset.')
    } catch (e: unknown) {
      window.alert((e as { response?: { data?: { errors?: string[] } } })?.response?.data?.errors?.[0] ?? 'Failed to reset password.')
    }
  }

  const rolesOf = (u: UserDto) => (u.roles?.length ? u.roles : (u.role ? [u.role] : []))
  const filtered = roleFilter === 'all' ? users : users.filter(u => rolesOf(u).includes(roleFilter))
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content">User Management</h1>
          <p className="text-sm text-content-muted mt-0.5">Manage system users and access control</p>
        </div>
        <button onClick={() => setModal('add')}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide">Total Users</p>
          <p className="text-3xl font-bold text-content mt-1">{totalCount}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{users.filter(u => u.isActive).length}</p>
        </div>
        {roles.slice(0, 2).map(r => (
          <div key={r.id} className="bg-surface rounded-xl border border-border-default p-4">
            <p className="text-xs text-content-muted uppercase tracking-wide">{roleMeta(r.name).label}</p>
            <p className={`text-3xl font-bold mt-1 ${roleMeta(r.name).color}`}>{r.userCount}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-border-default p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name or email…"
            className="w-full pl-9 pr-4 py-2 border border-border-default rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none" />
        </div>
        <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="min-w-[150px]">
          <option value="all">All Roles</option>
          {roles.map(r => <option key={r.id} value={r.name}>{roleMeta(r.name).label}</option>)}
        </Select>
        <button onClick={loadUsers} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted text-content-muted">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        <div className="px-4 py-3 border-b border-border-default">
          <p className="text-sm font-medium text-content">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-sm">
            <thead className="bg-surface-muted border-b border-border-default">
              <tr>
                {['User', 'Email', 'Phone', 'Role', 'Last Login', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.map(u => {
                const userRoles = rolesOf(u)
                const initials = `${u.firstName[0]}${u.lastName[0]}`
                return (
                  <tr key={u.id} className={`hover:bg-surface-muted ${!u.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-content">{u.fullName}</p>
                          <p className="text-xs text-content-muted">Since {u.createdAt.slice(0, 10)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{u.phoneNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {userRoles.length === 0 && <span className="text-xs text-content-muted">—</span>}
                        {userRoles.map(rn => {
                          const rm = roleMeta(rn)
                          return <span key={rn} className={`text-xs px-2.5 py-1 rounded-full font-semibold ${rm.bg} ${rm.color}`}>{rm.label}</span>
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs whitespace-nowrap">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleStatus(u)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${u.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-surface-muted text-content-muted hover:bg-surface-muted'}`}>
                        {u.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {u.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setTarget(u); setModal('edit') }} title="Edit"
                          className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setTarget(u); setModal('role') }} title="Assign role"
                          className="p-1.5 text-content-muted hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => resetPassword(u)} title="Reset password"
                          className="p-1.5 text-content-muted hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-content-muted text-sm">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border-default flex items-center justify-between">
            <span className="text-xs text-content-muted">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs border rounded-lg hover:bg-surface-muted disabled:opacity-40">Previous</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs border rounded-lg hover:bg-surface-muted disabled:opacity-40">Next</button>
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
