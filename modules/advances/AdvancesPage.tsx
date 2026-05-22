'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ContractorAdvance, RetentionRelease } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type Tab = 'advances' | 'retention'

function fmt(n: number) { return '৳' + n.toLocaleString('en-BD') }

const ADV_STATUS: Record<string, { label: string; color: string }> = {
  requested: { label: 'Requested', color: 'bg-slate-100 text-slate-600' },
  approved:  { label: 'Approved',  color: 'bg-blue-100 text-blue-700' },
  disbursed: { label: 'Disbursed', color: 'bg-orange-100 text-orange-700' },
  recovered: { label: 'Recovered', color: 'bg-green-100 text-green-700' },
  closed:    { label: 'Closed',    color: 'bg-slate-200 text-slate-500' },
}

const advSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  contractor_id: z.string().min(1, 'Required'),
  amount: z.coerce.number().positive('Must be positive'),
  purpose: z.string().min(10, 'Required'),
  recovery_pct: z.coerce.number().min(1).max(100),
})
type AdvForm = z.infer<typeof advSchema>

const retSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  contractor_id: z.string().min(1, 'Required'),
  bill_id: z.string().min(1, 'Required'),
  amount: z.coerce.number().positive('Must be positive'),
  release_date: z.string().min(1, 'Required'),
  phase: z.enum(['practical_completion', 'defects_liability']),
})
type RetForm = z.infer<typeof retSchema>

function NewAdvanceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<AdvForm>({
    resolver: zodResolver(advSchema) as any,
    defaultValues: { recovery_pct: 10 },
  })
  const mutation = useMutation({
    mutationFn: (d: unknown) => api.post('/contractor-advances', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contractor-advances'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Request Contractor Advance" size="md">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
            <select {...register('project_id')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select…</option>
              <option value="p1">Residential Complex (P1)</option>
              <option value="p2">Luxury Villas (P2)</option>
            </select>
            {errors.project_id && <p className="text-xs text-red-500 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contractor ID</label>
            <input {...register('contractor_id')} placeholder="c1, c2…" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            {errors.contractor_id && <p className="text-xs text-red-500 mt-1">{errors.contractor_id.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (BDT)</label>
            <input type="number" {...register('amount')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Recovery % per bill</label>
            <input type="number" {...register('recovery_pct')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
          <textarea {...register('purpose')} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none" />
          {errors.purpose && <p className="text-xs text-red-500 mt-1">{errors.purpose.message}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {mutation.isPending ? 'Saving…' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function RetentionReleaseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<RetForm>({
    resolver: zodResolver(retSchema) as any,
    defaultValues: { release_date: new Date().toISOString().slice(0, 10), phase: 'practical_completion' },
  })
  const mutation = useMutation({
    mutationFn: (d: unknown) => api.post('/retention-releases', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retention-releases'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Release Retention" size="md">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 p-1">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          This action creates a GL journal entry (Debit: Retention Payable → Credit: Cash). Ensure the defects liability period has elapsed before releasing.
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
            <select {...register('project_id')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select…</option>
              <option value="p1">Residential Complex (P1)</option>
              <option value="p2">Luxury Villas (P2)</option>
            </select>
            {errors.project_id && <p className="text-xs text-red-500 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contractor ID</label>
            <input {...register('contractor_id')} placeholder="c1, c2…" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bill Reference</label>
            <input {...register('bill_id')} placeholder="bill1, bill2…" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (BDT)</label>
            <input type="number" {...register('amount')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Release Date</label>
            <input type="date" {...register('release_date')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phase</label>
            <select {...register('phase')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="practical_completion">Practical Completion (50%)</option>
              <option value="defects_liability">Defects Liability End (50%)</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60">
            {mutation.isPending ? 'Processing…' : 'Release Retention'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AdvancesTab() {
  const [projectFilter, setProjectFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['contractor-advances', projectFilter],
    queryFn: () => api.get('/contractor-advances', { params: { project_id: projectFilter || undefined } }).then(r => r.data),
  })
  const advances: ContractorAdvance[] = data?.data ?? []
  const totalDisbursed: number = data?.total_disbursed ?? 0
  const totalOutstanding: number = data?.total_outstanding ?? 0

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/contractor-advances/${id}/approve`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractor-advances'] }),
  })
  const disburse = useMutation({
    mutationFn: (id: string) => api.post(`/contractor-advances/${id}/disburse`, { disbursed_date: new Date().toISOString().slice(0, 10) }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractor-advances'] }),
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Disbursed</p>
          <p className="text-xl font-bold text-orange-600">{fmt(totalDisbursed)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Outstanding (Unrecovered)</p>
          <p className="text-xl font-bold text-red-600">{fmt(totalOutstanding)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Recovered</p>
          <p className="text-xl font-bold text-green-700">{fmt(totalDisbursed - totalOutstanding)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Projects</option>
          <option value="p1">Residential Complex (P1)</option>
          <option value="p2">Luxury Villas (P2)</option>
        </select>
        <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Request Advance
        </button>
      </div>

      {isLoading ? <div className="p-8 text-center text-slate-400">Loading…</div> : (
        <div className="space-y-3">
          {advances.map(adv => {
            const recoveryPct = adv.amount > 0 ? Math.round((adv.recovered_amount / adv.amount) * 100) : 0
            return (
              <div key={adv.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{adv.purpose}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Contractor {adv.contractor_id} · Project {adv.project_id.toUpperCase()} · Recovery {adv.recovery_pct}% per bill</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ADV_STATUS[adv.status].color}`}>
                    {ADV_STATUS[adv.status].label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div><p className="text-xs text-slate-400">Amount</p><p className="font-bold text-slate-800">{fmt(adv.amount)}</p></div>
                  <div><p className="text-xs text-slate-400">Recovered</p><p className="font-bold text-green-700">{fmt(adv.recovered_amount)}</p></div>
                  <div><p className="text-xs text-slate-400">Outstanding</p><p className="font-bold text-red-600">{fmt(adv.amount - adv.recovered_amount)}</p></div>
                </div>
                {adv.status !== 'requested' && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Recovery progress</span><span>{recoveryPct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${recoveryPct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${recoveryPct}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  {adv.status === 'requested' && (
                    <button onClick={() => approve.mutate(adv.id)} disabled={approve.isPending}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                      Approve
                    </button>
                  )}
                  {adv.status === 'approved' && (
                    <button onClick={() => disburse.mutate(adv.id)} disabled={disburse.isPending}
                      className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 disabled:opacity-50">
                      Disburse (Auto GL)
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {showNew && <NewAdvanceModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

function RetentionTab() {
  const [projectFilter, setProjectFilter] = useState('')
  const [showRelease, setShowRelease] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['retention-releases', projectFilter],
    queryFn: () => api.get('/retention-releases', { params: { project_id: projectFilter || undefined } }).then(r => r.data),
  })
  const releases: RetentionRelease[] = data?.data ?? []
  const totalReleased: number = data?.total_released ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex-1 mr-4">
          <p className="text-xs text-slate-500">Total Retention Released</p>
          <p className="text-xl font-bold text-green-700">{fmt(totalReleased)}</p>
        </div>
        <button onClick={() => setShowRelease(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          + Release Retention
        </button>
      </div>

      <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">All Projects</option>
        <option value="p1">Residential Complex (P1)</option>
        <option value="p2">Luxury Villas (P2)</option>
      </select>

      {isLoading ? <div className="p-8 text-center text-slate-400">Loading…</div> : (
        <div className="bg-white rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Release Date</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Contractor</th>
                <th className="px-4 py-3 text-left">Bill Ref</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Phase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {releases.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{r.release_date}</td>
                  <td className="px-4 py-3 text-slate-700">{r.project_id.toUpperCase()}</td>
                  <td className="px-4 py-3 text-slate-700">{r.contractor_id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.bill_id}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(r.amount)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                      {r.phase === 'practical_completion' ? 'Practical Completion' : 'Defects Liability End'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {releases.length === 0 && <div className="p-8 text-center text-slate-400">No retention releases yet</div>}
        </div>
      )}
      {showRelease && <RetentionReleaseModal onClose={() => setShowRelease(false)} />}
    </div>
  )
}

export default function AdvancesPage() {
  const [tab, setTab] = useState<Tab>('advances')
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Advances & Retention</h1>
        <p className="text-sm text-slate-500">Contractor mobilization advances and retention release management</p>
      </div>
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['advances', 'Contractor Advances'], ['retention', 'Retention Releases']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'advances' && <AdvancesTab />}
      {tab === 'retention' && <RetentionTab />}
    </div>
  )
}
