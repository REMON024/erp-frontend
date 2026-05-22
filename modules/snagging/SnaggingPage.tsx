'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { SnagItem, DefectStatus, DefectSeverity } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const SEVERITY: Record<DefectSeverity, { label: string; color: string; dot: string }> = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700 border border-red-200',    dot: 'bg-red-500' },
  major:    { label: 'Major',    color: 'bg-orange-100 text-orange-700 border border-orange-200', dot: 'bg-orange-500' },
  minor:    { label: 'Minor',    color: 'bg-slate-100 text-slate-600 border border-slate-200',    dot: 'bg-slate-400' },
}

const STATUS_CFG: Record<DefectStatus, { label: string; color: string }> = {
  open:        { label: 'Open',        color: 'bg-red-50 text-red-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-700' },
  resolved:    { label: 'Resolved',    color: 'bg-green-50 text-green-700' },
  closed:      { label: 'Closed',      color: 'bg-slate-100 text-slate-500' },
}

const snagSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  unit_id: z.string().optional(),
  title: z.string().min(3, 'Required'),
  description: z.string().min(10, 'Required'),
  location: z.string().min(2, 'Required'),
  severity: z.enum(['minor', 'major', 'critical']),
  assigned_to: z.string().optional(),
  target_date: z.string().optional(),
})
type SnagForm = z.infer<typeof snagSchema>

function NewSnagModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<SnagForm>({
    resolver: zodResolver(snagSchema) as any,
    defaultValues: { severity: 'minor', reported_date: new Date().toISOString().slice(0, 10) } as any,
  })
  const mutation = useMutation({
    mutationFn: (d: unknown) => api.post('/snag-items', { ...(d as object), reported_by: 'user1', reported_date: new Date().toISOString().slice(0, 10) }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snag-items'] }); qc.invalidateQueries({ queryKey: ['snag-summary'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Log Defect / Snag" size="lg">
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit ID (optional)</label>
            <input {...register('unit_id')} placeholder="u101, u201…" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input {...register('title')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
          <input {...register('location')} placeholder="e.g. Unit A-101 Master Bathroom" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea {...register('description')} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none" />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
            <select {...register('severity')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
            <input {...register('assigned_to')} placeholder="user2…" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
            <input type="date" {...register('target_date')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
            {mutation.isPending ? 'Saving…' : 'Log Defect'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function SnaggingPage() {
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [selected, setSelected] = useState<SnagItem | null>(null)
  const [showNew, setShowNew] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['snag-items', projectFilter, statusFilter, severityFilter],
    queryFn: () => api.get('/snag-items', {
      params: { project_id: projectFilter || undefined, status: statusFilter || undefined, severity: severityFilter || undefined },
    }).then(r => r.data),
  })
  const items: SnagItem[] = data?.data ?? []

  const { data: summaryRes } = useQuery({
    queryKey: ['snag-summary', projectFilter],
    queryFn: () => api.get('/snag-items/summary', { params: { project_id: projectFilter || undefined } }).then(r => r.data),
  })
  const s = summaryRes?.data

  const resolve = useMutation({
    mutationFn: (id: string) => api.post(`/snag-items/${id}/resolve`, { resolved_date: new Date().toISOString().slice(0, 10) }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snag-items'] }); qc.invalidateQueries({ queryKey: ['snag-summary'] }); setSelected(null) },
  })
  const close = useMutation({
    mutationFn: (id: string) => api.post(`/snag-items/${id}/close`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snag-items'] }); qc.invalidateQueries({ queryKey: ['snag-summary'] }); setSelected(null) },
  })
  const start = useMutation({
    mutationFn: (id: string) => api.patch(`/snag-items/${id}`, { status: 'in_progress' }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snag-items'] }); setSelected(null) },
  })

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Snagging / Defects</h1>
          <p className="text-sm text-slate-500">Track, assign and resolve construction defects and punch list items</p>
        </div>
        <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
          + Log Defect
        </button>
      </div>

      {s && (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {[
            { label: 'Total', value: s.total, color: 'text-slate-800' },
            { label: 'Open', value: s.open, color: 'text-red-600' },
            { label: 'In Progress', value: s.in_progress, color: 'text-blue-600' },
            { label: 'Resolved', value: s.resolved, color: 'text-green-600' },
            { label: 'Closed', value: s.closed, color: 'text-slate-500' },
            { label: 'Critical', value: s.critical, color: 'text-red-700' },
            { label: 'Major', value: s.major, color: 'text-orange-600' },
          ].map(item => (
            <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Projects</option>
          <option value="p1">Residential Complex (P1)</option>
          <option value="p2">Luxury Villas (P2)</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="major">Major</option>
          <option value="minor">Minor</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Defects ({items.length})</h3>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading…</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
              {items.map(item => {
                const isOverdue = item.status !== 'resolved' && item.status !== 'closed' && item.target_date && item.target_date < today
                return (
                  <button key={item.id} onClick={() => setSelected(selected?.id === item.id ? null : item)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === item.id ? 'bg-blue-50' : ''} ${isOverdue ? 'border-l-2 border-l-red-400' : ''}`}>
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-slate-800 flex-1 pr-2 leading-tight">{item.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${SEVERITY[item.severity].color}`}>
                        {SEVERITY[item.severity].label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{item.location}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_CFG[item.status].color}`}>{STATUS_CFG[item.status].label}</span>
                    </div>
                    {isOverdue && <p className="text-xs text-red-500 mt-1">Overdue (target: {item.target_date})</p>}
                  </button>
                )
              })}
              {items.length === 0 && <div className="p-8 text-center text-slate-400">No defects found</div>}
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {!selected ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">Select a defect to view details</div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY[selected.severity].color}`}>
                      {SEVERITY[selected.severity].label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CFG[selected.status].color}`}>
                      {STATUS_CFG[selected.status].label}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{selected.title}</h3>
                  <p className="text-sm text-slate-500">{selected.location}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div><p className="text-xs text-slate-400">Project</p><p className="font-semibold text-slate-800">{selected.project_id.toUpperCase()}</p></div>
                {selected.unit_id && <div><p className="text-xs text-slate-400">Unit</p><p className="font-semibold text-slate-800">{selected.unit_id}</p></div>}
                <div><p className="text-xs text-slate-400">Reported</p><p className="font-semibold text-slate-700">{selected.reported_date}</p></div>
                {selected.target_date && <div><p className="text-xs text-slate-400">Target</p><p className={`font-semibold ${selected.target_date < today && selected.status !== 'resolved' && selected.status !== 'closed' ? 'text-red-600' : 'text-slate-700'}`}>{selected.target_date}</p></div>}
                {selected.assigned_to && <div><p className="text-xs text-slate-400">Assigned To</p><p className="font-semibold text-slate-700">{selected.assigned_to}</p></div>}
                {selected.resolved_date && <div><p className="text-xs text-slate-400">Resolved</p><p className="font-semibold text-green-700">{selected.resolved_date}</p></div>}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm text-slate-700 leading-relaxed">{selected.description}</p>
              </div>

              <div className="flex gap-3 flex-wrap">
                {selected.status === 'open' && (
                  <button onClick={() => start.mutate(selected.id)} disabled={start.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    Start Work
                  </button>
                )}
                {(selected.status === 'open' || selected.status === 'in_progress') && (
                  <button onClick={() => resolve.mutate(selected.id)} disabled={resolve.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    Mark Resolved
                  </button>
                )}
                {selected.status === 'resolved' && (
                  <button onClick={() => close.mutate(selected.id)} disabled={close.isPending}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
                    Close Defect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showNew && <NewSnagModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
