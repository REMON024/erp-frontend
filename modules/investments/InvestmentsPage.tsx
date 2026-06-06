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
  Bank:   'bg-blue-100 text-blue-700',
  Cash:   'bg-green-100 text-green-700',
  Cheque: 'bg-amber-100 text-amber-700',
  Online: 'bg-purple-100 text-purple-700',
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday()     { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

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
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Investor <span className="text-red-500">*</span></label>
            <select {...register('investorId')} className={inp}>
              <option value="">Select investor</option>
              {activeInvestors.map(i => (
                <option key={i.id} value={i.id}>{i.fullName} — {i.role}</option>
              ))}
            </select>
            {errors.investorId && <p className="text-xs text-red-600 mt-1">{errors.investorId.message}</p>}
          </div>
          <div>
            <label className={lbl}>Project <span className="text-red-500">*</span></label>
            <select {...register('projectId')} className={inp}>
              <option value="">Select project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>
              ))}
            </select>
            {errors.projectId && <p className="text-xs text-red-600 mt-1">{errors.projectId.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Investment Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('investmentDate')} className={inp} />
            {errors.investmentDate && <p className="text-xs text-red-600 mt-1">{errors.investmentDate.message}</p>}
          </div>
          <div>
            <label className={lbl}>Amount (৳) <span className="text-red-500">*</span></label>
            <input type="number" min={1} step="any" {...register('amount')} className={inp} placeholder="0.00" />
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Payment Mode <span className="text-red-500">*</span></label>
            <select {...register('paymentMode')} className={inp}>
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
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

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
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
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold text-amber-800">Reversing: {investment.investmentNo}</p>
          <p className="text-amber-700 text-xs mt-0.5">
            {investment.investorName} · {fmt(investment.amount)} · {investment.investmentDate}
          </p>
          <p className="text-xs text-amber-600 mt-1">This will post a reversal journal entry and mark this investment as reversed.</p>
        </div>
        <div>
          <label className={lbl}>Reason for Reversal <span className="text-red-500">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className={inp}
            placeholder="Explain why this investment is being reversed…" />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={onSubmit} disabled={saving}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-60">
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
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Record Investment
          </button>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invested',    value: fmt(totalAmount),         color: 'text-blue-700',  bg: 'bg-blue-50' },
          { label: 'Active Entries',    value: activeInvestments.length, color: 'text-gray-900',  bg: 'bg-white' },
          { label: 'Reversed Entries',  value: reversedCount,            color: reversedCount > 0 ? 'text-red-600' : 'text-gray-400', bg: reversedCount > 0 ? 'bg-red-50' : 'bg-white' },
          { label: 'Investors',         value: [...new Set(activeInvestments.map(i => i.investorId))].length, color: 'text-gray-900', bg: 'bg-white' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border border-gray-200 p-4 ${k.bg}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-white rounded-xl border border-gray-200 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Investor</label>
          <select value={filterInvestor} onChange={e => setFilterInvestor(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Investors</option>
            {investors.map(i => <option key={i.id} value={i.id}>{i.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <button onClick={() => refetch()}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 self-end">
          Refresh
        </button>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load investments.' : null} onRetry={refetch}
        empty={investments.length === 0} emptyMessage="No investment entries found for the selected filters.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Entry No', 'Date', 'Investor', 'Project', 'Amount', 'Mode', 'Reference', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {investments.map(inv => (
                  <tr key={inv.id} className={inv.isReversed ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-blue-700">{inv.investmentNo}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.investmentDate}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{inv.investorName}</p>
                      <p className="text-xs text-gray-400">{inv.investorRole}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">{inv.projectCode}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-green-700">{fmt(inv.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${MODE_COLOR[inv.paymentMode] ?? 'bg-gray-100 text-gray-600'}`}>
                        {inv.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{inv.referenceNo || '—'}</td>
                    <td className="px-4 py-3">
                      {inv.isReversed
                        ? <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <RotateCcw className="w-3 h-3" /> Reversed
                          </span>
                        : <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {!inv.isReversed && (
                        <button onClick={() => setReversing(inv)} title="Reverse this entry"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {inv.isReversed && inv.reversalReason && (
                        <span className="text-xs text-gray-400 italic" title={inv.reversalReason}>
                          <AlertTriangle className="w-3 h-3 inline" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-xs font-bold text-gray-700 uppercase">
                    Total Active Investment
                  </td>
                  <td className="px-4 py-2 font-bold text-green-700">{fmt(totalAmount)}</td>
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
