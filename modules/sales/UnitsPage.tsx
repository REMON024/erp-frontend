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
import { PermissionGate } from '@/components/ui/PermissionGate'
import { formatArea } from '@/utils/format'
import api from '@/lib/api'

interface Project { id: number; projectName: string; projectCode: string }
interface Block   { id: number; projectId: number; name: string }
interface Floor   { id: number; blockId: number; name: string; floorNumber: number }
export interface UnitCharge { id: number; chargeType: string; description?: string; amount: number }
export interface Unit {
  id: number; projectId: number; blockId: number; blockName: string
  floorId: number; floorName: string; floorNumber: number
  unitNo: string; unitType?: string; facing?: string
  // basePrice is computed server-side as areaSqFt x the resolved rate card, unless overridden.
  // additionalPrice is the sum of the charge lines.
  areaSqFt?: number; basePrice: number; ratePerSqFt?: number
  isPriceOverridden: boolean; rateScope?: string
  additionalPrice: number; charges: UnitCharge[]
  totalPrice: number; status: string
}
interface ResolvedRate { ratePerSqFt: number; scope: string; areaSqFt?: number; basePrice?: number }

const CHARGE_TYPES = ['Parking', 'Utility', 'Corner', 'FloorPremium', 'Other']

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
  projectId: z.coerce.number().min(1, 'Required'),
  blockId:   z.coerce.number().min(1, 'Required'),
  floorId:   z.coerce.number().min(1, 'Required'),
  unitNo:    z.string().min(1, 'Required'),
  unitType:  z.string().optional(),
  facing:    z.string().optional(),
  // Area drives the price now, so it is required rather than decorative.
  areaSqFt:  z.coerce.number().min(1, 'Required — the base price is area x rate'),
  basePriceOverride: z.coerce.number().optional(),
  status:    z.string(),
})
type Form = z.infer<typeof schema>

