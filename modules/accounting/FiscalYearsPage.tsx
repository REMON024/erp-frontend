'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Lock, Unlock, Calendar, CheckCircle, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'

interface FiscalYear {
  id: number; name: string; startDate: string; endDate: string
  isClosed: boolean; closedAt?: string; closedBy?: string; voucherCount: number
}

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  name:      z.string().min(1, 'Required'),
  startDate: z.string().min(1, 'Required'),
  endDate:   z.string().min(1, 'Required'),
}).refine(d => d.endDate > d.startDate, { message: 'End date must be after start date', path: ['endDate'] })
type Form = z.infer<typeof schema>

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { name: 'FY 2026-2027', startDate: '2026-07-01', endDate: '2027-06-30' },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try { await api.post('/fiscal-years', d); onSaved(); onClose() }
    catch (e: any) { setErr(e.response?.data?.errors?.[0] ?? 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Open New Fiscal Year" size="sm">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className={lbl}>Fiscal Year Name <span className="text-danger">*</span></label>
          <input {...register('name')} className={inp} placeholder="FY 2026-2027" />
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Start Date <span className="text-danger">*</span></label>
            <DateField {...register('startDate')} />
          </div>
          <div>
            <label className={lbl}>End Date <span className="text-danger">*</span></label>
            <DateField {...register('endDate')} />
            {errors.endDate && <p className="text-xs text-danger mt-1">{errors.endDate.message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Opening…' : 'Open Fiscal Year'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function FiscalYearsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [closing, setClosing] = useState<FiscalYear | null>(null)
  const [toast,   setToast]   = useState('')

  const { data: years = [], isLoading, error, refetch } = useApiData<FiscalYear[]>({
    url: '/fiscal-years', queryKey: ['fiscal-years'],
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['fiscal-years'] })
  const activeYear = years.find(y => !y.isClosed)

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const handleClose = async () => {
    if (!closing) return
    try { await api.post(`/fiscal-years/${closing.id}/close`); invalidate(); showToast(`${closing.name} has been closed.`) }
    catch { /* noop */ }
    setClosing(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fiscal Years"
        subtitle="Manage accounting periods — open new fiscal years and close completed ones"
        action={
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Open New Year
          </button>
        }
      />

      {toast && (
        <div className="flex items-center gap-2 px-4 py-3 bg-success/10 border border-success/20 rounded-xl text-sm text-success">
          <CheckCircle className="w-4 h-4 text-success shrink-0" />{toast}
        </div>
      )}

      {activeYear && (
        <div className="bg-primary/10 border border-info/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Unlock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-info">Current Active Period: {activeYear.name}</p>
            <p className="text-xs text-primary mt-0.5">{activeYear.startDate} → {activeYear.endDate} · {activeYear.voucherCount} vouchers</p>
          </div>
          <button onClick={() => setClosing(activeYear)}
            className="px-3 py-1.5 text-xs bg-danger text-white rounded-lg hover:bg-danger font-medium flex items-center gap-1.5 shrink-0">
            <Lock className="w-3.5 h-3.5" /> Close Year
          </button>
        </div>
      )}

      <DataState loading={isLoading} error={error ? 'Failed to load fiscal years.' : null} onRetry={refetch}
        empty={years.length === 0} emptyMessage="No fiscal years yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {['Fiscal Year', 'Period', 'Vouchers', 'Status', 'Closed On', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {[...years].reverse().map(y => (
                  <tr key={y.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-content-muted" /><span className="font-semibold text-content">{y.name}</span></div>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs">{y.startDate} → {y.endDate}</td>
                    <td className="px-4 py-3 font-medium text-content">{y.voucherCount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${y.isClosed ? 'bg-surface-muted text-content-muted' : 'bg-success/10 text-success'}`}>
                        {y.isClosed ? <><Lock className="w-3 h-3" />Closed</> : <><Unlock className="w-3 h-3" />Active</>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs">{y.closedAt ? `${y.closedAt} by ${y.closedBy}` : '—'}</td>
                    <td className="px-4 py-3">
                      {!y.isClosed && (
                        <button onClick={() => setClosing(y)} className="text-xs text-danger hover:text-danger font-medium hover:underline">Close</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={() => { invalidate(); showToast('Fiscal year opened.') }} />}

      {closing && (
        <Modal open onClose={() => setClosing(null)} title="Close Fiscal Year" size="sm">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-danger">This action cannot be undone</p>
                <p className="text-xs text-danger mt-1">Closing <strong>{closing.name}</strong> will lock all {closing.voucherCount} vouchers. No new entries can be posted after closing.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
              <button onClick={() => setClosing(null)} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
              <button onClick={handleClose} className="px-4 py-2 text-sm bg-danger text-white rounded-lg hover:bg-danger font-medium">Yes, Close Fiscal Year</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
