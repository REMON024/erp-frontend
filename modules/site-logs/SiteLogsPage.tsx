'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { DailyLog } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const WEATHER_MAP: Record<string, { label: string; icon: string; color: string }> = {
  sunny:         { label: 'Sunny',        icon: '☀️',  color: 'bg-yellow-50 text-yellow-700' },
  partly_cloudy: { label: 'Partly Cloudy', icon: '⛅', color: 'bg-amber-50 text-amber-700' },
  cloudy:        { label: 'Cloudy',        icon: '☁️',  color: 'bg-slate-100 text-slate-600' },
  rainy:         { label: 'Rainy',         icon: '🌧️', color: 'bg-blue-50 text-blue-700' },
}

const logSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required'),
  description: z.string().min(10, 'Required'),
  weather: z.string().optional(),
  workers_count: z.coerce.number().min(0).optional(),
})
type LogForm = z.infer<typeof logSchema>

function NewLogModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<LogForm>({
    resolver: zodResolver(logSchema) as any,
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  })
  const mutation = useMutation({
    mutationFn: (d: unknown) => api.post('/site-logs', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['site-logs'] }); qc.invalidateQueries({ queryKey: ['site-logs-summary'] }); onClose() },
    onError: (err: any) => alert(err.response?.data?.message ?? 'Error saving log'),
  })
  return (
    <Modal open onClose={onClose} title="Add Daily Site Log" size="lg">
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" {...register('date')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Weather</label>
            <select {...register('weather')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select…</option>
              <option value="sunny">☀️ Sunny</option>
              <option value="partly_cloudy">⛅ Partly Cloudy</option>
              <option value="cloudy">☁️ Cloudy</option>
              <option value="rainy">🌧️ Rainy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Workers on Site</label>
            <input type="number" {...register('workers_count')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Activities & Progress</label>
          <textarea {...register('description')} rows={5} placeholder="Describe work done, issues, material deliveries, inspections…" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none" />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {mutation.isPending ? 'Saving…' : 'Save Log'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function SiteLogsPage() {
  const [projectFilter, setProjectFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<DailyLog | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['site-logs', projectFilter, fromDate, toDate],
    queryFn: () => api.get('/site-logs', {
      params: { project_id: projectFilter || undefined, from: fromDate || undefined, to: toDate || undefined },
    }).then(r => r.data),
  })
  const logs: DailyLog[] = data?.data ?? []

  const { data: summaryRes } = useQuery({
    queryKey: ['site-logs-summary', projectFilter],
    queryFn: () => api.get('/site-logs/summary', { params: { project_id: projectFilter || undefined } }).then(r => r.data),
  })
  const summary = summaryRes?.data

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/site-logs/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['site-logs'] }); setSelected(null) },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Site Daily Logs</h1>
          <p className="text-sm text-slate-500">Daily progress records, weather, and workforce tracking</p>
        </div>
        <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Today's Log
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Total Log Days</p>
            <p className="text-2xl font-bold text-slate-800">{summary.total_log_days}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Total Worker-Days</p>
            <p className="text-2xl font-bold text-blue-700">{summary.total_worker_days.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Rain Days (no work)</p>
            <p className="text-2xl font-bold text-sky-600">{summary.rain_days}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Projects</option>
          <option value="p1">Residential Complex (P1)</option>
          <option value="p2">Luxury Villas (P2)</option>
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Logs ({logs.length})</h3>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading…</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
              {logs.map(log => {
                const w = WEATHER_MAP[log.weather ?? '']
                return (
                  <button key={log.id} onClick={() => setSelected(selected?.id === log.id ? null : log)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === log.id ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{log.date}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Project {log.project_id.toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        {w && <span className={`text-xs px-2 py-0.5 rounded-full ${w.color}`}>{w.icon} {w.label}</span>}
                        {log.workers_count !== undefined && (
                          <p className="text-xs text-slate-400 mt-1">{log.workers_count} workers</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{log.description}</p>
                  </button>
                )
              })}
              {logs.length === 0 && <div className="p-8 text-center text-slate-400">No logs found</div>}
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {!selected ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">Select a log to view details</div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selected.date}</h3>
                  <p className="text-sm text-slate-500">Project {selected.project_id.toUpperCase()} · Logged by {selected.created_by}</p>
                </div>
                <button onClick={() => del.mutate(selected.id)} className="text-xs border border-red-200 text-red-500 px-3 py-1 rounded-lg hover:bg-red-50">
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                {selected.weather && (
                  <div>
                    <p className="text-xs text-slate-400">Weather</p>
                    <p className="font-semibold text-slate-800">{WEATHER_MAP[selected.weather]?.icon} {WEATHER_MAP[selected.weather]?.label ?? selected.weather}</p>
                  </div>
                )}
                {selected.workers_count !== undefined && (
                  <div>
                    <p className="text-xs text-slate-400">Workers on Site</p>
                    <p className="font-bold text-blue-700 text-lg">{selected.workers_count}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Activities & Progress</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNew && <NewLogModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
