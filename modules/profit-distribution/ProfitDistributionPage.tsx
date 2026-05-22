'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, PieChart, CheckCircle, Clock } from 'lucide-react'
import { INVESTORS } from '@/modules/investors/InvestorsPage'

const PROJECTS = [
  { id: 'p1', name: 'Block-A — Mirpur 12',       net_profit: 12200000, status: 'completed' as const },
  { id: 'p2', name: 'Block-B — Mohammadpur',      net_profit:  3930000, status: 'completed' as const },
  { id: 'p3', name: 'Block-C — Uttara Sector 7', net_profit:       0,  status: 'ongoing'   as const },
  { id: 'p4', name: 'Block-D — Bashundhara',      net_profit:       0,  status: 'ongoing'   as const },
]

// Contribution shares per project (matching InvestmentRecordsPage data)
const CONTRIBUTION_SHARES: Record<string, Record<string, number>> = {
  p1: { inv1: 50, inv2: 30, inv3: 20 },
  p2: { inv1: 61.5, inv2: 38.5 },
  p3: { inv1: 50, inv2: 31.25, inv3: 18.75 },
  p4: { inv4: 57.1, inv5: 42.9 },
}

interface DistributionRecord {
  id: string; project_id: string; investor_id: string
  share_pct: number; amount: number; date: string
  payment_mode: string; status: 'paid' | 'pending'; notes: string
}

function buildDistributions(): DistributionRecord[] {
  const result: DistributionRecord[] = []
  // Block-A distributed
  const sharesA = CONTRIBUTION_SHARES['p1']
  Object.entries(sharesA).forEach(([invId, pct], i) => {
    result.push({
      id: `dist-p1-${i}`, project_id: 'p1', investor_id: invId,
      share_pct: pct, amount: Math.round((12200000 * pct) / 100),
      date: '2025-08-01', payment_mode: 'Bank Transfer', status: 'paid', notes: ''
    })
  })
  // Block-B distributed
  const sharesB = CONTRIBUTION_SHARES['p2']
  Object.entries(sharesB).forEach(([invId, pct], i) => {
    result.push({
      id: `dist-p2-${i}`, project_id: 'p2', investor_id: invId,
      share_pct: pct, amount: Math.round((3930000 * pct) / 100),
      date: '2025-10-01', payment_mode: 'Bank Transfer', status: 'paid', notes: ''
    })
  })
  return result
}

const MOCK_DISTRIBUTIONS = buildDistributions()
const MODES = ['Bank Transfer', 'Cheque', 'Cash', 'NEFT/RTGS']

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function getInvestor(id: string) { return INVESTORS.find(i => i.id === id) }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  project_id:   z.string().min(1, 'Required'),
  date:         z.string().min(1, 'Required'),
  payment_mode: z.string().min(1, 'Required'),
  notes:        z.string().optional(),
})
type Form = z.infer<typeof schema>

