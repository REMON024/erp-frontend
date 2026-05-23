'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react'

interface MenuItem {
  id: number; name: string; code: string; route: string
  icon: string; parentId: number | null; sortOrder: number; isActive: boolean
}

const MOCK_MENUS: MenuItem[] = [
  { id: 1,  name: 'Dashboard',          code: 'DASHBOARD',          route: '/dashboard',             icon: 'LayoutDashboard',  parentId: null, sortOrder: 1,  isActive: true  },
  { id: 2,  name: 'Projects',           code: 'PROJECTS',           route: '/projects',              icon: 'FolderKanban',     parentId: null, sortOrder: 2,  isActive: true  },
  { id: 3,  name: 'Investors',          code: 'INVESTORS',          route: '/investors',             icon: 'TrendingUp',       parentId: null, sortOrder: 3,  isActive: true  },
  { id: 4,  name: 'Investment Records', code: 'INVESTMENT_RECORDS', route: '/investors/investments', icon: 'FileText',         parentId: 3,    sortOrder: 1,  isActive: true  },
  { id: 5,  name: 'Purchase',           code: 'PURCHASE',           route: '/purchase',              icon: 'ShoppingCart',     parentId: null, sortOrder: 4,  isActive: true  },
  { id: 6,  name: 'Vendors',            code: 'VENDORS',            route: '/purchase/vendors',      icon: 'Building2',        parentId: 5,    sortOrder: 1,  isActive: true  },
  { id: 7,  name: 'Inventory',          code: 'INVENTORY',          route: '/inventory',             icon: 'Package',          parentId: null, sortOrder: 5,  isActive: true  },
  { id: 8,  name: 'Material Master',    code: 'MATERIAL_MASTER',    route: '/inventory/materials',   icon: 'List',             parentId: 7,    sortOrder: 1,  isActive: true  },
  { id: 9,  name: 'Stock In',           code: 'STOCK_IN',           route: '/inventory/stock-in',    icon: 'ArrowDownCircle',  parentId: 7,    sortOrder: 2,  isActive: true  },
  { id: 10, name: 'Issue to Project',   code: 'ISSUE_TO_PROJECT',   route: '/inventory/issue',       icon: 'ArrowUpCircle',    parentId: 7,    sortOrder: 3,  isActive: true  },
  { id: 11, name: 'Sales',              code: 'SALES',              route: '/sales',                 icon: 'Receipt',          parentId: null, sortOrder: 6,  isActive: true  },
  { id: 12, name: 'Clients',            code: 'CLIENTS',            route: '/sales/clients',         icon: 'Users',            parentId: 11,   sortOrder: 1,  isActive: true  },
  { id: 13, name: 'Invoices',           code: 'INVOICES',           route: '/sales',                 icon: 'FileText',         parentId: 11,   sortOrder: 2,  isActive: true  },
  { id: 14, name: 'Payment Schedules',  code: 'PAYMENT_SCHEDULES',  route: '/sales/schedules',       icon: 'Calendar',         parentId: 11,   sortOrder: 3,  isActive: true  },
  { id: 15, name: 'Collections',        code: 'COLLECTIONS',        route: '/sales/collections',     icon: 'DollarSign',       parentId: 11,   sortOrder: 4,  isActive: true  },
  { id: 16, name: 'Accounting',         code: 'ACCOUNTING',         route: '/accounting',            icon: 'BookOpen',         parentId: null, sortOrder: 7,  isActive: true  },
  { id: 17, name: 'Chart of Accounts',  code: 'CHART_OF_ACCOUNTS',  route: '/accounting',            icon: 'List',             parentId: 16,   sortOrder: 1,  isActive: true  },
  { id: 18, name: 'Project Ledger',     code: 'PROJECT_LEDGER',     route: '/accounting/ledger',     icon: 'BookOpen',         parentId: 16,   sortOrder: 2,  isActive: true  },
  { id: 19, name: 'P&L Statement',      code: 'PROFIT_LOSS',        route: '/accounting/pl',         icon: 'TrendingUp',       parentId: 16,   sortOrder: 3,  isActive: true  },
  { id: 20, name: 'Profit Distribution',code: 'PROFIT_DISTRIBUTION',route: '/profit-distribution',   icon: 'PieChart',         parentId: null, sortOrder: 8,  isActive: true  },
  { id: 21, name: 'Reports',            code: 'REPORTS',            route: '/reports',               icon: 'BarChart2',        parentId: null, sortOrder: 9,  isActive: true  },
  { id: 22, name: 'Users',              code: 'USERS',              route: '/users',                 icon: 'Users',            parentId: null, sortOrder: 10, isActive: true  },
  { id: 23, name: 'Roles',              code: 'ROLES',              route: '/roles',                 icon: 'Shield',           parentId: null, sortOrder: 11, isActive: true  },
  { id: 24, name: 'Menus',             code: 'MENUS',              route: '/menus',                 icon: 'Menu',             parentId: null, sortOrder: 12, isActive: true  },
  { id: 25, name: 'Audit Logs',         code: 'AUDIT_LOGS',         route: '/audit-logs',            icon: 'ClipboardList',    parentId: null, sortOrder: 13, isActive: true  },
  { id: 26, name: 'Settings',           code: 'SETTINGS',           route: '/settings',              icon: 'Settings',         parentId: null, sortOrder: 14, isActive: true  },
]

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  name:      z.string().min(1, 'Required').max(100),
  code:      z.string().min(1, 'Required').max(50).regex(/^[A-Z_]+$/, 'Uppercase letters and underscores only'),
  route:     z.string().min(1, 'Required'),
  icon:      z.string().max(50).optional(),
  parentId:  z.coerce.number().nullable(),
  sortOrder: z.coerce.number().min(1),
})
type Form = z.infer<typeof schema>

