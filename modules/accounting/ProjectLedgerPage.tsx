'use client'
import { useState } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const PROJECTS = [
  { id: 'p1', name: 'Block-A — Mirpur 12' },
  { id: 'p2', name: 'Block-B — Mohammadpur' },
  { id: 'p3', name: 'Block-C — Uttara Sector 7' },
  { id: 'p4', name: 'Block-D — Bashundhara' },
]

type EntryType = 'investment' | 'purchase' | 'sale' | 'collection' | 'expense' | 'profit'

interface LedgerEntry {
  id: string; project_id: string; date: string; description: string
  debit: number; credit: number; balance: number; type: EntryType; ref: string
}

function buildLedger(projectId: string, entries: Omit<LedgerEntry, 'id' | 'balance'>[]): LedgerEntry[] {
  let running = 0
  return entries.map((e, i) => {
    running += e.credit - e.debit
    return { id: `${projectId}-${i}`, ...e, balance: running }
  })
}

const LEDGER_P1 = buildLedger('p1', [
  { project_id: 'p1', date: '2025-01-10', description: 'Investment — Mr. Abdur Rahman',     debit: 0,       credit: 5000000, type: 'investment', ref: 'INV-001' },
  { project_id: 'p1', date: '2025-01-12', description: 'Investment — Mr. Kamal Hossain',    debit: 0,       credit: 3000000, type: 'investment', ref: 'INV-002' },
  { project_id: 'p1', date: '2025-01-20', description: 'Purchase — Cement (500 bags)',       debit: 350000,  credit: 0,       type: 'purchase',   ref: 'PO-001' },
  { project_id: 'p1', date: '2025-02-01', description: 'Purchase — Steel Rods (8 Ton)',      debit: 720000,  credit: 0,       type: 'purchase',   ref: 'PO-003' },
  { project_id: 'p1', date: '2025-02-10', description: 'Sale — Unit 3C (INV-2025-003)',      debit: 0,       credit: 6500000, type: 'sale',        ref: 'INV-2025-003' },
  { project_id: 'p1', date: '2025-03-01', description: 'Collection — Mr. Sabbir Ahmed',      debit: 0,       credit: 3250000, type: 'collection', ref: 'REC-2025-007' },
  { project_id: 'p1', date: '2025-03-10', description: 'Purchase — Bricks (10,000 pcs)',     debit: 400000,  credit: 0,       type: 'purchase',   ref: 'PO-002' },
  { project_id: 'p1', date: '2025-04-01', description: 'Labor cost — Masonry Q1',            debit: 850000,  credit: 0,       type: 'expense',    ref: 'LAB-001' },
  { project_id: 'p1', date: '2025-04-10', description: 'Collection — Mr. Zahirul Islam',     debit: 0,       credit: 5600000, type: 'collection', ref: 'REC-2025-001' },
  { project_id: 'p1', date: '2025-04-15', description: 'Collection — Mr. Sabbir Ahmed',      debit: 0,       credit: 3250000, type: 'collection', ref: 'REC-2025-008' },
])

const LEDGER_P2 = buildLedger('p2', [
  { project_id: 'p2', date: '2025-03-01', description: 'Investment — Mr. Abdur Rahman',      debit: 0,       credit: 4000000, type: 'investment', ref: 'INV-004' },
  { project_id: 'p2', date: '2025-03-05', description: 'Investment — Mr. Kamal Hossain',     debit: 0,       credit: 2500000, type: 'investment', ref: 'INV-005' },
  { project_id: 'p2', date: '2025-04-01', description: 'Purchase — Sand & Gravel',            debit: 520000,  credit: 0,       type: 'purchase',   ref: 'PO-010' },
  { project_id: 'p2', date: '2025-04-01', description: 'Sale — Unit 1A (INV-2025-005)',       debit: 0,       credit: 4800000, type: 'sale',        ref: 'INV-2025-005' },
  { project_id: 'p2', date: '2025-04-01', description: 'Collection — Ms. Farida Begum',       debit: 0,       credit: 4800000, type: 'collection', ref: 'REC-2025-010' },
  { project_id: 'p2', date: '2025-05-01', description: 'Labor cost — Foundation',             debit: 680000,  credit: 0,       type: 'expense',    ref: 'LAB-003' },
])

