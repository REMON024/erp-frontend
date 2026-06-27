'use client'
import { useEffect, useState, useCallback } from 'react'
import { PieChart, CheckCircle, Banknote, AlertCircle } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Role } from '@/types'

interface Project { id: number; projectCode: string; projectName: string }
interface Line { investorId: number; investorName: string; share: number; amount: number; status: string; voucher: string | null }
interface Preview {
  projectId: number; accountingProfit: number; distributableProfit: number
  revenue: number; cost: number; collected: number; lines: Line[]
}
interface Distribution {
  id: number; projectId: number; projectName: string; distributionNo: string
  profit: number; basis: string; shareBasis: string; declaredOn: string; status: string; lines: (Line & { id?: number })[]
}

function fmt(n: number) { return `৳${(n ?? 0).toLocaleString('en-BD')}` }

const inp = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'

export function ProfitDistributionPage() {
  const user = useAuthStore(s => s.user)
  const roles = (user?.roles?.length ? user.roles : (user?.role ? [user.role] : [])) as Role[]
  const isSuperAdmin = roles.includes('super_admin')

  const [projects, setProjects]   = useState<Project[]>([])
  const [projectId, setProjectId] = useState<number | ''>('')
  const [basis, setBasis]         = useState('accounting')
  const [shareBasis, setShareBasis] = useState('snapshot')
  const [rounding, setRounding]   = useState('largest-share')
  const [preview, setPreview]     = useState<Preview | null>(null)
  const [dists, setDists]         = useState<Distribution[]>([])
  const [overrides, setOverrides] = useState<Record<number, number>>({})
  const [useOverride, setUseOverride] = useState(false)
  const [busy, setBusy]           = useState(false)
  const [err, setErr]             = useState('')

  useEffect(() => {
    api.get('/projects', { params: { pageSize: 200 } })
      .then(r => setProjects(r.data?.items ?? r.data ?? []))
      .catch(() => setProjects([]))
  }, [])

  const loadDists = useCallback(async () => {
    if (!projectId) { setDists([]); return }
    const r = await api.get('/profit-distribution', { params: { projectId } }).catch(() => ({ data: [] }))
    setDists(r.data ?? [])
  }, [projectId])

  const loadPreview = useCallback(async () => {
    if (!projectId) { setPreview(null); return }
    setErr('')
    try {
      const r = await api.get('/profit-distribution/preview', { params: { projectId, basis, rounding } })
      setPreview(r.data)
      setOverrides(Object.fromEntries((r.data.lines as Line[]).map(l => [l.investorId, l.share])))
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to load preview')
      setPreview(null)
    }
  }, [projectId, basis, rounding])

  useEffect(() => { loadPreview(); loadDists() }, [loadPreview, loadDists])

  const overrideTotal = Object.values(overrides).reduce((a, b) => a + Number(b || 0), 0)

  const declare = async () => {
    if (!projectId) return
    setBusy(true); setErr('')
    try {
      const body: any = { projectId, basis, shareBasis, rounding }
      if (isSuperAdmin && useOverride)
        body.overrides = Object.entries(overrides).map(([investorId, share]) => ({ investorId: Number(investorId), share: Number(share) }))
      await api.post('/profit-distribution/declare', body)
      await loadDists()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to declare distribution')
    } finally { setBusy(false) }
  }

  const payout = async (lineId?: number) => {
    if (!lineId) return
    setBusy(true)
    try { await api.post(`/profit-distribution/lines/${lineId}/payout`); await loadDists() }
    catch { /* ignore */ } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <PieChart className="w-6 h-6 text-teal-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit Distribution</h1>
          <p className="text-sm text-gray-500 mt-0.5">Distribute project net profit to investors by contribution share</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : '')} className={inp}>
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Profit basis</label>
          <select value={basis} onChange={e => setBasis(e.target.value)} className={inp}>
            <option value="accounting">Accounting</option>
            <option value="distributable">Distributable (cash-capped)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Share basis</label>
          <select value={shareBasis} onChange={e => setShareBasis(e.target.value)} className={inp}>
            <option value="snapshot">Snapshot</option>
            <option value="live">Live</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Rounding</label>
          <select value={rounding} onChange={e => setRounding(e.target.value)} className={inp}>
            <option value="largest-share">Largest share</option>
            <option value="first">First investor</option>
            <option value="fractional">Largest fractional</option>
          </select>
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />{err}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              ['Revenue', preview.revenue], ['Cost', preview.cost], ['Collected', preview.collected],
              ['Accounting profit', preview.accountingProfit], ['Distributable', preview.distributableProfit],
            ].map(([label, val]) => (
              <div key={label as string}>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label as string}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{fmt(val as number)}</p>
              </div>
            ))}
          </div>

          {isSuperAdmin && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={useOverride} onChange={e => setUseOverride(e.target.checked)} className="w-4 h-4" />
              Override distribution ratio (Super Admin) — must total 100%
              {useOverride && <span className={`ml-2 font-semibold ${Math.round(overrideTotal) === 100 ? 'text-green-600' : 'text-red-600'}`}>{overrideTotal.toFixed(2)}%</span>}
            </label>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>{['Investor', 'Share %', 'Amount'].map(h => <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.lines.map(l => (
                  <tr key={l.investorId}>
                    <td className="px-4 py-2 text-gray-900">{l.investorName}</td>
                    <td className="px-4 py-2">
                      {isSuperAdmin && useOverride ? (
                        <input type="number" step="0.01" value={overrides[l.investorId] ?? 0}
                          onChange={e => setOverrides(o => ({ ...o, [l.investorId]: Number(e.target.value) }))}
                          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm" />
                      ) : `${l.share}%`}
                    </td>
                    <td className="px-4 py-2 font-medium">{fmt(l.amount)}</td>
                  </tr>
                ))}
                {preview.lines.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No investor contributions for this project.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button onClick={declare} disabled={busy || preview.lines.length === 0 || (useOverride && Math.round(overrideTotal) !== 100)}
              className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Declare Distribution
            </button>
          </div>
        </div>
      )}

      {/* Declared distributions */}
      <div className="space-y-4">
        {dists.map(d => (
          <div key={d.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{d.distributionNo} · {d.projectName}</p>
                <p className="text-xs text-gray-500">Declared {d.declaredOn} · {d.basis} · profit {fmt(d.profit)}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${d.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {d.lines.map((l, i) => (
                  <tr key={l.id ?? i}>
                    <td className="px-4 py-2 text-gray-900">{l.investorName}</td>
                    <td className="px-4 py-2 text-gray-500">{l.share}%</td>
                    <td className="px-4 py-2 font-medium">{fmt(l.amount)}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{l.status}</span>
                      {l.voucher && <span className="ml-2 text-xs text-gray-400">{l.voucher}</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {l.status !== 'paid' && l.id && (
                        <button onClick={() => payout(l.id)} disabled={busy}
                          className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-1 disabled:opacity-50">
                          <Banknote className="w-3.5 h-3.5" /> Pay out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