function UnitModal({ unit, projects, blocks, floors, onClose, onSaved }: {
  unit?: Unit; projects: Project[]; blocks: Block[]; floors: Floor[]
  onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!unit
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const [overriding, setOverriding] = useState(!!unit?.isPriceOverridden)
  const [charges, setCharges] = useState<{ chargeType: string; description?: string; amount: number }[]>(
    unit?.charges?.map(c => ({ chargeType: c.chargeType, description: c.description, amount: c.amount })) ?? [])
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: unit
      ? { projectId: unit.projectId, blockId: unit.blockId, floorId: unit.floorId, unitNo: unit.unitNo,
          unitType: unit.unitType, facing: unit.facing, areaSqFt: unit.areaSqFt,
          basePriceOverride: unit.isPriceOverridden ? unit.basePrice : undefined,
          status: unit.status }
      : { status: 'Available' },
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

  const selectedFloor = watch('floorId')
  const unitType      = watch('unitType')
  const areaSqFt      = Number(watch('areaSqFt') || 0)
  const overridePrice = Number(watch('basePriceOverride') || 0)

  // The same resolver the server prices with, so the preview is the price that will be stored
  // rather than a second implementation that can drift from it.
  const { data: rate, error: rateError } = useApiData<ResolvedRate>({
    url: '/sales-rates/resolve',
    params: {
      projectId: Number(selectedProject) || undefined,
      blockId:   Number(selectedBlock)   || undefined,
      floorId:   Number(selectedFloor)   || undefined,
      unitType:  unitType || undefined,
    },
    queryKey: ['resolve-rate', selectedProject, selectedBlock, selectedFloor, unitType],
    enabled: !!selectedFloor,
  })

  const basePrice       = overriding ? overridePrice : Math.round((rate?.ratePerSqFt ?? 0) * areaSqFt)
  const additionalPrice = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const totalPrice      = basePrice + additionalPrice

  const addCharge    = () => setCharges([...charges, { chargeType: 'Parking', amount: 0 }])
  const removeCharge = (i: number) => setCharges(charges.filter((_, x) => x !== i))
  const editCharge   = (i: number, patch: Partial<(typeof charges)[number]>) =>
    setCharges(charges.map((c, x) => (x === i ? { ...c, ...patch } : c)))

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      // basePrice and totalPrice are deliberately not sent — the server computes both.
      const payload = {
        ...d,
        basePriceOverride: overriding ? d.basePriceOverride : null,
        charges: charges.filter(c => Number(c.amount) > 0),
      }
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
          <Field label="Area (sqft)" required error={errors.areaSqFt?.message}>
            <Input type="number" {...register('areaSqFt')} invalid={!!errors.areaSqFt} placeholder="1200" />
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
        {/* Base price is computed from the rate card rather than typed, so identical flats cannot
            drift apart and a repricing is one rate-card row instead of every unit. */}
        <div className="space-y-2 border border-border-default rounded-lg p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-content">Base Price</p>
            <label className="flex items-center gap-1.5 text-xs text-content-muted">
              <input type="checkbox" checked={overriding} onChange={e => setOverriding(e.target.checked)} />
              Override
            </label>
          </div>

          {overriding ? (
            <>
              <Input type="number" {...register('basePriceOverride')} placeholder="5000000" />
              <p className="text-xs text-warning">
                Negotiated price — recorded as an override so it can be reviewed against the rate card.
              </p>
            </>
          ) : !selectedFloor ? (
            <p className="text-xs text-content-muted">Select a floor to look up the rate.</p>
          ) : rateError || !rate ? (
            <p className="text-xs text-danger">
              No rate card applies to this unit. Publish a rate per sqft for the project, block or
              floor first — or tick Override to enter a negotiated price.
            </p>
          ) : (
            <>
              <p className="text-lg font-bold text-content tabular-nums">{fmt(basePrice)}</p>
              <p className="text-xs text-content-muted">
                {areaSqFt.toLocaleString('en-BD')} sqft × {fmt(rate.ratePerSqFt)}/sqft — {rate.scope}
              </p>
            </>
          )}
        </div>

        {/* Named lines instead of one opaque "additional price" box, so it is visible what a
            buyer was actually charged for — and so discounts can be kept off these. */}
        <div className="space-y-2 border border-border-default rounded-lg p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-content">Additional Charges</p>
            <button type="button" onClick={addCharge} className="text-xs font-medium text-primary hover:underline">
              + Add charge
            </button>
          </div>
          {charges.length === 0 ? (
            <p className="text-xs text-content-muted">No extra charges.</p>
          ) : charges.map((c, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <Select value={c.chargeType} onChange={e => editCharge(i, { chargeType: e.target.value })}>
                  {CHARGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div className="col-span-4">
                <Input placeholder="Note (optional)" value={c.description ?? ''}
                  onChange={e => editCharge(i, { description: e.target.value })} />
              </div>
              <div className="col-span-3">
                <Input type="number" placeholder="0" value={c.amount}
                  onChange={e => editCharge(i, { amount: Number(e.target.value) })} />
              </div>
              <button type="button" onClick={() => removeCharge(i)}
                className="col-span-1 text-xs text-danger hover:underline" aria-label="Remove charge">✕</button>
            </div>
          ))}
          {additionalPrice > 0 && (
            <p className="text-xs text-content-muted text-right">Charges total {fmt(additionalPrice)}</p>
          )}
        </div>

        {totalPrice > 0 && (
          <div className="bg-surface-muted rounded-lg px-4 py-2 flex justify-between items-center text-sm">
            <span className="text-content-muted">Total Price</span>
            <span className="font-bold text-content">{fmt(totalPrice)}</span>
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

interface SalesRate {
  id: number; projectId: number; projectName: string
  blockId?: number; blockName?: string; floorId?: number; floorName?: string
  unitType?: string; scope: string; ratePerSqFt: number
  effectiveFrom: string; effectiveTo?: string; isActive: boolean; isCurrent: boolean
  notes?: string
}

/**
 * Rate card management. Lives beside the units it prices rather than on its own page: the two are
 * the same decision, and a rate is only meaningful in terms of the units it applies to.
 */
function RateCardModal({ projects, blocks, floors, onClose }: {
  projects: Project[]; blocks: Block[]; floors: Floor[]; onClose: () => void
}) {
  const qc = useQueryClient()
  const [projectId, setProjectId] = useState('')
  const [blockId,   setBlockId]   = useState('')
  const [floorId,   setFloorId]   = useState('')
  const [unitType,  setUnitType]  = useState('')
  const [rate,      setRate]      = useState('')
  const [from,      setFrom]      = useState(new Date().toISOString().slice(0, 10))
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState('')

  const { data: rates = [], refetch } = useApiData<SalesRate[]>({
    url: '/sales-rates', queryKey: ['sales-rates'],
  })

  const eligibleBlocks = blocks.filter(b => b.projectId === Number(projectId))
  const eligibleFloors = floors.filter(f => f.blockId === Number(blockId))
    .sort((a, b) => a.floorNumber - b.floorNumber)

  const publish = async () => {
    setSaving(true); setErr('')
    try {
      await api.post('/sales-rates', {
        projectId: Number(projectId),
        blockId:   blockId ? Number(blockId) : null,
        floorId:   floorId ? Number(floorId) : null,
        unitType:  unitType || null,
        ratePerSqFt: Number(rate),
        effectiveFrom: from,
      })
      setRate('')
      await refetch()
      // A new card changes what units price at, so any open preview must be re-fetched.
      qc.invalidateQueries({ queryKey: ['resolve-rate'] })
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Could not publish the rate')
    } finally { setSaving(false) }
  }

  const retire = async (id: number) => {
    await api.delete(`/sales-rates/${id}`)
    await refetch()
    qc.invalidateQueries({ queryKey: ['resolve-rate'] })
  }

  return (
    <Modal open onClose={onClose} title="Selling Rate Cards" size="lg">
      <div className="space-y-4">
        <p className="text-xs text-content-muted">
          Unit base prices are computed as area × rate. The most specific card wins — a floor or
          unit-type rate overrides the block rate, which overrides the project rate. Publishing a
          new rate closes the previous one, so past prices stay explainable.
        </p>

        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Project" required>
            <Select value={projectId} onChange={e => { setProjectId(e.target.value); setBlockId(''); setFloorId('') }}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
            </Select>
          </Field>
          <Field label="Block (optional)">
            <Select value={blockId} onChange={e => { setBlockId(e.target.value); setFloorId('') }} disabled={!projectId}>
              <option value="">Whole project</option>
              {eligibleBlocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Floor (optional)">
            <Select value={floorId} onChange={e => setFloorId(e.target.value)} disabled={!blockId}>
              <option value="">Whole block</option>
              {eligibleFloors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Unit type (optional)">
            <Input value={unitType} onChange={e => setUnitType(e.target.value)} placeholder="All types" />
          </Field>
          <Field label="Rate per sqft (৳)" required>
            <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="8500" />
          </Field>
          <Field label="Effective from" required>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={publish} disabled={saving || !projectId || !rate}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Publishing…' : 'Publish rate'}
          </button>
        </div>

        <div className="border-t border-border-default pt-3">
          {rates.length === 0 ? (
            <p className="text-sm text-content-muted text-center py-6">No rate cards published yet.</p>
          ) : (
            <Table
              minWidth={620}
              head={<><TH>Project</TH><TH>Scope</TH><TH num>Rate/sqft</TH><TH>From</TH><TH>To</TH><TH /></>}
            >
              {rates.map(r => (
                <TR key={r.id}>
                  <TD className="text-xs text-content-muted">{r.projectName}</TD>
                  <TD className="text-xs text-content">
                    {r.floorName ?? r.blockName ?? 'Whole project'}
                    {r.unitType && <span className="text-content-muted"> · {r.unitType}</span>}
                  </TD>
                  <TD num className="font-semibold text-content">{fmt(r.ratePerSqFt)}</TD>
                  <TD className="text-xs text-content-muted">{r.effectiveFrom}</TD>
                  <TD className="text-xs text-content-muted">{r.effectiveTo ?? 'open'}</TD>
                  <TD>
                    {r.isCurrent
                      ? <button onClick={() => retire(r.id)} className="text-xs text-danger hover:underline">Retire</button>
                      : <Badge tone="neutral">{r.isActive ? 'Scheduled' : 'Retired'}</Badge>}
                  </TD>
                </TR>
              ))}
            </Table>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function UnitsPage() {
  const qc = useQueryClient()
  const [search,    setSearch]    = useState('')
  const [projectId, setProject]   = useState('')
  const [status,    setStatus]    = useState('')
  const [modal,     setModal]     = useState<'add' | 'edit' | null>(null)
  const [rateCards, setRateCards] = useState(false)
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
          <div className="flex items-center gap-2">
            <button onClick={() => setRateCards(true)}
              className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted font-medium text-content-muted">
              Rate Cards
            </button>
            <PermissionGate module="UNITS" action="create">
              <button onClick={() => setModal('add')}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Unit
              </button>
            </PermissionGate>
          </div>
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
            <TH num>Area (sqft)</TH><TH num>Rate/sqft</TH><TH num>Total Price</TH>
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
              <TD num className="text-content-muted text-xs">
                {u.ratePerSqFt ? fmt(u.ratePerSqFt) : '—'}
                {/* An overridden price is the auditable exception, so it says so. */}
                {u.isPriceOverridden && <span className="ml-1 text-warning">override</span>}
              </TD>
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
      {rateCards && (
        <RateCardModal projects={projects} blocks={blocks} floors={floors}
          onClose={() => setRateCards(false)} />
      )}
    </div>
  )
}
