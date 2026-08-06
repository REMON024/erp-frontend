'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { Plus, Trash2, Edit2, Eye, CheckCircle, XCircle, FileBarChart2, Upload } from 'lucide-react'
import api from '@/lib/api'
import { ResourcePicker, RateSourceChip, type ResolvedRate } from '@/components/pickers/ResourcePicker'
import { CategorySelect } from '@/components/pickers/CategorySelect'
import { ScopePicker, scopeToPayload, scopeToParams, EMPTY_SCOPE, type ScopeValue } from '@/components/pickers/ScopePicker'
import { Input, Field } from '@/components/ui/Input'
import { Table, TH, TR, TD } from '@/components/ui/Table'
import { StatCard } from '@/components/ui/Card'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { AttachmentPanel } from '@/components/pickers/AttachmentPanel'
import { RESOURCE_TYPES, type Resource, type ResourceType } from '@/modules/inventory/ResourceMasterPage'

// ── Types ──────────────────────────────────────────────────────────────────────
type BOQCategory = 'Civil' | 'Structural' | 'Architectural' | 'Electrical' | 'Plumbing' | 'HVAC' | 'Finishing' | 'Miscellaneous'
type EstimateStatus = 'Draft' | 'Approved' | 'Revised' | 'Rejected'

interface Project  { id: number; projectCode: string; projectName: string }
interface Material { id: number; resourceName: string; resourceCode: string; unit: string; category?: string }
interface BOQItem {
  id?: number; resourceId?: number; resourceName?: string; resourceType?: ResourceType
  category: BOQCategory; description: string
  unit: string; quantity: number; unitRate: number
  estimatedAmount: number; actualAmount: number
}
interface CostEstimate {
  id: number; projectId: number; projectName: string; projectCode: string
  title: string; version: number; status: EstimateStatus
  totalEstimated: number; totalActual: number; variance: number
  items: BOQItem[]; createdAt: string
  // Scope covered. All three ids are null for a project-wide estimate.
  blockId?: number; blockName?: string
  floorId?: number; floorName?: string
  unitId?: number;  unitNo?: string
  scopeLevel: 'Project' | 'Block' | 'Floor' | 'Unit'
  scopeLabel: string
}

// Domain tones: the scope level is a hierarchy position, not a status, so statusTone()
// has nothing sensible to say about it. Still a Badge, so no inline pills.
const SCOPE_TONES: Record<CostEstimate['scopeLevel'], BadgeTone> = {
  Project: 'neutral',
  Block:   'info',
  Floor:   'primary',
  Unit:    'success',
}

const BOQ_CATEGORIES: BOQCategory[] = ['Civil', 'Structural', 'Architectural', 'Electrical', 'Plumbing', 'HVAC', 'Finishing', 'Miscellaneous']
const STATUS_TONES: Record<EstimateStatus, BadgeTone> = {
  Draft:    'neutral',
  Approved: 'success',
  Revised:  'warning',
  Rejected: 'danger',
}

function fmt(n: number)  { return `৳${n.toLocaleString('en-BD')}` }
function isoToday()      { return new Date().toISOString().split('T')[0] }

const tinp = 'border border-border-default rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary/40 focus:outline-none w-full'

// ── BOQ line-item editor ───────────────────────────────────────────────────────
/**
 * `resourceCategoryId` narrows the resource picker only — it is never sent, because the chosen
 * resource already carries its category. Not to be confused with `category`, which is this line's
 * BOQ discipline (Civil/Structural/…).
 */
type DraftItem = Omit<BOQItem, 'id' | 'estimatedAmount' | 'actualAmount' | 'resourceName'>
  & { key: string; resourceType: ResourceType; resourceCategoryId?: number }

function newLine(): DraftItem {
  // Default to Material so existing habits are unaffected; the type narrows the resource list.
  return { key: Math.random().toString(36).slice(2), resourceId: undefined, resourceType: 'Material',
           resourceCategoryId: undefined,
           category: 'Civil', description: '', unit: 'LS', quantity: 1, unitRate: 0 }
}

