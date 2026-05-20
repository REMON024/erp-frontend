'use client'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { ContractorAttendance } from '@/types'
import { cn } from '@/utils/cn'

interface Props { contractorId: string; year: number; month: number }

type AttStatus = ContractorAttendance['status']

const STATUS_STYLES: Record<AttStatus, string> = {
  present:  'bg-green-500 text-white',
  absent:   'bg-red-400 text-white',
  half_day: 'bg-amber-400 text-white',
}

const STATUS_LABEL: Record<AttStatus, string> = {
  present:  'P',
  absent:   'A',
  half_day: 'H',
}

export function AttendanceCalendar({ contractorId, year, month }: Props) {
  const { data } = useQuery<{ data: ContractorAttendance[] }>({
    queryKey: ['attendance', contractorId, year, month],
    queryFn: () => api.get(`/contractors/${contractorId}/attendance?year=${year}&month=${month}`).then((r) => r.data),
  })

  const records = data?.data ?? []
  const byDate = Object.fromEntries(records.map((r) => [r.date, r]))

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay    = new Date(year, month - 1, 1).getDay()
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const present  = records.filter((r) => r.status === 'present').length
  const absent   = records.filter((r) => r.status === 'absent').length
  const halfDay  = records.filter((r) => r.status === 'half_day').length
  const total    = records.length
  const pct      = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0

  return (
    <div>
      {/* Summary chips */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {[
          { label: 'Present',  count: present,  color: 'bg-green-100 text-green-700' },
          { label: 'Absent',   count: absent,   color: 'bg-red-100 text-red-700' },
          { label: 'Half Day', count: halfDay,  color: 'bg-amber-100 text-amber-700' },
          { label: 'Attendance Rate', count: `${pct}%`, color: 'bg-blue-100 text-blue-700' },
        ].map((s) => (
          <div key={s.label} className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold', s.color)}>
            {s.label}: {s.count}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {/* empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {days.map((d) => {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const rec     = byDate[dateStr]
            const isFri   = new Date(year, month - 1, d).getDay() === 5
            return (
              <div key={d}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors',
                  isFri ? 'bg-slate-50 text-slate-300' :
                  rec   ? STATUS_STYLES[rec.status] :
                  'bg-slate-50 text-slate-400'
                )}
              >
                <span className="text-xs leading-none">{d}</span>
                {rec && !isFri && <span className="text-xs leading-none mt-0.5 font-bold">{STATUS_LABEL[rec.status]}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Present</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> Absent</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> Half Day</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" /> Friday</span>
      </div>
    </div>
  )
}
