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
import { Plus, Building2, Users, FolderKanban, CheckCircle } from 'lucide-react'
import api from '@/lib/api'

interface Company {
  id: number; name: string; code: string
  email?: string; phone?: string; isActive: boolean
  userCount: number; projectCount: number
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  name:           z.string().min(1, 'Required'),
  code:           z.string().min(1, 'Required'),
  email:          z.string().email('Invalid email').or(z.literal('')).optional(),
  phone:          z.string().optional(),
  address:        z.string().optional(),
  website:        z.string().optional(),
  taxNumber:      z.string().optional(),
  adminFirstName: z.string().min(1, 'Required'),
  adminLastName:  z.string().min(1, 'Required'),
  adminEmail:     z.string().email('Invalid email'),
  adminPassword:  z.string().min(8, 'Min 8 characters'),
})
type Form = z.infer<typeof schema>

function CreateCompanyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      await api.post('/companies', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to create company')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Provision New Company" size="lg">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Company Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Company Name <span className="text-red-500">*</span></label>
              <input {...register('name')} className={inp} placeholder="Apex Builders Ltd." />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className={lbl}>Company Code <span className="text-red-500">*</span></label>
              <input {...register('code')} className={inp} placeholder="APX-001" />
              {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input type="email" {...register('email')} className={inp} placeholder="info@company.com" />
            </div>
            <div>
              <label className={lbl}>Phone</label>
              <input {...register('phone')} className={inp} placeholder="+880-..." />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Company Admin Account</p>
          <p className="text-xs text-gray-400 mb-3">This user will manage the company's users, roles and all data.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>First Name <span className="text-red-500">*</span></label>
              <input {...register('adminFirstName')} className={inp} placeholder="John" />
              {errors.adminFirstName && <p className="text-xs text-red-600 mt-1">{errors.adminFirstName.message}</p>}
            </div>
            <div>
              <label className={lbl}>Last Name <span className="text-red-500">*</span></label>
              <input {...register('adminLastName')} className={inp} placeholder="Doe" />
              {errors.adminLastName && <p className="text-xs text-red-600 mt-1">{errors.adminLastName.message}</p>}
            </div>
            <div>
              <label className={lbl}>Admin Email <span className="text-red-500">*</span></label>
              <input type="email" {...register('adminEmail')} className={inp} placeholder="admin@company.com" />
              {errors.adminEmail && <p className="text-xs text-red-600 mt-1">{errors.adminEmail.message}</p>}
            </div>
            <div>
              <label className={lbl}>Temp Password <span className="text-red-500">*</span></label>
              <input type="text" {...register('adminPassword')} className={inp} placeholder="Min 8 chars" />
              {errors.adminPassword && <p className="text-xs text-red-600 mt-1">{errors.adminPassword.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
            {saving ? 'Provisioning…' : 'Create Company'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function CompaniesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [toast, setToast]   = useState('')

  const { data: companies = [], isLoading, error, refetch } = useApiData<Company[]>({
    url: '/companies',
    params: { search: search || undefined },
    queryKey: ['companies', search],
  })

  const onSaved = () => {
    qc.invalidateQueries({ queryKey: ['companies'] })
    setToast('Company provisioned successfully.')
    setTimeout(() => setToast(''), 3000)
  }

  const active = companies.filter(c => c.isActive).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        subtitle="Platform tenant management — provision and oversee all companies"
        action={
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Company
          </button>
        }
      />

      {toast && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />{toast}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Companies</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{companies.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{companies.reduce((s, c) => s + c.userCount, 0)}</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search company name or code…" onRefresh={refetch} />

      <DataState loading={isLoading} error={error ? 'Failed to load companies.' : null} onRetry={refetch}
        empty={companies.length === 0} emptyMessage="No companies yet. Provision your first tenant.">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs font-mono text-gray-400">{c.code}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {c.email && <p className="text-xs text-gray-500 mb-3 truncate">{c.email}</p>}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span><span className="font-semibold">{c.userCount}</span> users</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <FolderKanban className="w-3.5 h-3.5 text-green-400" />
                  <span><span className="font-semibold">{c.projectCount}</span> projects</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DataState>

      {showNew && <CreateCompanyModal onClose={() => setShowNew(false)} onSaved={onSaved} />}
    </div>
  )
}
