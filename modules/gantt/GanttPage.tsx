'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { MOCK_PROJECTS } from '@/mocks/fixtures/projects'
import { Milestone } from '@/types'
import { GanttChart, GanttTask } from './GanttChart'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'
import { AlertTriangle, CheckCircle, Clock, Flag } from 'lucide-react'

interface GanttData { tasks: GanttTask[]; milestones: Milestone[] }

function useGantt(projectId: string) {
  return useQuery<GanttData>({
    queryKey: ['gantt', projectId],
    queryFn: () => api.get(`/projects/${projectId}/gantt`).then((r) => r.data),
    enabled: !!projectId,
  })
}

const STATUS_COLORS: Record<Milestone['status'], { dot: string; badge: string; icon: React.ElementType }> = {
  achieved: { dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700',  icon: CheckCircle },
  pending:  { dot: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-600',  icon: Clock },
  delayed:  { dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700',      icon: AlertTriangle },
}

function MilestoneSidebar({ milestones, projectId }: { milestones: Milestone[]; projectId: string }) {
  const qc = useQueryClient()

  const markAchieved = useMutation({
    mutationFn: (id: string) => api.put(`/milestones/${id}`, { status: 'achieved' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gantt', projectId] }),
  })

  return (
    <div className="w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-4 h-fit">
      <div className="flex items-center gap-2 mb-4">
        <Flag className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-800 text-sm">Milestones</h3>
        <span className="ml-auto text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{milestones.length}</span>
      </div>
      <ul className="space-y-3">
        {milestones.map((m) => {
          const cfg = STATUS_COLORS[m.status]
          const Icon = cfg.icon
          return (
            <li key={m.id} className="group">
              <div className="flex items-start gap-2.5">
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', cfg.dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 leading-snug">{m.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(m.due_date)}</p>
                  <span className={cn('inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium', cfg.badge)}>
                    <Icon className="inline w-3 h-3 mr-0.5 -mt-0.5" />
                    {m.status}
                  </span>
                  {m.status === 'pending' && (
                    <button onClick={() => markAchieved.mutate(m.id)}
                      className="mt-1.5 block text-xs text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                      Mark achieved
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
        {milestones.length === 0 && <p className="text-xs text-slate-400">No milestones defined.</p>}
      </ul>
    </div>
  )
}

function DelayBanner({ tasks }: { tasks: GanttTask[] }) {
  const today = new Date()
  const delayed = tasks.filter((t) => new Date(t.end_date) < today && t.status !== 'done')
  if (!delayed.length) return null
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
      <div>
        <span className="font-semibold text-red-700">{delayed.length} task{delayed.length > 1 ? 's are' : ' is'} overdue:</span>
        <span className="text-red-600 ml-1">{delayed.map((t) => t.text).join(', ')}</span>
      </div>
    </div>
  )
}

export function GanttPage() {
  const [projectId, setProjectId] = useState(MOCK_PROJECTS[0].id)
  const [zoom, setZoom] = useState<'week' | 'month'>('month')
  const { data, isLoading } = useGantt(projectId)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gantt Chart</h1>
          <p className="text-sm text-slate-500">Project timeline and milestone tracking</p>
        </div>
        <div className="flex gap-2">
          {/* Project selector */}
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {MOCK_PROJECTS.filter((p) => p.status !== 'completed').map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
          {/* Zoom */}
          <div className="flex rounded-lg border border-slate-300 overflow-hidden bg-white">
            {(['week', 'month'] as const).map((z) => (
              <button key={z} onClick={() => setZoom(z)}
                className={cn('px-3 py-2 text-xs font-medium capitalize transition-colors',
                  zoom === z ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>
                {z}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Delay alerts */}
      {data && <DelayBanner tasks={data.tasks} />}

      {/* Chart + sidebar */}
      {isLoading ? (
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      ) : (
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            <GanttChart tasks={data?.tasks ?? []} zoom={zoom} />
          </div>
          <MilestoneSidebar milestones={data?.milestones ?? []} projectId={projectId} />
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-slate-500 flex-wrap">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-400" /> Critical</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-400" /> High</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-400" /> Medium</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-300" /> Low</div>
        <div className="flex items-center gap-1.5"><div className="w-px h-4 bg-blue-500" style={{ borderLeft: '1.5px dashed' }} /> Today</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100" /> Overdue</div>
      </div>
    </div>
  )
}
