'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Lock, Unlock, Calendar, CheckCircle, AlertTriangle } from 'lucide-react'

// ── Mock data ─────────────────────────────────────────────────────────────────
interface FiscalYear {
  id: string; name: string; startDate: string; endDate: string
  isClosed: boolean; closedAt?: string; closedBy?: string
  voucherCount: number
}

const INITIAL_YEARS: FiscalYear[] = [
  { id: 'fy1', name: 'FY 2023-2024', startDate: '2023-07-01', endDate: '2024-06-30', isClosed: true,  closedAt: '2024-07-15', closedBy: 'Admin',      voucherCount: 342 },
  { id: 'fy2', name: 'FY 2024-2025', startDate: '2024-07-01', endDate: '2025-06-30', isClosed: true,  closedAt: '2025-07-10', closedBy: 'Admin',      voucherCount: 518 },
  { id: 'fy3', name: 'FY 2025-2026', startDate: '2025-07-01', endDate: '2026-06-30', isClosed: false,                                                   voucherCount: 127 },
]

const schema = z.object({
  name:      z.string().min(1, 'Required'),
  startDate: z.string().min(1, 'Required'),
  endDate:   z.string().min(1, 'Required'),
}).refine(d => d.endDate > d.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
})
type Form = z.infer<typeof schema>

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

function AddModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Form) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { name: 'FY 2026-2027', startDate: '2026-07-01', endDate: '2027-06-30' },
  })
  return (
    <Modal open onClose={onClose} title="Open New Fiscal Year" size="sm">
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <div>
          <label className={lbl}>Fiscal Year Name <span className="text-red-500">*</span></label>
          <input {...register('name')} className={inp} placeholder="FY 2026-2027" />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Start Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('startDate')} className={inp} />
            {errors.startDate && <p className="text-xs text-red-600 mt-1">{errors.startDate.message}</p>}
          </div>
          <div>
            <label className={lbl}>End Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('endDate')} className={inp} />
            {errors.endDate && <p className="text-xs text-red-600 mt-1">{errors.endDate.message}</p>}
          </div>
        </div>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Only one fiscal year can be open at a time. Opening a new year does not close the current one.
        </p>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Open Fiscal Year</button>
        </div>
      </form>
    </Modal>
  )
}

function CloseConfirmModal({ year, onClose, onConfirm }: {
  year: FiscalYear; onClose: () => void; onConfirm: () => void
}) {
  return (
    <Modal open onClose={onClose} title="Close Fiscal Year" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">This action cannot be undone</p>
            <p className="text-xs text-red-700 mt-1">
              Closing <strong>{year.name}</strong> will lock all {year.voucherCount} vouchers.
              No new entries can be posted after closing.
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Before closing, ensure all adjusting entries are posted and the trial balance is balanced.
        </p>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
            Yes, Close Fiscal Year
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function FiscalYearsPage() {
  const [years,   setYears]   = useState<FiscalYear[]>(INITIAL_YEARS)
  const [showAdd, setShowAdd] = useState(false)
  const [closing, setClosing] = useState<FiscalYear | null>(null)
  const [toast,   setToast]   = useState('')

  const activeYear = years.find(y => !y.isClosed)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleAdd = (data: Form) => {
    setYears(prev => [...prev, {
      id: `fy${Date.now()}`, ...data,
      isClosed: false, voucherCount: 0,
    }])
    setShowAdd(false)
    showToast(`${data.name} opened successfully.`)
  }

  const handleClose = () => {
    if (!closing) return
    setYears(prev => prev.map(y => y.id === closing.id
      ? { ...y, isClosed: true, closedAt: new Date().toISOString().split('T')[0], closedBy: 'Admin' }
      : y))
    showToast(`${closing.name} has been closed.`)
    setClosing(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fiscal Years"
        subtitle="Manage accounting periods — open new fiscal years and close completed ones"
        action={
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Open New Year
          </button>
        }
      />

      {toast && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />{toast}
        </div>
      )}

      {/* Current active year highlight */}
      {activeYear && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <Unlock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">Current Active Period: {activeYear.name}</p>
            <p className="text-xs text-blue-700 mt-0.5">
              {activeYear.startDate} → {activeYear.endDate} · {activeYear.voucherCount} vouchers posted
            </p>
          </div>
          <button onClick={() => setClosing(activeYear)}
            className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Close Year
          </button>
        </div>
      )}

      {/* Year list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Fiscal Year', 'Period', 'Vouchers', 'Status', 'Closed On', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...years].reverse().map(y => (
              <tr key={y.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">{y.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {y.startDate} → {y.endDate}
                </td>
                <td className="px-4 py-3 font-medium text-gray-700">{y.voucherCount}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${
                    y.isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
                  }`}>
                    {y.isClosed ? <><Lock className="w-3 h-3" />Closed</> : <><Unlock className="w-3 h-3" />Active</>}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {y.closedAt ? `${y.closedAt} by ${y.closedBy}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {!y.isClosed && (
                    <button onClick={() => setClosing(y)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline">
                      Close
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {closing && <CloseConfirmModal year={closing} onClose={() => setClosing(null)} onConfirm={handleClose} />}
    </div>
  )
}
