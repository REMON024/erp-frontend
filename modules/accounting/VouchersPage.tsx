'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, FileText, CheckCircle, AlertCircle, Eye } from 'lucide-react'

// ── Mock data ─────────────────────────────────────────────────────────────────
type VoucherType = 'JV' | 'PV' | 'RV' | 'CV' | 'BV'
type VoucherStatus = 'draft' | 'approved'

interface VoucherLine {
  accountCode: string; accountName: string
  debit: number; credit: number; description: string
}
interface Voucher {
  id: string; voucherNo: string; voucherType: VoucherType
  voucherDate: string; referenceNo: string; narration: string
  status: VoucherStatus; isPosted: boolean
  lines: VoucherLine[]
}

const MOCK_ACCOUNTS = [
  { code: '1001', name: 'Cash in Hand' },
  { code: '1002', name: 'Bank — Sonali Bank' },
  { code: '1003', name: 'Bank — Dutch Bangla Bank' },
  { code: '2001', name: 'Accounts Payable — Vendors' },
  { code: '2002', name: 'Customer Advances' },
  { code: '2003', name: 'Contractor Payable' },
  { code: '3001', name: 'Sales Revenue' },
  { code: '3002', name: 'Booking Income' },
  { code: '4001', name: 'Materials Inventory' },
  { code: '4002', name: 'Construction WIP' },
  { code: '4003', name: 'Construction Expense' },
  { code: '5001', name: 'Salary Expense' },
  { code: '5002', name: 'Office Expense' },
]

const INITIAL_VOUCHERS: Voucher[] = [
  {
    id: 'v1', voucherNo: 'JV-2026-001', voucherType: 'JV', voucherDate: '2026-05-01',
    referenceNo: '', narration: 'Opening balance adjustment', status: 'approved', isPosted: true,
    lines: [
      { accountCode: '1002', accountName: 'Bank — Sonali Bank',      debit: 5000000, credit: 0,       description: 'Opening balance' },
      { accountCode: '3001', accountName: 'Sales Revenue',            debit: 0,       credit: 5000000, description: 'Opening balance' },
    ],
  },
  {
    id: 'v2', voucherNo: 'RV-2026-001', voucherType: 'RV', voucherDate: '2026-05-05',
    referenceNo: 'BK-2026-003', narration: 'Booking payment from Mr. Karim — Unit 3A', status: 'approved', isPosted: true,
    lines: [
      { accountCode: '1002', accountName: 'Bank — Sonali Bank',  debit: 1500000, credit: 0,       description: 'Booking amount' },
      { accountCode: '2002', accountName: 'Customer Advances',   debit: 0,       credit: 1500000, description: 'Unit 3A — BLK-C' },
    ],
  },
  {
    id: 'v3', voucherNo: 'PV-2026-001', voucherType: 'PV', voucherDate: '2026-05-10',
    referenceNo: 'PO-2026-012', narration: 'Payment to ABC Cement for PO-2026-012', status: 'approved', isPosted: true,
    lines: [
      { accountCode: '2001', accountName: 'Accounts Payable — Vendors', debit: 850000, credit: 0,      description: 'Cement supply' },
      { accountCode: '1002', accountName: 'Bank — Sonali Bank',         debit: 0,      credit: 850000, description: 'Bank transfer' },
    ],
  },
  {
    id: 'v4', voucherNo: 'JV-2026-002', voucherType: 'JV', voucherDate: '2026-05-20',
    referenceNo: '', narration: 'Material issue to Block-C site', status: 'draft', isPosted: false,
    lines: [
      { accountCode: '4002', accountName: 'Construction WIP',    debit: 320000, credit: 0,      description: 'Cement 400 bags' },
      { accountCode: '4001', accountName: 'Materials Inventory', debit: 0,      credit: 320000, description: 'Cement issued' },
    ],
  },
]

const TYPE_COLORS: Record<VoucherType, string> = {
  JV: 'bg-purple-100 text-purple-700',
  PV: 'bg-red-100 text-red-700',
  RV: 'bg-green-100 text-green-700',
  CV: 'bg-blue-100 text-blue-700',
  BV: 'bg-orange-100 text-orange-700',
}
const TYPE_LABELS: Record<VoucherType, string> = {
  JV: 'Journal', PV: 'Payment', RV: 'Receipt', CV: 'Contra', BV: 'Bank',
}

const fmt = (n: number) => n === 0 ? '—' : `৳${n.toLocaleString()}`
const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

