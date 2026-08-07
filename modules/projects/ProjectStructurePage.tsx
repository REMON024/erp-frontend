'use client'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, ChevronDown, Plus, Trash2, Layers, Tag, Copy, LayoutTemplate } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Input, Field, Label } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { AreaBreakdownFields } from '@/components/ui/AreaBreakdownFields'
import { useApiData } from '@/hooks/useApiData'
import api from '@/lib/api'
import type { NodeLevel } from './NodeLevelsPage'
import type { ProjectUnit } from './ProjectUnitsPage'

/**
 * The project structure tree — one page replacing the separate Blocks, Floors and Units screens.
 *
 * Those three existed only because the hierarchy was three tables. Now that a level is a row in a
 * master, a tree with a detail pane is the shape that actually matches the data: it can show a
 * project five levels deep or two, and it can create twelve floors in one action instead of twelve
 * form submissions.
 */

interface Project { id: number; projectName: string; projectCode: string }

export interface ProjectNode {
  id: number
  parentId: number | null
  projectId: number | null
  rootProjectId: number | null
  path: string
  depth: number
  levelId: number
  levelCode: string
  levelName: string
  isAreaBearing: boolean
  code: string | null
  name: string
  sortOrder: number
  projectUnitId: number | null
  projectUnitCode: string | null
  projectUnitSymbol: string | null
  quantity: number | null
  areaSqFt: number | null
  commonAreaSqFt: number | null
  serviceAreaSqFt: number | null
  netAreaSqFt: number | null
  isSellable: boolean
  isSellableInherited: boolean
  unitNo: string | null
  unitType: string | null
  facing: string | null
  status: string
  isTemplate: boolean
  childCount: number
  breadcrumb: string
}

interface TreeNode { node: ProjectNode; children: TreeNode[] }

const STATUSES = ['Available', 'Booked', 'Sold', 'Cancelled']

// ── Detail form ──────────────────────────────────────────────────────────────
const schema = z.object({
  name:            z.string().min(1, 'Required').max(120),
  levelId:         z.coerce.number().min(1, 'Required'),
  code:            z.string().max(50).optional(),
  sortOrder:       z.coerce.number().min(0),
  projectUnitId:   z.string().optional(),
  quantity:        z.string().optional(),
  areaSqFt:        z.string().optional(),
  commonAreaSqFt:  z.string().optional(),
  serviceAreaSqFt: z.string().optional(),
  unitNo:          z.string().max(40).optional(),
  unitType:        z.string().max(40).optional(),
  facing:          z.string().max(40).optional(),
  status:          z.string().optional(),
}).refine(
  // Mirrors the server rule: a quantity nobody can interpret is worse than no quantity, and the
  // pricing feature multiplies exactly this pair.
  d => !d.quantity?.trim() || !!d.projectUnitId,
  { message: 'Pick the unit the quantity is measured in', path: ['projectUnitId'] },
).refine(
  d => {
    const total = Number(d.areaSqFt || 0)
    if (!d.areaSqFt?.trim()) return true
    return Number(d.commonAreaSqFt || 0) + Number(d.serviceAreaSqFt || 0) <= total
  },
  { message: 'Common + service area cannot exceed the total area.', path: ['areaSqFt'] },
)
type Form = z.infer<typeof schema>

const num = (v?: string) => (v?.trim() ? Number(v) : null)
const str = (v?: string) => (v?.trim() ? v.trim() : null)

