'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Table, TH, TR, TD } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { PermissionGate } from '@/components/ui/PermissionGate'
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
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>Full Name</Label>
            <Input {...register('fullName')} invalid={!!errors.fullName} placeholder="Mr. Client Name" />
            {errors.fullName && <p className="text-xs text-danger mt-1">{errors.fullName.message}</p>}
          </div>
          <div>
            <Label required>Mobile</Label>
            <Input {...register('mobile')} invalid={!!errors.mobile} placeholder="+880-171-0000000" />
            {errors.mobile && <p className="text-xs text-danger mt-1">{errors.mobile.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Email</Label>
            <Input type="email" {...register('email')} invalid={!!errors.email} />
            {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label>Profession</Label>
            <Input {...register('profession')} placeholder="Businessman" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>NID / Passport No.</Label>
            <Input {...register('nid')} placeholder="1991-1234567" />
          </div>
          <div>
            <Label>Nominee Name</Label>
            <Input {...register('nomineeName')} placeholder="Nominee" />
          </div>
        </div>
        <div>
          <Label>Present Address</Label>
          <Input {...register('presentAddress')} placeholder="Area, Dhaka" />
        </div>
        {isEdit && (
          <div>
            <Label>Status</Label>
            <Select {...register('status')}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save Changes' : 'Add Client'}
          </Button>
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
          <PermissionGate module="CLIENTS" action="create">
            <Button onClick={() => setModal('add')} leftIcon={<Plus className="w-4 h-4" />}>
              Add Client
            </Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-content-muted">Total Clients</p>
          <p className="text-2xl font-bold text-primary mt-1">{clients.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-content-muted">Active</p>
          <p className="text-2xl font-bold text-success mt-1">{active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-content-muted">Inactive</p>
          <p className="text-2xl font-bold text-content-muted mt-1">{clients.length - active}</p>
        </Card>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, code or phone…" onRefresh={refetch} />

      <DataState loading={isLoading} error={error ? 'Failed to load clients.' : null} onRetry={refetch}
        empty={clients.length === 0} emptyMessage="No clients yet. Add your first client.">
        <Table head={['Name', 'Code', 'Contact', 'Address', 'Profession', 'Status', ''].map(h => (
          <TH key={h}>{h}</TH>
        ))}>
          {clients.map(c => (
            <TR key={c.id}>
              <TD>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {c.fullName.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                  <span className="font-medium text-content">{c.fullName}</span>
                </div>
              </TD>
              <TD className="text-content-muted text-xs font-mono">{c.customerCode}</TD>
              <TD className="text-content-muted">
                <p className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{c.mobile}</p>
                {c.email && <p className="flex items-center gap-1 text-xs mt-0.5"><Mail className="w-3 h-3" />{c.email}</p>}
              </TD>
              <TD className="text-content-muted text-xs">
                {c.presentAddress && <div className="flex items-center gap-1"><Home className="w-3 h-3" />{c.presentAddress}</div>}
              </TD>
              <TD className="text-content-muted text-xs">{c.profession ?? '—'}</TD>
              <TD>
                <Badge tone={c.status === 'Active' ? 'success' : 'neutral'}>{c.status}</Badge>
              </TD>
              <TD>
                <PermissionGate module="CLIENTS" action="edit">
                  <button onClick={() => { setTarget(c); setModal('edit') }} aria-label={`Edit ${c.fullName}`} className="text-content-muted hover:text-primary p-1">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </PermissionGate>
              </TD>
            </TR>
          ))}
        </Table>
      </DataState>

      {modal === 'add' && <CustomerModal onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <CustomerModal customer={target} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
