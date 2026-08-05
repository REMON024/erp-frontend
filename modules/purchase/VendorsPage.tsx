'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Phone, Building2, History } from 'lucide-react'
import { VendorHistoryModal } from './VendorHistoryModal'
import api from '@/lib/api'

interface Vendor {
  id: number; vendorCode: string; vendorName: string; vendorType: string
  contactPerson?: string; mobile?: string; email?: string; address?: string
  binNumber?: string; tinNumber?: string; status: string
}

const TYPE_COLORS: Record<string, string> = {
  Supplier:   'bg-primary/10 text-primary',
  Contractor: 'bg-warning/15 text-warning',
  Both:       'bg-primary/10 text-primary',
}
const TYPES = ['Supplier', 'Contractor', 'Both']

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

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
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Vendor Name <span className="text-danger">*</span></label>
            <input {...register('vendorName')} className={inp} placeholder="ABC Supplies Ltd." />
            {errors.vendorName && <p className="text-xs text-danger mt-1">{errors.vendorName.message}</p>}
          </div>
          <div>
            <label className={lbl}>Type <span className="text-danger">*</span></label>
            <Select {...register('vendorType')}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
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
            {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
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
            <Select {...register('status')}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
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
  const [modal,   setModal]   = useState<'add' | 'edit' | null>(null)
  const [target,  setTarget]  = useState<Vendor | null>(null)
  const [history, setHistory] = useState<Vendor | null>(null)

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
          <PermissionGate module="VENDORS" action="create">
            <button onClick={() => setModal('add')}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Vendor
            </button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Total Vendors</p>
          <p className="text-2xl font-bold text-content mt-1">{vendors.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Suppliers</p>
          <p className="text-2xl font-bold text-primary mt-1">{suppliers}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Contractors</p>
          <p className="text-2xl font-bold text-warning mt-1">{contractors}</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search vendor name or code…" onRefresh={refetch}>
        <Select value={type} onChange={e => setType(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load vendors.' : null} onRetry={refetch}
        empty={vendors.length === 0} emptyMessage="No vendors yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {['Vendor', 'Code', 'Type', 'Contact', 'BIN', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {vendors.map(v => (
                  <tr key={v.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-content-muted shrink-0" />
                        <span className="font-medium text-content">{v.vendorName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs font-mono">{v.vendorCode}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[v.vendorType] ?? 'bg-surface-muted text-content-muted'}`}>{v.vendorType}</span>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs">
                      {v.contactPerson && <p>{v.contactPerson}</p>}
                      {v.mobile && <p className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{v.mobile}</p>}
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs font-mono">{v.binNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${v.status === 'Active' ? 'bg-success/10 text-success' : 'bg-surface-muted text-content-muted'}`}>{v.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setHistory(v)} title="View History" className="text-content-muted hover:text-primary hover:bg-primary/10 p-1.5 rounded-lg">
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <PermissionGate module="VENDORS" action="edit">
                          <button onClick={() => { setTarget(v); setModal('edit') }} title="Edit" aria-label={`Edit ${v.vendorName}`} className="text-content-muted hover:text-primary hover:bg-primary/10 p-1.5 rounded-lg">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </PermissionGate>
                      </div>
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
      {history && (
        <VendorHistoryModal vendorId={history.id} vendorName={history.vendorName} onClose={() => setHistory(null)} />
      )}
    </div>
  )
}
