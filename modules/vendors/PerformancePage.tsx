'use client'
import { useState } from 'react'
import { Star, TrendingUp, TrendingDown } from 'lucide-react'

interface Performance {
  id: string; vendor: string; specialty: string
  projects: number; onTime: number; quality: number; reliability: number; overall: number; trend: 'up' | 'down' | 'stable'
}

const MOCK: Performance[] = [
  { id: 'p1', vendor: 'Jackson',       specialty: 'Electrical Engineer', projects: 12, onTime: 92, quality: 88, reliability: 90, overall: 90, trend: 'up' },
  { id: 'p2', vendor: 'Jatin ahuja',   specialty: 'Raw Material',        projects: 8,  onTime: 85, quality: 95, reliability: 88, overall: 89, trend: 'up' },
  { id: 'p3', vendor: 'khushi sharma', specialty: 'Construction',        projects: 5,  onTime: 70, quality: 75, reliability: 72, overall: 72, trend: 'down' },
  { id: 'p4', vendor: 'Aman Asati',    specialty: 'Construction',        projects: 15, onTime: 95, quality: 93, reliability: 94, overall: 94, trend: 'up' },
]

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value}%</span>
    </div>
  )
}

function StarRating({ value }: { value: number }) {
  const stars = Math.round(value / 20)
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  )
}

export function PerformancePage() {
  const [sort, setSort] = useState<'overall' | 'onTime' | 'quality'>('overall')
  const sorted = [...MOCK].sort((a, b) => b[sort] - a[sort])

  const avg = (key: keyof Performance) =>
    Math.round(MOCK.reduce((s, p) => s + Number(p[key]), 0) / MOCK.length)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performance Rating</h1>
        <p className="text-sm text-gray-500 mt-0.5">Vendor and contractor performance analytics and scoring</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Avg Overall Score', value: `${avg('overall')}%`, color: 'text-blue-600' },
          { label: 'Avg On-Time Rate',  value: `${avg('onTime')}%`,  color: 'text-green-600' },
          { label: 'Avg Quality Score', value: `${avg('quality')}%`, color: 'text-purple-600' },
          { label: 'Avg Reliability',   value: `${avg('reliability')}%`, color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Sort by:</span>
        {(['overall', 'onTime', 'quality'] as const).map(k => (
          <button key={k} onClick={() => setSort(k)}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium ${sort === k ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {k === 'onTime' ? 'On-Time Rate' : k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>

      {/* Performance Cards */}
      <div className="space-y-4">
        {sorted.map((p, i) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  #{i + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{p.vendor}</p>
                  <p className="text-xs text-gray-500">{p.specialty} · {p.projects} projects completed</p>
                  <div className="mt-1"><StarRating value={p.overall} /></div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  {p.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                  <span className={`text-sm font-bold ${p.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>{p.overall}%</span>
                </div>
                <p className="text-xs text-gray-400">Overall Score</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">On-Time Delivery</p>
                <ScoreBar value={p.onTime} color="bg-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Quality Score</p>
                <ScoreBar value={p.quality} color="bg-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Reliability</p>
                <ScoreBar value={p.reliability} color="bg-purple-500" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