function NodeDetail({ node, levels, units, onSaved }: {
  node: ProjectNode; levels: NodeLevel[]; units: ProjectUnit[]; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
  })

  // The tree owns selection, so the form has to follow it — without this, clicking a sibling would
  // leave the previous node's values in the inputs.
  useEffect(() => {
    reset({
      name: node.name,
      levelId: node.levelId,
      code: node.code ?? '',
      sortOrder: node.sortOrder,
      projectUnitId: node.projectUnitId ? String(node.projectUnitId) : '',
      quantity: node.quantity != null ? String(node.quantity) : '',
      areaSqFt: node.areaSqFt != null ? String(node.areaSqFt) : '',
      commonAreaSqFt: node.commonAreaSqFt != null ? String(node.commonAreaSqFt) : '',
      serviceAreaSqFt: node.serviceAreaSqFt != null ? String(node.serviceAreaSqFt) : '',
      unitNo: node.unitNo ?? '',
      unitType: node.unitType ?? '',
      facing: node.facing ?? '',
      status: node.status,
    })
    setErr('')
  }, [node, reset])

  const level = levels.find(l => l.id === Number(watch('levelId'))) ?? levels.find(l => l.id === node.levelId)

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      await api.put(`/project-nodes/${node.id}`, {
        name: d.name,
        levelId: d.levelId,
        code: str(d.code),
        sortOrder: d.sortOrder,
        projectUnitId: d.projectUnitId ? Number(d.projectUnitId) : null,
        quantity: num(d.quantity),
        areaSqFt: num(d.areaSqFt),
        commonAreaSqFt: num(d.commonAreaSqFt),
        serviceAreaSqFt: num(d.serviceAreaSqFt),
        unitNo: str(d.unitNo),
        unitType: str(d.unitType),
        facing: str(d.facing),
        status: d.status || null,
      })
      onSaved()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  const isRoot = node.parentId === null

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      <div>
        <p className="text-xs text-content-muted">{node.breadcrumb}</p>
        <div className="flex items-center gap-2 mt-1">
          <h3 className="text-base font-semibold text-content">{node.name}</h3>
          {node.isSellable && (
            <Badge tone={node.isSellableInherited ? 'info' : 'success'}>
              {node.isSellableInherited ? 'Contains sellable' : 'Sellable'}
            </Badge>
          )}
          {!node.isAreaBearing && <Badge tone="warning">No area</Badge>}
        </div>
      </div>

      {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

      <Field label="Name" required error={errors.name?.message}>
        <Input {...register('name')} invalid={!!errors.name} maxLength={120} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Level" required error={errors.levelId?.message}>
          <Select {...register('levelId')} disabled={isRoot}>
            {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </Field>
        <Field label="Sort order" error={errors.sortOrder?.message}>
          <Input type="number" min={0} {...register('sortOrder')} invalid={!!errors.sortOrder} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Unit of measure" error={errors.projectUnitId?.message}>
          <Select {...register('projectUnitId')}>
            <option value="">None</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}{u.symbol ? ` (${u.symbol})` : ''}</option>)}
          </Select>
        </Field>
        <Field label="Quantity" error={errors.quantity?.message}>
          <Input type="number" step="0.0001" min={0} {...register('quantity')} />
        </Field>
      </div>

      {level?.isAreaBearing !== false && (
        <AreaBreakdownFields
          register={register}
          areaSqFt={watch('areaSqFt')}
          commonAreaSqFt={watch('commonAreaSqFt')}
          serviceAreaSqFt={watch('serviceAreaSqFt')}
        />
      )}
      {errors.areaSqFt && <p className="text-xs text-danger">{errors.areaSqFt.message}</p>}

      {level?.isSellableLevel && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Unit no" error={errors.unitNo?.message}>
            <Input {...register('unitNo')} maxLength={40} />
          </Field>
          <Field label="Status">
            <Select {...register('status')}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Type" error={errors.unitType?.message}>
            <Input {...register('unitType')} placeholder="Flat" maxLength={40} />
          </Field>
          <Field label="Facing" error={errors.facing?.message}>
            <Input {...register('facing')} placeholder="South" maxLength={40} />
          </Field>
        </div>
      )}

      <SellableToggle node={node} onChanged={onSaved} />

      <div className="flex justify-end pt-2 border-t border-border-default">
        <PermissionGate module="PROJECT_STRUCTURE" action="edit">
          <Button type="submit" loading={saving}>Save</Button>
        </PermissionGate>
      </div>
    </form>
  )
}

// ── Sellable cascade ─────────────────────────────────────────────────────────
interface SellableChange { nodeId: number; name: string; isSellable: boolean; reason: string }
interface SellableCascadeResult {
  nodeId: number; nodeName: string; sellable: boolean
  affectedCount: number; nowSellable: number; noLongerSellable: number
  preview: boolean
  changes: SellableChange[]
}

