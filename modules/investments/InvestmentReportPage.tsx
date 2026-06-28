'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { BarChart2, Users, FolderKanban, TrendingUp } from 'lucide-react'

interface Project  { id: number; projectCode: string; projectName: string }
interface Investor { id: number; fullName: string }

interface ByProjectRow {
  projectId: number; projectName: string; projectCode: string
  totalInvested: number; investorCount: number; lastInvestmentDate: string
}
interface ByInvestorRow {
  investorId: number; investorCode: string; investorName: string; investorRole: string
  totalInvested: number; projectCount: number; sharePercent: number
}
interface InvestmentSummaryDto {
  byProject:  ByProjectRow[]
  byInvestor: ByInvestorRow[]
  grandTotal: number
}

interface InvestorRoiRow {
  investorId: number; investorName: string
  invested: number; distributed: number; roiPct: number
}
interface InvestorRoiDto { rows: InvestorRoiRow[]; totalInvested: number; totalDistributed: number }

function fmt(n: number) { return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

const ROLE_COLOR: Record<string, string> = {
  'Managing Director': 'bg-purple-100 text-purple-700',
  'Chairman':          'bg-blue-100 text-blue-700',
  'Director':          'bg-indigo-100 text-indigo-700',
  'Partner':           'bg-teal-100 text-teal-700',
  'Shareholder':       'bg-cyan-100 text-cyan-700',
}
const roleColor = (r: string) => ROLE_COLOR[r] ?? 'bg-gray-100 text-gray-600'

export function InvestmentReportPage() {
  const [projectId,  setProjectId]  = useState('')
  const [investorId, setInvestorId] = useState('')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  const { data: projects  = [] } = useApiData<Project[]>({ url: '/projects',  queryKey: ['projects-list'] })
  const { data: investors = [] } = useApiData<Investor[]>({ url: '/investors', queryKey: ['investors-list'] })

  const { data, isLoading, error, refetch } = useApiData<InvestmentSummaryDto>({
    url: '/investments/summary',
    params: {
      projectId:  projectId  || undefined,
      investorId: investorId || undefined,
      dateFrom:   dateFrom   || undefined,
      dateTo:     dateTo     || undefined,
    },
    queryKey: ['investment-summary', projectId, investorId, dateFrom, dateTo],
  })

  const { data: roi } = useApiData<InvestorRoiDto>({ url: '/profit-distribution/roi', queryKey: ['investor-roi'] })

  const maxProjectAmount  = Math.max(...(data?.byProject.map(r => r.totalInvested)  ?? [1]), 1)
  const maxInvestorAmount = Math.max(...(data?.byInvestor.map(r => r.totalInvested) ?? [1]), 1)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investment Report"
        subtitle="Capital contributions by project and by investor with share percentages"
      />

      {/* Investor ROI across projects (PRD-08 FR-PRD-08) */}
      {roi && roi.rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold text-gray-800 text-sm">Investor ROI</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Investor</th>
                <th className="text-right px-4 py-2 font-medium">Invested</th>
                <th className="text-right px-4 py-2 font-medium">Distributed</th>
                <th className="text-right px-4 py-2 font-medium">ROI %</th>
              </tr>
            </thead>
            <tbody>
              {roi.rows.map(r => (
                <tr key={r.investorId} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-900">{r.investorName}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.invested)}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.distributed)}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${r.roiPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{r.roiPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-white rounded-xl border border-gray-200 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Investor</label>
          <select value={investorId} onChange={e => setInvestorId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Investors</option>
            {investors.map(i => <option key={i.id} value={i.id}>{i.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <button onClick={() => refetch()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium self-end">
          Refresh
        </button>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load report.' : null} onRetry={refetch}
        empty={!isLoading && data?.grandTotal === 0} emptyMessage="No investment data for the selected filters.">
        <>
          {/* Grand total banner */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Total Capital Invested</p>
                <p className="text-xs text-blue-600">Across {data?.byProject.length ?? 0} project(s) · {data?.byInvestor.length ?? 0} investor(s)</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-900">{fmt(data?.grandTotal ?? 0)}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── By Project ───────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                <FolderKanban className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-800">Investment by Project</h3>
              </div>
              <div className="p-5 space-y-4">
                {data?.byProject.map(row => {
                  const barPct = Math.round((row.totalInvested / maxProjectAmount) * 100)
                  return (
                    <div key={row.projectId}>
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{row.projectName}</p>
                          <p className="text-xs text-gray-400">{row.projectCode} · {row.investorCount} investor{row.investorCount !== 1 ? 's' : ''} · Last: {row.lastInvestmentDate}</p>
                        </div>
                        <p className="text-sm font-bold text-blue-700 ml-4 shrink-0">{fmt(row.totalInvested)}</p>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Table summary */}
              <div className="border-t border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Project', 'Investors', 'Total Invested'].map(h => (
                        <th key={h} className="px-4 py-2 text-left font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data?.byProject.map(row => (
                      <tr key={row.projectId} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <span className="bg-blue-50 text-blue-700 font-medium px-1.5 py-0.5 rounded text-[11px]">{row.projectCode}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-500">{row.investorCount}</td>
                        <td className="px-4 py-2 font-bold text-blue-700">{fmt(row.totalInvested)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-gray-700 uppercase text-[11px]">Total</td>
                      <td className="px-4 py-2 text-blue-800">{fmt(data?.grandTotal ?? 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── By Investor ──────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                <Users className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-800">Investment by Investor</h3>
              </div>
              <div className="p-5 space-y-4">
                {data?.byInvestor.map(row => {
                  const barPct = Math.round((row.totalInvested / maxInvestorAmount) * 100)
                  return (
                    <div key={row.investorId}>
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-800">{row.investorName}</p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleColor(row.investorRole)}`}>{row.investorRole}</span>
                          </div>
                          <p className="text-xs text-gray-400">{row.investorCode} · {row.projectCount} project{row.projectCount !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <p className="text-sm font-bold text-green-700">{fmt(row.totalInvested)}</p>
                          <p className="text-xs text-gray-400">{row.sharePercent}% share</p>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Contribution share table */}
              <div className="border-t border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Investor', 'Role', 'Projects', 'Total', 'Share %'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data?.byInvestor.map(row => (
                      <tr key={row.investorId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{row.investorName}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleColor(row.investorRole)}`}>{row.investorRole}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{row.projectCount}</td>
                        <td className="px-3 py-2 font-bold text-green-700">{fmt(row.totalInvested)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-1.5 bg-green-400 rounded-full" style={{ width: `${row.sharePercent}%` }} />
                            </div>
                            <span className="text-gray-600 font-semibold">{row.sharePercent}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-gray-700 uppercase text-[11px]">Total</td>
                      <td className="px-3 py-2 text-green-800">{fmt(data?.grandTotal ?? 0)}</td>
                      <td className="px-3 py-2 text-gray-600">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </>
      </DataState>
    </div>
  )
}