// ── Voucher detail modal ───────────────────────────────────────────────────────
function ViewModal({ voucher, onClose }: { voucher: Voucher; onClose: () => void }) {
  const total = voucher.lines.reduce((s, l) => s + l.debit, 0)
  return (
    <Modal open onClose={onClose} title={`${voucher.voucherNo} — ${TYPE_LABELS[voucher.voucherType]} Voucher`} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div><span className="text-gray-400 text-xs">Date</span><p className="font-medium">{voucher.voucherDate}</p></div>
          <div><span className="text-gray-400 text-xs">Reference</span><p className="font-medium">{voucher.referenceNo || '—'}</p></div>
          <div><span className="text-gray-400 text-xs">Status</span>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold mt-0.5 ${voucher.isPosted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {voucher.isPosted ? 'Posted' : 'Draft'}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{voucher.narration}</p>
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              {['Account', 'Description', 'Debit', 'Credit'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {voucher.lines.map((l, i) => (
              <tr key={i}>
                <td className="px-3 py-2">
                  <p className="font-medium text-gray-900 text-xs">{l.accountName}</p>
                  <p className="text-gray-400 text-xs">{l.accountCode}</p>
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs">{l.description}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">{fmt(l.debit)}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">{fmt(l.credit)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td colSpan={2} className="px-3 py-2 text-gray-700 text-sm">Total</td>
              <td className="px-3 py-2 text-right text-gray-900">{fmt(total)}</td>
              <td className="px-3 py-2 text-right text-gray-900">{fmt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

// ── New voucher form ──────────────────────────────────────────────────────────
interface NewVoucherForm {
  voucherType: VoucherType
  voucherDate: string
  referenceNo: string
  narration: string
  lines: { accountCode: string; debit: string; credit: string; description: string }[]
}

function NewVoucherModal({ onClose, onSave }: {
  onClose: () => void
  onSave: (v: Omit<Voucher, 'id' | 'voucherNo'>) => void
}) {
  const [err, setErr] = useState('')
  const { register, control, handleSubmit, watch } = useForm<NewVoucherForm>({
    defaultValues: {
      voucherType: 'JV',
      voucherDate: new Date().toISOString().split('T')[0],
      referenceNo: '',
      narration: '',
      lines: [
        { accountCode: '', debit: '', credit: '', description: '' },
        { accountCode: '', debit: '', credit: '', description: '' },
      ],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const lines = watch('lines')
  const totalDebit  = lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = totalDebit > 0 && totalDebit === totalCredit

  const onSubmit = (data: NewVoucherForm) => {
    if (!balanced) { setErr('Debit and credit totals must be equal and non-zero.'); return }
    const mapped = data.lines.map(l => {
      const acc = MOCK_ACCOUNTS.find(a => a.code === l.accountCode)
      return { accountCode: l.accountCode, accountName: acc?.name ?? l.accountCode,
               debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0,
               description: l.description }
    })
    onSave({ voucherType: data.voucherType, voucherDate: data.voucherDate,
             referenceNo: data.referenceNo, narration: data.narration,
             status: 'draft', isPosted: false, lines: mapped })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="New Voucher Entry" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {err && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />{err}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Type <span className="text-red-500">*</span></label>
            <select {...register('voucherType')} className={inp}>
              <option value="JV">Journal Voucher (JV)</option>
              <option value="PV">Payment Voucher (PV)</option>
              <option value="RV">Receipt Voucher (RV)</option>
              <option value="CV">Contra Voucher (CV)</option>
              <option value="BV">Bank Voucher (BV)</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('voucherDate')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Reference No</label>
            <input {...register('referenceNo')} className={inp} placeholder="PO-XXXX / BK-XXXX" />
          </div>
        </div>

        <div>
          <label className={lbl}>Narration</label>
          <input {...register('narration')} className={inp} placeholder="Brief description of this transaction…" />
        </div>

        {/* Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Transaction Lines</label>
            <button type="button" onClick={() => append({ accountCode: '', debit: '', credit: '', description: '' })}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Line
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 w-[35%]">Account</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Description</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 w-[18%]">Debit (৳)</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 w-[18%]">Credit (৳)</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((field, i) => (
                  <tr key={field.id}>
                    <td className="px-2 py-1.5">
                      <select {...register(`lines.${i}.accountCode`)} className={inp + ' text-xs py-1.5'}>
                        <option value="">Select account…</option>
                        {MOCK_ACCOUNTS.map(a => (
                          <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input {...register(`lines.${i}.description`)} className={inp + ' text-xs py-1.5'} placeholder="Note…" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" {...register(`lines.${i}.debit`)} className={inp + ' text-xs py-1.5'} placeholder="0" min={0} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" {...register(`lines.${i}.credit`)} className={inp + ' text-xs py-1.5'} placeholder="0" min={0} />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {fields.length > 2 && (
                        <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={2} className="px-3 py-2 text-xs font-semibold text-gray-600">Total</td>
                  <td className="px-3 py-2 text-xs font-bold text-gray-900">{fmt(totalDebit)}</td>
                  <td className="px-3 py-2 text-xs font-bold text-gray-900">{fmt(totalCredit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className={`mt-2 flex items-center gap-2 text-xs font-medium ${balanced ? 'text-green-600' : 'text-red-500'}`}>
            {balanced
              ? <><CheckCircle className="w-3.5 h-3.5" /> Balanced — Debit = Credit</>
              : <><AlertCircle className="w-3.5 h-3.5" /> Not balanced — difference: {fmt(Math.abs(totalDebit - totalCredit))}</>
            }
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Save as Draft
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>(INITIAL_VOUCHERS)
  const [search,   setSearch]   = useState('')
  const [typeFilter, setType]   = useState<VoucherType | ''>('')
  const [statusFilter, setStatus] = useState<'all' | 'draft' | 'posted'>('all')
  const [showNew,  setShowNew]  = useState(false)
  const [viewing,  setViewing]  = useState<Voucher | null>(null)

  const displayed = vouchers.filter(v => {
    const matchSearch = v.voucherNo.toLowerCase().includes(search.toLowerCase()) ||
                        v.narration.toLowerCase().includes(search.toLowerCase())
    const matchType   = !typeFilter || v.voucherType === typeFilter
    const matchStatus = statusFilter === 'all' ||
                        (statusFilter === 'posted' ? v.isPosted : !v.isPosted)
    return matchSearch && matchType && matchStatus
  })

  const handlePost = (id: string) => {
    setVouchers(prev => prev.map(v => v.id === id ? { ...v, isPosted: true, status: 'approved' } : v))
  }

  const handleSave = (data: Omit<Voucher, 'id' | 'voucherNo'>) => {
    const type = data.voucherType
    const count = vouchers.filter(v => v.voucherType === type).length + 1
    const voucherNo = `${type}-2026-${String(count).padStart(3, '0')}`
    setVouchers(prev => [{ id: `v${Date.now()}`, voucherNo, ...data }, ...prev])
  }

  const posted = vouchers.filter(v => v.isPosted).length
  const draft  = vouchers.filter(v => !v.isPosted).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voucher Entry"
        subtitle="Create and manage journal, payment, receipt and contra vouchers"
        action={
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Voucher
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Vouchers', value: vouchers.length, color: 'text-gray-900' },
          { label: 'Posted',         value: posted,          color: 'text-green-600' },
          { label: 'Drafts',         value: draft,           color: 'text-amber-600' },
          { label: 'This Month',     value: vouchers.filter(v => v.voucherDate.startsWith('2026-05')).length, color: 'text-blue-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{k.label}</p>
            <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <SearchBar value={search} onChange={setSearch} placeholder="Search voucher no. or narration…">
        <select value={typeFilter} onChange={e => setType(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Types</option>
          {(['JV','PV','RV','CV','BV'] as VoucherType[]).map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]} ({t})</option>
          ))}
        </select>
        {(['all','posted','draft'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-2 text-xs rounded-lg border font-medium capitalize ${
              statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
            }`}>{s}</button>
        ))}
      </SearchBar>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Voucher No', 'Type', 'Date', 'Narration', 'Amount', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(v => {
              const total = v.lines.reduce((s, l) => s + l.debit, 0)
              return (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 font-semibold">{v.voucherNo}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${TYPE_COLORS[v.voucherType]}`}>
                      {v.voucherType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{v.voucherDate}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{v.narration}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 text-right">{fmt(total)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      v.isPosted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {v.isPosted ? 'Posted' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewing(v)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {!v.isPosted && (
                        <button onClick={() => handlePost(v.id)}
                          className="text-xs text-green-600 hover:text-green-700 font-medium hover:underline">
                          Post
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        {displayed.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">No vouchers match your filters.</div>
        )}
      </div>

      {showNew  && <NewVoucherModal onClose={() => setShowNew(false)} onSave={handleSave} />}
      {viewing  && <ViewModal voucher={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
