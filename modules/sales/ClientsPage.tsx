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
import { Plus, Edit2, Phone, Mail, Home } from 'lucide-react'
import api from '@/lib/api'

export interface Customer {
  id: number; customerCode: string; fullName: string; mobile: string
  email?: string; presentAddress?: string; nid?: string
  profession?: string; nomineeName?: string; status: string
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  fullName:       z.string().min(1, 'Required'),
  mobile:         z.string().min(1, 'Required'),
  email:          z.string().email('Invalid email').or(z.literal('')).optional(),
  presentAddress: z.string().optional(),
  nid:            z.string().optional(),
  profession:     z.string().optional(),
  nomineeName:    z.string().optional(),
  status:         z.string().optional(),
})
type Form = z.infer<typeof schema>

function CustomerModal({ customer, onClose, onSaved }: {
  customer?: Customer; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!customer
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: customer ?? { status: 'Active' },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const body = { ...d, status: d.status || 'Active' }
      if (isEdit) await api.put(`/customers/${customer!.id}`, body)
      else        await api.post('/customers', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Client' : 'Add Client'} size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Full Name <span className="text-red-500">*</span></label>
            <input {...register('fullName')} className={inp} placeholder="Mr. Client Name" />
            {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className={lbl}>Mobile <span className="text-red-500">*</span></label>
            <input {...register('mobile')} className={inp} placeholder="+880-171-0000000" />
            {errors.mobile && <p className="text-xs text-red-600 mt-1">{errors.mobile.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Email</label>
            <input type="email" {...register('email')} className={inp} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className={lbl}>Profession</label>
            <input {...register('profession')} className={inp} placeholder="Businessman" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>NID / Passport No.</label>
            <input {...register('nid')} className={inp} placeholder="1991-1234567" />
          </div>
          <div>
            <label className={lbl}>Nominee Name</label>
            <input {...register('nomineeName')} className={inp} placeholder="Nominee" />
          </div>
        </div>
        <div>
          <label className={lbl}>Present Address</label>
          <input {...register('presentAddress')} className={inp} placeholder="Area, Dhaka" />
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
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Client'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function ClientsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState<'add' | 'edit' | null>(null)
  const [target, setTarget] = useState<Customer | null>(null)

  const { data: clients = [], isLoading, error, refetch } = useApiData<Customer[]>({
    url: '/customers',
    params: { search: search || undefined },
    queryKey: ['customers', search],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['customers'] })
    qc.invalidateQueries({ queryKey: ['customers-list'] })
  }
  const active = clients.filter(c => c.status === 'Active').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Master"
        subtitle="Manage all unit buyers and their contact details"
        action={
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Clients</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{clients.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Inactive</p>
          <p className="text-2xl font-bold text-gray-400 mt-1">{clients.length - active}</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, code or phone…" onRefresh={refetch} />

      <DataState loading={isLoading} error={error ? 'Failed to load clients.' : null} onRetry={refetch}
        empty={clients.length === 0} emptyMessage="No clients yet. Add your first client.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Code', 'Contact', 'Address', 'Profession', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                          {c.fullName.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </div>
                        <span className="font-medium text-gray-900">{c.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{c.customerCode}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <p className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{c.mobile}</p>
                      {c.email && <p className="flex items-center gap-1 text-xs mt-0.5"><Mail className="w-3 h-3" />{c.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.presentAddress && <div className="flex items-center gap-1"><Home className="w-3 h-3" />{c.presentAddress}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.profession ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${c.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setTarget(c); setModal('edit') }} className="text-gray-400 hover:text-blue-600 p-1">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {modal === 'add' && <CustomerModal onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <CustomerModal customer={target} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
