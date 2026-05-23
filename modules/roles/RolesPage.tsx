'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Shield, Users, ChevronDown, ChevronUp, Check, X as XIcon } from 'lucide-react'

interface Role {
  id: string; name: string; label: string; description: string
  isActive: boolean; userCount: number; createdAt: string
  color: string
}

interface Permission {
  menuId: number; menuName: string; menuCode: string
  canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean
}

const MOCK_ROLES: Role[] = [
  { id: 'r1', name: 'super_admin', label: 'Super Admin',  description: 'Full system access — all modules and settings',      isActive: true,  userCount: 2, createdAt: '2024-01-01', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'r2', name: 'operations',  label: 'Operations',   description: 'Projects, investors, purchase, sales, accounting',    isActive: true,  userCount: 2, createdAt: '2024-01-01', color: 'bg-blue-100 text-blue-700 border-blue-200'       },
  { id: 'r3', name: 'inventory',   label: 'Inventory',    description: 'Stock levels, stock in, issue to project',             isActive: true,  userCount: 2, createdAt: '2024-01-01', color: 'bg-orange-100 text-orange-700 border-orange-200' },
]

const ALL_MENUS = [
  { menuId: 1,  menuName: 'Dashboard',          menuCode: 'DASHBOARD'    },
  { menuId: 2,  menuName: 'Projects',            menuCode: 'PROJECTS'     },
  { menuId: 3,  menuName: 'Investors',           menuCode: 'INVESTORS'    },
  { menuId: 4,  menuName: 'Investment Records',  menuCode: 'INVESTMENT_RECORDS' },
  { menuId: 5,  menuName: 'Purchase',            menuCode: 'PURCHASE'     },
  { menuId: 6,  menuName: 'Vendors',             menuCode: 'VENDORS'      },
  { menuId: 7,  menuName: 'Inventory',           menuCode: 'INVENTORY'    },
  { menuId: 8,  menuName: 'Stock In',            menuCode: 'STOCK_IN'     },
  { menuId: 9,  menuName: 'Issue to Project',    menuCode: 'ISSUE_TO_PROJECT' },
  { menuId: 10, menuName: 'Sales',               menuCode: 'SALES'        },
  { menuId: 11, menuName: 'Invoices',            menuCode: 'INVOICES'     },
  { menuId: 12, menuName: 'Collections',         menuCode: 'COLLECTIONS'  },
  { menuId: 13, menuName: 'Accounting',          menuCode: 'ACCOUNTING'   },
  { menuId: 14, menuName: 'Reports',             menuCode: 'REPORTS'      },
  { menuId: 15, menuName: 'Users',               menuCode: 'USERS'        },
  { menuId: 16, menuName: 'Roles',               menuCode: 'ROLES'        },
  { menuId: 17, menuName: 'Audit Logs',          menuCode: 'AUDIT_LOGS'   },
  { menuId: 18, menuName: 'Settings',            menuCode: 'SETTINGS'     },
]

// Super admin gets all; operations most; inventory subset
const MOCK_PERMISSIONS: Record<string, Permission[]> = {
  r1: ALL_MENUS.map(m => ({ ...m, canView: true, canCreate: true, canEdit: true, canDelete: true })),
  r2: ALL_MENUS.filter(m => m.menuId <= 14).map(m => ({ ...m, canView: true, canCreate: true, canEdit: true, canDelete: m.menuId < 10 })),
  r3: ALL_MENUS.filter(m => [1,7,8,9].includes(m.menuId)).map(m => ({ ...m, canView: true, canCreate: m.menuId !== 1, canEdit: m.menuId !== 1, canDelete: false })),
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  label:       z.string().min(1, 'Required').max(50),
  name:        z.string().min(1, 'Required').max(50).regex(/^[a-z_]+$/, 'lowercase letters and underscores only'),
  description: z.string().max(200).optional(),
})
type Form = z.infer<typeof schema>

