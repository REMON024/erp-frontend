'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { CostEstimate, BOQItem, BOQCategory } from '@/types'

function fmt(n: number) {
  return '৳' + n.toLocaleString('en-BD')
}

function pct(actual: number, estimated: number) {
  if (estimated === 0) return 0
  return Math.min(100, Math.round((actual / estimated) * 100))
}

const CATEGORY_COLORS: Record<string, string> = {
  Civil: 'bg-amber-100 text-amber-700',
  Structural: 'bg-blue-100 text-blue-700',
  Architectural: 'bg-purple-100 text-purple-700',
  Electrical: 'bg-yellow-100 text-yellow-700',
  Plumbing: 'bg-cyan-100 text-cyan-700',
  HVAC: 'bg-teal-100 text-teal-700',
  Finishing: 'bg-pink-100 text-pink-700',
  Miscellaneous: 'bg-slate-100 text-slate-600',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  approved: 'bg-green-100 text-green-700',
  revised: 'bg-orange-100 text-orange-700',
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const p = pct(value, max)
  const color = p >= 100 ? 'bg-red-500' : p >= 80 ? 'bg-orange-500' : 'bg-blue-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(p, 100)}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-10 text-right">{p}%</span>
    </div>
  )
}

function EstimateCard({ estimate, onSelect, selected }: { estimate: CostEstimate; onSelect: () => void; selected: boolean }) {
  const overallPct = pct(estimate.total_actual, estimate.total_estimated)
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left bg-white rounded-xl border-2 p-4 transition-colors ${selected ? 'border-blue-500' : 'border-slate-200 hover:border-slate-300'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-slate-800 text-sm">{estimate.title}</p>
          <p className="text-xs text-slate-500">v{estimate.version} · {estimate.created_at.slice(0, 10)}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[estimate.status]}`}>
          {estimate.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-xs text-slate-400">Estimated</p>
          <p className="text-sm font-semibold text-slate-800">{fmt(estimate.total_estimated)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Actual</p>
          <p className="text-sm font-semibold text-blue-700">{fmt(estimate.total_actual)}</p>
        </div>
      </div>
      <ProgressBar value={estimate.total_actual} max={estimate.total_estimated} />
    </button>
  )
}

export default function CostingPage() {
  const [projectFilter, setProjectFilter] = useState('')
  const [selectedEstimate, setSelectedEstimate] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<BOQCategory | ''>('')

  const { data: estimatesRes, isLoading } = useQuery({
    queryKey: ['cost-estimates', projectFilter],
    queryFn: () => api.get('/cost-estimates', { params: { project_id: projectFilter || undefined } }).then(r => r.data),
  })
  const estimates: CostEstimate[] = estimatesRes?.data ?? []

  const { data: detailRes } = useQuery({
    queryKey: ['cost-estimate-detail', selectedEstimate],
    queryFn: () => selectedEstimate ? api.get(`/cost-estimates/${selectedEstimate}`).then(r => r.data) : null,
    enabled: !!selectedEstimate,
  })
  const detail: CostEstimate | null = detailRes?.data ?? null

  const { data: summaryRes } = useQuery({
    queryKey: ['estimate-summary', selectedEstimate],
    queryFn: () => selectedEstimate ? api.get(`/cost-estimates/${selectedEstimate}/summary`).then(r => r.data) : null,
    enabled: !!selectedEstimate,
  })
  const categorySummary: Array<{ category: string; estimated_amount: number; actual_amount: number; completion_pct: number }> = summaryRes?.data ?? []

  const items: BOQItem[] = detail?.items ?? []
  const filtered = categoryFilter ? items.filter(i => i.category === categoryFilter) : items
  const categories = Array.from(new Set(items.map(i => i.category))) as BOQCategory[]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Construction Costing & BOQ</h1>
          <p className="text-sm text-slate-500">Bill of Quantities, cost estimates and variance tracking</p>
        </div>
        <select
          value={projectFilter}
          onChange={e => { setProjectFilter(e.target.value); setSelectedEstimate(null) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Projects</option>
          <option value="p1">Residential Complex (P1)</option>
          <option value="p2">Luxury Villas (P2)</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Estimates list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Estimates</h2>
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading…</div>
          ) : (
            estimates.map(e => (
              <EstimateCard
                key={e.id}
                estimate={e}
                selected={selectedEstimate === e.id}
                onSelect={() => setSelectedEstimate(selectedEstimate === e.id ? null : e.id)}
              />
            ))
          )}
        </div>

        {/* BOQ Detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedEstimate ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              Select an estimate to view BOQ items
            </div>
          ) : (
            <>
              {/* Category Summary */}
              {categorySummary.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200">
                  <div className="p-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">Category Summary</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-px bg-slate-100">
                    {categorySummary.map(cs => (
                      <div key={cs.category} className="bg-white px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cs.category] ?? 'bg-slate-100 text-slate-600'}`}>
                            {cs.category}
                          </span>
                          <span className="text-xs text-slate-500">{cs.completion_pct}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Est: {fmt(cs.estimated_amount)}</span>
                          <span>Act: {fmt(cs.actual_amount)}</span>
                        </div>
                        <ProgressBar value={cs.actual_amount} max={cs.estimated_amount} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BOQ Items Table */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                  <h3 className="font-semibold text-slate-800 flex-1">BOQ Items</h3>
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value as BOQCategory | '')}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3 text-left">Category</th>
                        <th className="px-4 py-3 text-left">Description</th>
                        <th className="px-4 py-3 text-right">Unit</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-right">Estimated</th>
                        <th className="px-4 py-3 text-right">Actual</th>
                        <th className="px-4 py-3 text-right">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map(item => {
                        const p = pct(item.actual_amount, item.estimated_amount)
                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category] ?? 'bg-slate-100 text-slate-600'}`}>
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-slate-700 max-w-xs">{item.description}</td>
                            <td className="px-4 py-2 text-right text-slate-500">{item.unit}</td>
                            <td className="px-4 py-2 text-right text-slate-700">{item.quantity.toLocaleString()}</td>
                            <td className="px-4 py-2 text-right text-slate-700">{fmt(item.unit_rate)}</td>
                            <td className="px-4 py-2 text-right font-medium text-slate-800">{fmt(item.estimated_amount)}</td>
                            <td className="px-4 py-2 text-right font-medium text-blue-700">
                              {item.actual_amount > 0 ? fmt(item.actual_amount) : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-2 min-w-24">
                              {item.actual_amount > 0 ? (
                                <div className="flex items-center gap-1">
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${p >= 100 ? 'bg-red-500' : p >= 80 ? 'bg-orange-400' : 'bg-blue-500'}`}
                                      style={{ width: `${Math.min(p, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-400">{p}%</span>
                                </div>
                              ) : <span className="text-xs text-slate-300">not started</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <div className="p-8 text-center text-slate-400">No items found</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
