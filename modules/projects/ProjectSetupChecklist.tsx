'use client'
import { useApiData } from '@/hooks/useApiData'
import { CheckCircle2, Circle, ArrowRight, Loader2 } from 'lucide-react'

interface ChecklistItem {
  key:         string
  stage:       string
  label:       string
  description: string
  complete:    boolean
  count:       number
  route:       string
}

interface Checklist {
  projectId:      number
  projectCode:    string
  projectName:    string
  completedSteps: number
  totalSteps:     number
  items:          ChecklistItem[]
}

const STAGE_COLORS: Record<string, string> = {
  'Stage 1 — Project Setup':   'bg-blue-100 text-blue-700',
  'Stage 2 — Budget Planning': 'bg-purple-100 text-purple-700',
  'Stage 3 — Procurement':     'bg-amber-100 text-amber-700',
  'Stage 4 — Site Execution':  'bg-orange-100 text-orange-700',
  'Stage 5 — Sales':           'bg-green-100 text-green-700',
}

export function ProjectSetupChecklist({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const { data, isLoading } = useApiData<Checklist>({
    url: `/projects/${projectId}/setup-checklist`,
    queryKey: ['project-setup-checklist', projectId],
  })

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const pct = Math.round((data.completedSteps / data.totalSteps) * 100)

  // Group items by stage
  const stages: Record<string, ChecklistItem[]> = {}
  data.items.forEach(item => {
    if (!stages[item.stage]) stages[item.stage] = []
    stages[item.stage].push(item)
  })

  const handleGoTo = (route: string) => {
    onClose()
    window.location.href = route
  }

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-gray-400 font-mono">{data.projectCode}</p>
            <p className="font-semibold text-gray-900">{data.projectName}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{data.completedSteps}<span className="text-sm text-gray-400 font-normal">/{data.totalSteps}</span></p>
            <p className="text-xs text-gray-500">steps complete</p>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          {pct === 100
            ? '🎉 All steps complete — project is fully set up.'
            : `${pct}% complete — ${data.totalSteps - data.completedSteps} step${data.totalSteps - data.completedSteps !== 1 ? 's' : ''} remaining`}
        </p>
      </div>

      {/* Checklist by stage */}
      {Object.entries(stages).map(([stage, items]) => {
        const stageComplete = items.every(i => i.complete)
        const stageColor    = STAGE_COLORS[stage] ?? 'bg-gray-100 text-gray-600'
        return (
          <div key={stage} className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stageColor}`}>{stage}</span>
              {stageComplete && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            </div>
            {items.map(item => (
              <div
                key={item.key}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors
                  ${item.complete
                    ? 'border-green-100 bg-green-50/50'
                    : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'}`}
              >
                {/* Icon */}
                <div className="mt-0.5 shrink-0">
                  {item.complete
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : <Circle className="w-5 h-5 text-gray-300" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${item.complete ? 'text-green-800' : 'text-gray-800'}`}>
                      {item.label}
                    </p>
                    {item.complete && item.count > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                        {item.count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
                </div>

                {/* Action */}
                {!item.complete && (
                  <button
                    onClick={() => handleGoTo(item.route)}
                    className="shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-0.5"
                  >
                    Go <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {/* Footer tip */}
      {data.completedSteps < data.totalSteps && (
        <p className="text-xs text-gray-400 text-center pb-1">
          Complete steps in order — each stage depends on the previous one.
        </p>
      )}
    </div>
  )
}
