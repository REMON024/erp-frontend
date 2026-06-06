'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, ShoppingCart, Eye, CheckCircle, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'

interface Vendor   { id: number; vendorName: string }
interface Project  { id: number; projectName: string; projectCode: string }
interface Material { id: number; materialName: string; unit: string; averageCost: number }
interface PoItem   { id: number; materialId: number; materialName: string; qty: number; unitPrice: number; amount: number }
interface PurchaseOrder {
  id: number; poNumber: string; projectId?: number; projectName?: string
  vendorId: number; vendorName: string; poDate: string; deliveryDate?: string
  totalAmount: number; status: string; items: PoItem[]
}

const STATUS_COLORS: Record<string, string> = {
  Draft:     'bg-gray-100 text-gray-600',
  Approved:  'bg-green-100 text-green-700',
  Received:  'bg-blue-100 text-blue-700',
  Cancelled: 'bg-red-100 text-red-600',
}
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

interface MaterialBudgetV2Line {
  materialId: number; budgetedCost: number; committedCost: number; actualCost: number
}

interface PoForm {
  vendorId: string; projectId: string; poDate: string; deliveryDate: string
  items: { materialId: string; qty: string; unitPrice: string }[]
}

function PoModal({ vendors, projects, materials, onClose, onSaved }: {
  vendors: Vendor[]; projects: Project[]; materials: Material[]; onClose: () => void; onSaved: () => void
}) {
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const { register, control, handleSubmit, watch } = useForm<PoForm>({
    defaultValues: { poDate: isoToday(), deliveryDate: '', items: [{ materialId: '', qty: '', unitPrice: '' }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items      = watch('items')
  const projectId  = watch('projectId')
  const total      = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0), 0)

  const { data: budgetLines = [] } = useApiData<MaterialBudgetV2Line[]>({
    url: `/cost-estimates/material-budget/${projectId || '0'}`,
    queryKey: ['material-budget-v2', projectId],
    enabled: !!projectId,
  })

  const budgetByMaterial = Object.fromEntries(budgetLines.map(l => [l.materialId, l]))

  const budgetWarnings = items
    .map((item, i) => {
      if (!item.materialId || !projectId) return null
      const line      = budgetByMaterial[Number(item.materialId)]
      if (!line || line.budgetedCost === 0) return null
      const newAmount = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)
      const projected = line.committedCost + newAmount
      if (projected > line.budgetedCost) {
        const mat = materials.find(m => m.id === Number(item.materialId))
        return { index: i, name: mat?.materialName ?? 'Material', projected, budget: line.budgetedCost }
      }
      return null
    })
    .filter(Boolean) as { index: number; name: string; projected: number; budget: number }[]

  const onSubmit = async (d: PoForm) => {
    if (!d.vendorId) { setErr('Vendor is required.'); return }
    const validItems = d.items.filter(i => i.materialId && parseFloat(i.qty) > 0)
    if (validItems.length === 0) { setErr('At least one valid line item is required.'); return }
    setSaving(true); setErr('')
    try {
      await api.post('/purchase-orders', {
        vendorId:  Number(d.vendorId),
        projectId: d.projectId ? Number(d.projectId) : undefined,
        poDate:    d.poDate,
        deliveryDate: d.deliveryDate || undefined,
        items: validItems.map(i => ({ materialId: Number(i.materialId), qty: Number(i.qty), unitPrice: Number(i.unitPrice) })),
      })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="New Purchase Order" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Vendor <span className="text-red-500">*</span></label>
            <select {...register('vendorId')} className={inp}>
              <option value="">Select vendor</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Project</label>
            <select {...register('projectId')} className={inp}>
              <option value="">No specific project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>PO Date</label>
            <input type="date" {...register('poDate')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Delivery Date</label>
            <input type="date" {...register('deliveryDate')} className={inp} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Line Items</label>
            <button type="button" onClick={() => append({ materialId: '', qty: '', unitPrice: '' })}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[500px] text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-gray-500 w-[45%]">Material</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-500">Qty</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-500">Unit Price</th>
                  <th className="px-2 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((field, i) => (
                  <tr key={field.id}>
                    <td className="px-2 py-1.5">
                      <select {...register(`items.${i}.materialId`)} className={inp + ' text-xs py-1.5'}>
                        <option value="">Select…</option>
                        {materials.map(m => <option key={m.id} value={m.id}>{m.materialName} ({m.unit})</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5"><input type="number" step="any" {...register(`items.${i}.qty`)} className={inp + ' text-xs py-1.5'} placeholder="0" /></td>
                    <td className="px-2 py-1.5"><input type="number" step="any" {...register(`items.${i}.unitPrice`)} className={inp + ' text-xs py-1.5'} placeholder="0" /></td>
                    <td className="px-2 py-1.5 text-center">
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={2} className="px-2 py-2 text-xs font-semibold text-gray-600">Total</td>
                  <td colSpan={2} className="px-2 py-2 text-xs font-bold text-gray-900">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {budgetWarnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5" /> Budget Warning
            </div>
            {budgetWarnings.map(w => (
              <p key={w.index} className="text-xs text-amber-700">
                <span className="font-medium">{w.name}</span>: committing {fmt(w.projected)} exceeds BOQ budget of {fmt(w.budget)}. You can still proceed.
              </p>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Create PO'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function PurchasePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null)

  const { data: vendors = [] }   = useApiData<Vendor[]>({ url: '/vendors', queryKey: ['vendors-list'] })
  const { data: projects = [] }  = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data: materials = [] } = useApiData<Material[]>({ url: '/materials', queryKey: ['materials-list'] })

  const { data: orders = [], isLoading, error, refetch } = useApiData<PurchaseOrder[]>({
    url: '/purchase-orders',
    params: { search: search || undefined, status: status || undefined },
    queryKey: ['purchase-orders', search, status],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    qc.invalidateQueries({ queryKey: ['pos-list'] })
    qc.invalidateQueries({ queryKey: ['material-budget-v2'] })
    qc.invalidateQueries({ queryKey: ['material-budget-summary'] })
  }

  const approve = async (id: number) => {
    try { await api.post(`/purchase-orders/${id}/approve`); invalidate() } catch { /* noop */ }
  }

  const totalValue = orders.reduce((s, o) => s + o.totalAmount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Create and manage purchase orders to vendors"
        action={
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New PO
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total POs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{orders.filter(o => o.status === 'Approved').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{fmt(totalValue)}</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search PO no or vendor…" onRefresh={refetch}>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Status</option>
          {['Draft', 'Approved', 'Received', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load purchase orders.' : null} onRetry={refetch}
        empty={orders.length === 0} emptyMessage="No purchase orders yet.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['PO No.', 'Vendor', 'Project', 'Date', 'Items', 'Total', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">
                      <div className="flex items-center gap-1.5"><ShoppingCart className="w-3.5 h-3.5 text-gray-400" />{o.poNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm">{o.vendorName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.projectName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.poDate}</td>
                    <td className="px-4 py-3 text-gray-500 text-center">{o.items.length}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(o.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewing(o)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-3.5 h-3.5" /></button>
                        {o.status === 'Draft' && (
                          <button onClick={() => approve(o.id)} className="text-xs text-green-600 hover:text-green-700 font-medium hover:underline px-1">Approve</button>
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

      {showNew && <PoModal vendors={vendors} projects={projects} materials={materials} onClose={() => setShowNew(false)} onSaved={invalidate} />}

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={`${viewing.poNumber} — ${viewing.vendorName}`} size="lg">
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>{['Material', 'Qty', 'Unit Price', 'Amount'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewing.items.map(it => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">{it.materialName}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{it.qty}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{fmt(it.unitPrice)}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-gray-900">{fmt(it.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3} className="px-3 py-2 text-sm text-gray-700">Total</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{fmt(viewing.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
