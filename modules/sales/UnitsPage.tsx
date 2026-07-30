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
import { Input, Field } from '@/components/ui/Input'
import { Table, TH, TR, TD } from '@/components/ui/Table'
import { StatCard } from '@/components/ui/Card'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { formatArea } from '@/utils/format'
import api from '@/lib/api'

interface Project { id: number; projectName: string; projectCode: string }
interface Block   { id: number; projectId: number; name: string }
interface Floor   { id: number; blockId: number; name: string; floorNumber: number }
export interface Unit {
  id: number; projectId: number; blockId: number; blockName: string
  floorId: number; floorName: string; floorNumber: number
  unitNo: string; unitType?: string; facing?: string
  areaSqFt?: number; basePrice: number; additionalPrice: number
  totalPrice: number; status: string
}

// Domain tones rather than the shared statusTone(): that helper reads "Available" and
// "Booked" as neutral, which would flatten the distinction this list exists to show.
// Still a Badge, so no inline pills.
const STATUS_TONES: Record<string, BadgeTone> = {
  Available: 'success',
  Booked:    'primary',
  Sold:      'neutral',
  Cancelled: 'danger',
}
const STATUSES = ['Available', 'Booked', 'Sold', 'Cancelled']
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

const schema = z.object({
  projectId:       z.coerce.number().min(1, 'Required'),
  blockId:         z.coerce.number().min(1, 'Required'),
  floorId:         z.coerce.number().min(1, 'Required'),
  unitNo:          z.string().min(1, 'Required'),
  unitType:        z.string().optional(),
  facing:          z.string().optional(),
  areaSqFt:        z.coerce.number().optional(),
  basePrice:       z.coerce.number().min(1, 'Required'),
  additionalPrice: z.coerce.number().optional(),
  status:          z.string(),
})
type Form = z.infer<typeof schema>

function UnitModal({ unit, projects, blocks, floors, onClose, onSaved }: {
  unit?: Unit; projects: Project[]; blocks: Block[]; floors: Floor[]
  onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!unit
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: unit
      ? { projectId: unit.projectId, blockId: unit.blockId, floorId: unit.floorId, unitNo: unit.unitNo,
          unitType: unit.unitType, facing: unit.facing, areaSqFt: unit.areaSqFt,
          basePrice: unit.basePrice, additionalPrice: unit.additionalPrice, status: unit.status }
      : { status: 'Available', additionalPrice: 0 },
  })

  // Project → Block → Floor. Each level clears its descendants on change, otherwise a stale
  // child id survives the switch and the unit lands under the wrong parent.
  const selectedProject = watch('projectId')
  const selectedBlock   = watch('blockId')
  const eligibleBlocks  = blocks.filter(b => b.projectId === Number(selectedProject))
  const eligibleFloors  = floors
    .filter(f => f.blockId === Number(selectedBlock))
    .sort((a, b) => a.floorNumber - b.floorNumber)
  const clear = (field: 'blockId' | 'floorId') =>
    setValue(field, undefined as any, { shouldValidate: false })
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
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Project" required error={errors.projectId?.message}>
            <Select {...register('projectId', { onChange: () => { clear('blockId'); clear('floorId') } })}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
            </Select>
          </Field>
          <Field label="Block" required error={errors.blockId?.message}>
            <Select {...register('blockId', { onChange: () => clear('floorId') })} disabled={!selectedProject}>
              <option value="">{selectedProject ? 'Select block' : 'Select a project first'}</option>
              {eligibleBlocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Floor" required error={errors.floorId?.message}>
            <Select {...register('floorId')} disabled={!selectedBlock}>
              <option value="">{selectedBlock ? 'Select floor' : 'Select a block first'}</option>
              {eligibleFloors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Unit No." required error={errors.unitNo?.message}>
            <Input {...register('unitNo')} invalid={!!errors.unitNo} placeholder="A-101" />
          </Field>
          <Field label="Type">
            <Input {...register('unitType')} placeholder="3 BHK" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Area (sqft)">
            <Input type="number" {...register('areaSqFt')} placeholder="1200" />
          </Field>
          <Field label="Facing">
            <Select {...register('facing')}>
              <option value="">—</option>
              {['North', 'South', 'East', 'West', 'North-East', 'South-West'].map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select {...register('status')}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Base Price (৳)" required error={errors.basePrice?.message}>
            <Input type="number" {...register('basePrice')} invalid={!!errors.basePrice} placeholder="5000000" />
          </Field>
          <Field label="Additional Price (৳)">
            <Input type="number" {...register('additionalPrice')} placeholder="0" />
          </Field>
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
  const { data: floors = [] }   = useApiData<Floor[]>({ url: '/floors', queryKey: ['floors-list'] })

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
        {([
          { label: 'Total Units',     value: String(units.length), tone: 'neutral' },
          { label: 'Available',       value: String(available),    tone: 'success' },
          { label: 'Booked',          value: String(booked),       tone: 'primary' },
          { label: 'Sold',            value: String(sold),         tone: 'neutral' },
          { label: 'Available Value', value: fmt(availableValue),  tone: 'info'    },
        ] as const).map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} tone={s.tone} />
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
        <Table
          minWidth={860}
          head={<>
            <TH>Unit No.</TH><TH>Block</TH><TH>Type</TH><TH align="center">Floor</TH>
            <TH num>Area (sqft)</TH><TH num>Total Price</TH>
            <TH>Facing</TH><TH>Status</TH><TH />
          </>}
        >
          {units.map(u => (
            <TR key={u.id}>
              <TD className="font-semibold text-content">{u.unitNo}</TD>
              <TD className="text-content-muted text-xs">
                <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-content-muted" />{u.blockName}</div>
              </TD>
              <TD className="text-content-muted text-xs">{u.unitType ?? '—'}</TD>
              <TD align="center" className="text-content-muted">{u.floorName}</TD>
              <TD num className="text-content font-medium">{formatArea(u.areaSqFt)}</TD>
              <TD num className="font-semibold text-content">{fmt(u.totalPrice)}</TD>
              <TD className="text-content-muted text-xs">{u.facing ?? '—'}</TD>
              <TD>
                <Badge tone={STATUS_TONES[u.status] ?? 'neutral'}>{u.status}</Badge>
              </TD>
              <TD>
                <button onClick={() => { setTarget(u); setModal('edit') }} aria-label={`Edit ${u.unitNo}`}
                  className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </TD>
            </TR>
          ))}
        </Table>
      </DataState>

      {modal === 'add' && (
        <UnitModal projects={projects} blocks={blocks} floors={floors} onClose={() => setModal(null)} onSaved={invalidate} />
      )}
      {modal === 'edit' && target && (
        <UnitModal unit={target} projects={projects} blocks={blocks} floors={floors}
          onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
