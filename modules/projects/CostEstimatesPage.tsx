'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { Plus, Trash2, Edit2, Eye, CheckCircle, XCircle, FileBarChart2 } from 'lucide-react'
import api from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────
type BOQCategory = 'Civil' | 'Structural' | 'Architectural' | 'Electrical' | 'Plumbing' | 'HVAC' | 'Finishing' | 'Miscellaneous'
type EstimateStatus = 'Draft' | 'Approved' | 'Revised' | 'Rejected'

interface Project  { id: number; projectCode: string; projectName: string }
interface Material { id: number; materialName: string; materialCode: string; unit: string; category?: string }
interface BOQItem {
  id?: number; materialId?: number; materialName?: string
  category: BOQCategory; description: string
  unit: string; quantity: number; unitRate: number
  estimatedAmount: number; actualAmount: number
}
interface CostEstimate {
  id: number; projectId: number; projectName: string; projectCode: string
  title: string; version: number; status: EstimateStatus
  totalEstimated: number; totalActual: number; variance: number
  items: BOQItem[]; createdAt: string
}

const BOQ_CATEGORIES: BOQCategory[] = ['Civil', 'Structural', 'Architectural', 'Electrical', 'Plumbing', 'HVAC', 'Finishing', 'Miscellaneous']
const STATUS_COLORS: Record<EstimateStatus, string> = {
  Draft:    'bg-gray-100 text-gray-600',
  Approved: 'bg-green-100 text-green-700',
  Revised:  'bg-amber-100 text-amber-700',
  Rejected: 'bg-red-100 text-red-700',
}

function fmt(n: number)  { return `৳${n.toLocaleString('en-BD')}` }
function isoToday()      { return new Date().toISOString().split('T')[0] }

const inp  = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl  = 'block text-sm font-medium text-gray-700 mb-1'
const tinp = 'border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none w-full'

// ── BOQ line-item editor ───────────────────────────────────────────────────────
type DraftItem = Omit<BOQItem, 'id' | 'estimatedAmount' | 'actualAmount' | 'materialName'> & { key: string }

function newLine(): DraftItem {
  return { key: Math.random().toString(36).slice(2), materialId: undefined, category: 'Civil', description: '', unit: 'LS', quantity: 1, unitRate: 0 }
}

