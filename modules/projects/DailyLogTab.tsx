'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { DailyLog } from '@/types'
import { useAuthStore } from '@/store/auth.store'
import { formatDate } from '@/utils/format'
import { Cloud, Sun, CloudRain, Wind, Plus } from 'lucide-react'

const schema = z.object({
  date:          z.string().min(1),
  description:   z.string().min(5, 'Description required'),
  weather:       z.string().optional(),
  workers_count: z.coerce.number().int().min(0).optional(),
})
type FormValues = z.infer<typeof schema>

const WEATHER_ICONS: Record<string, React.ElementType> = {
  Clear: Sun, 'Partly Cloudy': Cloud, Hot: Sun, Rainy: CloudRain, Windy: Wind,
}

interface Props { projectId: string }

function useLogs(projectId: string) {
  return useQuery<{ data: DailyLog[] }>({
    queryKey: ['daily-logs', projectId],
    queryFn: () => api.get(`/projects/${projectId}/logs`).then((r) => r.data),
  })
}

export function DailyLogTab({ projectId }: Props) {
  const [showForm, setShowForm] = useState(false)
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useLogs(projectId)
  const logs = data?.data ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { date: new Date().toISOString().split('T')[0], weather: 'Clear' },
  })

  const mutation = useMutation({
    mutationFn: (values: unknown) =>
      api.post(`/projects/${projectId}/logs`, { ...(values as FormValues), created_by: user?.id }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-logs', projectId] })
      reset()
      setShowForm(false)
    },
  })

  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{logs.length} log entries</p>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Log
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((v) => mutation.mutateAsync(v))}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 space-y-3">
          <h4 className="text-sm font-semibold text-slate-800">New Daily Log</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input type="date" {...register('date')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Weather</label>
              <select {...register('weather')} className={inputCls}>
                {['Clear', 'Partly Cloudy', 'Hot', 'Rainy', 'Windy'].map((w) => <option key={w}>{w}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Workers on Site</label>
            <input type="number" {...register('workers_count')} placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea {...register('description')} rows={3} placeholder="Describe today's work..." className={inputCls} />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-white">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {mutation.isPending ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const WeatherIcon = WEATHER_ICONS[log.weather ?? ''] ?? Sun
            return (
              <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{formatDate(log.date)}</span>
                    {log.weather && (
                      <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                        <WeatherIcon className="w-3 h-3" /> {log.weather}
                      </span>
                    )}
                  </div>
                  {log.workers_count !== undefined && (
                    <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full shrink-0">
                      {log.workers_count} workers
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{log.description}</p>
              </div>
            )
          })}
          {logs.length === 0 && <p className="text-sm text-slate-400">No logs yet. Add today's site report.</p>}
        </div>
      )}
    </div>
  )
}