function BOQEditor({ items, onChange }: {
  items: DraftItem[]
  onChange: (items: DraftItem[]) => void
}) {
  // Rate provenance per line, so the user can see why a rate was suggested.
  const [rateInfo, setRateInfo] = useState<Record<string, ResolvedRate>>({})

  const update = (key: string, patch: Partial<DraftItem>) =>
    onChange(items.map(i => i.key === key ? { ...i, ...patch } : i))
  const remove = (key: string) => onChange(items.filter(i => i.key !== key))

  const totalEstimated = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitRate) || 0), 0)

  const clearRate = (key: string) =>
    setRateInfo(prev => { const next = { ...prev }; delete next[key]; return next })

  const handleResourceChange = (key: string, resourceId: number | '', resource?: Resource) => {
    if (resource) {
      // Unit always follows the resource; the rate is handled by onResolved so a
      // rate the user already typed is not clobbered.
      update(key, { resourceId: resource.id, description: resource.resourceName, unit: resource.unit })
    } else {
      update(key, { resourceId: undefined })
      clearRate(key)
    }
  }

  // Changing the type invalidates everything downstream — category, resource, unit, rate.
  const handleTypeChange = (key: string, resourceType: ResourceType) => {
    update(key, {
      resourceType, resourceCategoryId: undefined, resourceId: undefined,
      description: '', unit: '', unitRate: 0,
    })
    clearRate(key)
  }

  const handleCategoryChange = (key: string, categoryId: number | '') => {
    update(key, {
      resourceCategoryId: categoryId || undefined, resourceId: undefined,
      description: '', unit: '', unitRate: 0,
    })
    clearRate(key)
  }

  const handleResolved = (key: string, resolved: ResolvedRate) => {
    setRateInfo(prev => ({ ...prev, [key]: resolved }))
    const line = items.find(i => i.key === key)
    // Prefill only an empty rate — never overwrite a number the user entered.
    if (line && !Number(line.unitRate) && resolved.rate > 0) update(key, { unitRate: resolved.rate })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-sm font-medium text-content">Bill of Quantities</span>
          <span className="ml-2 text-xs text-content-muted">— link each line to a resource (material, equipment, service or labour) to enable budget vs actual tracking</span>
        </div>
        <button type="button" onClick={() => onChange([...items, newLine()])}
          className="text-xs text-primary hover:text-primary font-medium flex items-center gap-1 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Line
        </button>
      </div>
      {/* Hand-rolled rather than <Table>: this is a dense editable grid with fixed column
          widths and an input in every cell — the primitive's row padding fights it. */}
      <div className="border border-border-default rounded-lg overflow-x-auto">
        <table className="w-full min-w-[1120px] text-xs">
          <thead className="bg-surface-muted border-b border-border-default">
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-content-muted w-28">Type <span className="text-primary">*</span></th>
              <th className="px-2 py-2 text-left font-semibold text-content-muted w-40">Resource Category</th>
              <th className="px-2 py-2 text-left font-semibold text-content-muted w-52">Resource <span className="text-primary">*</span></th>
              <th className="px-2 py-2 text-left font-semibold text-content-muted w-32">BOQ Category</th>
              <th className="px-2 py-2 text-left font-semibold text-content-muted">Description</th>
              <th className="px-2 py-2 text-left font-semibold text-content-muted w-16">Unit</th>
              <th className="px-2 py-2 text-left font-semibold text-content-muted w-20">Qty</th>
              <th className="px-2 py-2 text-left font-semibold text-content-muted w-28">Unit Rate (৳)</th>
              <th className="px-2 py-2 text-right font-semibold text-content-muted w-28">Amount (৳)</th>
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {items.map(item => {
              const amount = (Number(item.quantity) || 0) * (Number(item.unitRate) || 0)
              return (
                <tr key={item.key} className={item.resourceId ? 'hover:bg-surface-muted' : 'bg-warning/15 hover:bg-warning/15'}>
                  <td className="px-2 py-1.5">
                    <Select value={item.resourceType}
                      onChange={e => handleTypeChange(item.key, e.target.value as ResourceType)}
                      className="text-xs py-1">
                      {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </td>
                  <td className="px-2 py-1.5">
                    <CategorySelect
                      value={item.resourceCategoryId ?? ''}
                      resourceType={item.resourceType}
                      onChange={id => handleCategoryChange(item.key, id)}
                      placeholder="All categories"
                      className="text-xs py-1"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <ResourcePicker
                      value={item.resourceId ?? ''}
                      types={[item.resourceType]}
                      categoryId={item.resourceCategoryId}
                      onChange={(id, resource) => handleResourceChange(item.key, id, resource)}
                      onResolved={resolved => handleResolved(item.key, resolved)}
                      placeholder={`Select ${item.resourceType.toLowerCase()}…`}
                      invalid={!item.resourceId}
                      className={'text-xs py-1' + (item.resourceId ? '' : ' border-warning/20')}
                    />
                    {!item.resourceId && (
                      <p className="text-[10px] text-warning mt-0.5">Required — every line must reference a resource</p>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <Select value={item.category} onChange={e => update(item.key, { category: e.target.value as BOQCategory })} className="text-xs py-1">
                      {BOQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={item.description} onChange={e => update(item.key, { description: e.target.value })}
                      className={tinp} placeholder="Work description…" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={item.unit} readOnly disabled title="Unit comes from the selected resource"
                      className={tinp} placeholder="m²" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} step="any" value={item.quantity}
                      onChange={e => update(item.key, { quantity: Number(e.target.value) })} className={tinp} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} step="any" value={item.unitRate}
                      onChange={e => update(item.key, { unitRate: Number(e.target.value) })} className={tinp} />
                    <div className="mt-0.5">
                      <RateSourceChip
                        resolved={rateInfo[item.key]}
                        currentValue={Number(item.unitRate)}
                        onApply={rate => update(item.key, { unitRate: rate })}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1.5 font-semibold text-content text-right pr-3">
                    {fmt(amount)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {items.length > 1 && (
                      <button type="button" onClick={() => remove(item.key)}
                        className="text-content-muted/50 hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-surface-muted border-t border-border-default">
            <tr>
              <td colSpan={8} className="px-2 py-2 text-xs font-bold text-content uppercase">Total Estimated</td>
              <td className="px-2 py-2 text-right font-bold text-content pr-3">{fmt(totalEstimated)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {items.some(i => !i.resourceId) && (
        <p className="text-xs text-warning flex items-center gap-1">
          ⚠ Every line must reference a resource before the estimate can be saved.
        </p>
      )}
    </div>
  )
}

// ── Create / Edit modal ────────────────────────────────────────────────────────
function EstimateModal({ estimate, onClose, onSaved }: {
  estimate?: CostEstimate
  onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!estimate
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')
  const [scope,  setScope]  = useState<ScopeValue>({
    projectId: String(estimate?.projectId ?? ''),
    blockId:   estimate?.blockId ? String(estimate.blockId) : '',
    floorId:   estimate?.floorId ? String(estimate.floorId) : '',
    unitId:    estimate?.unitId  ? String(estimate.unitId)  : '',
  })
  const [title, setTitle] = useState(estimate?.title ?? '')
  const [items, setItems] = useState<DraftItem[]>(
    estimate?.items?.length
      ? estimate.items.map(i => ({
          key:        String(i.id ?? Math.random()),
          resourceId: i.resourceId ?? undefined,
          resourceType: (i.resourceType ?? "Material") as ResourceType,
          category:   i.category,
          description: i.description,
          unit:        i.unit,
          quantity:    i.quantity,
          unitRate:    i.unitRate,
        }))
      : [newLine()]
  )

  // Only drives the "catalogue is empty" hint; the picker fetches its own list.
  const { data: materials = [] } = useApiData<Resource[]>({ url: '/resources', queryKey: ['resources-all'] })

  const validItems     = items.filter(i => i.resourceId && i.description.trim() && Number(i.quantity) > 0 && Number(i.unitRate) >= 0)
  const totalEstimated = validItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unitRate), 0)
  const unlinkedCount  = items.filter(i => !i.resourceId && i.description.trim()).length

  const onSubmit = async () => {
    if (!scope.projectId)     { setErr('Select a project'); return }
    if (!title.trim())        { setErr('Title is required'); return }
    if (validItems.length === 0) { setErr('Add at least one BOQ line with a resource, description and quantity'); return }
    setSaving(true); setErr('')
    try {
      const payload = {
        ...scopeToPayload(scope), title,
        items: validItems.map(i => ({
          resourceId:      i.resourceId,
          category:        i.category,
          description:     i.description,
          unit:            i.unit,
          quantity:        Number(i.quantity),
          unitRate:        Number(i.unitRate),
          estimatedAmount: Number(i.quantity) * Number(i.unitRate),
        })),
      }
      if (isEdit) await api.put(`/cost-estimates/${estimate!.id}`, payload)
      else        await api.post('/cost-estimates', payload)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Cost Estimate' : 'New Cost Estimate'} size="xl">
      <div className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <Field label="Estimate Title" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Phase 1 Construction Budget" />
        </Field>

        <div className="rounded-lg border border-border-default p-3">
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-3">Scope</p>
          <ScopePicker value={scope} onChange={setScope} mode="form" />
        </div>

        {materials.length === 0 && (
          <div className="rounded-lg border border-warning/20 bg-warning/15 px-3 py-2 text-xs text-warning">
            ⚠ No resources found in the master list. <a href="/inventory/resources" className="underline font-medium">Add resources first</a> so you can link BOQ lines for budget tracking.
          </div>
        )}

        <BOQEditor items={items} onChange={setItems} />

        {/* Only on an existing estimate — a file needs a record to hang off, and the panel says so
            rather than silently dropping the upload. */}
        <AttachmentPanel entityType="CostEstimate" entityId={estimate?.id} />

        {totalEstimated > 0 && (
          <div className="bg-primary/10 border border-info/20 rounded-lg px-4 py-2 flex justify-between text-sm">
            <span className="text-primary font-medium">Total Estimated Cost</span>
            <div className="flex items-center gap-3">
              {unlinkedCount > 0 && (
                <span className="text-xs text-warning">{unlinkedCount} line{unlinkedCount !== 1 ? 's' : ''} missing a resource — will not be saved</span>
              )}
              <span className="font-bold text-info">{fmt(totalEstimated)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button onClick={onSubmit} disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Estimate'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── View modal ─────────────────────────────────────────────────────────────────
function ViewModal({ estimate, onClose }: { estimate: CostEstimate; onClose: () => void }) {
  const variancePct = estimate.totalEstimated > 0 ? Math.round((estimate.totalActual / estimate.totalEstimated) * 100) : 0
  const isOverBudget = estimate.totalActual > estimate.totalEstimated && estimate.totalActual > 0

  const byCategory: Record<string, { estimated: number; actual: number; items: BOQItem[] }> = {}
  estimate.items.forEach(i => {
    if (!byCategory[i.category]) byCategory[i.category] = { estimated: 0, actual: 0, items: [] }
    byCategory[i.category].estimated += i.estimatedAmount
    byCategory[i.category].actual    += i.actualAmount
    byCategory[i.category].items.push(i)
  })

  return (
    <Modal open onClose={onClose} title={`${estimate.title} — v${estimate.version}`} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-content-muted">Covers</span>
          <Badge tone={SCOPE_TONES[estimate.scopeLevel]}>
            {estimate.scopeLevel === 'Project' ? 'Whole project' : estimate.scopeLabel}
          </Badge>
          <span className="text-content-muted">in {estimate.projectCode}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-primary/10 rounded-lg p-3">
            <p className="text-xs text-primary font-medium uppercase">Total Estimated</p>
            <p className="text-lg font-bold text-info mt-1">{fmt(estimate.totalEstimated)}</p>
          </div>
          <div className="bg-warning/15 rounded-lg p-3">
            <p className="text-xs text-warning font-medium uppercase">Actual Cost</p>
            <p className="text-lg font-bold text-warning mt-1">{estimate.totalActual > 0 ? fmt(estimate.totalActual) : '—'}</p>
          </div>
          <div className={`rounded-lg p-3 ${isOverBudget ? 'bg-danger/10' : 'bg-success/10'}`}>
            <p className={`text-xs font-medium uppercase ${isOverBudget ? 'text-danger' : 'text-success'}`}>Variance</p>
            <p className={`text-lg font-bold mt-1 ${isOverBudget ? 'text-danger' : 'text-success'}`}>
              {estimate.totalActual > 0 ? `${variancePct}% used` : '—'}
            </p>
            {isOverBudget && <p className="text-xs text-danger font-medium">⚠ Over budget by {fmt(estimate.totalActual - estimate.totalEstimated)}</p>}
          </div>
        </div>

        {/* Hand-rolled rather than <Table>: this one needs a <tfoot> totals row, which the
            shared primitive does not render. */}
        <div className="overflow-x-auto border border-border-default rounded-lg">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-surface-muted border-b border-border-default">
              <tr>
                {['Material', 'Category', 'Description', 'Unit', 'Qty', 'Rate', 'Estimated', 'Actual'].map(h => (
                  <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${['Qty','Rate','Estimated','Actual'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {estimate.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-surface-muted">
                  <td className="px-3 py-2 text-xs">
                    {item.resourceName
                      ? <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-medium">{item.resourceName}</span>
                      : <span className="text-content-muted/50 text-[10px]">Not linked</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="bg-surface-muted text-content-muted px-2 py-0.5 rounded text-[10px] font-medium">{item.category}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-content">{item.description}</td>
                  <td className="px-3 py-2 text-xs text-content-muted">{item.unit}</td>
                  <td className="px-3 py-2 text-xs text-content-muted text-right">{item.quantity.toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs text-content-muted text-right">{fmt(item.unitRate)}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-primary text-right">{fmt(item.estimatedAmount)}</td>
                  <td className="px-3 py-2 text-xs text-right">
                    {item.actualAmount > 0
                      ? <span className={item.actualAmount > item.estimatedAmount ? 'text-danger font-semibold' : 'text-success font-semibold'}>{fmt(item.actualAmount)}</span>
                      : <span className="text-content-muted/50">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-muted border-t border-border-default font-bold">
              <tr>
                <td colSpan={6} className="px-3 py-2 text-xs text-content uppercase">Total</td>
                <td className="px-3 py-2 text-xs text-info text-right">{fmt(estimate.totalEstimated)}</td>
                <td className="px-3 py-2 text-xs text-right">
                  {estimate.totalActual > 0
                    ? <span className={isOverBudget ? 'text-danger' : 'text-success'}>{fmt(estimate.totalActual)}</span>
                    : <span className="text-content-muted/50">—</span>}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export function CostEstimatesPage() {
  const qc = useQueryClient()
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState<ScopeValue>(EMPTY_SCOPE)
  const [modal,   setModal]   = useState<'new' | 'edit' | null>(null)
  const [viewing, setViewing] = useState<CostEstimate | null>(null)
  const [target,  setTarget]  = useState<CostEstimate | null>(null)

  const { data: estimates = [], isLoading, error, refetch } = useApiData<CostEstimate[]>({
    url: '/cost-estimates',
    params: { search: search || undefined, ...scopeToParams(filter) },
    queryKey: ['cost-estimates', search, filter.projectId, filter.blockId, filter.floorId, filter.unitId],
  })

  // Four other screens read /cost-estimates under their own keys; clearing only
  // ['cost-estimates'] left the dashboard and projects banners showing stale budgets.
  const invalidate = () => {
    for (const key of [['cost-estimates'], ['projects-estimates'], ['dash-estimates'],
                       ['budget-estimates'], ['material-budget-v2'], ['material-budget-summary']])
      qc.invalidateQueries({ queryKey: key })
  }

  const approve = async (id: number) => {
    try { await api.post(`/cost-estimates/${id}/approve`); invalidate() } catch { /* noop */ }
  }

  const reject = async (id: number) => {
    const reason = window.prompt('Reason for rejecting this estimate? (optional)')
    if (reason === null) return // cancelled
    try { await api.post(`/cost-estimates/${id}/reject`, { reason: reason || null }); invalidate() } catch { /* noop */ }
  }

  // CSV columns: category, description, unit, quantity, unitRate (header row optional).
  const importCsv = async (id: number, file: File) => {
    const text = await file.text()
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return
    if (/category/i.test(lines[0]) && /description/i.test(lines[0])) lines.shift()
    const rows = lines.map(l => {
      const [category, description, unit, quantity, unitRate] = l.split(',').map(c => c.trim())
      return { category, description, unit, quantity: Number(quantity), unitRate: Number(unitRate) }
    })
    try {
      await api.post(`/cost-estimates/${id}/import`, rows)
      invalidate()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: string[] } } })?.response?.data?.errors?.join('\n')
      window.alert(msg || 'Import failed.')
    }
  }

  const totalEstimated = estimates.reduce((s, e) => s + e.totalEstimated, 0)
  const totalActual    = estimates.reduce((s, e) => s + e.totalActual,    0)
  const overBudget     = estimates.filter(e => e.totalActual > e.totalEstimated && e.totalActual > 0).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Estimates (BOQ)"
        subtitle="Bill of Quantities and budget estimates per project"
        action={
          <PermissionGate module="COST_ESTIMATES" action="create">
            <button onClick={() => setModal('new')}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Estimate
            </button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Estimates" value={String(estimates.length)} tone="neutral" />
        <StatCard label="Total Budgeted"  value={fmt(totalEstimated)}      tone="primary" />
        <StatCard label="Actual Cost"     value={fmt(totalActual)}         tone="warning" />
        <StatCard label="Over Budget"     value={String(overBudget)}       tone={overBudget > 0 ? 'danger' : 'success'} />
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search estimates…" onRefresh={refetch}>
        <ScopePicker value={filter} onChange={setFilter} mode="filter" />
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load estimates.' : null} onRetry={refetch}
        empty={estimates.length === 0} emptyMessage="No cost estimates yet.">
        <Table
          minWidth={820}
          head={<>
            <TH>Title</TH><TH>Project</TH><TH>Scope</TH><TH align="center">Ver.</TH><TH>Status</TH>
            <TH num>Total Estimated</TH><TH num>Actual Cost</TH><TH>Variance</TH><TH />
          </>}
        >
                {estimates.map(e => {
                  const isOver = e.totalActual > e.totalEstimated && e.totalActual > 0
                  const variancePct = e.totalEstimated > 0 && e.totalActual > 0
                    ? Math.round((e.totalActual / e.totalEstimated) * 100)
                    : null
                  return (
                    <TR key={e.id}>
                      <TD>
                        <div className="flex items-center gap-2">
                          <FileBarChart2 className="w-4 h-4 text-content-muted shrink-0" />
                          <p className="font-medium text-content text-sm">{e.title}</p>
                        </div>
                      </TD>
                      <TD><Badge tone="primary">{e.projectCode}</Badge></TD>
                      <TD>
                        <span title={e.scopeLabel}>
                          <Badge tone={SCOPE_TONES[e.scopeLevel]}>
                            {e.scopeLevel === 'Project' ? 'Whole project' : e.scopeLabel}
                          </Badge>
                        </span>
                      </TD>
                      <TD align="center" className="text-content-muted">v{e.version}</TD>
                      <TD><Badge tone={STATUS_TONES[e.status]}>{e.status}</Badge></TD>
                      <TD num className="font-semibold text-primary">{fmt(e.totalEstimated)}</TD>
                      <TD num className="font-semibold">
                        {e.totalActual > 0
                          ? <span className={isOver ? 'text-danger' : 'text-success'}>{fmt(e.totalActual)}</span>
                          : <span className="text-content-muted/50 font-normal">Not started</span>}
                      </TD>
                      <TD>
                        {variancePct !== null
                          ? <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                                <div className={`h-1.5 rounded-full ${isOver ? 'bg-danger' : 'bg-success'}`}
                                  style={{ width: `${Math.min(variancePct, 100)}%` }} />
                              </div>
                              <span className={`text-xs font-semibold ${isOver ? 'text-danger' : 'text-success'}`}>{variancePct}%</span>
                              {isOver && <span className="text-xs text-danger font-medium">Over</span>}
                            </div>
                          : <span className="text-content-muted/50 text-xs">—</span>}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewing(e)} title="View BOQ"
                            className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setTarget(e); setModal('edit') }} title="Edit"
                            className="p-1.5 text-content-muted hover:text-info hover:bg-info/10 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                          {e.status === 'Draft' && (
                            <>
                              <label title="Import BOQ from CSV"
                                className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer">
                                <Upload className="w-3.5 h-3.5" />
                                <input type="file" accept=".csv,text/csv" className="hidden"
                                  onChange={ev => { const f = ev.target.files?.[0]; if (f) importCsv(e.id, f); ev.target.value = '' }} />
                              </label>
                              <button onClick={() => approve(e.id)} title="Approve"
                                className="p-1.5 text-content-muted hover:text-success hover:bg-success/10 rounded-lg"><CheckCircle className="w-3.5 h-3.5" /></button>
                              <button onClick={() => reject(e.id)} title="Reject"
                                className="p-1.5 text-content-muted hover:text-danger hover:bg-danger/10 rounded-lg"><XCircle className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                        </div>
                      </TD>
                    </TR>
                  )
                })}
        </Table>
      </DataState>

      {modal === 'new' && (
        <EstimateModal onClose={() => setModal(null)} onSaved={invalidate} />
      )}
      {modal === 'edit' && target && (
        <EstimateModal estimate={target} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
      {viewing && <ViewModal estimate={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