const LEDGER_P3 = buildLedger('p3', [
  { project_id: 'p3', date: '2025-06-01', description: 'Investment — Mr. Abdur Rahman',      debit: 0,       credit: 8000000, type: 'investment', ref: 'INV-006' },
  { project_id: 'p3', date: '2025-06-10', description: 'Investment — Mr. Kamal Hossain',     debit: 0,       credit: 5000000, type: 'investment', ref: 'INV-007' },
  { project_id: 'p3', date: '2025-07-01', description: 'Investment — Ms. Sumaiya Begum',     debit: 0,       credit: 3000000, type: 'investment', ref: 'INV-008' },
  { project_id: 'p3', date: '2025-07-15', description: 'Purchase — Electrical materials',    debit: 1200000, credit: 0,       type: 'purchase',   ref: 'PO-020' },
  { project_id: 'p3', date: '2025-08-01', description: 'Purchase — Plumbing materials',      debit:  850000, credit: 0,       type: 'purchase',   ref: 'PO-021' },
  { project_id: 'p3', date: '2025-09-01', description: 'Labor cost — Structural work',       debit: 2200000, credit: 0,       type: 'expense',    ref: 'LAB-007' },
  { project_id: 'p3', date: '2025-06-01', description: 'Sale — Unit 1B (INV-2025-007)',       debit: 0,       credit: 8000000, type: 'sale',        ref: 'INV-2025-007' },
  { project_id: 'p3', date: '2025-06-01', description: 'Collection — Mr. Shahinur Rahman',   debit: 0,       credit: 2000000, type: 'collection', ref: 'REC-2025-011' },
])

const LEDGER_P4 = buildLedger('p4', [
  { project_id: 'p4', date: '2025-09-01', description: 'Investment — Mr. Rafiqul Islam',     debit: 0,       credit: 2000000, type: 'investment', ref: 'INV-009' },
  { project_id: 'p4', date: '2025-09-15', description: 'Investment — Mr. Nasir Uddin',       debit: 0,       credit: 1500000, type: 'investment', ref: 'INV-010' },
  { project_id: 'p4', date: '2025-10-01', description: 'Purchase — Foundation materials',    debit:  950000, credit: 0,       type: 'purchase',   ref: 'PO-030' },
])

const ALL_ENTRIES_INITIAL = [...LEDGER_P1, ...LEDGER_P2, ...LEDGER_P3, ...LEDGER_P4]

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const journalSchema = z.object({
  date:        z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  type:        z.enum(['investment', 'purchase', 'sale', 'collection', 'expense', 'profit']),
  ref:         z.string().optional(),
  debit:       z.coerce.number().min(0),
  credit:      z.coerce.number().min(0),
})
type JournalForm = z.infer<typeof journalSchema>