function MenuModal({ menu, menus, onClose, onSave }: {
  menu?: MenuItem; menus: MenuItem[]; onClose: () => void; onSave: (m: MenuItem) => void
}) {
  const isEdit = !!menu
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: menu ?? { parentId: null, sortOrder: 1 },
  })
  const roots = menus.filter(m => m.parentId === null && (!isEdit || m.id !== menu?.id))
  const onSubmit = (d: Form) => {
    onSave(isEdit
      ? { ...menu!, ...d, parentId: d.parentId || null }
      : { id: Date.now(), ...d, parentId: d.parentId || null, isActive: true })
    onClose()
  }
  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Menu' : 'Add Menu Item'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Display Name</label>
            <input {...register('name')} className={inp} placeholder="e.g. Projects" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Code <span className="text-gray-400 font-normal">(unique)</span></label>
            <input {...register('code')} className={inp} placeholder="e.g. PROJECTS" />
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Route</label>
            <input {...register('route')} className={inp} placeholder="/projects" />
          </div>
          <div>
            <label className={lbl}>Icon Name</label>
            <input {...register('icon')} className={inp} placeholder="e.g. FolderKanban" />
            <p className="text-xs text-gray-400 mt-1">Lucide icon name</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Parent Menu <span className="text-gray-400 font-normal">(optional)</span></label>
            <select {...register('parentId')} className={inp}>
              <option value="">— None (top level) —</option>
              {roots.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Sort Order</label>
            <input type="number" {...register('sortOrder')} className={inp} min={1} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            {isEdit ? 'Save Changes' : 'Add Menu'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function MenuRow({ menu, children, depth, onEdit, onDelete, onToggle }: {
  menu: MenuItem; children: MenuItem[]; depth: number
  onEdit: (m: MenuItem) => void; onDelete: (id: number) => void; onToggle: (id: number) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = children.length > 0
  return (
    <>
      <tr className={`hover:bg-gray-50 ${!menu.isActive ? 'opacity-50' : ''}`}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
            <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            {hasChildren ? (
              <button onClick={() => setOpen(v => !v)} className="text-gray-400 hover:text-gray-600">
                {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              </span>
            )}
            <span className="font-medium text-gray-800 text-sm">{menu.name}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{menu.code}</code>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{menu.route}</td>
        <td className="px-4 py-3 text-xs text-gray-500">{menu.icon || '—'}</td>
        <td className="px-4 py-3 text-center text-xs font-medium text-gray-500">{menu.sortOrder}</td>
        <td className="px-4 py-3">
          <button onClick={() => onToggle(menu.id)}
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${menu.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {menu.isActive ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
            {menu.isActive ? 'Active' : 'Inactive'}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            <button onClick={() => onEdit(menu)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(menu.id)} disabled={hasChildren}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {open && children.map(child => (
        <MenuRow key={child.id} menu={child} children={[]} depth={depth + 1}
          onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
      ))}
    </>
  )
}

export function MenusPage() {
  const [menus,  setMenus]  = useState<MenuItem[]>(MOCK_MENUS)
  const [modal,  setModal]  = useState<'add' | 'edit' | null>(null)
  const [target, setTarget] = useState<MenuItem | null>(null)
  const [delId,  setDelId]  = useState<number | null>(null)

  const roots    = menus.filter(m => m.parentId === null).sort((a,b) => a.sortOrder - b.sortOrder)
  const childMap = Object.fromEntries(
    menus.filter(m => m.parentId !== null).reduce((acc, m) => {
      const key = m.parentId!
      if (!acc.has(key)) acc.set(key, [])
      acc.get(key)!.push(m)
      return acc
    }, new Map<number, MenuItem[]>())
  )

  const onToggle = (id: number) => setMenus(p => p.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m))
  const onDelete = (id: number) => setDelId(id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure navigation menus and their hierarchy</p>
        </div>
        <button onClick={() => setModal('add')}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Menu
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Menus</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{menus.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Root Menus</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{roots.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Sub-Menus</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{menus.filter(m => m.parentId !== null).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{menus.filter(m => m.isActive).length}</p>
        </div>
      </div>

      {/* Tree table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Code', 'Route', 'Icon', 'Order', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roots.map(root => (
                <MenuRow key={root.id} menu={root} children={childMap[root.id] ?? []}
                  depth={0} onEdit={m => { setTarget(m); setModal('edit') }}
                  onDelete={onDelete} onToggle={onToggle} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {(modal === 'add' || modal === 'edit') && (
        <MenuModal menu={modal === 'edit' ? target ?? undefined : undefined}
          menus={menus}
          onClose={() => { setModal(null); setTarget(null) }}
          onSave={m => setMenus(prev => modal === 'edit' ? prev.map(x => x.id === m.id ? m : x) : [m, ...prev])} />
      )}
      {delId !== null && (
        <Modal open onClose={() => setDelId(null)} title="Delete Menu Item" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Delete this menu item? Associated role permissions will also be removed.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => { setMenus(p => p.filter(m => m.id !== delId)); setDelId(null) }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
