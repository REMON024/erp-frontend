'use client'
import { useMemo } from 'react'
import { cn } from '@/utils/cn'

export interface GanttTask {
  id: string
  text: string
  start_date: string
  end_date: string
  progress: number
  status: string
  priority: string
}

interface Props {
  tasks: GanttTask[]
  zoom: 'week' | 'month'
}

const PRIORITY_BAR: Record<string, string> = {
  critical: 'fill-red-500',
  high:     'fill-amber-500',
  medium:   'fill-blue-500',
  low:      'fill-slate-400',
}

const STATUS_TEXT: Record<string, string> = {
  done:        'text-green-600',
  in_progress: 'text-blue-600',
  review:      'text-amber-600',
  pending:     'text-slate-500',
}

const ROW_H   = 44
const LABEL_W = 220
const COL_W   = 36   // px per day
const PAD     = 12

function dateToD(d: string) { return new Date(d) }
function daysBetween(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86400000) }

export function GanttChart({ tasks, zoom }: Props) {
  const { minDate, maxDate, months, days } = useMemo(() => {
    if (!tasks.length) return { minDate: new Date(), maxDate: new Date(), months: [], days: [] }

    const starts = tasks.map((t) => dateToD(t.start_date))
    const ends   = tasks.map((t) => dateToD(t.end_date))
    const min    = new Date(Math.min(...starts.map((d) => d.getTime())))
    const max    = new Date(Math.max(...ends.map((d) => d.getTime())))

    // Pad a bit
    min.setDate(min.getDate() - 3)
    max.setDate(max.getDate() + 3)

    // Build day array
    const dayList: Date[] = []
    const cur = new Date(min)
    while (cur <= max) { dayList.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }

    // Group into months for the header
    const monthMap: Map<string, number> = new Map()
    dayList.forEach((d) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1)
    })
    const monthList = Array.from(monthMap.entries()).map(([k, count]) => {
      const [y, m] = k.split('-').map(Number)
      return { label: new Date(y, m, 1).toLocaleDateString('en-BD', { month: 'short', year: '2-digit' }), count }
    })

    return { minDate: min, maxDate: max, months: monthList, days: dayList }
  }, [tasks])

  if (!tasks.length) {
    return <p className="text-sm text-slate-400 text-center py-12">No tasks to display for this project.</p>
  }

  const today      = new Date()
  const totalDays  = days.length
  const chartW     = totalDays * COL_W
  const svgH       = tasks.length * ROW_H + 50

  const xOf = (date: string) => daysBetween(minDate, dateToD(date)) * COL_W

  const todayX = daysBetween(minDate, today) * COL_W

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="flex">
        {/* Task labels */}
        <div className="shrink-0 border-r border-slate-200 bg-white z-10" style={{ width: LABEL_W }}>
          {/* Header */}
          <div className="h-[50px] flex items-end px-3 pb-2 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Task</span>
          </div>
          {tasks.map((t, i) => (
            <div key={t.id}
              className="flex items-center px-3 border-b border-slate-100"
              style={{ height: ROW_H }}>
              <span className={cn('text-xs font-medium truncate', STATUS_TEXT[t.status] ?? 'text-slate-700')} title={t.text}>
                {t.text}
              </span>
            </div>
          ))}
        </div>

        {/* SVG chart */}
        <div className="overflow-x-auto">
          <svg width={chartW} height={svgH} className="font-sans select-none">
            {/* Month header */}
            {(() => {
              let x = 0
              return months.map((m) => {
                const w = m.count * COL_W
                const el = (
                  <g key={`${m.label}-${x}`}>
                    <rect x={x} y={0} width={w} height={24} fill={x % (COL_W * 2) === 0 ? '#f8fafc' : '#f1f5f9'} />
                    <text x={x + w / 2} y={16} textAnchor="middle" fontSize={10} fill="#64748b" fontWeight="600">{m.label}</text>
                    <line x1={x} y1={0} x2={x} y2={24} stroke="#e2e8f0" />
                  </g>
                )
                x += w
                return el
              })
            })()}

            {/* Day header + grid */}
            {days.map((d, i) => {
              const x = i * COL_W
              const isToday = d.toDateString() === today.toDateString()
              const isFri   = d.getDay() === 5
              return (
                <g key={i}>
                  <rect x={x} y={24} width={COL_W} height={26} fill={isToday ? '#dbeafe' : isFri ? '#fef9c3' : 'transparent'} />
                  {COL_W >= 24 && (
                    <text x={x + COL_W / 2} y={38} textAnchor="middle" fontSize={9} fill={isToday ? '#2563eb' : '#94a3b8'}>
                      {d.getDate()}
                    </text>
                  )}
                  <line x1={x} y1={50} x2={x} y2={svgH} stroke="#f1f5f9" />
                </g>
              )
            })}

            {/* Today line */}
            {todayX >= 0 && todayX <= chartW && (
              <line x1={todayX} y1={24} x2={todayX} y2={svgH} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 3" />
            )}

            {/* Task bars */}
            {tasks.map((t, i) => {
              const x = xOf(t.start_date)
              const w = Math.max(daysBetween(dateToD(t.start_date), dateToD(t.end_date)) * COL_W, COL_W)
              const y = 50 + i * ROW_H + PAD / 2
              const barH = ROW_H - PAD
              const progressW = w * t.progress
              const isLate = new Date(t.end_date) < today && t.status !== 'done'

              return (
                <g key={t.id}>
                  {/* Background bar */}
                  <rect x={x} y={y} width={w} height={barH} rx={4} fill={isLate ? '#fee2e2' : '#e0f2fe'} />
                  {/* Progress fill */}
                  {progressW > 0 && (
                    <rect x={x} y={y} width={Math.min(progressW, w)} height={barH} rx={4}
                      className={PRIORITY_BAR[t.priority] ?? 'fill-blue-400'} opacity={0.85} />
                  )}
                  {/* % label */}
                  <text x={x + 6} y={y + barH / 2 + 4} fontSize={9} fill="white" fontWeight="700">
                    {Math.round(t.progress * 100)}%
                  </text>
                  {/* Row separator */}
                  <line x1={0} y1={50 + (i + 1) * ROW_H} x2={chartW} y2={50 + (i + 1) * ROW_H} stroke="#f1f5f9" />
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  )
}