function DistributeModal({
  onClose, onAdd
}: {
  onClose: () => void
  onAdd: (records: DistributionRecord[]) => void
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { date: new Date().toISOString().split('T')[0], payment_mode: 'Bank Transfer' },
  })
  const selectedProject = watch('project_id')
  const proj = PROJECTS.find(p => p.id === selectedProject)
  const shares = selectedProject ? CONTRIBUTION_SHARES[selectedProject] : {}

  return (
    <Modal open onClose={onClose} title="Distribute Profit" size="md">
      <form onSubmit={handleSubmit(d => {
        if (!proj || !shares) return
        const records: DistributionRecord[] = Object.entries(shares).map(([invId, pct], i) => ({
          id: `dist-${Date.now()}-${i}`,
          project_id: d.project_id, investor_id: invId,
          share_pct: pct, amount: Math.round((proj.net_profit * pct) / 100),
          date: d.date, payment_mode: d.payment_mode, status: 'paid',
          notes: d.notes ?? ''
        }))
        onAdd(records)
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project</label>
            <select {...register('project_id')} className={inp}>
              <option value="">Select project</option>
              {PROJECTS.filter(p => p.net_profit > 0).map(p => (
                <option key={p.id} value={p.id}>{p.name} — {fmt(p.net_profit)}</option>
              ))}
            </select>
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Payment Mode</label>
            <select {...register('payment_mode')} className={inp}>
              {MODES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {proj && Object.keys(shares).length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-800 mb-2">Distribution Preview — Net Profit: {fmt(proj.net_profit)}</p>
            <div className="space-y-1.5">
              {Object.entries(shares).map(([invId, pct]) => {
                const inv = getInvestor(invId)
                return (
                  <div key={invId} className="flex justify-between text-xs text-blue-800">
                    <span>{inv?.name} ({pct}%)</span>
                    <span className="font-bold">{fmt(Math.round((proj.net_profit * pct) / 100))}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Distribution Date</label>
            <input type="date" {...register('date')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <input {...register('notes')} className={inp} placeholder="Optional notes" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">Distribute Profit</button>
        </div>
      </form>
    </Modal>
  )
}

export function ProfitDistributionPage() {
  const [distributions, setDistributions] = useState<DistributionRecord[]>(MOCK_DISTRIBUTIONS)
  const [showAdd, setShowAdd]              = useState(false)
  const [filterProject, setFP]            = useState('')

  const displayed = filterProject ? distributions.filter(d => d.project_id === filterProject) : distributions

  const totalDistributed = distributions.filter(d => d.status === 'paid').reduce((s, d) => s + d.amount, 0)

  // Per-investor totals
  const investorTotals = INVESTORS.map(inv => {
    const total = distributions.filter(d => d.investor_id === inv.id && d.status === 'paid').reduce((s, d) => s + d.amount, 0)
    return { ...inv, total }
  }).filter(i => i.total > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit Distribution</h1>
          <p className="text-sm text-gray-500 mt-0.5">Distribute net profit to investors based on contribution share</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Distribute Profit
        </button>
      </div>

      {/* Project profitability overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PROJECTS.map(proj => {
          const isCompleted = proj.status === 'completed'
          const distributed = distributions.filter(d => d.project_id === proj.id && d.status === 'paid').reduce((s, d) => s + d.amount, 0)
          return (
            <div key={proj.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{proj.name}</p>
                  {isCompleted
                    ? <span className="text-xs font-bold text-green-700">Net Profit: {fmt(proj.net_profit)}</span>
                    : <span className="text-xs text-gray-400">In Progress — profit not yet calculated</span>
                  }
                </div>
                {isCompleted
                  ? <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Distributed</span>
                  : <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-semibold"><Clock className="w-3.5 h-3.5" /> Ongoing</span>
                }
              </div>
              {isCompleted && proj.net_profit > 0 && (
                <div className="space-y-1.5">
                  {Object.entries(CONTRIBUTION_SHARES[proj.id] ?? {}).map(([invId, pct]) => {
                    const inv = getInvestor(invId)
                    const share = Math.round((proj.net_profit * pct) / 100)
                    return (
                      <div key={invId}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-600">{inv?.name} <span className="text-gray-400">({pct}%)</span></span>
                          <span className="font-semibold text-gray-900">{fmt(share)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Investor totals */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Total Profit Received per Investor</h3>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          {investorTotals.map(inv => (
            <div key={inv.id} className="flex items-center gap-3 bg-green-50 rounded-lg p-3 border border-green-100">
              <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {inv.name.split(' ').map(w => w[0]).slice(0,2).join('')}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{inv.name}</p>
                <p className="text-xs text-gray-500">{inv.role}</p>
                <p className="text-sm font-bold text-green-700 mt-0.5">{fmt(inv.total)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution history */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <h3 className="font-semibold text-gray-900 flex-1">Distribution History</h3>
          <span className="text-sm text-gray-500">Total Distributed: <span className="font-bold text-green-700">{fmt(totalDistributed)}</span></span>
          <select value={filterProject} onChange={e => setFP(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Projects</option>
            {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date', 'Project', 'Investor', 'Role', 'Share %', 'Amount', 'Payment Mode', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(d => {
              const inv = getInvestor(d.investor_id)
              const proj = PROJECTS.find(p => p.id === d.project_id)
              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{d.date}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs font-medium">{proj?.name}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{inv?.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{inv?.role}</td>
                  <td className="px-4 py-3 text-gray-700 font-semibold">{d.share_pct.toFixed(1)}%</td>
                  <td className="px-4 py-3 font-bold text-green-700">{fmt(d.amount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{d.payment_mode}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${d.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{d.status}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>

      {showAdd && <DistributeModal onClose={() => setShowAdd(false)} onAdd={records => setDistributions(p => [...records, ...p])} />}
    </div>
  )
}