/**
 * Marking something sellable is never a one-row edit — it runs down the subtree and up the
 * ancestors. So the toggle asks the server what it *would* do, shows that, and only then commits.
 *
 * The preview and the commit are the same endpoint with a flag, which is what guarantees the
 * number in the dialog is the number that happens. It is deliberately not a local estimate from
 * the loaded tree: the pane only ever holds one branch, and a count computed from a partial tree
 * would understate the change.
 */
function SellableToggle({ node, onChanged }: { node: ProjectNode; onChanged: () => void }) {
  const [plan, setPlan] = useState<SellableCascadeResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  // Only an authored node can be un-ticked. A node that merely contains something sellable has
  // nothing of its own to clear — clearing it would silently wipe the descendants that made it
  // true, which is a different, much larger action than the checkbox suggests.
  const authored = node.isSellable && !node.isSellableInherited
  const next     = !authored

  const preview = async () => {
    setBusy(true); setErr('')
    try {
      const { data } = await api.post<{ data: SellableCascadeResult }>(
        `/project-nodes/${node.id}/sellable`, { sellable: next, preview: true })
      setPlan(data.data ?? (data as any))
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Could not work out what this would change.')
    } finally { setBusy(false) }
  }

  const commit = async () => {
    setBusy(true); setErr('')
    try {
      await api.post(`/project-nodes/${node.id}/sellable`, { sellable: next, preview: false })
      setPlan(null)
      onChanged()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="rounded-lg border border-border-default p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-content">Sellable</p>
          <p className="text-xs text-content-muted mt-0.5">
            {authored
              ? 'Marked for sale in its own right. Clearing it also clears everything beneath it.'
              : node.isSellable
                ? 'Sellable because something beneath it is. Mark it directly to sell it as a whole.'
                : 'Marking this also marks everything beneath it, and flags the levels above as containing something for sale.'}
          </p>
        </div>
        <PermissionGate module="PROJECT_STRUCTURE" action="edit">
          {/* type="button": this sits inside the detail form and must never submit it. */}
          <Button type="button" variant="secondary" onClick={preview} loading={busy} disabled={busy}>
            {authored ? 'Clear' : 'Mark sellable'}
          </Button>
        </PermissionGate>
      </div>

      {err && <p className="text-xs text-danger mt-2">{err}</p>}

      {plan && (
        <Modal open onClose={() => setPlan(null)} title={next ? 'Mark as sellable' : 'Clear sellable'} size="sm">
          {plan.affectedCount === 0 ? (
            <p className="text-sm text-content">
              Nothing would change — <strong>{node.name}</strong> is already {next ? 'sellable' : 'not sellable'}.
            </p>
          ) : (
            <>
              <p className="text-sm text-content">
                This updates <strong>{plan.affectedCount}</strong>{' '}
                {plan.affectedCount === 1 ? 'node' : 'nodes'}
                {plan.nowSellable > 0 && plan.noLongerSellable > 0
                  ? ` — ${plan.nowSellable} become sellable, ${plan.noLongerSellable} stop being sellable.`
                  : plan.nowSellable > 0
                    ? ` — all of them become sellable.`
                    : ` — all of them stop being sellable.`}
              </p>
              <ul className="mt-3 max-h-56 overflow-auto rounded-lg border border-border-default divide-y divide-border-default">
                {plan.changes.map(c => (
                  <li key={c.nodeId} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                    <span className="truncate text-content">{c.name}</span>
                    <span className="text-xs text-content-muted shrink-0">{c.reason}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="secondary" onClick={() => setPlan(null)}>Cancel</Button>
            {plan.affectedCount > 0 && (
              <Button type="button" onClick={commit} loading={busy}>Confirm</Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Templates ────────────────────────────────────────────────────────────────
/**
 * Copies a live subtree into the template library.
 *
 * A template is an ordinary node tree with no project behind it, so this is a plain clone — which
 * is why the dialog can promise exactly what will be copied without a preview call.
 */
function SaveTemplateModal({ node, onClose, onSaved }: {
  node: ProjectNode; onClose: () => void; onSaved: () => void
}) {
  const [name, setName] = useState(node.name)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    setSaving(true); setErr('')
    try {
      await api.post(`/project-nodes/${node.id}/save-as-template`, { name: name.trim() || null })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Save as template" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-content-muted">
          Copies <strong className="text-content">{node.name}</strong> and everything beneath it into
          the template library, so the same layout can be applied to another project.
        </p>
        <Field label="Template name" required>
          <Input value={name} onChange={e => setName(e.target.value)} maxLength={120} autoFocus />
        </Field>
        <p className="text-xs text-content-muted">
          Sold and booked statuses are not carried across — a template always starts available.
        </p>
        {err && <p className="text-xs text-danger">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!name.trim()}>Save template</Button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Clones a library template beneath the selected node.
 *
 * A whole-project template ("Std Tower") applies its branches rather than its own root, because a
 * project cannot have two roots. The server decides which of the two applies, from the level rules
 * — the dialog just names what will happen.
 */
function ApplyTemplateModal({ parent, onClose, onSaved }: {
  parent: ProjectNode; onClose: () => void; onSaved: () => void
}) {
  const [templateId, setTemplateId] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Template roots only: the library lists whole trees, not their innards.
  const { data: templates = [], isLoading } = useApiData<ProjectNode[]>({
    url: '/project-nodes',
    params: { templates: true },
    queryKey: ['project-nodes', 'templates'],
  })
  const roots = templates.filter(t => t.parentId === null)
  const chosen = roots.find(t => String(t.id) === templateId)

  const submit = async () => {
    setSaving(true); setErr('')
    try {
      await api.post('/project-nodes/apply-template', {
        templateNodeId: Number(templateId),
        parentId: parent.id,
        name: name.trim() || null,
      })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Could not apply the template.')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Apply template" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-content-muted">
          Adds a copy of a saved layout under <strong className="text-content">{parent.name}</strong>.
        </p>
        <Field label="Template" required>
          <Select value={templateId} onChange={e => { setTemplateId(e.target.value); setName('') }}>
            <option value="">{isLoading ? 'Loading…' : 'Select a template'}</option>
            {roots.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.levelName})</option>
            ))}
          </Select>
        </Field>
        {roots.length === 0 && !isLoading && (
          <p className="text-xs text-content-muted">
            No templates yet — save a block or a whole project as one first.
          </p>
        )}
        {chosen && (
          <Field label="Name">
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder={chosen.name} maxLength={120} />
          </Field>
        )}
        {err && <p className="text-xs text-danger">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!templateId}>Apply</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Add child ────────────────────────────────────────────────────────────────
function AddChildModal({ parent, levels, units, onClose, onSaved }: {
  parent: ProjectNode; levels: NodeLevel[]; units: ProjectUnit[]
  onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [name, setName] = useState('')
  const [levelId, setLevelId] = useState('')
  const [unitId, setUnitId] = useState('')

  // Only levels that declare this parent are offered — the same rule the server enforces, so the
  // form cannot suggest a shape the save would reject.
  const eligible = useMemo(
    () => levels.filter(l =>
      !l.allowedParentCodes ||
      l.allowedParentCodes.split(',').map(c => c.trim().toUpperCase()).includes(parent.levelCode.toUpperCase())),
    [levels, parent.levelCode],
  )

  const submit = async () => {
    setSaving(true); setErr('')
    try {
      await api.post('/project-nodes', {
        name, levelId: Number(levelId), parentId: parent.id,
        projectUnitId: unitId ? Number(unitId) : null,
      })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={`Add under ${parent.name}`} size="sm">
      <div className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        {eligible.length === 0 ? (
          <p className="text-sm text-content-muted">
            No level may sit under a {parent.levelName}. Add one on the Structure Levels page, or
            widen an existing level&apos;s allowed parents.
          </p>
        ) : (
          <>
            <Field label="Level" required>
              <Select value={levelId} onChange={e => setLevelId(e.target.value)}>
                <option value="">Select a level</option>
                {eligible.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>
            <Field label="Name" required>
              <Input value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="Block A" />
            </Field>
            <Field label="Unit of measure">
              <Select value={unitId} onChange={e => setUnitId(e.target.value)}>
                <option value="">None</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </Field>
          </>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          {eligible.length > 0 && (
            <Button onClick={submit} loading={saving} disabled={!name.trim() || !levelId}>Add</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Bulk generate ────────────────────────────────────────────────────────────
/**
 * Creating twelve floors used to be twelve form submissions. The preview is what makes this
 * trustworthy — the server returns the exact names it would write, before it writes any.
 */
function BulkGenerateModal({ parent, levels, units, onClose, onSaved }: {
  parent: ProjectNode; levels: NodeLevel[]; units: ProjectUnit[]
  onClose: () => void; onSaved: () => void
}) {
  const [levelId, setLevelId] = useState('')
  const [count, setCount] = useState(12)
  const [pattern, setPattern] = useState('Level {n}')
  const [startAt, setStartAt] = useState(1)
  const [unitId, setUnitId] = useState('')
  const [qty, setQty] = useState('')
  const [area, setArea] = useState('')
  const [names, setNames] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const eligible = useMemo(
    () => levels.filter(l =>
      !l.allowedParentCodes ||
      l.allowedParentCodes.split(',').map(c => c.trim().toUpperCase()).includes(parent.levelCode.toUpperCase())),
    [levels, parent.levelCode],
  )

  const body = () => ({
    parentId: parent.id,
    levelId: Number(levelId),
    count,
    namePattern: pattern,
    startAt,
    projectUnitId: unitId ? Number(unitId) : null,
    quantityEach: qty.trim() ? Number(qty) : null,
    areaSqFtEach: area.trim() ? Number(area) : null,
  })

  const run = async (preview: boolean) => {
    setBusy(true); setErr('')
    try {
      const res = await api.post('/project-nodes/bulk-generate', { ...body(), preview })
      const data = res.data?.data ?? res.data
      if (preview) setNames(data.names)
      else { onSaved(); onClose() }
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed')
      setNames(null)
    } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={`Generate under ${parent.name}`} size="md">
      <div className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Level" required>
            <Select value={levelId} onChange={e => { setLevelId(e.target.value); setNames(null) }}>
              <option value="">Select a level</option>
              {eligible.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
          <Field label="How many" required>
            <Input type="number" min={1} max={500} value={count}
              onChange={e => { setCount(Number(e.target.value)); setNames(null) }} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Naming pattern" required>
            <Input value={pattern} onChange={e => { setPattern(e.target.value); setNames(null) }}
              className="font-mono" placeholder="A-{n:02}" />
          </Field>
          <Field label="Start at">
            <Input type="number" value={startAt}
              onChange={e => { setStartAt(Number(e.target.value)); setNames(null) }} />
          </Field>
        </div>
        <p className="-mt-3 text-xs text-content-muted">
          <code className="font-mono">{'{n}'}</code> is the index,
          <code className="font-mono"> {'{n:00}'}</code> pads it to two digits, and
          <code className="font-mono"> {'{parent}'}</code> is this node&apos;s name.
        </p>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Unit of measure">
            <Select value={unitId} onChange={e => setUnitId(e.target.value)}>
              <option value="">None</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
          <Field label="Quantity each">
            <Input type="number" step="0.0001" min={0} value={qty} onChange={e => setQty(e.target.value)} />
          </Field>
          <Field label="Area each (sqft)">
            <Input type="number" step="0.01" min={0} value={area} onChange={e => setArea(e.target.value)} />
          </Field>
        </div>

        {names && (
          <div className="rounded-lg border border-border-default bg-surface-muted p-3">
            <p className="text-xs font-medium text-content mb-2">
              {names.length} node{names.length === 1 ? '' : 's'} will be created
            </p>
            <p className="text-xs text-content-muted font-mono break-words">
              {names.slice(0, 12).join(', ')}{names.length > 12 ? `, … ${names[names.length - 1]}` : ''}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="outline" onClick={() => run(true)}
            loading={busy && !names} disabled={!levelId || !pattern.trim()}>Preview</Button>
          <Button onClick={() => run(false)} loading={busy} disabled={!names}>
            Create {names ? names.length : ''}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Tree ─────────────────────────────────────────────────────────────────────
function TreeRow({ item, depth, selectedId, expanded, onToggle, onSelect }: {
  item: TreeNode; depth: number; selectedId: number | null
  expanded: Set<number>; onToggle: (id: number) => void; onSelect: (n: ProjectNode) => void
}) {
  const { node, children } = item
  const isOpen = expanded.has(node.id)
  const hasChildren = children.length > 0

  return (
    <>
      <div
        role="treeitem"
        aria-selected={selectedId === node.id}
        aria-expanded={hasChildren ? isOpen : undefined}
        onClick={() => onSelect(node)}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer text-sm ${
          selectedId === node.id ? 'bg-primary/10 text-primary' : 'hover:bg-surface-muted text-content'
        }`}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {hasChildren ? (
          <button type="button" aria-label={isOpen ? 'Collapse' : 'Expand'}
            onClick={e => { e.stopPropagation(); onToggle(node.id) }}
            className="p-0.5 text-content-muted hover:text-content shrink-0">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : <span className="w-[18px] shrink-0" />}

        <span className="truncate">{node.name}</span>

        <span className="ml-auto flex items-center gap-1.5 shrink-0">
          {node.quantity != null && node.projectUnitCode !== 'SQFT' && (
            <span className="text-[11px] text-content-muted">
              {node.quantity.toLocaleString()} {node.projectUnitSymbol ?? ''}
            </span>
          )}
          {node.isSellable && (
            <span className={`text-[10px] font-bold px-1 rounded ${
              node.isSellableInherited ? 'bg-info/10 text-info' : 'bg-success/10 text-success'}`}>S</span>
          )}
          {hasChildren && <span className="text-[11px] text-content-muted/60">{children.length}</span>}
        </span>
      </div>

      {isOpen && children.map(c => (
        <TreeRow key={c.node.id} item={c} depth={depth + 1} selectedId={selectedId}
          expanded={expanded} onToggle={onToggle} onSelect={onSelect} />
      ))}
    </>
  )
}

export function ProjectStructurePage() {
  const qc = useQueryClient()
  const [projectId, setProjectId] = useState('')
  const [selected, setSelected] = useState<ProjectNode | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [modal, setModal] = useState<'add' | 'bulk' | 'save-template' | 'apply-template' | null>(null)

  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data: levels = [] }   = useApiData<NodeLevel[]>({
    url: '/node-levels', params: { activeOnly: true }, queryKey: ['node-levels', 'active'],
  })
  const { data: units = [] }    = useApiData<ProjectUnit[]>({
    url: '/project-units', params: { activeOnly: true }, queryKey: ['project-units', 'active'],
  })

  const { data: tree = [], isLoading, error, refetch } = useApiData<TreeNode[]>({
    url: '/project-nodes/tree',
    params: { projectId: projectId || undefined },
    queryKey: ['project-tree', projectId],
    enabled: !!projectId,
  })

  // Default to the first project so the page is never a blank slate on arrival.
  useEffect(() => {
    if (!projectId && projects.length > 0) setProjectId(String(projects[0].id))
  }, [projects, projectId])

  // Roots and their immediate children open by default: deep trees are unreadable fully expanded,
  // and fully collapsed hides the fact that anything is there at all.
  useEffect(() => {
    if (tree.length === 0) return
    setExpanded(prev => {
      if (prev.size > 0) return prev
      const next = new Set<number>()
      tree.forEach(r => { next.add(r.node.id); r.children.forEach(c => next.add(c.node.id)) })
      return next
    })
  }, [tree])

  // Selection has to survive a refetch, or saving a node deselects it.
  useEffect(() => {
    if (!selected) return
    const find = (items: TreeNode[]): ProjectNode | null => {
      for (const i of items) {
        if (i.node.id === selected.id) return i.node
        const hit = find(i.children)
        if (hit) return hit
      }
      return null
    }
    const fresh = find(tree)
    if (fresh && fresh !== selected) setSelected(fresh)
    if (!fresh && tree.length > 0) setSelected(null)
  }, [tree, selected])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['project-tree'] })

  const toggle = (id: number) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const remove = async (node: ProjectNode) => {
    if (!window.confirm(`Delete "${node.name}"?`)) return
    try {
      await api.delete(`/project-nodes/${node.id}`)
      setSelected(null)
      invalidate()
    } catch (e: any) {
      window.alert(e.response?.data?.errors?.[0] ?? 'Delete failed')
    }
  }

  const nodeCount = useMemo(() => {
    const walk = (items: TreeNode[]): number =>
      items.reduce((n, i) => n + 1 + walk(i.children), 0)
    return walk(tree)
  }, [tree])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Structure"
        subtitle="Blocks, floors, units — and any level this project actually needs"
        action={
          <div className="flex items-center gap-2">
            <a href="/projects/levels"
              className="text-xs text-content-muted hover:text-primary flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Levels
            </a>
            <a href="/projects/units-of-measure"
              className="text-xs text-content-muted hover:text-primary flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Units
            </a>
            <Select value={projectId} onChange={e => { setProjectId(e.target.value); setSelected(null); setExpanded(new Set()) }}
              className="min-w-[220px]">
              <option value="">Select project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>
              ))}
            </Select>
          </div>
        }
      />

      <DataState
        loading={!!projectId && isLoading}
        error={error ? 'Failed to load the structure.' : null}
        onRetry={refetch}
        empty={!!projectId && !isLoading && tree.length === 0}
        emptyMessage="This project has no structure yet."
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,380px)_1fr] gap-6 items-start">
          {/* Tree */}
          <div className="rounded-xl border border-border-default bg-surface p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs font-semibold text-content-muted uppercase tracking-wide">
                Structure
              </span>
              <span className="text-xs text-content-muted">{nodeCount} node{nodeCount === 1 ? '' : 's'}</span>
            </div>
            <div role="tree" className="max-h-[65vh] overflow-y-auto">
              {tree.map(r => (
                <TreeRow key={r.node.id} item={r} depth={0} selectedId={selected?.id ?? null}
                  expanded={expanded} onToggle={toggle} onSelect={setSelected} />
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="rounded-xl border border-border-default bg-surface p-5 min-h-[300px]">
            {selected ? (
              <div className="space-y-5">
                <NodeDetail node={selected} levels={levels} units={units} onSaved={invalidate} />

                <div className="flex flex-wrap gap-2 pt-3 border-t border-border-default">
                  <PermissionGate module="PROJECT_STRUCTURE" action="create">
                    <Button variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => setModal('add')}>Add child</Button>
                    <Button variant="outline" onClick={() => setModal('bulk')}>Generate children…</Button>
                  </PermissionGate>
                  <PermissionGate module="PROJECT_STRUCTURE" action="create">
                    <Button variant="outline" leftIcon={<Copy className="w-3.5 h-3.5" />}
                      onClick={() => setModal('save-template')}>Save as template</Button>
                    <Button variant="outline" leftIcon={<LayoutTemplate className="w-3.5 h-3.5" />}
                      onClick={() => setModal('apply-template')}>Apply template…</Button>
                  </PermissionGate>
                  {selected.parentId !== null && (
                    <PermissionGate module="PROJECT_STRUCTURE" action="delete">
                      <Button variant="outline" leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => remove(selected)}>Delete</Button>
                    </PermissionGate>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-content-muted">
                Select a node to edit it, or add a child beneath it.
              </p>
            )}
          </div>
        </div>
      </DataState>

      {modal === 'add' && selected && (
        <AddChildModal parent={selected} levels={levels} units={units}
          onClose={() => setModal(null)} onSaved={invalidate} />
      )}
      {modal === 'bulk' && selected && (
        <BulkGenerateModal parent={selected} levels={levels} units={units}
          onClose={() => setModal(null)} onSaved={invalidate} />
      )}
      {modal === 'save-template' && selected && (
        <SaveTemplateModal node={selected} onClose={() => setModal(null)} onSaved={invalidate} />
      )}
      {modal === 'apply-template' && selected && (
        <ApplyTemplateModal parent={selected} onClose={() => setModal(null)} onSaved={invalidate} />
      )}
    </div>
  )
}
