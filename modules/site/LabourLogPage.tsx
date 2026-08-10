'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, HardHat } from 'lucide-react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { ScopePicker, EMPTY_SCOPE, scopeToParams, type ScopeValue } from '@/components/pickers/ScopePicker'
import { ResourcePicker, type ResolvedRate } from '@/components/pickers/ResourcePicker'
import { useApiData } from '@/hooks/useApiData'
import api from '@/lib/api'
import type { ProjectUnit } from '@/modules/projects/ProjectUnitsPage'

/**
 * Daily labour on site.
 *
 * Labour reached the ledger only through contractor bills and hand-posted vouchers, both of which
 * arrive weeks after the work and neither of which says how many people were there. This is the
 * capture that makes "what has this floor cost in labour" and "what did we get for it" answerable.
 *
 * The rate shown here is a preview: the server resolves its own on the log date and ignores
 * anything the client sends, because this entry posts to the ledger.
 */

interface LabourLog {
  id: number; logDate: string
  projectId: number; projectName: string
  nodeId: number; nodeName: string; breadcrumb: string
  resourceId: number; resourceName: string; skillLevel: string | null
  mandays: number; ratePerManday: number; amount: number
  outputQty: number | null; outputUnit: string | null
  productivity: number | null
  notes: string | null
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { maximumFractionDigits: 0 })}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  logDate:      z.string().min(1, 'Required'),
  projectId:    z.coerce.number().min(1, 'Required'),
  nodeId:       z.coerce.number().min(1, 'Pick the part of the project worked on'),
  resourceId:   z.coerce.number().min(1, 'Required'),
  mandays:      z.coerce.number().min(0.01, 'Must be greater than zero'),
  outputQty:    z.coerce.number().optional(),
  outputUnitId: z.coerce.number().optional(),
  notes:        z.string().optional(),
}).refine(d => !d.outputQty || !!d.outputUnitId, {
  // The same rule the server enforces and the node's own quantity obeys: a number nobody can
  // interpret is worse than no number.
  message: 'Pick the unit the output is measured in',
  path: ['outputUnitId'],
})
type Form = z.infer<typeof schema>

function LogModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [scope, setScope] = useState<ScopeValue>(EMPTY_SCOPE)
  const [rate, setRate] = useState<ResolvedRate | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { logDate: isoToday() },
  })

  const { data: units = [] } = useApiData<ProjectUnit[]>({
    url: '/project-units', queryKey: ['project-units-list'],
  })

  const logDate = watch('logDate')
  const mandays = Number(watch('mandays')) || 0
  const preview = rate ? mandays * rate.rate : 0

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      await api.post('/labour-logs', {
        logDate: d.logDate,
        projectId: Number(scope.projectId),
        nodeId: Number(scope.nodeId),
        resourceId: d.resourceId,
        mandays: d.mandays,
        outputQty: d.outputQty || null,
        outputUnitId: d.outputUnitId || null,
        notes: d.notes?.trim() || null,
      })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Log labour" size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <div>
          <label className={lbl}>Date <span className="text-danger">*</span></label>
          <DateField {...register('logDate')} />
        </div>

        <div className="rounded-lg border border-border-default p-3">
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-3">Worked on</p>
          <ScopePicker
            value={scope}
            onChange={next => {
              setScope(next)
              setValue('projectId', next.projectId ? Number(next.projectId) : (0 as any), { shouldValidate: false })
              setValue('nodeId', next.nodeId ? Number(next.nodeId) : (0 as any), { shouldValidate: false })
            }}
            mode="form"
            // Deliberately unfiltered: a node measured in man-days is the most natural place to
            // book effort, and it is exactly what a material issue would refuse.
          />
        </div>

        <div>
          <label className={lbl}>Gang / trade <span className="text-danger">*</span></label>
          <ResourcePicker
            value={watch('resourceId') || ''}
            types={['Labour']}
            asOf={logDate}
            onChange={id => setValue('resourceId', (id || 0) as any, { shouldValidate: false })}
            onResolved={r => setRate(r)}
            placeholder="Select a labour resource"
          />
          {errors.resourceId && <p className="text-xs text-danger mt-1">{errors.resourceId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Mandays <span className="text-danger">*</span></label>
            <Input type="number" step="0.5" min={0} {...register('mandays')} invalid={!!errors.mandays} />
            {errors.mandays && <p className="text-xs text-danger mt-1">{errors.mandays.message}</p>}
          </div>
          <div>
            <label className={lbl}>Cost</label>
            <div className="px-3 py-2 rounded-lg bg-surface-muted text-sm text-content">
              {rate ? fmt(preview) : '—'}
            </div>
            {rate && (
              <p className="text-xs text-content-muted mt-1">
                {fmt(rate.rate)}/day · {rate.source}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Output <span className="text-content-muted font-normal">(optional)</span></label>
            <Input type="number" step="0.001" min={0} {...register('outputQty')} placeholder="e.g. 480" />
          </div>
          <div>
            <label className={lbl}>Output unit</label>
            <Select {...register('outputUnitId')}>
              <option value="">None</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
            {errors.outputUnitId && <p className="text-xs text-danger mt-1">{errors.outputUnitId.message}</p>}
          </div>
        </div>
        <p className="text-xs text-content-muted">
          Leave output blank for supervision or making good — a day with nothing countable produced
          is a real day, and recording it as zero would drag every productivity figure down.
        </p>

        <div>
          <label className={lbl}>Notes</label>
          <Input {...register('notes')} maxLength={500} />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-content-muted hover:text-content">Cancel</button>
          <button type="submit" disabled={saving || !scope.nodeId}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Log labour'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function LabourLogPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<ScopeValue>(EMPTY_SCOPE)
  const [dateFrom, setFrom] = useState('')
  const [dateTo, setTo] = useState('')
  const [modal, setModal] = useState(false)

  const { data: logs = [], isLoading, error, refetch } = useApiData<LabourLog[]>({
    url: '/labour-logs',
    params: { ...scopeToParams(filter), dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
    queryKey: ['labour-logs', filter.projectId, filter.nodeId, dateFrom, dateTo],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['labour-logs'] })
    // Labour lands on the BOQ actual, so both resource reports move with it.
    qc.invalidateQueries({ queryKey: ['resource-budget'] })
    qc.invalidateQueries({ queryKey: ['resource-consumption'] })
  }

  const remove = async (log: LabourLog) => {
    if (!window.confirm(
      `Delete ${log.mandays} manday(s) of ${log.resourceName} on ${log.logDate}?\n\n`
      + 'The BOQ actual is recomputed. The journal it posted is not reversed — correct that with a '
      + 'contra voucher if it was wrong.'
    )) return
    try {
      await api.delete(`/labour-logs/${log.id}`)
      invalidate()
    } catch (e: any) {
      window.alert(e.response?.data?.errors?.[0] ?? 'Delete failed')
    }
  }

  const totalMandays = logs.reduce((s, l) => s + l.mandays, 0)
  const totalCost = logs.reduce((s, l) => s + l.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labour Log"
        subtitle="Mandays spent on each part of the project, costed at the rate that applied on the day"
        action={
          <PermissionGate module="LABOUR_LOGS" action="create">
            <button onClick={() => setModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium">
              <Plus className="w-4 h-4" /> Log labour
            </button>
          </PermissionGate>
        }
      />

      <div className="flex items-end gap-3 flex-wrap">
        <label className="text-sm font-medium text-content shrink-0 pb-2">Scope:</label>
        <ScopePicker value={filter} onChange={setFilter} mode="filter" />
        <div>
          <label className="block text-xs font-medium text-content mb-1">From</label>
          <DateField value={dateFrom} onChange={e => setFrom(e.target.value)} className="min-w-[150px]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-content mb-1">To</label>
          <DateField value={dateTo} onChange={e => setTo(e.target.value)} className="min-w-[150px]" />
        </div>
      </div>

      {logs.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="rounded-xl border border-border-default bg-primary/10 p-4 min-w-[180px]">
            <p className="text-xs text-primary uppercase font-semibold">Mandays</p>
            <p className="text-2xl font-bold text-info mt-1">{totalMandays.toLocaleString('en-BD')}</p>
          </div>
          <div className="rounded-xl border border-border-default bg-surface p-4 min-w-[180px]">
            <p className="text-xs text-content-muted uppercase font-semibold">Labour Cost</p>
            <p className="text-2xl font-bold text-content mt-1">{fmt(totalCost)}</p>
          </div>
        </div>
      )}

      <DataState
        loading={isLoading} error={error ? 'Failed to load.' : null} onRetry={refetch}
        empty={!isLoading && logs.length === 0}
        emptyMessage="No labour logged for this scope and period."
      >
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  {['Date', 'Worked on', 'Gang', 'Mandays', 'Rate', 'Cost', 'Output', 'Per manday', ''].map((c, i) => (
                    <th key={c || i} className={`px-3 py-2 text-xs font-semibold text-content-muted uppercase tracking-wide ${
                      i >= 3 && i <= 7 ? 'text-right' : 'text-left'}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-surface-muted/50">
                    <td className="px-3 py-2 text-content-muted text-xs">{l.logDate}</td>
                    <td className="px-3 py-2">
                      <div className="text-content">{l.nodeName}</div>
                      <div className="text-xs text-content-muted">{l.breadcrumb}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 text-content">
                        <HardHat className="w-3.5 h-3.5 text-content-muted" />{l.resourceName}
                      </div>
                      {l.skillLevel && <div className="text-xs text-content-muted">{l.skillLevel}</div>}
                    </td>
                    <td className="px-3 py-2 text-right text-content">{l.mandays}</td>
                    <td className="px-3 py-2 text-right text-content-muted">{fmt(l.ratePerManday)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-content">{fmt(l.amount)}</td>
                    <td className="px-3 py-2 text-right text-content-muted">
                      {l.outputQty != null ? `${l.outputQty} ${l.outputUnit ?? ''}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-content-muted">
                      {l.productivity != null ? l.productivity.toLocaleString('en-BD') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <PermissionGate module="LABOUR_LOGS" action="delete">
                        <button onClick={() => remove(l)} title="Delete"
                          className="p-1.5 text-content-muted hover:text-danger">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {modal && <LogModal onClose={() => setModal(false)} onSaved={invalidate} />}
    </div>
  )
}
