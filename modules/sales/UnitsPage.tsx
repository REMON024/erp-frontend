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
import { Plus, Edit2, Building2 } from 'lucide-react'
import api from '@/lib/api'

interface Project { id: number; projectName: string; projectCode: string }
interface Block   { id: number; projectId: number; name: string }
export interface Unit {
  id: number; projectId: number; blockId: number; blockName: string
  unitNo: string; floorNo?: string; unitType?: string; facing?: string
  sizeSqFt?: number; basePrice: number; additionalPrice: number
  totalPrice: number; status: string
}

const STATUS_COLORS: Record<string, string> = {
  Available: 'bg-emerald-100 text-emerald-700',
  Booked:    'bg-primary/10 text-primary',
  Sold:      'bg-surface-muted text-content-muted',
  Cancelled: 'bg-red-100 text-red-600',
}
const STATUSES = ['Available', 'Booked', 'Sold', 'Cancelled']
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  projectId:       z.coerce.number().min(1, 'Required'),
  blockId:         z.coerce.number().min(1, 'Required'),
  unitNo:          z.string().min(1, 'Required'),
  floorNo:         z.string().optional(),
  unitType:        z.string().optional(),
  facing:          z.string().optional(),
  sizeSqFt:        z.coerce.number().optional(),
  basePrice:       z.coerce.number().min(1, 'Required'),
  additionalPrice: z.coerce.number().optional(),
  status:          z.string(),
})
type Form = z.infer<typeof schema>

