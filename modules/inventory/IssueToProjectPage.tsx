'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
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

interface Project  { id: number; projectName: string; projectCode: string }
interface BudgetLine { materialId: number; budgetedQty: number; issuedQty: number; unit: string }
interface StockBalanceRow { warehouseId: number | null; balance: number }
interface MaterialRollup { materialId: number; materialName: string; unit: string; warehouses: StockBalanceRow[] }
interface StockTxn {
  id: number; materialName: string; unit: string; projectName?: string
  qty: number; totalCost: number; referenceNo?: string; transactionDate: string
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  warehouseId:     z.coerce.number().min(1, 'Required'),
  materialId:      z.coerce.number().min(1, 'Required'),
  projectId:       z.coerce.number().min(1, 'Required'),
  qty:             z.coerce.number().min(0.01, 'Required'),
  transactionDate: z.string().min(1, 'Required'),
  referenceNo:     z.string().optional(),
  notes:           z.string().optional(),
})
type Form = z.infer<typeof schema>

function IssueModal({ projects, warehouses, onClose, onSaved }: {
  projects: Project[]; warehouses: { id: number; name: string }[]; onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, watch, resetField, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { transactionDate: isoToday() },
  })

  const watchedWh    = Number(watch('warehouseId'))
  const watchedMat   = Number(watch('materialId'))
  const watchedProj  = Number(watch('projectId'))
  const watchedQty   = Number(watch('qty')) || 0

  // Per-warehouse stock for the selected warehouse; drives the material list and "Available".
  const { data: rollups = [] } = useApiData<MaterialRollup[]>({
    url: '/stock-transactions/balances',
    params: { warehouseId: watchedWh || undefined },
    queryKey: ['issue-wh-balances', String(watchedWh)],
    enabled: !!watchedWh,
  })
  // Only materials that have a positive balance in the chosen warehouse.
  const availableMaterials = rollups
    .map(r => ({ id: r.materialId, name: r.materialName, unit: r.unit, balance: r.warehouses.find(w => w.warehouseId === watchedWh)?.balance ?? 0 }))
    .filter(m => m.balance > 0)
  const selectedMat = availableMaterials.find(m => m.id === watchedMat)

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
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className={lbl}>Warehouse <span className="text-danger">*</span></label>
          <Select {...register('warehouseId', { onChange: () => resetField('materialId') })}>
            <option value="">Select warehouse</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
          {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId.message}</p>}
        </div>
        <div>
          <label className={lbl}>Material <span className="text-danger">*</span></label>
          <Select {...register('materialId')} disabled={!watchedWh}>
            <option value="">{watchedWh ? 'Select material' : 'Select a warehouse first'}</option>
            {availableMaterials.map(m => <option key={m.id} value={m.id}>{m.name} — {m.balance.toLocaleString()} {m.unit} available</option>)}
          </Select>
          {watchedWh && availableMaterials.length === 0 &&
            <p className="text-xs text-content-muted mt-1">No materials in stock in this warehouse.</p>}
          {errors.materialId && <p className="text-xs text-danger mt-1">{errors.materialId.message}</p>}
        </div>
        {selectedMat && (
          <div className="bg-surface-muted rounded-lg px-3 py-2 text-xs text-content-muted">
            Available: <strong>{selectedMat.balance.toLocaleString()} {selectedMat.unit}</strong>
          </div>
        )}
        <div>
          <label className={lbl}>Project <span className="text-danger">*</span></label>
          <Select {...register('projectId')}>
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
          </Select>
          {errors.projectId && <p className="text-xs text-danger mt-1">{errors.projectId.message}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Quantity <span className="text-danger">*</span></label>
            <input type="number" step="any" {...register('qty')} className={inp} placeholder="0" />
            {errors.qty && <p className="text-xs text-danger mt-1">{errors.qty.message}</p>}
            {remaining !== null && !wouldExceed && (
              <p className="text-xs text-content-muted mt-1">
                BOQ remaining: <span className="font-medium text-success">{remaining.toLocaleString()} {budgetLine?.unit}</span>
              </p>
            )}
            {wouldExceed && (
              <div className="flex items-start gap-1.5 mt-1.5 bg-warning/15 border border-warning/20 rounded-lg px-2.5 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-warning">
                  This would exceed the BOQ budget by{' '}
                  <span className="font-semibold">
                    {((budgetLine!.issuedQty + watchedQty) - budgetLine!.budgetedQty).toLocaleString()} {budgetLine?.unit}
                  </span>. You can still proceed.
                </p>
              </div>
            )}
          </div>
          <div>
            <label className={lbl}>Date <span className="text-danger">*</span></label>
            <DateField {...register('transactionDate')} />
          </div>
        </div>
        <div>
          <label className={lbl}>Reference / Notes</label>
          <input {...register('referenceNo')} className={inp} placeholder="ISS-..." />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
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
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Issue Material
          </button>
        }
      />

      <DataState loading={isLoading} error={error ? 'Failed to load issue history.' : null} onRetry={refetch}
        empty={txns.length === 0} emptyMessage="No material issues yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Material' }, { h: 'Project' }, { h: 'Date' },
                    { h: 'Qty', num: true }, { h: 'Value', num: true }, { h: 'Reference' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {txns.map(t => (
                  <tr key={t.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-medium text-content">
                      <div className="flex items-center gap-2"><PackageCheck className="w-4 h-4 text-warning" />{t.materialName}</div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs">{t.projectName ?? '—'}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">{t.transactionDate}</td>
                    <td className="px-4 py-3 text-warning font-semibold text-right tabular-nums">−{t.qty.toLocaleString()} {t.unit}</td>
                    <td className="px-4 py-3 font-semibold text-content text-right tabular-nums">{fmt(t.totalCost)}</td>
                    <td className="px-4 py-3 text-content-muted text-xs font-mono">{t.referenceNo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {showNew && <IssueModal projects={projects} warehouses={warehouses} onClose={() => setShowNew(false)} onSaved={invalidate} />}
    </div>
  )
}