function RoleModal({ role, onClose, onSave }: { role?: Role; onClose: () => void; onSave: (r: Role) => void }) {
  const isEdit = !!role
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: role ? { label: role.label, name: role.name, description: role.description } : {},
  })
  const onSubmit = (d: Form) => {
    onSave(isEdit
      ? { ...role!, ...d }
      : { id: `r${Date.now()}`, name: d.name, label: d.label, description: d.description ?? '', isActive: true, userCount: 0, createdAt: new Date().toISOString().slice(0,10), color: 'bg-gray-100 text-gray-700 border-gray-200' })
    onClose()
  }
  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Role' : 'Create Role'} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={lbl}>Display Name</label>
          <input {...register('label')} className={inp} placeholder="e.g. Site Manager" />
          {errors.label && <p className="text-xs text-red-600 mt-1">{errors.label.message}</p>}
        </div>
        <div>
          <label className={lbl}>Role Code <span className="text-gray-400 font-normal">(system identifier)</span></label>
          <input {...register('name')} className={inp} placeholder="e.g. site_manager" disabled={isEdit} />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          {!isEdit && <p className="text-xs text-gray-400 mt-1">Lowercase letters and underscores only. Cannot be changed later.</p>}
        </div>
        <div>
          <label className={lbl}>Description</label>
          <textarea {...register('description')} rows={2} className={inp} placeholder="Brief description of this role's access…" />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            {isEdit ? 'Save Changes' : 'Create Role'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function PermissionsModal({ role, perms, onClose, onSave }: {
  role: Role
  perms: Permission[]
  onClose: () => void
  onSave: (p: Permission[]) => void
}) {
  const [state, setState] = useState<Permission[]>(
    ALL_MENUS.map(m => perms.find(p => p.menuId === m.menuId) ?? { ...m, canView: false, canCreate: false, canEdit: false, canDelete: false })
  )

  const toggle = (menuId: number, field: keyof Pick<Permission, 'canView'|'canCreate'|'canEdit'|'canDelete'>) =>
    setState(prev => prev.map(p => p.menuId === menuId ? { ...p, [field]: !p[field] } : p))

  const Chk = ({ checked, onClick }: { checked: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick}
      className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 hover:border-blue-400'}`}>
      {checked && <Check className="w-3.5 h-3.5" />}
    </button>
  )

  return (
    <Modal open onClose={onClose} title={`Permissions — ${role.label}`} size="xl">
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Menu</th>
                {['View','Create','Edit','Delete'].map(h => (
                  <th key={h} className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-16">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.map(p => (
                <tr key={p.menuId} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-700">{p.menuName}</td>
                  <td className="px-3 py-2 text-center"><Chk checked={p.canView}   onClick={() => toggle(p.menuId,'canView')}   /></td>
                  <td className="px-3 py-2 text-center"><Chk checked={p.canCreate} onClick={() => toggle(p.menuId,'canCreate')} /></td>
                  <td className="px-3 py-2 text-center"><Chk checked={p.canEdit}   onClick={() => toggle(p.menuId,'canEdit')}   /></td>
                  <td className="px-3 py-2 text-center"><Chk checked={p.canDelete} onClick={() => toggle(p.menuId,'canDelete')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onSave(state.filter(p => p.canView||p.canCreate||p.canEdit||p.canDelete)); onClose() }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Save Permissions</button>
        </div>
      </div>
    </Modal>
  )
}

export function RolesPage() {
  const [roles, setRoles]       = useState<Role[]>(MOCK_ROLES)
  const [perms, setPerms]       = useState<Record<string, Permission[]>>(MOCK_PERMISSIONS)
  const [modal, setModal]       = useState<'create' | 'edit' | 'perms' | null>(null)
  const [target, setTarget]     = useState<Role | null>(null)
  const [delId, setDelId]       = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define roles and configure their menu permissions</p>
        </div>
        <button onClick={() => setModal('create')}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Role
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Roles</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{roles.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active Roles</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{roles.filter(r => r.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Users</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{roles.reduce((s, r) => s + r.userCount, 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Menus Configured</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{ALL_MENUS.length}</p>
        </div>
      </div>

      {/* Roles list */}
      <div className="space-y-3">
        {roles.map(role => {
          const rp = perms[role.id] ?? []
          const isOpen = expanded === role.id
          return (
            <div key={role.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-4">
                <div className={`p-2.5 rounded-lg border ${role.color.replace('text-','').replace('bg-','border-')}`}>
                  <Shield className={`w-5 h-5 ${role.color.split(' ')[1]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{role.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${role.color}`}>{role.name}</span>
                    {!role.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{role.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span className="font-medium text-gray-700">{role.userCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setTarget(role); setModal('perms') }}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                      Permissions
                    </button>
                    <button onClick={() => { setTarget(role); setModal('edit') }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDelId(role.id)} disabled={role.userCount > 0}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setExpanded(isOpen ? null : role.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded permissions preview */}
              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Permission Summary</p>
                  {rp.length === 0 ? (
                    <p className="text-sm text-gray-400">No permissions assigned yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {rp.map(p => (
                        <div key={p.menuId} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
                          <span className="text-xs font-medium text-gray-700">{p.menuName}</span>
                          <div className="flex gap-1">
                            {[['V',p.canView],['C',p.canCreate],['E',p.canEdit],['D',p.canDelete]].map(([k,v]) => (
                              <span key={k as string} className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${v ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-300'}`}>{k}</span>
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

      {/* Modals */}
      {(modal === 'create' || modal === 'edit') && (
        <RoleModal role={modal === 'edit' ? target ?? undefined : undefined}
          onClose={() => { setModal(null); setTarget(null) }}
          onSave={r => { setRoles(prev => modal === 'edit' ? prev.map(x => x.id === r.id ? r : x) : [r, ...prev]) }} />
      )}
      {modal === 'perms' && target && (
        <PermissionsModal role={target} perms={perms[target.id] ?? []}
          onClose={() => { setModal(null); setTarget(null) }}
          onSave={p => setPerms(prev => ({ ...prev, [target.id]: p }))} />
      )}
      {delId && (
        <Modal open onClose={() => setDelId(null)} title="Delete Role" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Permanently delete this role? All associated permissions will be removed.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => { setRoles(p => p.filter(r => r.id !== delId)); setPerms(p => { const n = {...p}; delete n[delId]; return n }); setDelId(null) }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