function AddJournalModal({ projectId, onClose, onAdd }: {
  projectId: string; onClose: () => void; onAdd: (e: Omit<LedgerEntry, 'id' | 'balance'>) => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<JournalForm>({
    resolver: zodResolver(journalSchema) as any,
    defaultValues: { date: new Date().toISOString().split('T')[0], type: 'expense', debit: 0, credit: 0 },
  })
  return (
    <Modal open onClose={onClose} title="Add Journal Entry" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({ project_id: projectId, date: d.date, description: d.description, type: d.type, ref: d.ref ?? '', debit: d.debit, credit: d.credit })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Date</label>
            <input type="date" {...register('date')} className={inp} />
            {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date.message}</p>}
          </div>
          <div>
            <label className={lbl}>Entry Type</label>
            <select {...register('type')} className={inp}>
              <option value="investment">Investment</option>
              <option value="purchase">Purchase</option>
              <option value="sale">Sale</option>
              <option value="collection">Collection</option>
              <option value="expense">Expense</option>
              <option value="profit">Profit</option>
            </select>
          </div>
        </div>
        <div>
          <label className={lbl}>Description</label>
          <input {...register('description')} className={inp} placeholder="Journal entry description" />
          {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
        </div>
        <div>
          <label className={lbl}>Reference No.</label>
          <input {...register('ref')} className={inp} placeholder="PO-001 / INV-2025-001 / JV-001" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Debit Amount (৳)</label>
            <input type="number" {...register('debit')} className={inp} placeholder="0" />
          </div>
          <div>
            <label className={lbl}>Credit Amount (৳)</label>
            <input type="number" {...register('credit')} className={inp} placeholder="0" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Post Entry</button>
        </div>
      </form>
    </Modal>
  )
}

const TYPE_COLORS: Record<EntryType, string> = {
  investment: 'bg-blue-100 text-blue-700',
  purchase:   'bg-orange-100 text-orange-700',
  sale:       'bg-green-100 text-green-700',
  collection: 'bg-teal-100 text-teal-700',
  expense:    'bg-red-100 text-red-700',
  profit:     'bg-yellow-100 text-yellow-700',
}

function fmt(n: number) { return n === 0 ? '—' : `৳${n.toLocaleString('en-BD')}` }

export function ProjectLedgerPage() {
  const [allEntries, setAllEntries]   = useState<LedgerEntry[]>(ALL_ENTRIES_INITIAL)
  const [selectedProject, setProject] = useState('p1')
  const [filterType, setFilterType]   = useState<string>('')
  const [showAdd, setShowAdd]         = useState(false)

  function addEntry(raw: Omit<LedgerEntry, 'id' | 'balance'>) {
    setAllEntries(prev => {
      const projectEntries = prev.filter(e => e.project_id === raw.project_id)
      const lastBalance = projectEntries.length > 0 ? projectEntries[projectEntries.length - 1].balance : 0
      const newEntry: LedgerEntry = {
        id: `${raw.project_id}-manual-${Date.now()}`,
        ...raw,
        balance: lastBalance + raw.credit - raw.debit,
      }
      return [...prev, newEntry]
    })
  }

  const projectEntries = allEntries.filter(e => e.project_id === selectedProject)
  const displayed = filterType ? projectEntries.filter(e => e.type === filterType) : projectEntries

  const totalDebit  = projectEntries.reduce((s, e) => s + e.debit, 0)
  const totalCredit = projectEntries.reduce((s, e) => s + e.credit, 0)
  const netBalance  = totalCredit - totalDebit

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Project Ledger</h1>
        <p className="text-sm text-gray-500 mt-0.5">Debit/credit journal per project</p>
      </div>

      {/* Project selector */}
      <div className="flex gap-2 flex-wrap">
        {PROJECTS.map(p => (
          <button key={p.id} onClick={() => setProject(p.id)}
            className={`px-4 py-2 text-sm rounded-lg border font-medium ${selectedProject === p.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400 bg-white'}`}>
            {p.name}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Credits</p><p className="text-xl font-bold text-green-600 mt-1">{`৳${totalCredit.toLocaleString('en-BD')}`}</p><p className="text-xs text-gray-400 mt-1">Investments + Sales</p></div>
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><BookOpen className="w-5 h-5 text-green-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Total Debits</p><p className="text-xl font-bold text-red-600 mt-1">{`৳${totalDebit.toLocaleString('en-BD')}`}</p><p className="text-xs text-gray-400 mt-1">Purchases + Expenses</p></div>
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><BookOpen className="w-5 h-5 text-red-600" /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div><p className="text-sm text-gray-500">Net Balance</p><p className={`text-xl font-bold mt-1 ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{`৳${netBalance.toLocaleString('en-BD')}`}</p></div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><BookOpen className="w-5 h-5 text-blue-600" /></div>
        </div>
      </div>

      {/* Filter + ledger table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-gray-900 flex-1">
            {PROJECTS.find(p => p.id === selectedProject)?.name} — Ledger
          </h3>
          <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-1.5 shrink-0">
            <Plus className="w-3 h-3" /> Add Entry
          </button>
          {(['', 'investment', 'purchase', 'sale', 'collection', 'expense'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 text-xs rounded-full border font-medium capitalize ${filterType === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
              {t === '' ? 'All' : t}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date', 'Description', 'Type', 'Reference', 'Debit', 'Credit', 'Balance'].map(h => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Debit' || h === 'Credit' || h === 'Balance' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 text-xs">{e.date}</td>
                <td className="px-4 py-3 text-gray-900 text-xs font-medium">{e.description}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${TYPE_COLORS[e.type]}`}>{e.type}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{e.ref}</td>
                <td className="px-4 py-3 text-right text-red-700 font-medium text-xs">{fmt(e.debit)}</td>
                <td className="px-4 py-3 text-right text-green-700 font-medium text-xs">{fmt(e.credit)}</td>
                <td className={`px-4 py-3 text-right font-bold text-xs ${e.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{`৳${e.balance.toLocaleString('en-BD')}`}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Totals</td>
              <td className="px-4 py-3 text-right font-bold text-red-700">{`৳${totalDebit.toLocaleString('en-BD')}`}</td>
              <td className="px-4 py-3 text-right font-bold text-green-700">{`৳${totalCredit.toLocaleString('en-BD')}`}</td>
              <td className={`px-4 py-3 text-right font-bold ${netBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{`৳${netBalance.toLocaleString('en-BD')}`}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      </div>

      {showAdd && <AddJournalModal projectId={selectedProject} onClose={() => setShowAdd(false)} onAdd={addEntry} />}
    </div>
  )
}