function UnitModal({ unit, projects, blocks, onClose, onSaved }: {
  unit?: Unit; projects: Project[]; blocks: Block[]; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!unit
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: unit
      ? { projectId: unit.projectId, blockId: unit.blockId, unitNo: unit.unitNo, floorNo: unit.floorNo,
          unitType: unit.unitType, facing: unit.facing, sizeSqFt: unit.sizeSqFt,
          basePrice: unit.basePrice, additionalPrice: unit.additionalPrice, status: unit.status }
      : { status: 'Available', additionalPrice: 0 },
  })

  const selectedProject = watch('projectId')
  const eligibleBlocks  = blocks.filter(b => b.projectId === Number(selectedProject))
  const basePrice       = Number(watch('basePrice') || 0)
  const additionalPrice = Number(watch('additionalPrice') || 0)
  const totalPrice      = basePrice + additionalPrice

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const payload = { ...d, totalPrice: (d.basePrice ?? 0) + (d.additionalPrice ?? 0) }
      if (isEdit) await api.put(`/units/${unit!.id}`, payload)
      else        await api.post('/units', payload)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Unit' : 'Add Unit'} size="lg">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project <span className="text-red-500">*</span></label>
            <Select {...register('projectId')}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
            </Select>
            {errors.projectId && <p className="text-xs text-red-600 mt-1">{errors.projectId.message}</p>}
          </div>
          <div>
            <label className={lbl}>Block <span className="text-red-500">*</span></label>
            <Select {...register('blockId')}>
              <option value="">Select block</option>
              {eligibleBlocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            {errors.blockId && <p className="text-xs text-red-600 mt-1">{errors.blockId.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Unit No. <span className="text-red-500">*</span></label>
            <input {...register('unitNo')} className={inp} placeholder="A-101" />
            {errors.unitNo && <p className="text-xs text-red-600 mt-1">{errors.unitNo.message}</p>}
          </div>
          <div>
            <label className={lbl}>Floor</label>
            <input {...register('floorNo')} className={inp} placeholder="3" />
          </div>
          <div>
            <label className={lbl}>Type</label>
            <input {...register('unitType')} className={inp} placeholder="3 BHK" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Area (sqft)</label>
            <input type="number" {...register('sizeSqFt')} className={inp} placeholder="1200" />
          </div>
          <div>
            <label className={lbl}>Facing</label>
            <Select {...register('facing')}>
              <option value="">—</option>
              {['North', 'South', 'East', 'West', 'North-East', 'South-West'].map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <div>
            <label className={lbl}>Status</label>
            <Select {...register('status')}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Base Price (৳) <span className="text-red-500">*</span></label>
            <input type="number" {...register('basePrice')} className={inp} placeholder="5000000" />
            {errors.basePrice && <p className="text-xs text-red-600 mt-1">{errors.basePrice.message}</p>}
          </div>
          <div>
            <label className={lbl}>Additional Price (৳)</label>
            <input type="number" {...register('additionalPrice')} className={inp} placeholder="0" />
          </div>
        </div>
        {totalPrice > 0 && (
          <div className="bg-surface-muted rounded-lg px-4 py-2 flex justify-between items-center text-sm">
            <span className="text-content-muted">Total Price</span>
            <span className="font-bold text-content">৳{totalPrice.toLocaleString('en-BD')}</span>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Unit'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function UnitsPage() {
  const qc = useQueryClient()
  const [search,    setSearch]    = useState('')
  const [projectId, setProject]   = useState('')
  const [status,    setStatus]    = useState('')
  const [modal,     setModal]     = useState<'add' | 'edit' | null>(null)
  const [target,    setTarget]    = useState<Unit | null>(null)

  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data: blocks = [] }   = useApiData<Block[]>({ url: '/blocks', queryKey: ['blocks-list'] })

  const { data: units = [], isLoading, error, refetch } = useApiData<Unit[]>({
    url: '/units',
    params: { projectId: projectId || undefined, status: status || undefined, search: search || undefined },
    queryKey: ['units', projectId, status, search],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['units'] })
    qc.invalidateQueries({ queryKey: ['units-list'] })
  }

  const available = units.filter(u => u.status === 'Available').length
  const booked    = units.filter(u => u.status === 'Booked').length
  const sold       = units.filter(u => u.status === 'Sold').length
  const availableValue = units.filter(u => u.status === 'Available').reduce((s, u) => s + u.totalPrice, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unit Configuration"
        subtitle="Define and manage sellable units across all projects"
        action={
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Unit
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Units',     value: units.length,        color: 'text-content',    bg: 'bg-surface' },
          { label: 'Available',       value: available,           color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Booked',          value: booked,              color: 'text-primary',    bg: 'bg-primary/10' },
          { label: 'Sold',            value: sold,                color: 'text-content-muted',    bg: 'bg-surface-muted' },
          { label: 'Available Value', value: fmt(availableValue), color: 'text-indigo-600',  bg: 'bg-indigo-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-border-default p-4 ${s.bg}`}>
            <p className="text-xs text-content-muted uppercase tracking-wide leading-tight">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search unit no…" onRefresh={refetch}>
        <Select value={projectId} onChange={e => setProject(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
        </Select>
        <Select value={status} onChange={e => setStatus(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load units.' : null} onRetry={refetch}
        empty={units.length === 0} emptyMessage="No units found.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {['Unit No.', 'Block', 'Type', 'Floor', 'Area (sqft)', 'Total Price', 'Facing', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {units.map(u => (
                  <tr key={u.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-semibold text-content">{u.unitNo}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">
                      <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-content-muted" />{u.blockName}</div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs">{u.unitType ?? '—'}</td>
                    <td className="px-4 py-3 text-content-muted text-center">{u.floorNo ?? '—'}</td>
                    <td className="px-4 py-3 text-content font-medium">{u.sizeSqFt?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-content">{fmt(u.totalPrice)}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{u.facing ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[u.status] ?? 'bg-surface-muted text-content-muted'}`}>{u.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setTarget(u); setModal('edit') }}
                        className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
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

      {modal === 'add' && (
        <UnitModal projects={projects} blocks={blocks} onClose={() => setModal(null)} onSaved={invalidate} />
      )}
      {modal === 'edit' && target && (
        <UnitModal unit={target} projects={projects} blocks={blocks}
          onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
