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
import { Plus, Edit2, Phone, Mail, Building2 } from 'lucide-react'
import api from '@/lib/api'

interface Vendor {
  id: number; vendorCode: string; vendorName: string; vendorType: string
  contactPerson?: string; mobile?: string; email?: string; address?: string
  binNumber?: string; tinNumber?: string; status: string
}

const TYPE_COLORS: Record<string, string> = {
  Supplier:   'bg-blue-100 text-blue-700',
  Contractor: 'bg-orange-100 text-orange-700',
  Both:       'bg-purple-100 text-purple-700',
}
const TYPES = ['Supplier', 'Contractor', 'Both']

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  vendorName:    z.string().min(1, 'Required'),
  vendorType:    z.string().min(1, 'Required'),
  contactPerson: z.string().optional(),
  mobile:        z.string().optional(),
  email:         z.string().email('Invalid email').or(z.literal('')).optional(),
  address:       z.string().optional(),
  binNumber:     z.string().optional(),
  tinNumber:     z.string().optional(),
  status:        z.string().optional(),
})
type Form = z.infer<typeof schema>

function VendorModal({ vendor, onClose, onSaved }: {
  vendor?: Vendor; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!vendor
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: vendor ?? { vendorType: 'Supplier', status: 'Active' },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const body = { ...d, status: d.status || 'Active' }
      if (isEdit) await api.put(`/vendors/${vendor!.id}`, body)
      else        await api.post('/vendors', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Vendor' : 'Add Vendor'} size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Vendor Name <span className="text-red-500">*</span></label>
            <input {...register('vendorName')} className={inp} placeholder="ABC Supplies Ltd." />
            {errors.vendorName && <p className="text-xs text-red-600 mt-1">{errors.vendorName.message}</p>}
          </div>
          <div>
            <label className={lbl}>Type <span className="text-red-500">*</span></label>
            <select {...register('vendorType')} className={inp}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Contact Person</label>
            <input {...register('contactPerson')} className={inp} placeholder="Mr. Name" />
          </div>
          <div>
            <label className={lbl}>Mobile</label>
            <input {...register('mobile')} className={inp} placeholder="+880-..." />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Email</label>
            <input type="email" {...register('email')} className={inp} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className={lbl}>Address</label>
            <input {...register('address')} className={inp} placeholder="Area, Dhaka" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>BIN Number</label>
            <input {...register('binNumber')} className={inp} placeholder="BIN-..." />
          </div>
          <div>
            <label className={lbl}>TIN Number</label>
            <input {...register('tinNumber')} className={inp} placeholder="TIN-..." />
          </div>
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
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Vendor'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function VendorsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [type,   setType]   = useState('')
  const [modal,  setModal]  = useState<'add' | 'edit' | null>(null)
  const [target, setTarget] = useState<Vendor | null>(null)

  const { data: vendors = [], isLoading, error, refetch } = useApiData<Vendor[]>({
    url: '/vendors',
    params: { search: search || undefined, type: type || undefined },
    queryKey: ['vendors', search, type],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['vendors'] })
    qc.invalidateQueries({ queryKey: ['vendors-list'] })
  }

  const suppliers   = vendors.filter(v => v.vendorType === 'Supplier').length
  const contractors = vendors.filter(v => v.vendorType === 'Contractor').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        subtitle="Manage suppliers and contractors"
        action={
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Vendors</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{vendors.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Suppliers</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{suppliers}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Contractors</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{contractors}</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search vendor name or code…" onRefresh={refetch}>
        <select value={type} onChange={e => setType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load vendors.' : null} onRetry={refetch}
        empty={vendors.length === 0} emptyMessage="No vendors yet.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Vendor', 'Code', 'Type', 'Contact', 'BIN', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendors.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-medium text-gray-900">{v.vendorName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{v.vendorCode}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[v.vendorType] ?? 'bg-gray-100 text-gray-600'}`}>{v.vendorType}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {v.contactPerson && <p>{v.contactPerson}</p>}
                      {v.mobile && <p className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{v.mobile}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{v.binNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${v.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setTarget(v); setModal('edit') }} className="text-gray-400 hover:text-blue-600 p-1">
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

      {modal === 'add' && <VendorModal onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <VendorModal vendor={target} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
