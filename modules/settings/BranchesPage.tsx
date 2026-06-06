'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Building2, Phone, Mail, User } from 'lucide-react'
import api from '@/lib/api'

interface Branch {
  id: number; name: string; code: string; address?: string
  phone?: string; email?: string; managerName?: string; isActive: boolean
}

const schema = z.object({
  name:        z.string().min(1, 'Required'),
  code:        z.string().min(1, 'Required'),
  address:     z.string().optional(),
  phone:       z.string().optional(),
  email:       z.string().optional(),
  managerName: z.string().optional(),
  isActive:    z.boolean().optional(),
})
type Form = z.infer<typeof schema>

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

function BranchModal({ branch, onClose, onSaved }: {
  branch?: Branch; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!branch
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: branch ?? { isActive: true },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      if (isEdit) await api.put(`/branches/${branch!.id}`, d)
      else        await api.post('/branches', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Branch' : 'Add Branch'} size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Branch Name <span className="text-red-500">*</span></label>
            <input {...register('name')} className={inp} placeholder="Head Office" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Branch Code <span className="text-red-500">*</span></label>
            <input {...register('code')} className={inp} placeholder="HO-001" />
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Address</label>
          <textarea {...register('address')} className={inp} rows={2} placeholder="Full branch address" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Phone</label>
            <input {...register('phone')} className={inp} placeholder="+880-2-XXXXXXX" />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" {...register('email')} className={inp} placeholder="branch@company.com" />
          </div>
        </div>
        <div>
          <label className={lbl}>Branch Manager</label>
          <input {...register('managerName')} className={inp} placeholder="Full name of branch manager" />
        </div>
        {isEdit && (
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" {...register('isActive')} className="rounded" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active branch</label>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Branch'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function BranchCard({ branch, onEdit }: { branch: Branch; onEdit: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{branch.name}</p>
            <p className="text-xs font-mono text-gray-400">{branch.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            branch.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {branch.isActive ? 'Active' : 'Inactive'}
          </span>
          <button onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {branch.managerName && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />{branch.managerName}
          </div>
        )}
        {branch.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />{branch.phone}
          </div>
        )}
        {branch.email && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />{branch.email}
          </div>
        )}
        {branch.address && (
          <p className="text-xs text-gray-400 pt-1 border-t border-gray-100 mt-2">{branch.address}</p>
        )}
      </div>
    </div>
  )
}

export function BranchesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [modal,  setModal]  = useState<'add' | 'edit' | null>(null)
  const [target, setTarget] = useState<Branch | null>(null)

  const { data: branches = [], isLoading, error, refetch } = useApiData<Branch[]>({
    url: '/branches',
    params: { search: search || undefined },
    queryKey: ['branches', search],
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['branches'] })

  const displayed = branches.filter(b =>
    filter === 'all' || (filter === 'active' ? b.isActive : !b.isActive))

  const active   = branches.filter(b => b.isActive).length
  const inactive = branches.filter(b => !b.isActive).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        subtitle="Manage company branches and regional offices"
        action={
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Branch
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{branches.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Inactive</p>
          <p className="text-3xl font-bold text-gray-400 mt-1">{inactive}</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name or code…" onRefresh={refetch}>
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 text-xs rounded-lg border font-medium capitalize ${
              filter === f ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
            }`}>{f}</button>
        ))}
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load branches.' : null} onRetry={refetch}
        empty={displayed.length === 0} emptyMessage="No branches found. Add your first branch.">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(b => (
            <BranchCard key={b.id} branch={b} onEdit={() => { setTarget(b); setModal('edit') }} />
          ))}
        </div>
      </DataState>

      {modal === 'add' && <BranchModal onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <BranchModal branch={target} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
