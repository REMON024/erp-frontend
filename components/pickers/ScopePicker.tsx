'use client'
import { Select } from '@/components/ui/Select'
import { useApiData } from '@/hooks/useApiData'

/**
 * Project → Block → Floor → Unit cascade, used wherever something is scoped to a level of the
 * hierarchy (the estimate form, the estimates filter bar, and the budget reports).
 *
 * Lives outside components/ui because it fetches — components/ui is for dumb primitives.
 * The lookup lists reuse the same query keys as the rest of the app, so they come from cache.
 *
 * Descendant resets are handled here: picking a different project clears the block, floor and
 * unit, so a stale child id can never survive a parent change.
 */

export interface ScopeValue {
  projectId: string
  blockId:   string
  floorId:   string
  unitId:    string
}

export const EMPTY_SCOPE: ScopeValue = { projectId: '', blockId: '', floorId: '', unitId: '' }

/** Turns the picker's string state into the numeric payload the API expects. */
export function scopeToPayload(v: ScopeValue) {
  return {
    projectId: Number(v.projectId),
    blockId:   v.blockId ? Number(v.blockId) : undefined,
    floorId:   v.floorId ? Number(v.floorId) : undefined,
    unitId:    v.unitId  ? Number(v.unitId)  : undefined,
  }
}

/** Turns the picker's string state into `?x=` query params, dropping the empties. */
export function scopeToParams(v: ScopeValue) {
  return {
    projectId: v.projectId || undefined,
    blockId:   v.blockId   || undefined,
    floorId:   v.floorId   || undefined,
    unitId:    v.unitId    || undefined,
  }
}

interface Project { id: number; projectName: string; projectCode: string }
interface Block   { id: number; projectId: number; name: string }
interface Floor   { id: number; blockId: number; name: string; floorNumber: number }
interface Unit    { id: number; floorId: number; unitNo: string }

const lbl = 'block text-sm font-medium text-content mb-1'

export function ScopePicker({ value, onChange, mode = 'form', className }: {
  value: ScopeValue
  onChange: (next: ScopeValue) => void
  /** 'form' requires a project and disables each child until its parent is set.
   *  'filter' offers "All …" options and never disables.
   *  'inline' is 'form' semantics with no labels, wrapper or hint — four bare selects for a
   *  table row, where there is no space for the labelled grid. */
  mode?: 'form' | 'filter' | 'inline'
  className?: string
}) {
  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data: blocks = [] }   = useApiData<Block[]>({ url: '/blocks', queryKey: ['blocks-list'] })
  const { data: floors = [] }   = useApiData<Floor[]>({ url: '/floors', queryKey: ['floors-list'] })
  const { data: units = [] }    = useApiData<Unit[]>({ url: '/units', queryKey: ['units-list'] })

  // 'inline' shares every rule with 'form' — required project, cascade disabling, "Whole project"
  // wording — and differs only in what wraps the selects, which is decided at the return below.
  const isForm = mode === 'form' || mode === 'inline'

  // In filter mode an unset parent shows everything, so you can narrow by floor without
  // first picking a block. In form mode the child is disabled until its parent is chosen.
  const eligibleBlocks = value.projectId
    ? blocks.filter(b => b.projectId === Number(value.projectId))
    : (isForm ? [] : blocks)
  const eligibleFloors = value.blockId
    ? floors.filter(f => f.blockId === Number(value.blockId))
    : (isForm ? [] : floors)
  const eligibleUnits = value.floorId
    ? units.filter(u => u.floorId === Number(value.floorId))
    : (isForm ? [] : units)

  const sortedFloors = [...eligibleFloors].sort((a, b) => a.floorNumber - b.floorNumber)

  const set = (patch: Partial<ScopeValue>) => onChange({ ...value, ...patch })

  const selectCls =
    mode === 'inline' ? className
  : mode === 'filter' ? 'min-w-[150px]'
  :                     undefined

  const project = (
    <Select
      className={selectCls}
      value={value.projectId}
      onChange={e => set({ projectId: e.target.value, blockId: '', floorId: '', unitId: '' })}
    >
      <option value="">{isForm ? 'Select project' : 'All Projects'}</option>
      {projects.map(p => (
        <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>
      ))}
    </Select>
  )

  const block = (
    <Select
      className={selectCls}
      value={value.blockId}
      disabled={isForm && !value.projectId}
      onChange={e => set({ blockId: e.target.value, floorId: '', unitId: '' })}
    >
      <option value="">
        {isForm ? (value.projectId ? 'Whole project' : 'Select a project first') : 'All Blocks'}
      </option>
      {eligibleBlocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
    </Select>
  )

  const floor = (
    <Select
      className={selectCls}
      value={value.floorId}
      disabled={isForm && !value.blockId}
      onChange={e => set({ floorId: e.target.value, unitId: '' })}
    >
      <option value="">
        {isForm ? (value.blockId ? 'Whole block' : 'Select a block first') : 'All Floors'}
      </option>
      {sortedFloors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
    </Select>
  )

  const unit = (
    <Select
      className={selectCls}
      value={value.unitId}
      disabled={isForm && !value.floorId}
      onChange={e => set({ unitId: e.target.value })}
    >
      <option value="">
        {isForm ? (value.floorId ? 'Whole floor' : 'Select a floor first') : 'All Units'}
      </option>
      {eligibleUnits.map(u => <option key={u.id} value={u.id}>{u.unitNo}</option>)}
    </Select>
  )

  // Both 'filter' and 'inline' hand back bare selects; the caller owns the layout.
  if (mode !== 'form') return <>{project}{block}{floor}{unit}</>

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className={lbl}>Project <span className="text-danger">*</span></label>
          {project}
        </div>
        <div><label className={lbl}>Block</label>{block}</div>
        <div><label className={lbl}>Floor</label>{floor}</div>
        <div><label className={lbl}>Unit</label>{unit}</div>
      </div>
      <p className="text-xs text-content-muted mt-2">
        Leave a level blank to cover everything below it — pick only a project for a
        project-wide estimate, or drill down to a single unit.
      </p>
    </div>
  )
}