function BOQEditor({ items, materials, onChange }: {
  items: DraftItem[]
  materials: Material[]
  onChange: (items: DraftItem[]) => void
}) {
  const update = (key: string, patch: Partial<DraftItem>) =>
    onChange(items.map(i => i.key === key ? { ...i, ...patch } : i))
  const remove = (key: string) => onChange(items.filter(i => i.key !== key))

  const totalEstimated = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitRate) || 0), 0)

  const handleMaterialChange = (key: string, materialId: string) => {
    const mat = materials.find(m => m.id === Number(materialId))
    if (mat) {
      update(key, {
        materialId:  mat.id,
        description: mat.materialName,
        unit:        mat.unit,
      })
    } else {
      update(key, { materialId: undefined })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-sm font-medium text-gray-700">Bill of Quantities</span>
          <span className="ml-2 text-xs text-gray-400">— link each line to a material to enable budget vs actual tracking</span>
        </div>
        <button type="button" onClick={() => onChange([...items, newLine()])}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Line
        </button>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full min-w-[860px] text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 w-44">Material <span className="text-blue-500">*</span></th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 w-32">Category</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500">Description</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 w-16">Unit</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 w-20">Qty</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 w-28">Unit Rate (৳)</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-500 w-28">Amount (৳)</th>
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => {
              const amount = (Number(item.quantity) || 0) * (Number(item.unitRate) || 0)
              return (
                <tr key={item.key} className={item.materialId ? 'hover:bg-gray-50' : 'bg-amber-50/30 hover:bg-amber-50/50'}>
                  <td className="px-2 py-1.5">
                    <select
                      value={item.materialId ?? ''}
                      onChange={e => handleMaterialChange(item.key, e.target.value)}
                      className={tinp + (item.materialId ? '' : ' border-amber-300')}
                    >
                      <option value="">— select material —</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>{m.materialName} ({m.unit})</option>
                      ))}
                    </select>
                    {!item.materialId && (
                      <p className="text-[10px] text-amber-600 mt-0.5">Link material for budget tracking</p>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={item.category} onChange={e => update(item.key, { category: e.target.value as BOQCategory })} className={tinp}>
                      {BOQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={item.description} onChange={e => update(item.key, { description: e.target.value })}
                      className={tinp} placeholder="Work description…" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={item.unit} onChange={e => update(item.key, { unit: e.target.value })}
                      className={tinp} placeholder="m²" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} step="any" value={item.quantity}
                      onChange={e => update(item.key, { quantity: Number(e.target.value) })} className={tinp} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} step="any" value={item.unitRate}
                      onChange={e => update(item.key, { unitRate: Number(e.target.value) })} className={tinp} />
                  </td>
                  <td className="px-2 py-1.5 font-semibold text-gray-900 text-right pr-3">
                    {fmt(amount)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {items.length > 1 && (
                      <button type="button" onClick={() => remove(item.key)}
                        className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={6} className="px-2 py-2 text-xs font-bold text-gray-700 uppercase">Total Estimated</td>
              <td className="px-2 py-2 text-right font-bold text-gray-900 pr-3">{fmt(totalEstimated)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {items.some(i => !i.materialId) && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          ⚠ Lines without a material won't appear in Material Budget vs Actual tracking.
        </p>
      )}
    </div>
  )
}

// ── Create / Edit modal ────────────────────────────────────────────────────────
function EstimateModal({ estimate, projects, onClose, onSaved }: {
  estimate?: CostEstimate; projects: Project[]
  onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!estimate
  const [saving, setSaving]       = useState(false)
  const [err,    setErr]          = useState('')
  const [projectId, setProjectId] = useState(String(estimate?.projectId ?? ''))
  const [title,     setTitle]     = useState(estimate?.title ?? '')
  const [items, setItems] = useState<DraftItem[]>(
    estimate?.items?.length
      ? estimate.items.map(i => ({
          key:        String(i.id ?? Math.random()),
          materialId: i.materialId ?? undefined,
          category:   i.category,
          description: i.description,
          unit:        i.unit,
          quantity:    i.quantity,
          unitRate:    i.unitRate,
        }))
      : [newLine()]
  )

  const { data: materials = [] } = useApiData<Material[]>({ url: '/materials', queryKey: ['materials-list'] })

  const validItems     = items.filter(i => i.description.trim() && Number(i.quantity) > 0 && Number(i.unitRate) >= 0)
  const totalEstimated = validItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unitRate), 0)
  const unlinkedCount  = validItems.filter(i => !i.materialId).length

  const onSubmit = async () => {
    if (!projectId)           { setErr('Select a project'); return }
    if (!title.trim())        { setErr('Title is required'); return }
    if (validItems.length === 0) { setErr('Add at least one BOQ line with a description and quantity'); return }
    setSaving(true); setErr('')
    try {
      const payload = {
        projectId: Number(projectId), title,
        items: validItems.map(i => ({
          materialId:      i.materialId ?? null,
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
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project <span className="text-red-500">*</span></label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inp}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Estimate Title <span className="text-red-500">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inp} placeholder="e.g. Phase 1 Construction Budget" />
          </div>
        </div>

        {materials.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            ⚠ No materials found in the master list. <a href="/inventory/materials" className="underline font-medium">Add materials first</a> so you can link BOQ lines for budget tracking.
          </div>
        )}

        <BOQEditor items={items} materials={materials} onChange={setItems} />

        {totalEstimated > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex justify-between text-sm">
            <span className="text-blue-700 font-medium">Total Estimated Cost</span>
            <div className="flex items-center gap-3">
              {unlinkedCount > 0 && (
                <span className="text-xs text-amber-600">{unlinkedCount} line{unlinkedCount !== 1 ? 's' : ''} not linked to material</span>
              )}
              <span className="font-bold text-blue-900">{fmt(totalEstimated)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={onSubmit} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium uppercase">Total Estimated</p>
            <p className="text-lg font-bold text-blue-900 mt-1">{fmt(estimate.totalEstimated)}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-xs text-orange-600 font-medium uppercase">Actual Cost</p>
            <p className="text-lg font-bold text-orange-900 mt-1">{estimate.totalActual > 0 ? fmt(estimate.totalActual) : '—'}</p>
          </div>
          <div className={`rounded-lg p-3 ${isOverBudget ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className={`text-xs font-medium uppercase ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>Variance</p>
            <p className={`text-lg font-bold mt-1 ${isOverBudget ? 'text-red-800' : 'text-green-800'}`}>
              {estimate.totalActual > 0 ? `${variancePct}% used` : '—'}
            </p>
            {isOverBudget && <p className="text-xs text-red-600 font-medium">⚠ Over budget by {fmt(estimate.totalActual - estimate.totalEstimated)}</p>}
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Material', 'Category', 'Description', 'Unit', 'Qty', 'Rate', 'Estimated', 'Actual'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {estimate.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs">
                    {item.materialName
                      ? <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium">{item.materialName}</span>
                      : <span className="text-gray-300 text-[10px]">Not linked</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium">{item.category}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-800">{item.description}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{item.unit}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 text-right">{item.quantity.toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 text-right">{fmt(item.unitRate)}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-blue-700 text-right">{fmt(item.estimatedAmount)}</td>
                  <td className="px-3 py-2 text-xs text-right">
                    {item.actualAmount > 0
                      ? <span className={item.actualAmount > item.estimatedAmount ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>{fmt(item.actualAmount)}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
              <tr>
                <td colSpan={6} className="px-3 py-2 text-xs text-gray-700 uppercase">Total</td>
                <td className="px-3 py-2 text-xs text-blue-800 text-right">{fmt(estimate.totalEstimated)}</td>
                <td className="px-3 py-2 text-xs text-right">
                  {estimate.totalActual > 0
                    ? <span className={isOverBudget ? 'text-red-700' : 'text-green-700'}>{fmt(estimate.totalActual)}</span>
                    : <span className="text-gray-300">—</span>}
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
  const [projFilter, setProjFilter] = useState('')
  const [modal,   setModal]   = useState<'new' | 'edit' | null>(null)
  const [viewing, setViewing] = useState<CostEstimate | null>(null)
  const [target,  setTarget]  = useState<CostEstimate | null>(null)

  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })

  const { data: estimates = [], isLoading, error, refetch } = useApiData<CostEstimate[]>({
    url: '/cost-estimates',
    params: { search: search || undefined, projectId: projFilter || undefined },
    queryKey: ['cost-estimates', search, projFilter],
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cost-estimates'] })

  const approve = async (id: number) => {
    try { await api.post(`/cost-estimates/${id}/approve`); invalidate() } catch { /* noop */ }
  }

  const reject = async (id: number) => {
    const reason = window.prompt('Reason for rejecting this estimate? (optional)')
    if (reason === null) return // cancelled
    try { await api.post(`/cost-estimates/${id}/reject`, { reason: reason || null }); invalidate() } catch { /* noop */ }
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
          <button onClick={() => setModal('new')}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Estimate
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Estimates',  value: estimates.length,       color: 'text-gray-900',  bg: 'bg-white' },
          { label: 'Total Budgeted',   value: fmt(totalEstimated),    color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: 'Actual Cost',      value: fmt(totalActual),       color: 'text-orange-600',bg: 'bg-orange-50' },
          { label: 'Over Budget',      value: overBudget,             color: overBudget > 0 ? 'text-red-600' : 'text-green-600', bg: overBudget > 0 ? 'bg-red-50' : 'bg-green-50' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border border-gray-200 p-4 ${k.bg}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search estimates…" onRefresh={refetch}>
        <select value={projFilter} onChange={e => setProjFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
        </select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load estimates.' : null} onRetry={refetch}
        empty={estimates.length === 0} emptyMessage="No cost estimates yet.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Title', 'Project', 'Ver.', 'Status', 'Total Estimated', 'Actual Cost', 'Variance', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {estimates.map(e => {
                  const isOver = e.totalActual > e.totalEstimated && e.totalActual > 0
                  const variancePct = e.totalEstimated > 0 && e.totalActual > 0
                    ? Math.round((e.totalActual / e.totalEstimated) * 100)
                    : null
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileBarChart2 className="w-4 h-4 text-gray-400 shrink-0" />
                          <p className="font-medium text-gray-900 text-sm">{e.title}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">{e.projectCode}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-center">v{e.version}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[e.status]}`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-700">{fmt(e.totalEstimated)}</td>
                      <td className="px-4 py-3 font-semibold">
                        {e.totalActual > 0
                          ? <span className={isOver ? 'text-red-600' : 'text-green-700'}>{fmt(e.totalActual)}</span>
                          : <span className="text-gray-300 font-normal">Not started</span>}
                      </td>
                      <td className="px-4 py-3">
                        {variancePct !== null
                          ? <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-1.5 rounded-full ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(variancePct, 100)}%` }} />
                              </div>
                              <span className={`text-xs font-semibold ${isOver ? 'text-red-600' : 'text-green-600'}`}>{variancePct}%</span>
                              {isOver && <span className="text-xs text-red-500 font-medium">Over</span>}
                            </div>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewing(e)} title="View BOQ"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setTarget(e); setModal('edit') }} title="Edit"
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                          {e.status === 'Draft' && (
                            <>
                              <button onClick={() => approve(e.id)} title="Approve"
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle className="w-3.5 h-3.5" /></button>
                              <button onClick={() => reject(e.id)} title="Reject"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><XCircle className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {modal === 'new' && (
        <EstimateModal projects={projects} onClose={() => setModal(null)} onSaved={invalidate} />
      )}
      {modal === 'edit' && target && (
        <EstimateModal estimate={target} projects={projects} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
      {viewing && <ViewModal estimate={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
