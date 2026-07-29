'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Ban, Tags } from 'lucide-react'
import api from '@/lib/api'
import type { Resource } from './ResourceMasterPage'

interface ResourceRate {
  id: number
  resourceId: number; resourceCode: string; resourceName: string; resourceType: string
  vendorId?: number; vendorName?: string
  rate: number; rateBasis?: string
  effectiveFrom: string; effectiveTo?: string
  isActive: boolean; isCurrent: boolean
  source: string; notes?: string
}

interface Vendor { id: number; vendorName: string }

const RATE_BASES = ['Unit', 'Hour', 'Day', 'Month', 'Shift', 'Lumpsum', 'Sqft', 'Percent']

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { maximumFractionDigits: 4 })}` }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  resourceId:    z.coerce.number().min(1, 'Required'),
  rate:          z.coerce.number().min(0, 'Must be 0 or more'),
  effectiveFrom: z.string().min(1, 'Required'),
  vendorId:      z.string().optional(),
  rateBasis:     z.string().optional(),
  effectiveTo:   z.string().optional(),
  notes:         z.string().optional(),
})
type Form = z.infer<typeof schema>

function RateModal({ rate, resources, vendors, onClose, onSaved }: {
  rate?: ResourceRate; resources: Resource[]; vendors: Vendor[]
  onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!rate
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: rate
      ? {
          resourceId: rate.resourceId, rate: rate.rate, effectiveFrom: rate.effectiveFrom,
          vendorId: rate.vendorId ? String(rate.vendorId) : '',
          rateBasis: rate.rateBasis ?? '', effectiveTo: rate.effectiveTo ?? '', notes: rate.notes ?? '',
        }
      : { effectiveFrom: new Date().toISOString().slice(0, 10), rate: 0 },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const body = {
        resourceId: Number(d.resourceId),
        rate: Number(d.rate),
        effectiveFrom: d.effectiveFrom,
        vendorId: d.vendorId ? Number(d.vendorId) : null,
        rateBasis: d.rateBasis || null,
        effectiveTo: d.effectiveTo || null,
        notes: d.notes || null,
      }
      if (isEdit) await api.put(`/resource-rates/${rate!.id}`, body)
      else        await api.post('/resource-rates', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Rate' : 'Add Rate'} size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <div>
          <label className={lbl}>Resource <span className="text-danger">*</span></label>
          <Select {...register('resourceId')} disabled={isEdit}>
            <option value="">Select a resource…</option>
            {resources.map(r => (
              <option key={r.id} value={r.id}>{r.resourceCode} — {r.resourceName} ({r.resourceType})</option>
            ))}
          </Select>
          {errors.resourceId && <p className="text-xs text-danger mt-1">{errors.resourceId.message}</p>}
        </div>

        <div>
          <label className={lbl}>Vendor</label>
          <Select {...register('vendorId')} disabled={isEdit}>
            <option value="">Standard rate (no vendor)</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
          </Select>
          <p className="text-xs text-content-muted mt-1">
            {isEdit
              ? 'Resource and vendor are fixed — they identify which price history this row belongs to.'
              : 'A vendor rate overrides the standard rate for that vendor.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Rate (৳) <span className="text-danger">*</span></label>
            <input type="number" step="0.0001" {...register('rate')} className={inp} placeholder="0" />
            {errors.rate && <p className="text-xs text-danger mt-1">{errors.rate.message}</p>}
          </div>
          <div>
            <label className={lbl}>Rate Basis</label>
            <Select {...register('rateBasis')}>
              <option value="">Use resource default</option>
              {RATE_BASES.map(b => <option key={b} value={b}>{b}</option>)}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Effective From <span className="text-danger">*</span></label>
            <input type="date" {...register('effectiveFrom')} className={inp} />
            {errors.effectiveFrom && <p className="text-xs text-danger mt-1">{errors.effectiveFrom.message}</p>}
          </div>
          <div>
            <label className={lbl}>Effective To</label>
            <input type="date" {...register('effectiveTo')} className={inp} />
            <p className="text-xs text-content-muted mt-1">Leave blank to keep open-ended.</p>
          </div>
        </div>

        {!isEdit && (
          <p className="text-xs text-info bg-info/10 border border-info/20 rounded-lg px-3 py-2">
            Adding a rate automatically closes the previous open rate for the same resource and
            vendor, so the two never overlap and the old price is kept as history.
          </p>
        )}

        <div>
          <label className={lbl}>Notes</label>
          <input {...register('notes')} className={inp} placeholder="Negotiated hire rate" />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Rate'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function ResourceRatesPage() {
  const qc = useQueryClient()
  const [search, setSearch]     = useState('')
  const [resourceId, setResourceId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [currentOnly, setCurrentOnly] = useState(false)
  const [modal, setModal]   = useState<'add' | 'edit' | null>(null)
  const [target, setTarget] = useState<ResourceRate | null>(null)

  const { data: rates = [], isLoading, error, refetch } = useApiData<ResourceRate[]>({
    url: '/resource-rates',
    params: {
      resourceId: resourceId || undefined,
      vendorId: vendorId || undefined,
      currentOnly: currentOnly || undefined,
    },
    queryKey: ['resource-rates', resourceId, vendorId, currentOnly],
  })

  const { data: resources = [] } = useApiData<Resource[]>({ url: '/resources', queryKey: ['resources-all'] })
  const { data: vendors = [] }   = useApiData<Vendor[]>({ url: '/vendors', queryKey: ['vendors-list'] })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['resource-rates'] })

  const deactivate = async (r: ResourceRate) => {
    if (!window.confirm(`Deactivate the ${fmt(r.rate)} rate for ${r.resourceName}? It stays as price history.`)) return
    try { await api.delete(`/resource-rates/${r.id}`); invalidate() }
    catch (e: any) { window.alert(e.response?.data?.errors?.[0] ?? 'Could not deactivate.') }
  }

  const term = search.trim().toLowerCase()
  const shown = term
    ? rates.filter(r =>
        r.resourceName.toLowerCase().includes(term) ||
        r.resourceCode.toLowerCase().includes(term) ||
        (r.vendorName ?? '').toLowerCase().includes(term))
    : rates

  const currentCount = rates.filter(r => r.isCurrent).length
  const vendorCount  = rates.filter(r => r.vendorId).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Rates"
        subtitle="Effective-dated rates, optionally scoped to a vendor"
        action={
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Rate
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Rate Records</p>
          <p className="text-2xl font-bold text-primary mt-1">{rates.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Currently In Force</p>
          <p className="text-2xl font-bold text-success mt-1">{currentCount}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <p className="text-sm text-content-muted">Vendor-Specific</p>
          <p className="text-2xl font-bold text-info mt-1">{vendorCount}</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search resource or vendor…" onRefresh={refetch}>
        <Select value={resourceId} onChange={e => setResourceId(e.target.value)} className="min-w-[180px]">
          <option value="">All resources</option>
          {resources.map(r => <option key={r.id} value={r.id}>{r.resourceCode} — {r.resourceName}</option>)}
        </Select>
        <Select value={vendorId} onChange={e => setVendorId(e.target.value)} className="min-w-[150px]">
          <option value="">All vendors</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm text-content-muted whitespace-nowrap">
          <input type="checkbox" checked={currentOnly} onChange={e => setCurrentOnly(e.target.checked)} />
          Current only
        </label>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load rates.' : null} onRetry={refetch}
        empty={shown.length === 0} emptyMessage="No rates defined yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Resource' }, { h: 'Type' }, { h: 'Vendor' },
                    { h: 'Rate', num: true }, { h: 'Basis' },
                    { h: 'Effective From' }, { h: 'Effective To' }, { h: 'State' }, { h: '' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {shown.map(r => (
                  <tr key={r.id} className={`hover:bg-surface-muted ${!r.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-content">{r.resourceName}</p>
                      <p className="text-xs text-content-muted font-mono">{r.resourceCode}</p>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs">{r.resourceType}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.vendorName
                        ? <span className="text-content">{r.vendorName}</span>
                        : <span className="text-content-muted italic">Standard</span>}
                    </td>
                    <td className="px-4 py-3 font-bold text-right tabular-nums text-content">{fmt(r.rate)}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{r.rateBasis ?? '—'}</td>
                    <td className="px-4 py-3 text-content-muted text-xs tabular-nums">{r.effectiveFrom}</td>
                    <td className="px-4 py-3 text-content-muted text-xs tabular-nums">
                      {r.effectiveTo ?? <span className="text-success">open</span>}
                    </td>
                    <td className="px-4 py-3">
                      {!r.isActive
                        ? <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-surface-muted text-content-muted">Inactive</span>
                        : r.isCurrent
                          ? <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-success/10 text-success">In force</span>
                          : <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-surface-muted text-content-muted">History</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setTarget(r); setModal('edit') }} className="text-content-muted hover:text-primary p-1" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {r.isActive && (
                          <button onClick={() => deactivate(r)} className="text-content-muted hover:text-danger p-1" title="Deactivate">
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      <p className="text-xs text-content-muted flex items-center gap-2">
        <Tags className="w-3.5 h-3.5" />
        Rates resolve in order: vendor rate → standard rate → resource standard rate → average cost.
      </p>

      {modal === 'add' && (
        <RateModal resources={resources} vendors={vendors} onClose={() => setModal(null)} onSaved={invalidate} />
      )}
      {modal === 'edit' && target && (
        <RateModal rate={target} resources={resources} vendors={vendors}
          onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
