'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ChangeOrder, ChangeOrderStatus } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

function fmt(n: number) { return '৳' + n.toLocaleString('en-BD') }

const STATUS_CONFIG: Record<ChangeOrderStatus, { label: string; color: string }> = {
  draft:     { label: 'Draft',     color: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  approved:  { label: 'Approved',  color: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Rejected',  color: 'bg-red-100 text-red-700' },
}

const coSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  sale_id: z.string().optional(),
  title: z.string().min(3, 'Required'),
  description: z.string().min(10, 'Required'),
  impact_cost: z.coerce.number().min(0),
  impact_days: z.coerce.number().min(0),
})
type COForm = z.infer<typeof coSchema>

function NewCOModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<COForm>({
    resolver: zodResolver(coSchema) as any,
    defaultValues: { impact_cost: 0, impact_days: 0 },
  })
  const mutation = useMutation({
    mutationFn: (d: unknown) => api.post('/change-orders', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['change-orders'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="New Change Order / Variation Order" size="lg">
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Related Sale ID (optional)</label>
            <input {...register('sale_id')} placeholder="sale1, sale2…" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input {...register('title')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea {...register('description')} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none" />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cost Impact (BDT)</label>
            <input type="number" {...register('impact_cost')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Impact (days)</label>
            <input type="number" {...register('impact_days')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {mutation.isPending ? 'Saving…' : 'Create Change Order'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function ChangeOrdersPage() {
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<ChangeOrder | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['change-orders', projectFilter, statusFilter],
    queryFn: () => api.get('/change-orders', { params: { project_id: projectFilter || undefined, status: statusFilter || undefined } }).then(r => r.data),
  })
  const orders: ChangeOrder[] = data?.data ?? []
  const totalImpact: number = data?.total_impact_cost ?? 0

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/change-orders/${id}/approve`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['change-orders'] }); setSelected(null) },
  })
  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/change-orders/${id}/reject`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['change-orders'] }); setSelected(null) },
  })
  const submit = useMutation({
    mutationFn: (id: string) => api.post(`/change-orders/${id}/submit`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['change-orders'] }); setSelected(null) },
  })

  const counts = {
    submitted: orders.filter(o => o.status === 'submitted').length,
    approved: orders.filter(o => o.status === 'approved').length,
    approvedCost: orders.filter(o => o.status === 'approved').reduce((s, o) => s + o.impact_cost, 0),
    approvedDays: orders.filter(o => o.status === 'approved').reduce((s, o) => s + o.impact_days, 0),
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Change Orders / Variation Orders</h1>
          <p className="text-sm text-slate-500">Track scope changes, cost impacts and schedule extensions</p>
        </div>
        <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + New VO
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Pending Approval</p>
          <p className="text-2xl font-bold text-orange-600">{counts.submitted}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Approved VOs</p>
          <p className="text-2xl font-bold text-green-700">{counts.approved}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Approved Cost Impact</p>
          <p className="text-xl font-bold text-blue-700">{fmt(counts.approvedCost)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Schedule Extension</p>
          <p className="text-2xl font-bold text-slate-800">{counts.approvedDays} days</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Projects</option>
          <option value="p1">Residential Complex (P1)</option>
          <option value="p2">Luxury Villas (P2)</option>
        </select>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['', 'draft', 'submitted', 'approved', 'rejected'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {s === '' ? 'All' : STATUS_CONFIG[s as ChangeOrderStatus]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? <div className="p-8 text-center text-slate-400">Loading…</div> : orders.map(co => (
            <button key={co.id} onClick={() => setSelected(selected?.id === co.id ? null : co)}
              className={`w-full text-left bg-white rounded-xl border-2 p-4 transition-colors ${selected?.id === co.id ? 'border-blue-500' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 pr-2">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{co.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{co.reference} · Project {co.project_id.toUpperCase()}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_CONFIG[co.status].color}`}>
                  {STATUS_CONFIG[co.status].label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="font-medium text-slate-700">+{fmt(co.impact_cost)}</span>
                {co.impact_days > 0 && <span>+{co.impact_days} days</span>}
              </div>
            </button>
          ))}
          {!isLoading && orders.length === 0 && <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">No change orders found</div>}
        </div>

        <div className="lg:col-span-3">
          {!selected ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">Select a change order to view details</div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400">{selected.reference}</p>
                  <h3 className="text-lg font-bold text-slate-800 mt-0.5">{selected.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{selected.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selected.status].color}`}>
                  {STATUS_CONFIG[selected.status].label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div><p className="text-xs text-slate-400">Cost Impact</p><p className="font-bold text-blue-700">{fmt(selected.impact_cost)}</p></div>
                <div><p className="text-xs text-slate-400">Schedule Impact</p><p className="font-bold text-slate-800">{selected.impact_days} days</p></div>
                <div><p className="text-xs text-slate-400">Project</p><p className="font-bold text-slate-800">{selected.project_id.toUpperCase()}</p></div>
                {selected.sale_id && <div><p className="text-xs text-slate-400">Related Sale</p><p className="font-semibold text-slate-700">{selected.sale_id}</p></div>}
                {selected.approved_by && <div><p className="text-xs text-slate-400">Approved By</p><p className="font-semibold text-green-700">{selected.approved_by}</p></div>}
                <div><p className="text-xs text-slate-400">Created</p><p className="font-semibold text-slate-700">{selected.created_at.slice(0, 10)}</p></div>
              </div>

              <div className="flex gap-3">
                {selected.status === 'draft' && (
                  <button onClick={() => submit.mutate(selected.id)} disabled={submit.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    Submit for Approval
                  </button>
                )}
                {selected.status === 'submitted' && (
                  <>
                    <button onClick={() => approve.mutate(selected.id)} disabled={approve.isPending}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                      Approve
                    </button>
                    <button onClick={() => reject.mutate(selected.id)} disabled={reject.isPending}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50">
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showNew && <NewCOModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
