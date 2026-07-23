'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Edit2 } from 'lucide-react'
import api from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Project { id: number; projectCode: string; projectName: string }
interface BOQItem {
  id: number; category: string; description: string; unit: string
  quantity: number; unitRate: number
  estimatedAmount: number; actualAmount: number
}
interface CostEstimate {
  id: number; projectId: number; projectName: string; projectCode: string
  title: string; version: number; status: string
  totalEstimated: number; totalActual: number; variance: number
  items: BOQItem[]
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

// ── Update actual cost modal ────────────────────────────────────────────────────
function UpdateActualModal({ item, estimateId, onClose, onSaved }: {
  item: BOQItem; estimateId: number; onClose: () => void; onSaved: () => void
}) {
  const [actual,  setActual]  = useState(String(item.actualAmount || ''))
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  const onSubmit = async () => {
    setSaving(true); setErr('')
    try {
      await api.patch(`/cost-estimates/${estimateId}/items/${item.id}`, { actualAmount: Number(actual) })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to update')
    } finally { setSaving(false) }
  }

  const over = Number(actual) > item.estimatedAmount && Number(actual) > 0

  return (
    <Modal open onClose={onClose} title="Update Actual Cost" size="sm">
      <div className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="bg-surface-muted rounded-lg px-4 py-3 text-sm text-content">
          <p className="font-medium">{item.description}</p>
          <p className="text-xs text-content-muted mt-0.5">{item.category} · {item.quantity} {item.unit} × {fmt(item.unitRate)}</p>
          <p className="text-xs font-semibold text-primary mt-1">Estimated: {fmt(item.estimatedAmount)}</p>
        </div>
        <div>
          <label className={lbl}>Actual Cost (৳) <span className="text-red-500">*</span></label>
          <input type="number" min={0} step="any" value={actual} onChange={e => setActual(e.target.value)} className={inp} placeholder="0" />
          {over && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Over budget by {fmt(Number(actual) - item.estimatedAmount)} ({pct(Number(actual), item.estimatedAmount)}% of estimate)
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button onClick={onSubmit} disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Update'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Estimate detail panel ──────────────────────────────────────────────────────
function EstimatePanel({ estimate, onItemUpdated }: { estimate: CostEstimate; onItemUpdated: () => void }) {
  const [editItem, setEditItem] = useState<BOQItem | null>(null)
  const utilized = pct(estimate.totalActual, estimate.totalEstimated)
  const isOver   = estimate.totalActual > estimate.totalEstimated && estimate.totalActual > 0

  const byCategory: Record<string, BOQItem[]> = {}
  estimate.items.forEach(i => {
    if (!byCategory[i.category]) byCategory[i.category] = []
    byCategory[i.category].push(i)
  })

  return (
    <div className="space-y-4">
      {editItem && (
        <UpdateActualModal
          item={editItem} estimateId={estimate.id}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); onItemUpdated() }}
        />
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-primary/10 rounded-xl p-4">
          <p className="text-xs text-primary font-medium uppercase">Total Budgeted</p>
          <p className="text-xl font-bold text-blue-900 mt-1">{fmt(estimate.totalEstimated)}</p>
        </div>
        <div className={`rounded-xl p-4 ${isOver ? 'bg-red-50' : 'bg-orange-50'}`}>
          <p className={`text-xs font-medium uppercase ${isOver ? 'text-red-600' : 'text-orange-600'}`}>Actual Spent</p>
          <p className={`text-xl font-bold mt-1 ${isOver ? 'text-red-800' : 'text-orange-900'}`}>
            {estimate.totalActual > 0 ? fmt(estimate.totalActual) : '—'}
          </p>
        </div>
        <div className={`rounded-xl p-4 ${isOver ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className={`text-xs font-medium uppercase ${isOver ? 'text-red-600' : 'text-green-600'}`}>
            {isOver ? 'Over Budget' : 'Budget Remaining'}
          </p>
          <p className={`text-xl font-bold mt-1 ${isOver ? 'text-red-800' : 'text-green-800'}`}>
            {estimate.totalActual > 0
              ? isOver
                ? `+${fmt(estimate.totalActual - estimate.totalEstimated)}`
                : fmt(estimate.totalEstimated - estimate.totalActual)
              : '—'}
          </p>
          {estimate.totalActual > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-0.5">
                <span className={isOver ? 'text-red-600' : 'text-green-600'}>{utilized}% used</span>
              </div>
              <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                <div className={`h-1.5 rounded-full transition-all ${isOver ? 'bg-red-500' : utilized > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(utilized, 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {isOver && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Budget Overrun Detected</p>
            <p className="text-xs text-red-600 mt-0.5">
              Actual cost exceeds budget by {fmt(estimate.totalActual - estimate.totalEstimated)} ({utilized - 100}% over). Review line items below.
            </p>
          </div>
        </div>
      )}

      {/* BOQ breakdown by category */}
      {Object.entries(byCategory).map(([cat, items]) => {
        const catEstimated = items.reduce((s, i) => s + i.estimatedAmount, 0)
        const catActual    = items.reduce((s, i) => s + i.actualAmount, 0)
        const catOver      = catActual > catEstimated && catActual > 0
        return (
          <div key={cat} className="bg-surface border border-border-default rounded-xl overflow-hidden">
            <div className={`px-4 py-2 border-b flex items-center justify-between ${catOver ? 'bg-red-50 border-red-200' : 'bg-surface-muted border-border-default'}`}>
              <div className="flex items-center gap-2">
                {catOver
                  ? <TrendingUp className="w-4 h-4 text-red-500" />
                  : <TrendingDown className="w-4 h-4 text-green-500" />}
                <span className="font-semibold text-sm text-content">{cat}</span>
              </div>
              <div className="text-xs text-content-muted flex gap-4">
                <span>Est: <strong className="text-primary">{fmt(catEstimated)}</strong></span>
                {catActual > 0 && <span className={catOver ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>Actual: {fmt(catActual)}</span>}
              </div>
            </div>
            <table className="w-full min-w-[600px] text-xs">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {['Description', 'Unit', 'Qty', 'Rate', 'Estimated', 'Actual', ''].map(h => (
                    <th key={h} className={`px-3 py-2 font-semibold text-content-muted ${['Estimated','Actual','Rate'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {items.map(item => {
                  const itemOver = item.actualAmount > item.estimatedAmount && item.actualAmount > 0
                  return (
                    <tr key={item.id} className={`hover:bg-surface-muted ${itemOver ? 'bg-red-50/30' : ''}`}>
                      <td className="px-3 py-2 text-content">{item.description}</td>
                      <td className="px-3 py-2 text-content-muted">{item.unit}</td>
                      <td className="px-3 py-2 text-content-muted text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-content-muted text-right">{fmt(item.unitRate)}</td>
                      <td className="px-3 py-2 font-semibold text-primary text-right">{fmt(item.estimatedAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {item.actualAmount > 0
                          ? <span className={itemOver ? 'text-red-600' : 'text-green-700'}>{fmt(item.actualAmount)}</span>
                          : <span className="text-content-muted/50">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => setEditItem(item)} title="Update actual cost"
                          className="p-1 text-content-muted/50 hover:text-primary hover:bg-primary/10 rounded transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export function BudgetTrackerPage() {
  const qc = useQueryClient()
  const [selectedProject, setSelectedProject] = useState('')

  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data: estimates = [], isLoading, error, refetch } = useApiData<CostEstimate[]>({
    url: '/cost-estimates',
    params: { projectId: selectedProject || undefined, status: 'Approved' },
    queryKey: ['budget-estimates', selectedProject],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['budget-estimates'] })
    qc.invalidateQueries({ queryKey: ['cost-estimates'] })
  }

  const totalBudget  = estimates.reduce((s, e) => s + e.totalEstimated, 0)
  const totalActual  = estimates.reduce((s, e) => s + e.totalActual,    0)
  const overRunCount = estimates.filter(e => e.totalActual > e.totalEstimated && e.totalActual > 0).length
  const utilization  = pct(totalActual, totalBudget)

  return (
    <div className="space-y-6">
      <PageHeader title="Budget vs Actual Tracker" subtitle="Monitor actual costs against approved BOQ estimates" />

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Budget',       value: fmt(totalBudget),  color: 'text-primary',   bg: 'bg-primary/10' },
          { label: 'Actual Spent',       value: fmt(totalActual),  color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Utilization',        value: `${utilization}%`, color: utilization > 100 ? 'text-red-600' : utilization > 80 ? 'text-amber-600' : 'text-green-600', bg: 'bg-surface' },
          { label: 'Estimates Overrun',  value: overRunCount,      color: overRunCount > 0 ? 'text-red-600' : 'text-green-600', bg: overRunCount > 0 ? 'bg-red-50' : 'bg-green-50' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border border-border-default p-4 ${k.bg}`}>
            <p className="text-xs text-content-muted uppercase tracking-wide">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Budget progress bar */}
      {totalBudget > 0 && (
        <div className="bg-surface rounded-xl border border-border-default p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-content">Overall Budget Utilization</span>
            <span className={`font-bold ${utilization > 100 ? 'text-red-600' : utilization > 80 ? 'text-amber-600' : 'text-green-600'}`}>
              {utilization}%
            </span>
          </div>
          <div className="h-3 bg-surface-muted rounded-full overflow-hidden">
            <div className={`h-3 rounded-full transition-all ${utilization > 100 ? 'bg-red-500' : utilization > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(utilization, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-content-muted mt-1">
            <span>{fmt(totalActual)} spent</span>
            <span>{fmt(totalBudget)} budgeted</span>
          </div>
        </div>
      )}

      {/* Project filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-content shrink-0">Filter by project:</label>
        <Select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
        </Select>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load budget data.' : null} onRetry={refetch}
        empty={estimates.length === 0} emptyMessage="No approved cost estimates found. Approve an estimate in Cost Estimates to track budget here.">
        <div className="space-y-6">
          {estimates.map(e => (
            <div key={e.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">{e.projectCode}</span>
                <h3 className="font-semibold text-content">{e.title}</h3>
                <span className="text-xs text-content-muted">v{e.version}</span>
                {e.totalActual > e.totalEstimated && e.totalActual > 0 && (
                  <span className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    <AlertTriangle className="w-3 h-3" /> Over Budget
                  </span>
                )}
                {e.totalActual > 0 && e.totalActual <= e.totalEstimated && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle className="w-3 h-3" /> On Track
                  </span>
                )}
              </div>
              <EstimatePanel estimate={e} onItemUpdated={invalidate} />
            </div>
          ))}
        </div>
      </DataState>
    </div>
  )
}
