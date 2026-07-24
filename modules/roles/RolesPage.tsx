'use client'
import { useEffect, useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Shield, Users, ChevronDown, ChevronUp, Check, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import api from '@/lib/api'

interface RoleDto {
  id: string; name: string; description: string | null
  isActive: boolean; userCount: number
}

interface MenuPermissionDto {
  menuId: number; menuName: string; menuCode: string
  canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean
}

interface RolePermissionsDto {
  roleId: string; roleName: string; permissions: MenuPermissionDto[]
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-primary/10 text-primary border-primary/20',
  operations:  'bg-primary/10 text-primary border-info/20',
  inventory:   'bg-warning/15 text-warning border-warning/20',
}
const roleColor = (name: string) => ROLE_COLORS[name] ?? 'bg-surface-muted text-content border-border-default'
const roleLabel = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  name:        z.string().min(1, 'Required').max(50).regex(/^[a-z_]+$/, 'Lowercase and underscores only'),
  description: z.string().max(200).optional(),
})
type Form = z.infer<typeof schema>

function RoleModal({ role, onClose, onSaved }: { role?: RoleDto; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!role
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: role ? { name: role.name, description: role.description ?? '' } : {},
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      if (isEdit) await api.put(`/roles/${role!.id}`, { name: d.name, description: d.description })
      else        await api.post('/roles', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Role' : 'Create Role'} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className={lbl}>Role Code <span className="text-content-muted font-normal">(system identifier)</span></label>
          <input {...register('name')} className={inp} placeholder="e.g. site_manager" disabled={isEdit} />
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
          {!isEdit && <p className="text-xs text-content-muted mt-1">Lowercase letters and underscores only. Cannot be changed later.</p>}
        </div>
        <div>
          <label className={lbl}>Description</label>
          <textarea {...register('description')} rows={2} className={inp} placeholder="Brief description of this role's access…" />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Role'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function PermissionsModal({ role, onClose, onSaved }: {
  role: RoleDto; onClose: () => void; onSaved: () => void
}) {
  const [perms,   setPerms]   = useState<MenuPermissionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  useEffect(() => {
    api.get<RolePermissionsDto>(`/permissions/${role.id}`)
      .then(r => setPerms(r.data.permissions))
      .catch(() => setErr('Failed to load permissions'))
      .finally(() => setLoading(false))
  }, [role.id])

  const toggle = (menuId: number, field: keyof Pick<MenuPermissionDto, 'canView'|'canCreate'|'canEdit'|'canDelete'>) =>
    setPerms(prev => prev.map(p => p.menuId === menuId ? { ...p, [field]: !p[field] } : p))

  const save = async () => {
    setSaving(true); setErr('')
    try {
      await api.put(`/permissions/${role.id}`, {
        permissions: perms.map(p => ({
          menuId:    p.menuId,
          canView:   p.canView,
          canCreate: p.canCreate,
          canEdit:   p.canEdit,
          canDelete: p.canDelete,
        })),
      })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  const Chk = ({ checked, onClick }: { checked: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick}
      className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${checked ? 'bg-primary border-primary text-white' : 'border-border-default hover:border-info/20'}`}>
      {checked && <Check className="w-3.5 h-3.5" />}
    </button>
  )

  return (
    <Modal open onClose={onClose} title={`Permissions — ${roleLabel(role.name)}`} size="xl">
      <div className="space-y-3">
        {err && <p className="text-xs text-danger">{err}</p>}
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-content-muted">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading permissions…
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-surface-muted sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-content-muted uppercase">Menu</th>
                  {['View','Create','Edit','Delete'].map(h => (
                    <th key={h} className="px-3 py-2 text-center text-xs font-semibold text-content-muted uppercase w-16">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {perms.map(p => (
                  <tr key={p.menuId} className="hover:bg-surface-muted">
                    <td className="px-3 py-2 font-medium text-content text-sm">{p.menuName}</td>
                    <td className="px-3 py-2 text-center"><Chk checked={p.canView}   onClick={() => toggle(p.menuId,'canView')}   /></td>
                    <td className="px-3 py-2 text-center"><Chk checked={p.canCreate} onClick={() => toggle(p.menuId,'canCreate')} /></td>
                    <td className="px-3 py-2 text-center"><Chk checked={p.canEdit}   onClick={() => toggle(p.menuId,'canEdit')}   /></td>
                    <td className="px-3 py-2 text-center"><Chk checked={p.canDelete} onClick={() => toggle(p.menuId,'canDelete')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button onClick={save} disabled={saving || loading}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function RolesPage() {
  const [roles,    setRoles]    = useState<RoleDto[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [modal,    setModal]    = useState<'create' | 'edit' | 'perms' | 'delete' | null>(null)
  const [target,   setTarget]   = useState<RoleDto | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [permsCache, setPermsCache] = useState<Record<string, MenuPermissionDto[]>>({})

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get<RoleDto[]>('/roles')
      setRoles(res.data)
    } catch {
      setError('Failed to load roles')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const loadPermsForExpand = async (roleId: string) => {
    if (permsCache[roleId]) return
    try {
      const res = await api.get<RolePermissionsDto>(`/permissions/${roleId}`)
      setPermsCache(prev => ({ ...prev, [roleId]: res.data.permissions }))
    } catch { /* ignore */ }
  }

  const deleteRole = async () => {
    if (!target) return
    try {
      await api.delete(`/roles/${target.id}`)
      setModal(null); setTarget(null)
      load()
    } catch (e: any) {
      alert(e.response?.data?.errors?.[0] ?? 'Cannot delete role')
    }
  }

  const toggleExpand = (id: string) => {
    const next = expanded === id ? null : id
    setExpanded(next)
    if (next) loadPermsForExpand(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content">Role Management</h1>
          <p className="text-sm text-content-muted mt-0.5">Define roles and configure their menu permissions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg border border-border-default transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setModal('create')}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Role
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide">Total Roles</p>
          <p className="text-3xl font-bold text-content mt-1">{roles.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide">Active</p>
          <p className="text-3xl font-bold text-success mt-1">{roles.filter(r => r.isActive).length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide">Total Users</p>
          <p className="text-3xl font-bold text-primary mt-1">{roles.reduce((s, r) => s + r.userCount, 0)}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide">Roles Configured</p>
          <p className="text-3xl font-bold text-info mt-1">{roles.filter(r => r.userCount > 0).length}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Roles list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl border border-border-default p-5 animate-pulse">
              <div className="h-5 bg-surface-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-surface-muted rounded w-2/3" />
            </div>
          ))
        ) : roles.map(role => {
          const rp = permsCache[role.id] ?? []
          const isOpen = expanded === role.id
          const color  = roleColor(role.name)
          const iconColor = color.split(' ')[1]

          return (
            <div key={role.id} className="bg-surface rounded-xl border border-border-default overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-4">
                <div className={`p-2.5 rounded-lg border ${color}`}>
                  <Shield className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-content">{roleLabel(role.name)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${color}`}>{role.name}</span>
                    {!role.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted text-content-muted">Inactive</span>}
                  </div>
                  <p className="text-sm text-content-muted mt-0.5 truncate">{role.description ?? '—'}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-sm text-content-muted">
                    <Users className="w-4 h-4" />
                    <span className="font-medium text-content">{role.userCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setTarget(role); setModal('perms') }}
                      className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/10 rounded-lg transition-colors">
                      Permissions
                    </button>
                    <button onClick={() => { setTarget(role); setModal('edit') }}
                      className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setTarget(role); setModal('delete') }}
                      disabled={role.userCount > 0}
                      className="p-1.5 text-content-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleExpand(role.id)}
                      className="p-1.5 text-content-muted hover:text-content-muted rounded-lg transition-colors">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border-default px-5 py-4 bg-surface-muted">
                  <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-3">Permission Summary</p>
                  {rp.length === 0 ? (
                    <p className="text-sm text-content-muted">Loading…</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {rp.filter(p => p.canView || p.canCreate || p.canEdit || p.canDelete).map(p => (
                        <div key={p.menuId} className="flex items-center justify-between bg-surface rounded-lg border border-border-default px-3 py-2">
                          <span className="text-xs font-medium text-content">{p.menuName}</span>
                          <div className="flex gap-1">
                            {([['V', p.canView], ['C', p.canCreate], ['E', p.canEdit], ['D', p.canDelete]] as [string, boolean][]).map(([k, v]) => (
                              <span key={k} className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${v ? 'bg-primary/10 text-primary' : 'bg-surface-muted text-content-muted/50'}`}>{k}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <RoleModal role={modal === 'edit' ? target ?? undefined : undefined}
          onClose={() => { setModal(null); setTarget(null) }}
          onSaved={() => { load(); setPermsCache({}) }} />
      )}
      {modal === 'perms' && target && (
        <PermissionsModal role={target}
          onClose={() => { setModal(null); setTarget(null) }}
          onSaved={() => { setPermsCache(p => { const n = { ...p }; delete n[target.id]; return n }) }} />
      )}
      {modal === 'delete' && target && (
        <Modal open onClose={() => { setModal(null); setTarget(null) }} title="Delete Role" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-content-muted">
              Permanently delete role <strong>{roleLabel(target.name)}</strong>? All associated permissions will be removed.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setModal(null); setTarget(null) }} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
              <button onClick={deleteRole} className="px-4 py-2 text-sm bg-danger text-white rounded-lg hover:bg-danger font-medium">Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
