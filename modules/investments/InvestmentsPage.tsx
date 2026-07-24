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
import { Plus, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react'
import api from '@/lib/api'

interface Investor { id: number; investorCode: string; fullName: string; role: string; status: string }
interface Project  { id: number; projectCode: string; projectName: string }
interface Investment {
  id: number; investmentNo: string
  investorId: number; investorName: string; investorRole: string
  projectId: number; projectName: string; projectCode: string
  investmentDate: string; amount: number; paymentMode: string
  referenceNo?: string; notes?: string
  isReversed: boolean; reversalReason?: string
}

const PAYMENT_MODES = ['Bank', 'Cash', 'Cheque', 'Online']
const MODE_COLOR: Record<string, string> = {
  Bank:   'bg-primary/10 text-primary',
  Cash:   'bg-success/10 text-success',
  Cheque: 'bg-warning/15 text-warning',
  Online: 'bg-primary/10 text-primary',
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday()     { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

// ── Create investment modal ────────────────────────────────────────────────
const createSchema = z.object({
  investorId:     z.coerce.number().min(1, 'Select an investor'),
  projectId:      z.coerce.number().min(1, 'Select a project'),
  investmentDate: z.string().min(1, 'Date is required'),
  amount:         z.coerce.number().min(1, 'Amount must be > 0'),
  paymentMode:    z.string().min(1, 'Select payment mode'),
  referenceNo:    z.string().optional(),
  notes:          z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

function CreateModal({ investors, projects, onClose, onSaved }: {
  investors: Investor[]; projects: Project[]; onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema) as any,
    defaultValues: { paymentMode: 'Bank', investmentDate: isoToday() },
  })

  const onSubmit = async (d: CreateForm) => {
    setSaving(true); setErr('')
    try {
      await api.post('/investments', d)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to record investment')
    } finally { setSaving(false) }
  }

  const activeInvestors = investors.filter(i => i.status === 'Active')

  return (
    <Modal open onClose={onClose} title="Record Investment" size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Investor <span className="text-danger">*</span></label>
            <Select {...register('investorId')}>
              <option value="">Select investor</option>
              {activeInvestors.map(i => (
                <option key={i.id} value={i.id}>{i.fullName} — {i.role}</option>
              ))}
            </Select>
            {errors.investorId && <p className="text-xs text-danger mt-1">{errors.investorId.message}</p>}
          </div>
          <div>
            <label className={lbl}>Project <span className="text-danger">*</span></label>
            <Select {...register('projectId')}>
              <option value="">Select project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>
              ))}
            </Select>
            {errors.projectId && <p className="text-xs text-danger mt-1">{errors.projectId.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Investment Date <span className="text-danger">*</span></label>
            <DateField {...register('investmentDate')} />
            {errors.investmentDate && <p className="text-xs text-danger mt-1">{errors.investmentDate.message}</p>}
          </div>
          <div>
            <label className={lbl}>Amount (৳) <span className="text-danger">*</span></label>
            <input type="number" min={1} step="any" {...register('amount')} className={inp} placeholder="0.00" />
            {errors.amount && <p className="text-xs text-danger mt-1">{errors.amount.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Payment Mode <span className="text-danger">*</span></label>
            <Select {...register('paymentMode')}>
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
          </div>
          <div>
            <label className={lbl}>Reference No</label>
            <input {...register('referenceNo')} className={inp} placeholder="Cheque / transfer ref" />
          </div>
        </div>

        <div>
          <label className={lbl}>Notes</label>
          <textarea {...register('notes')} rows={2} className={inp} placeholder="Any remarks…" />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Record Investment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Reversal modal ─────────────────────────────────────────────────────────
function ReverseModal({ investment, onClose, onSaved }: {
  investment: Investment; onClose: () => void; onSaved: () => void
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const onSubmit = async () => {
    if (!reason.trim()) { setErr('Reversal reason is required'); return }
    setSaving(true); setErr('')
    try {
      await api.post(`/investments/${investment.id}/reverse`, { reason })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Reversal failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Reverse Investment" size="sm">
      <div className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="bg-warning/15 border border-warning/20 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold text-warning">Reversing: {investment.investmentNo}</p>
          <p className="text-warning text-xs mt-0.5">
            {investment.investorName} · {fmt(investment.amount)} · {investment.investmentDate}
          </p>
          <p className="text-xs text-warning mt-1">This will post a reversal journal entry and mark this investment as reversed.</p>
        </div>
        <div>
          <label className={lbl}>Reason for Reversal <span className="text-danger">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className={inp}
            placeholder="Explain why this investment is being reversed…" />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button onClick={onSubmit} disabled={saving}
            className="px-4 py-2 text-sm bg-danger text-white rounded-lg hover:bg-danger font-medium disabled:opacity-60">
            {saving ? 'Reversing…' : 'Confirm Reversal'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export function InvestmentsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen]   = useState(false)
  const [reversing, setReversing]     = useState<Investment | null>(null)
  const [filterInvestor, setFilterInvestor] = useState('')
  const [filterProject, setFilterProject]   = useState('')
  const [dateFrom, setDateFrom]             = useState('')
  const [dateTo,   setDateTo]               = useState('')

  const { data: investors = [] } = useApiData<Investor[]>({ url: '/investors', queryKey: ['investors-list'] })
  const { data: projects  = [] } = useApiData<Project[]>({ url: '/projects',  queryKey: ['projects-list'] })
  const { data: investments = [], isLoading, error, refetch } = useApiData<Investment[]>({
    url: '/investments',
    params: {
      investorId: filterInvestor || undefined,
      projectId:  filterProject  || undefined,
      dateFrom:   dateFrom       || undefined,
      dateTo:     dateTo         || undefined,
    },
    queryKey: ['investments', filterInvestor, filterProject, dateFrom, dateTo],
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['investments'] })

  const activeInvestments = investments.filter(i => !i.isReversed)
  const totalAmount  = activeInvestments.reduce((s, i) => s + i.amount, 0)
  const reversedCount = investments.filter(i => i.isReversed).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investment Entries"
        subtitle="Record and track capital investments per project and investor"
        action={
          <button onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Record Investment
          </button>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invested',    value: fmt(totalAmount),         color: 'text-primary',  bg: 'bg-primary/10' },
          { label: 'Active Entries',    value: activeInvestments.length, color: 'text-content',  bg: 'bg-surface' },
          { label: 'Reversed Entries',  value: reversedCount,            color: reversedCount > 0 ? 'text-danger' : 'text-content-muted', bg: reversedCount > 0 ? 'bg-danger/10' : 'bg-surface' },
          { label: 'Investors',         value: [...new Set(activeInvestments.map(i => i.investorId))].length, color: 'text-content', bg: 'bg-surface' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border border-border-default p-4 ${k.bg}`}>
            <p className="text-xs text-content-muted uppercase tracking-wide">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-surface rounded-xl border border-border-default p-4">
        <div>
          <label className="block text-xs font-medium text-content-muted mb-1">Investor</label>
          <Select value={filterInvestor} onChange={e => setFilterInvestor(e.target.value)}
            className="min-w-[150px]">
            <option value="">All Investors</option>
            {investors.map(i => <option key={i.id} value={i.id}>{i.fullName}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-content-muted mb-1">Project</label>
          <Select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="min-w-[150px]">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-content-muted mb-1">From</label>
          <DateField value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="min-w-[150px]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-content-muted mb-1">To</label>
          <DateField value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="min-w-[150px]" />
        </div>
        <button onClick={() => refetch()}
          className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted self-end">
          Refresh
        </button>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load investments.' : null} onRetry={refetch}
        empty={investments.length === 0} emptyMessage="No investment entries found for the selected filters.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Entry No' }, { h: 'Date' }, { h: 'Investor' }, { h: 'Project' },
                    { h: 'Amount', num: true }, { h: 'Mode' }, { h: 'Reference' }, { h: 'Status' }, { h: '' },
                  ].map(({ h, num }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {investments.map(inv => (
                  <tr key={inv.id} className={inv.isReversed ? 'bg-surface-muted opacity-60' : 'hover:bg-surface-muted'}>
                    <td className="px-4 py-3 font-medium text-primary">{inv.investmentNo}</td>
                    <td className="px-4 py-3 text-content-muted">{inv.investmentDate}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-content">{inv.investorName}</p>
                      <p className="text-xs text-content-muted">{inv.investorRole}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">{inv.projectCode}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-success text-right tabular-nums">{fmt(inv.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${MODE_COLOR[inv.paymentMode] ?? 'bg-surface-muted text-content-muted'}`}>
                        {inv.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-content-muted">{inv.referenceNo || '—'}</td>
                    <td className="px-4 py-3">
                      {inv.isReversed
                        ? <span className="flex items-center gap-1 text-xs text-danger font-medium">
                            <RotateCcw className="w-3 h-3" /> Reversed
                          </span>
                        : <span className="flex items-center gap-1 text-xs text-success font-medium">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {!inv.isReversed && (
                        <button onClick={() => setReversing(inv)} title="Reverse this entry"
                          className="p-1.5 text-content-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {inv.isReversed && inv.reversalReason && (
                        <span className="text-xs text-content-muted italic" title={inv.reversalReason}>
                          <AlertTriangle className="w-3 h-3 inline" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border-default bg-surface-muted">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-xs font-bold text-content uppercase">
                    Total Active Investment
                  </td>
                  <td className="px-4 py-2 font-bold text-success text-right tabular-nums">{fmt(totalAmount)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </DataState>

      {createOpen && (
        <CreateModal
          investors={investors} projects={projects}
          onClose={() => setCreateOpen(false)}
          onSaved={invalidate}
        />
      )}
      {reversing && (
        <ReverseModal
          investment={reversing}
          onClose={() => setReversing(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  )
}
