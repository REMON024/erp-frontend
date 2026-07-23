'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
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
  'Chairman':          'bg-primary/10 text-primary',
  'Director':          'bg-indigo-100 text-indigo-700',
  'Partner':           'bg-teal-100 text-teal-700',
  'Shareholder':       'bg-cyan-100 text-cyan-700',
}
const roleColor = (r: string) => ROLE_COLOR[r] ?? 'bg-surface-muted text-content-muted'

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
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="px-5 py-3 border-b border-border-default flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold text-content text-sm">Investor ROI</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-content-muted">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Investor</th>
                <th className="text-right px-4 py-2 font-medium">Invested</th>
                <th className="text-right px-4 py-2 font-medium">Distributed</th>
                <th className="text-right px-4 py-2 font-medium">ROI %</th>
              </tr>
            </thead>
            <tbody>
              {roi.rows.map(r => (
                <tr key={r.investorId} className="border-t border-border-default">
                  <td className="px-4 py-2 text-content">{r.investorName}</td>
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
      <div className="flex flex-wrap gap-3 items-end bg-surface rounded-xl border border-border-default p-4">
        <div>
          <label className="block text-xs font-medium text-content-muted mb-1">Project</label>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)}
            className="min-w-[150px]">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-content-muted mb-1">Investor</label>
          <Select value={investorId} onChange={e => setInvestorId(e.target.value)}
            className="min-w-[150px]">
            <option value="">All Investors</option>
            {investors.map(i => <option key={i.id} value={i.id}>{i.fullName}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-content-muted mb-1">From</label>
          <DateField value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="min-w-[150px]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-content-muted mb-1">To</label>
          <DateField value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="min-w-[150px]" />
        </div>
        <button onClick={() => refetch()}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium self-end">
          Refresh
        </button>
      </div>

      <DataState loading={isLoading} error={error ? 'Failed to load report.' : null} onRetry={refetch}
        empty={!isLoading && data?.grandTotal === 0} emptyMessage="No investment data for the selected filters.">
        <>
          {/* Grand total banner */}
          <div className="rounded-xl border border-blue-200 bg-primary/10 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Total Capital Invested</p>
                <p className="text-xs text-primary">Across {data?.byProject.length ?? 0} project(s) · {data?.byInvestor.length ?? 0} investor(s)</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-900">{fmt(data?.grandTotal ?? 0)}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── By Project ───────────────────────────────────────────── */}
            <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border-default">
                <FolderKanban className="w-4 h-4 text-content-muted" />
                <h3 className="font-semibold text-content">Investment by Project</h3>
              </div>
              <div className="p-5 space-y-4">
                {data?.byProject.map(row => {
                  const barPct = Math.round((row.totalInvested / maxProjectAmount) * 100)
                  return (
                    <div key={row.projectId}>
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <p className="text-sm font-semibold text-content">{row.projectName}</p>
                          <p className="text-xs text-content-muted">{row.projectCode} · {row.investorCount} investor{row.investorCount !== 1 ? 's' : ''} · Last: {row.lastInvestmentDate}</p>
                        </div>
                        <p className="text-sm font-bold text-primary ml-4 shrink-0">{fmt(row.totalInvested)}</p>
                      </div>
                      <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Table summary */}
              <div className="border-t border-border-default">
                <table className="w-full text-xs">
                  <thead className="bg-surface-muted">
                    <tr>
                      {['Project', 'Investors', 'Total Invested'].map(h => (
                        <th key={h} className="px-4 py-2 text-left font-semibold text-content-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {data?.byProject.map(row => (
                      <tr key={row.projectId} className="hover:bg-surface-muted">
                        <td className="px-4 py-2">
                          <span className="bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded text-[11px]">{row.projectCode}</span>
                        </td>
                        <td className="px-4 py-2 text-content-muted">{row.investorCount}</td>
                        <td className="px-4 py-2 font-bold text-primary">{fmt(row.totalInvested)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-border-default bg-surface-muted font-bold">
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-content uppercase text-[11px]">Total</td>
                      <td className="px-4 py-2 text-blue-800">{fmt(data?.grandTotal ?? 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── By Investor ──────────────────────────────────────────── */}
            <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border-default">
                <Users className="w-4 h-4 text-content-muted" />
                <h3 className="font-semibold text-content">Investment by Investor</h3>
              </div>
              <div className="p-5 space-y-4">
                {data?.byInvestor.map(row => {
                  const barPct = Math.round((row.totalInvested / maxInvestorAmount) * 100)
                  return (
                    <div key={row.investorId}>
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-content">{row.investorName}</p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleColor(row.investorRole)}`}>{row.investorRole}</span>
                          </div>
                          <p className="text-xs text-content-muted">{row.investorCode} · {row.projectCount} project{row.projectCount !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <p className="text-sm font-bold text-green-700">{fmt(row.totalInvested)}</p>
                          <p className="text-xs text-content-muted">{row.sharePercent}% share</p>
                        </div>
                      </div>
                      <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Contribution share table */}
              <div className="border-t border-border-default">
                <table className="w-full text-xs">
                  <thead className="bg-surface-muted">
                    <tr>
                      {['Investor', 'Role', 'Projects', 'Total', 'Share %'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-content-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {data?.byInvestor.map(row => (
                      <tr key={row.investorId} className="hover:bg-surface-muted">
                        <td className="px-3 py-2 font-medium text-content">{row.investorName}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleColor(row.investorRole)}`}>{row.investorRole}</span>
                        </td>
                        <td className="px-3 py-2 text-content-muted">{row.projectCount}</td>
                        <td className="px-3 py-2 font-bold text-green-700">{fmt(row.totalInvested)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                              <div className="h-1.5 bg-green-400 rounded-full" style={{ width: `${row.sharePercent}%` }} />
                            </div>
                            <span className="text-content-muted font-semibold">{row.sharePercent}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-border-default bg-surface-muted font-bold">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-content uppercase text-[11px]">Total</td>
                      <td className="px-3 py-2 text-green-800">{fmt(data?.grandTotal ?? 0)}</td>
                      <td className="px-3 py-2 text-content-muted">100%</td>
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
