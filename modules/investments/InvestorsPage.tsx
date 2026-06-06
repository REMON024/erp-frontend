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
import { Plus, Edit2, Phone, Mail, TrendingUp } from 'lucide-react'
import api from '@/lib/api'

interface Investor {
  id: number; investorCode: string; fullName: string; role: string
  mobile?: string; email?: string; address?: string; notes?: string
  status: string; totalInvested: number
}

const ROLES = ['Managing Director', 'Chairman', 'Director', 'Partner', 'Shareholder', 'Other']

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  role:     z.string().min(1, 'Role is required'),
  mobile:   z.string().optional(),
  email:    z.string().email('Invalid email').or(z.literal('')).optional(),
  address:  z.string().optional(),
  notes:    z.string().optional(),
  status:   z.string().optional(),
})
type Form = z.infer<typeof schema>

function InvestorModal({ investor, onClose, onSaved }: {
  investor?: Investor; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!investor
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: investor
      ? { fullName: investor.fullName, role: investor.role, mobile: investor.mobile ?? '', email: investor.email ?? '', address: investor.address ?? '', notes: investor.notes ?? '', status: investor.status }
      : { role: 'Director', status: 'Active' },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const body = { ...d, status: d.status || 'Active' }
      if (isEdit) await api.put(`/investors/${investor!.id}`, body)
      else        await api.post('/investors', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Investor' : 'Add Investor'} size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Full Name <span className="text-red-500">*</span></label>
            <input {...register('fullName')} className={inp} placeholder="Investor full name" />
            {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className={lbl}>Role <span className="text-red-500">*</span></label>
            <input {...register('role')} list="investor-roles" className={inp} placeholder="e.g. Managing Director" />
            <datalist id="investor-roles">
              {ROLES.map(r => <option key={r} value={r} />)}
            </datalist>
            {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Mobile</label>
            <input {...register('mobile')} className={inp} placeholder="+880-171-0000000" />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" {...register('email')} className={inp} placeholder="investor@email.com" />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <label className={lbl}>Address</label>
          <input {...register('address')} className={inp} placeholder="Residential address" />
        </div>

        <div>
          <label className={lbl}>Notes</label>
          <textarea {...register('notes')} rows={2} className={inp} placeholder="Any additional information…" />
        </div>

        {isEdit && (
          <div>
            <label className={lbl}>Status</label>
            <select {...register('status')} className={inp}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Investor'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function InvestorsPage() {
  const qc = useQueryClient()
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState<Investor | null>(null)

  const { data: investors = [], isLoading, error, refetch } = useApiData<Investor[]>({
    url: '/investors',
    params: { search: search || undefined },
    queryKey: ['investors', search],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['investors'] })
    qc.invalidateQueries({ queryKey: ['investors-list'] })
  }

  const totalInvested  = investors.reduce((s, i) => s + i.totalInvested, 0)
  const activeCount    = investors.filter(i => i.status === 'Active').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investors"
        subtitle="Manage investor profiles and track their capital contributions"
        action={
          <button onClick={() => { setEditing(null); setModal(true) }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Investor
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-600 uppercase font-semibold tracking-wide">Total Invested</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{fmt(totalInvested)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Active Investors</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Investors</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{investors.length}</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, code, or mobile…" onRefresh={refetch} />

      <DataState loading={isLoading} error={error ? 'Failed to load investors.' : null} onRetry={refetch}
        empty={investors.length === 0} emptyMessage="No investors yet. Add your first investor.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {investors.map(inv => (
            <div key={inv.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{inv.fullName}</p>
                  <p className="text-xs text-blue-600 font-medium mt-0.5">{inv.role}</p>
                  <p className="text-xs text-gray-400">{inv.investorCode}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${inv.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {inv.status}
                  </span>
                  <button onClick={() => { setEditing(inv); setModal(true) }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-gray-500">
                {inv.mobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{inv.mobile}</span>
                  </div>
                )}
                {inv.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{inv.email}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500">Total Invested</p>
                  <p className="font-bold text-blue-700 text-sm">{fmt(inv.totalInvested)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DataState>

      {modal && (
        <InvestorModal
          investor={editing ?? undefined}
          onClose={() => { setModal(false); setEditing(null) }}
          onSaved={invalidate}
        />
      )}
    </div>
  )
}
