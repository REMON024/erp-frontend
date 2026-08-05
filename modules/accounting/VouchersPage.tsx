'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { useApiData } from '@/hooks/useApiData'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, CheckCircle, AlertCircle, Eye } from 'lucide-react'
import api from '@/lib/api'

interface Account { id: number; accountCode: string; accountName: string; isPosting: boolean }
interface VLine {
  id: number; accountId: number; accountCode: string; accountName: string
  projectId?: number; debitAmount: number; creditAmount: number; description?: string
}
interface Voucher {
  id: number; voucherNo: string; voucherType: string; voucherDate: string
  fiscalYearId: number; referenceNo?: string; narration?: string
  status: string; isPosted: boolean; totalDebit: number; totalCredit: number; lines: VLine[]
}

const TYPE_COLORS: Record<string, string> = {
  JV: 'bg-primary/10 text-primary', PV: 'bg-danger/10 text-danger',
  RV: 'bg-success/10 text-success', CV: 'bg-primary/10 text-primary', BV: 'bg-warning/15 text-warning',
}
const TYPE_LABELS: Record<string, string> = { JV: 'Journal', PV: 'Payment', RV: 'Receipt', CV: 'Contra', BV: 'Bank' }
const fmt = (n: number) => n === 0 ? '—' : `৳${n.toLocaleString('en-BD')}`
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

