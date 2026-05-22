'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, TrendingUp } from 'lucide-react'
import { INVESTORS } from './InvestorsPage'

const PROJECTS = [
  { id: 'p1', name: 'Block-A — Mirpur 12' },
  { id: 'p2', name: 'Block-B — Mohammadpur' },
  { id: 'p3', name: 'Block-C — Uttara Sector 7' },
  { id: 'p4', name: 'Block-D — Bashundhara' },
]

interface InvestmentRecord {
  id: string; project_id: string; investor_id: string; amount: number
  date: string; payment_mode: string; notes: string
}

const MOCK: InvestmentRecord[] = [
  { id: 'ir1',  project_id: 'p1', investor_id: 'inv1', amount: 5000000,  date: '2025-01-10', payment_mode: 'Bank Transfer', notes: 'Initial capital' },
  { id: 'ir2',  project_id: 'p1', investor_id: 'inv2', amount: 3000000,  date: '2025-01-12', payment_mode: 'Bank Transfer', notes: '' },
  { id: 'ir3',  project_id: 'p1', investor_id: 'inv3', amount: 2000000,  date: '2025-01-15', payment_mode: 'Cheque',        notes: 'Phase 1' },
  { id: 'ir4',  project_id: 'p2', investor_id: 'inv1', amount: 4000000,  date: '2025-03-01', payment_mode: 'Bank Transfer', notes: 'Q1 funding' },
  { id: 'ir5',  project_id: 'p2', investor_id: 'inv2', amount: 2500000,  date: '2025-03-05', payment_mode: 'Bank Transfer', notes: '' },
  { id: 'ir6',  project_id: 'p3', investor_id: 'inv1', amount: 8000000,  date: '2025-06-01', payment_mode: 'Bank Transfer', notes: 'Major capital infusion' },
  { id: 'ir7',  project_id: 'p3', investor_id: 'inv2', amount: 5000000,  date: '2025-06-10', payment_mode: 'Cheque',        notes: '' },
  { id: 'ir8',  project_id: 'p3', investor_id: 'inv3', amount: 3000000,  date: '2025-07-01', payment_mode: 'Cash',          notes: '' },
  { id: 'ir9',  project_id: 'p4', investor_id: 'inv4', amount: 2000000,  date: '2025-09-01', payment_mode: 'Bank Transfer', notes: '' },
  { id: 'ir10', project_id: 'p4', investor_id: 'inv5', amount: 1500000,  date: '2025-09-15', payment_mode: 'Bank Transfer', notes: 'New investor' },
]

const MODES = ['Bank Transfer', 'Cheque', 'Cash', 'NEFT/RTGS']

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  project_id:   z.string().min(1, 'Required'),
  investor_id:  z.string().min(1, 'Required'),
  amount:       z.coerce.number().min(1, 'Required'),
  date:         z.string().min(1, 'Required'),
  payment_mode: z.string().min(1, 'Required'),
  notes:        z.string().optional(),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (r: InvestmentRecord) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { date: new Date().toISOString().split('T')[0], payment_mode: 'Bank Transfer' },
  })
  return (
    <Modal open onClose={onClose} title="Record Investment" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({ id: `ir${Date.now()}`, ...d, notes: d.notes ?? '' })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project</label>
            <select {...register('project_id')} className={inp}>
              <option value="">Select project</option>
              {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Investor</label>
            <select {...register('investor_id')} className={inp}>
              <option value="">Select investor</option>
              {INVESTORS.map(i => <option key={i.id} value={i.id}>{i.name} ({i.role})</option>)}
            </select>
            {errors.investor_id && <p className="text-xs text-red-600 mt-1">{errors.investor_id.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Amount (৳)</label>
            <input type="number" {...register('amount')} className={inp} placeholder="1000000" />
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className={lbl}>Payment Mode</label>
            <select {...register('payment_mode')} className={inp}>
              {MODES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Date</label>
            <input type="date" {...register('date')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <input {...register('notes')} className={inp} placeholder="Optional notes" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Record Investment</button>
        </div>
      </form>
    </Modal>
  )
}

function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

function getInvestorName(id: string) { return INVESTORS.find(i => i.id === id)?.name ?? id }
function getProjectName(id: string)  { return PROJECTS.find(p => p.id === id)?.name ?? id }

export function InvestmentRecordsPage() {
  const [records, setRecords]   = useState<InvestmentRecord[]>(MOCK)
  const [showAdd, setShowAdd]   = useState(false)
  const [filterProject, setFP] = useState('')

  const displayed = filterProject ? records.filter(r => r.project_id === filterProject) : records

  // Contribution shares per project
  const projectSummary = PROJECTS.map(proj => {
    const recs = records.filter(r => r.project_id === proj.id)
    const total = recs.reduce((s, r) => s + r.amount, 0)
    const shares = INVESTORS.map(inv => {
      const invested = recs.filter(r => r.investor_id === inv.id).reduce((s, r) => s + r.amount, 0)
      return { investor: inv.name, role: inv.role, invested, share: total > 0 ? (invested / total) * 100 : 0 }
    }).filter(s => s.invested > 0)
    return { ...proj, total, shares }
  }).filter(p => p.total > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment Records</h1>
          <p className="text-sm text-gray-500 mt-0.5">Capital contributions per investor per project with share calculation</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Record Investment
        </button>
      </div>

      {/* Project contribution shares */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {projectSummary.map(proj => (
          <div key={proj.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-900">{proj.name}</p>
              <span className="text-sm font-bold text-blue-600">{fmt(proj.total)}</span>
            </div>
            <div className="space-y-2">
              {proj.shares.map(s => (
                <div key={s.investor}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-600 font-medium">{s.investor} <span className="text-gray-400">({s.role})</span></span>
                    <span className="font-semibold text-gray-900">{s.share.toFixed(1)}% · {fmt(s.invested)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.share}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Filter + table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">All Investment Entries</h3>
          <select value={filterProject} onChange={e => setFP(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">All Projects</option>
            {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date', 'Project', 'Investor', 'Role', 'Amount', 'Payment Mode', 'Notes'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{r.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900 text-xs">{getProjectName(r.project_id)}</td>
                <td className="px-4 py-3 text-gray-700">{getInvestorName(r.investor_id)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{INVESTORS.find(i => i.id === r.investor_id)?.role}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{fmt(r.amount)}</td>
                <td className="px-4 py-3 text-gray-500">{r.payment_mode}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={r => setRecords(p => [r, ...p])} />}
    </div>
  )
}
