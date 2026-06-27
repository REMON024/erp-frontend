'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, PackageCheck, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'

interface Material { id: number; materialName: string; unit: string; currentStock: number }
interface Project  { id: number; projectName: string; projectCode: string }
interface BudgetLine { materialId: number; budgetedQty: number; issuedQty: number; unit: string }
interface StockTxn {
  id: number; materialName: string; unit: string; projectName?: string
  qty: number; totalCost: number; referenceNo?: string; transactionDate: string
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  materialId:      z.coerce.number().min(1, 'Required'),
  projectId:       z.coerce.number().min(1, 'Required'),
  warehouseId:     z.coerce.number().optional(),
  qty:             z.coerce.number().min(0.01, 'Required'),
  transactionDate: z.string().min(1, 'Required'),
  referenceNo:     z.string().optional(),
  notes:           z.string().optional(),
})
type Form = z.infer<typeof schema>

function IssueModal({ materials, projects, warehouses, onClose, onSaved }: {
  materials: Material[]; projects: Project[]; warehouses: { id: number; name: string }[]; onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { transactionDate: isoToday() },
  })

  const selectedMat  = materials.find(m => m.id === Number(watch('materialId')))
  const watchedMat   = Number(watch('materialId'))
  const watchedProj  = Number(watch('projectId'))
  const watchedQty   = Number(watch('qty')) || 0

  const { data: budgetLines = [] } = useApiData<BudgetLine[]>({
    url: `/cost-estimates/material-budget/${watchedProj || '0'}`,
    queryKey: ['material-budget-v2', String(watchedProj)],
    enabled: !!watchedProj,
  })
  const budgetLine   = budgetLines.find(l => l.materialId === watchedMat)
  const remaining    = budgetLine ? budgetLine.budgetedQty - budgetLine.issuedQty : null
  const wouldExceed  = budgetLine && budgetLine.budgetedQty > 0 && (budgetLine.issuedQty + watchedQty) > budgetLine.budgetedQty

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      await api.post('/stock-transactions/issue', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Issue Material to Project" size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className={lbl}>Material <span className="text-red-500">*</span></label>
          <select {...register('materialId')} className={inp}>
            <option value="">Select material</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.materialName} — {m.currentStock.toLocaleString()} {m.unit} available</option>)}
          </select>
          {errors.materialId && <p className="text-xs text-red-600 mt-1">{errors.materialId.message}</p>}
        </div>
        {selectedMat && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
            Available: <strong>{selectedMat.currentStock.toLocaleString()} {selectedMat.unit}</strong>
          </div>
        )}
        <div>
          <label className={lbl}>Project <span className="text-red-500">*</span></label>
          <select {...register('projectId')} className={inp}>
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
          </select>
          {errors.projectId && <p className="text-xs text-red-600 mt-1">{errors.projectId.message}</p>}
        </div>
        <div>
          <label className={lbl}>Warehouse <span className="text-gray-400 font-normal">(guards that warehouse's balance)</span></label>
          <select {...register('warehouseId')} className={inp}>
            <option value="">Unassigned (central store)</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Quantity <span className="text-red-500">*</span></label>
            <input type="number" step="any" {...register('qty')} className={inp} placeholder="0" />
            {errors.qty && <p className="text-xs text-red-600 mt-1">{errors.qty.message}</p>}
            {remaining !== null && !wouldExceed && (
              <p className="text-xs text-gray-500 mt-1">
                BOQ remaining: <span className="font-medium text-green-700">{remaining.toLocaleString()} {budgetLine?.unit}</span>
              </p>
            )}
            {wouldExceed && (
              <div className="flex items-start gap-1.5 mt-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  This would exceed the BOQ budget by{' '}
                  <span className="font-semibold">
                    {((budgetLine!.issuedQty + watchedQty) - budgetLine!.budgetedQty).toLocaleString()} {budgetLine?.unit}
                  </span>. You can still proceed.
                </p>
              </div>
            )}
          </div>
          <div>
            <label className={lbl}>Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('transactionDate')} className={inp} />
          </div>
        </div>
        <div>
          <label className={lbl}>Reference / Notes</label>
          <input {...register('referenceNo')} className={inp} placeholder="ISS-..." />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Issue Material'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function IssueToProjectPage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)

  const { data: materials = [] } = useApiData<Material[]>({ url: '/materials', queryKey: ['materials-list'] })
  const { data: projects = [] }  = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data: warehouses = [] } = useApiData<{ id: number; name: string }[]>({ url: '/warehouses', params: { activeOnly: true }, queryKey: ['warehouses-list'] })
  const { data: txns = [], isLoading, error, refetch } = useApiData<StockTxn[]>({
    url: '/stock-transactions',
    params: { type: 'Out' },
    queryKey: ['stock-out'],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['stock-out'] })
    qc.invalidateQueries({ queryKey: ['materials'] })
    qc.invalidateQueries({ queryKey: ['materials-list'] })
    qc.invalidateQueries({ queryKey: ['material-budget-v2'] })
    qc.invalidateQueries({ queryKey: ['material-budget-summary'] })
    qc.invalidateQueries({ queryKey: ['cost-estimates'] })
    qc.invalidateQueries({ queryKey: ['project-setup-checklist'] })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issue to Project"
        subtitle="Issue materials from store to project sites"
        action={
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Issue Material
          </button>
        }
      />

      <DataState loading={isLoading} error={error ? 'Failed to load issue history.' : null} onRetry={refetch}
        empty={txns.length === 0} emptyMessage="No material issues yet.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Material', 'Project', 'Date', 'Qty', 'Value', 'Reference'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txns.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2"><PackageCheck className="w-4 h-4 text-orange-500" />{t.materialName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t.projectName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{t.transactionDate}</td>
                    <td className="px-4 py-3 text-orange-600 font-semibold">−{t.qty.toLocaleString()} {t.unit}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(t.totalCost)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{t.referenceNo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {showNew && <IssueModal materials={materials} projects={projects} warehouses={warehouses} onClose={() => setShowNew(false)} onSaved={invalidate} />}
    </div>
  )
}