// ── View modal ─────────────────────────────────────────────────────────────────
function ViewModal({ voucher, onClose }: { voucher: Voucher; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={`${voucher.voucherNo} — ${TYPE_LABELS[voucher.voucherType] ?? voucher.voucherType} Voucher`} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div><span className="text-content-muted text-xs">Date</span><p className="font-medium">{voucher.voucherDate}</p></div>
          <div><span className="text-content-muted text-xs">Reference</span><p className="font-medium">{voucher.referenceNo || '—'}</p></div>
          <div><span className="text-content-muted text-xs">Status</span>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold mt-0.5 ${voucher.isPosted ? 'bg-success/10 text-success' : 'bg-warning/15 text-warning'}`}>
              {voucher.isPosted ? 'Posted' : 'Draft'}
            </span>
          </div>
        </div>
        {voucher.narration && <p className="text-sm text-content-muted bg-surface-muted rounded-lg px-3 py-2">{voucher.narration}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm border border-border-default rounded-lg overflow-hidden">
            <thead className="bg-surface-muted">
              <tr>{['Account', 'Description', 'Debit', 'Credit'].map(h => (
                <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${['Debit','Credit'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {voucher.lines.map(l => (
                <tr key={l.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-content text-xs">{l.accountName}</p>
                    <p className="text-content-muted text-xs">{l.accountCode}</p>
                  </td>
                  <td className="px-3 py-2 text-content-muted text-xs">{l.description ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-medium text-content">{fmt(l.debitAmount)}</td>
                  <td className="px-3 py-2 text-right font-medium text-content">{fmt(l.creditAmount)}</td>
                </tr>
              ))}
              <tr className="bg-surface-muted font-semibold">
                <td colSpan={2} className="px-3 py-2 text-content text-sm">Total</td>
                <td className="px-3 py-2 text-right text-content">{fmt(voucher.totalDebit)}</td>
                <td className="px-3 py-2 text-right text-content">{fmt(voucher.totalCredit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}

// ── New voucher modal ──────────────────────────────────────────────────────────
interface NewForm {
  voucherType: string; voucherDate: string; referenceNo: string; narration: string
  lines: { accountId: string; projectId: string; debit: string; credit: string; description: string }[]
}
interface Project { id: number; projectCode: string; projectName: string }

function NewVoucherModal({ accounts, onClose, onSaved }: {
  accounts: Account[]; onClose: () => void; onSaved: () => void
}) {
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const { register, control, handleSubmit, watch } = useForm<NewForm>({
    defaultValues: {
      voucherType: 'JV', voucherDate: isoToday(), referenceNo: '', narration: '',
      lines: [
        { accountId: '', projectId: '', debit: '', credit: '', description: '' },
        { accountId: '', projectId: '', debit: '', credit: '', description: '' },
      ],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const lines = watch('lines')
  const totalDebit  = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = totalDebit > 0 && Math.round(totalDebit * 100) === Math.round(totalCredit * 100)

  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })

  const onSubmit = async (d: NewForm) => {
    if (!balanced) { setErr('Debit and credit totals must be equal and non-zero.'); return }
    const validLines = d.lines.filter(l => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
    if (validLines.length < 2) { setErr('At least two lines are required.'); return }
    setSaving(true); setErr('')
    try {
      await api.post('/vouchers', {
        voucherType: d.voucherType, voucherDate: d.voucherDate,
        referenceNo: d.referenceNo || undefined, narration: d.narration || undefined,
        lines: validLines.map(l => ({
          accountId:    Number(l.accountId),
          projectId:    l.projectId ? Number(l.projectId) : undefined,
          debitAmount:  parseFloat(l.debit) || 0,
          creditAmount: parseFloat(l.credit) || 0,
          description:  l.description || undefined,
        })),
      })
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  const postingAccounts = accounts.filter(a => a.isPosting)

  return (
    <Modal open onClose={onClose} title="New Voucher Entry" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {err && <div className="flex items-center gap-2 px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs"><AlertCircle className="w-4 h-4 shrink-0" />{err}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Type <span className="text-danger">*</span></label>
            <Select {...register('voucherType')}>
              <option value="JV">Journal (JV)</option>
              <option value="PV">Payment (PV)</option>
              <option value="RV">Receipt (RV)</option>
              <option value="CV">Contra (CV)</option>
              <option value="BV">Bank (BV)</option>
            </Select>
          </div>
          <div>
            <label className={lbl}>Date <span className="text-danger">*</span></label>
            <DateField {...register('voucherDate')} />
          </div>
          <div>
            <label className={lbl}>Reference No</label>
            <input {...register('referenceNo')} className={inp} placeholder="Optional" />
          </div>
        </div>
        <div>
          <label className={lbl}>Narration</label>
          <input {...register('narration')} className={inp} placeholder="Brief description…" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-content">Transaction Lines</label>
            <button type="button" onClick={() => append({ accountId: '', projectId: '', debit: '', credit: '', description: '' })}
              className="text-xs text-primary hover:text-primary font-medium flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Line</button>
          </div>
          <div className="border border-border-default rounded-lg overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-content-muted w-[28%]">Account</th>
                  <th className="px-2 py-2 text-left font-semibold text-content-muted w-[18%]">Project</th>
                  <th className="px-2 py-2 text-left font-semibold text-content-muted">Description</th>
                  <th className="px-2 py-2 text-right font-semibold text-content-muted w-[14%]">Debit</th>
                  <th className="px-2 py-2 text-right font-semibold text-content-muted w-[14%]">Credit</th>
                  <th className="px-2 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {fields.map((field, i) => (
                  <tr key={field.id}>
                    <td className="px-2 py-1.5">
                      <Select {...register(`lines.${i}.accountId`)} className="text-xs py-1.5">
                        <option value="">Select…</option>
                        {postingAccounts.map(a => <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      <Select {...register(`lines.${i}.projectId`)} className="text-xs py-1.5">
                        <option value="">— None —</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
                      </Select>
                    </td>
                    <td className="px-2 py-1.5"><input {...register(`lines.${i}.description`)} className={inp + ' text-xs py-1.5'} placeholder="Note…" /></td>
                    <td className="px-2 py-1.5 text-right"><input type="number" step="any" {...register(`lines.${i}.debit`)} className={inp + ' text-xs py-1.5 text-right tabular-nums'} placeholder="0" /></td>
                    <td className="px-2 py-1.5 text-right"><input type="number" step="any" {...register(`lines.${i}.credit`)} className={inp + ' text-xs py-1.5 text-right tabular-nums'} placeholder="0" /></td>
                    <td className="px-2 py-1.5 text-center">
                      {fields.length > 2 && <button type="button" onClick={() => remove(i)} className="text-content-muted/50 hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-muted border-t border-border-default">
                <tr>
                  <td colSpan={3} className="px-2 py-2 text-xs font-semibold text-content-muted">Total</td>
                  <td className="px-2 py-2 text-xs font-bold text-content text-right tabular-nums">{fmt(totalDebit)}</td>
                  <td className="px-2 py-2 text-xs font-bold text-content text-right tabular-nums">{fmt(totalCredit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className={`mt-2 flex items-center gap-2 text-xs font-medium ${balanced ? 'text-success' : 'text-danger'}`}>
            {balanced
              ? <><CheckCircle className="w-3.5 h-3.5" /> Balanced — Debit = Credit</>
              : <><AlertCircle className="w-3.5 h-3.5" /> Not balanced — difference: {fmt(Math.abs(totalDebit - totalCredit))}</>}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Save as Draft'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function VouchersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setType] = useState('')
  const [statusFilter, setStatus] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [viewing, setViewing] = useState<Voucher | null>(null)

  const { data: accounts = [] } = useApiData<Account[]>({ url: '/accounts', queryKey: ['accounts-list'] })

  const { data: vouchers = [], isLoading, error, refetch } = useApiData<Voucher[]>({
    url: '/vouchers',
    params: { search: search || undefined, type: typeFilter || undefined, status: statusFilter || undefined },
    queryKey: ['vouchers', search, typeFilter, statusFilter],
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vouchers'] })
  const post = async (id: number) => {
    try { await api.post(`/vouchers/${id}/post`); invalidate() } catch { /* noop */ }
  }

  const posted = vouchers.filter(v => v.isPosted).length
  const draft  = vouchers.filter(v => !v.isPosted).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voucher Entry"
        subtitle="Create and post journal, payment, receipt and contra vouchers"
        action={
          <PermissionGate module="VOUCHERS" action="create">
            <button onClick={() => setShowNew(true)}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Voucher
            </button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Vouchers', value: vouchers.length, color: 'text-content' },
          { label: 'Posted',         value: posted,          color: 'text-success' },
          { label: 'Drafts',         value: draft,           color: 'text-warning' },
          { label: 'Account Heads',  value: accounts.length, color: 'text-primary' },
        ].map(k => (
          <div key={k.label} className="bg-surface rounded-xl border border-border-default p-4">
            <p className="text-xs text-content-muted uppercase tracking-wide font-medium">{k.label}</p>
            <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search voucher no or narration…" onRefresh={refetch}>
        <Select value={typeFilter} onChange={e => setType(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Types</option>
          {Object.keys(TYPE_LABELS).map(t => <option key={t} value={t}>{TYPE_LABELS[t]} ({t})</option>)}
        </Select>
        {(['', 'posted', 'draft'] as const).map(s => (
          <button key={s || 'all'} onClick={() => setStatus(s)}
            className={`px-3 py-2 text-xs rounded-lg border font-medium capitalize ${statusFilter === s ? 'bg-primary text-white border-primary' : 'border-border-default text-content-muted hover:border-info/20'}`}>
            {s || 'All'}
          </button>
        ))}
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load vouchers.' : null} onRetry={refetch}
        empty={vouchers.length === 0} emptyMessage="No vouchers yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {['Voucher No', 'Type', 'Date', 'Narration', 'Amount', 'Status', ''].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {vouchers.map(v => (
                  <tr key={v.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-mono text-xs text-content font-semibold">{v.voucherNo}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded font-bold ${TYPE_COLORS[v.voucherType] ?? 'bg-surface-muted'}`}>{v.voucherType}</span></td>
                    <td className="px-4 py-3 text-content-muted text-xs">{v.voucherDate}</td>
                    <td className="px-4 py-3 text-content-muted max-w-xs truncate">{v.narration ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-content text-right">{fmt(v.totalDebit)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${v.isPosted ? 'bg-success/10 text-success' : 'bg-warning/15 text-warning'}`}>{v.isPosted ? 'Posted' : 'Draft'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewing(v)} className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-lg"><Eye className="w-3.5 h-3.5" /></button>
                        {!v.isPosted && <button onClick={() => post(v.id)} className="text-xs text-success hover:text-success font-medium hover:underline">Post</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {showNew && <NewVoucherModal accounts={accounts} onClose={() => setShowNew(false)} onSaved={invalidate} />}
      {viewing && <ViewModal voucher={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
