'use client'
import { useEffect, useState, useCallback } from 'react'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, GripVertical, ToggleLeft, ToggleRight, RefreshCw, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

interface MenuItem {
  id: number; name: string; code: string; route: string | null
  icon: string | null; parentId: number | null; sortOrder: number
  isActive: boolean; children: MenuItem[]
}

function flattenTree(items: MenuItem[]): MenuItem[] {
  return items.flatMap(m => [{ ...m, children: [] }, ...flattenTree(m.children)])
}

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  name:      z.string().min(1, 'Required').max(100),
  code:      z.string().min(1, 'Required').max(50).regex(/^[A-Z_]+$/, 'Uppercase letters and underscores only'),
  route:     z.string().min(1, 'Required'),
  icon:      z.string().max(50).optional(),
  parentId:  z.coerce.number().nullable(),
  sortOrder: z.coerce.number().min(1),
})
type Form = z.infer<typeof schema>

function MenuModal({ menu, roots, onClose, onSaved }: {
  menu?: MenuItem; roots: MenuItem[]
  onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!menu
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: menu
      ? { name: menu.name, code: menu.code, route: menu.route ?? '', icon: menu.icon ?? '', parentId: menu.parentId, sortOrder: menu.sortOrder }
      : { parentId: null, sortOrder: 1 },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      if (isEdit) {
        await api.put(`/menus/${menu!.id}`, {
          name: d.name, route: d.route, icon: d.icon,
          parentId: d.parentId || null, sortOrder: d.sortOrder, isActive: menu!.isActive,
        })
      } else {
        await api.post('/menus', { ...d, parentId: d.parentId || null })
      }
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? e.response?.data?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  const eligibleParents = roots.filter(r => !isEdit || r.id !== menu?.id)

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Menu' : 'Add Menu Item'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Display Name</label>
            <input {...register('name')} className={inp} placeholder="e.g. Projects" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Code <span className="text-content-muted font-normal">(unique)</span></label>
            <input {...register('code')} className={inp} placeholder="e.g. PROJECTS" disabled={isEdit} />
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Route</label>
            <input {...register('route')} className={inp} placeholder="/projects" />
          </div>
          <div>
            <label className={lbl}>Icon Name</label>
            <input {...register('icon')} className={inp} placeholder="e.g. FolderKanban" />
            <p className="text-xs text-content-muted mt-1">Lucide icon name</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Parent Menu <span className="text-content-muted font-normal">(optional)</span></label>
            <Select {...register('parentId')}>
              <option value="">— None (top level) —</option>
              {eligibleParents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </div>
          <div>
            <label className={lbl}>Sort Order</label>
            <input type="number" {...register('sortOrder')} className={inp} min={1} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Menu'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function MenuRow({ menu, children, depth, onEdit, onDelete, onToggle }: {
  menu: MenuItem; children: MenuItem[]; depth: number
  onEdit: (m: MenuItem) => void; onDelete: (id: number) => void; onToggle: (m: MenuItem) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = children.length > 0
  return (
    <>
      <tr className={`hover:bg-surface-muted ${!menu.isActive ? 'opacity-50' : ''}`}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
            <GripVertical className="w-3.5 h-3.5 text-content-muted/50 shrink-0" />
            {hasChildren ? (
              <button onClick={() => setOpen(v => !v)} className="text-content-muted hover:text-content-muted">
                {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-surface-muted" />
              </span>
            )}
            <span className="font-medium text-content text-sm">{menu.name}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <code className="text-xs bg-surface-muted text-content-muted px-2 py-0.5 rounded font-mono">{menu.code}</code>
        </td>
        <td className="px-4 py-3 text-xs text-content-muted font-mono">{menu.route ?? '—'}</td>
        <td className="px-4 py-3 text-xs text-content-muted">{menu.icon ?? '—'}</td>
        <td className="px-4 py-3 text-center text-xs font-medium text-content-muted">{menu.sortOrder}</td>
        <td className="px-4 py-3">
          <button onClick={() => onToggle(menu)}
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${menu.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-surface-muted text-content-muted hover:bg-surface-muted'}`}>
            {menu.isActive ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
            {menu.isActive ? 'Active' : 'Inactive'}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            <button onClick={() => onEdit(menu)}
              className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(menu.id)} disabled={hasChildren}
              className="p-1.5 text-content-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
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
  const [tree,    setTree]    = useState<MenuItem[]>([])
  const [flat,    setFlat]    = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [modal,   setModal]   = useState<'add' | 'edit' | null>(null)
  const [target,  setTarget]  = useState<MenuItem | null>(null)
  const [delId,   setDelId]   = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get<MenuItem[]>('/menus/tree')
      setTree(res.data)
      setFlat(flattenTree(res.data))
    } catch {
      setError('Failed to load menus')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleStatus = async (menu: MenuItem) => {
    try {
      await api.put(`/menus/${menu.id}`, {
        name: menu.name, route: menu.route, icon: menu.icon,
        parentId: menu.parentId, sortOrder: menu.sortOrder, isActive: !menu.isActive,
      })
      load()
    } catch { /* ignore */ }
  }

  const deleteMenu = async () => {
    if (!delId) return
    try {
      await api.delete(`/menus/${delId}`)
      setDelId(null); load()
    } catch (e: any) {
      alert(e.response?.data?.errors?.[0] ?? 'Cannot delete menu')
      setDelId(null)
    }
  }

  const childMap = flat.reduce((acc, m) => {
    if (m.parentId !== null) {
      acc[m.parentId] = [...(acc[m.parentId] ?? []), m]
    }
    return acc
  }, {} as Record<number, MenuItem[]>)

  const roots = tree

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content">Menu Management</h1>
          <p className="text-sm text-content-muted mt-0.5">Configure navigation menus and their hierarchy</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg border border-border-default transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Menu
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide">Total Menus</p>
          <p className="text-3xl font-bold text-content mt-1">{flat.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide">Root Menus</p>
          <p className="text-3xl font-bold text-primary mt-1">{roots.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide">Sub-Menus</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{flat.filter(m => m.parentId !== null).length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-xs text-content-muted uppercase tracking-wide">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{flat.filter(m => m.isActive).length}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Tree table */}
      <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-surface-muted border-b border-border-default">
              <tr>
                {['Name', 'Code', 'Route', 'Icon', 'Order', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : roots.map(root => (
                <MenuRow key={root.id} menu={root} children={root.children}
                  depth={0}
                  onEdit={m => { setTarget(m); setModal('edit') }}
                  onDelete={setDelId}
                  onToggle={toggleStatus} />
              ))}
              {!loading && roots.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-content-muted">No menus found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <MenuModal
          menu={modal === 'edit' ? target ?? undefined : undefined}
          roots={flat.filter(m => m.parentId === null)}
          onClose={() => { setModal(null); setTarget(null) }}
          onSaved={load} />
      )}
      {delId !== null && (
        <Modal open onClose={() => setDelId(null)} title="Delete Menu Item" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-content-muted">Delete this menu item? Associated role permissions will also be removed.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
              <button onClick={deleteMenu} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
