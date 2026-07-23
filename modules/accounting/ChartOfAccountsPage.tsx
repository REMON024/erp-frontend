'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Lock } from 'lucide-react'
import api from '@/lib/api'

interface Account {
  id: number; parentAccountId?: number; accountCode: string; accountName: string
  accountType: string; accountCategory?: string; levelNo: number
  openingBalance: number; isPosting: boolean; isSystem: boolean; isActive: boolean
}

const TYPE_COLORS: Record<string, string> = {
  Asset:     'bg-primary/10 text-primary',
  Liability: 'bg-orange-100 text-orange-700',
  Equity:    'bg-purple-100 text-purple-700',
  Revenue:   'bg-green-100 text-green-700',
  Expense:   'bg-red-100 text-red-700',
}
const TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  accountName:     z.string().min(1, 'Required'),
  accountType:     z.string().min(1, 'Required'),
  accountCode:     z.string().optional(),
  accountCategory: z.string().optional(),
  openingBalance:  z.coerce.number(),
  isPosting:       z.boolean().optional(),
})
type Form = z.infer<typeof schema>

function AccountModal({ account, onClose, onSaved }: {
  account?: Account; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!account
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: account ?? { accountType: 'Asset', openingBalance: 0, isPosting: true },
  })

  const onSubmit = async (d: Form) => {
    setSaving(true); setErr('')
    try {
      const body = { ...d, isPosting: d.isPosting ?? true }
      if (isEdit) await api.put(`/accounts/${account!.id}`, body)
      else        await api.post('/accounts', body)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Account' : 'Add Account'} size="md">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Account Name <span className="text-red-500">*</span></label>
            <input {...register('accountName')} className={inp} placeholder="Cash in Hand" />
            {errors.accountName && <p className="text-xs text-red-600 mt-1">{errors.accountName.message}</p>}
          </div>
          <div>
            <label className={lbl}>Type <span className="text-red-500">*</span></label>
            <Select {...register('accountType')}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Account Code</label>
            <input {...register('accountCode')} className={inp} placeholder="Auto if blank" />
          </div>
          <div>
            <label className={lbl}>Category</label>
            <input {...register('accountCategory')} className={inp} placeholder="Current Asset" />
          </div>
        </div>
        <div>
          <label className={lbl}>Opening Balance (৳)</label>
          <input type="number" {...register('openingBalance')} className={inp} placeholder="0" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isPosting" {...register('isPosting')} className="rounded" />
          <label htmlFor="isPosting" className="text-sm text-content">Allow posting transactions to this account</label>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Account'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function ChartOfAccountsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [type,   setType]   = useState('')
  const [modal,  setModal]  = useState<'add' | 'edit' | null>(null)
  const [target, setTarget] = useState<Account | null>(null)

  const { data: accounts = [], isLoading, error, refetch } = useApiData<Account[]>({
    url: '/accounts',
    params: { search: search || undefined, type: type || undefined },
    queryKey: ['accounts', search, type],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['accounts'] })
    qc.invalidateQueries({ queryKey: ['accounts-list'] })
  }

  const byType = (t: string) => accounts.filter(a => a.accountType === t).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage the general ledger account structure"
        action={
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Account
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {TYPES.map(t => (
          <div key={t} className="bg-surface rounded-xl border border-border-default p-4">
            <p className="text-xs text-content-muted uppercase tracking-wide">{t}</p>
            <p className="text-2xl font-bold text-content mt-1">{byType(t)}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search account name or code…" onRefresh={refetch}>
        <Select value={type} onChange={e => setType(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load accounts.' : null} onRetry={refetch}
        empty={accounts.length === 0} emptyMessage="No accounts yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {['Code', 'Account Name', 'Type', 'Category', 'Opening Balance', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {accounts.map(a => (
                  <tr key={a.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-mono text-xs text-content font-semibold">{a.accountCode}</td>
                    <td className="px-4 py-3 font-medium text-content">
                      <div className="flex items-center gap-2">
                        {a.accountName}
                        {a.isSystem && <Lock className="w-3 h-3 text-content-muted/50" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[a.accountType] ?? 'bg-surface-muted text-content-muted'}`}>{a.accountType}</span>
                    </td>
                    <td className="px-4 py-3 text-content-muted text-xs">{a.accountCategory ?? '—'}</td>
                    <td className="px-4 py-3 text-content">{a.openingBalance ? fmt(a.openingBalance) : '—'}</td>
                    <td className="px-4 py-3">
                      {!a.isSystem && (
                        <button onClick={() => { setTarget(a); setModal('edit') }} className="text-content-muted hover:text-primary p-1">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {modal === 'add' && <AccountModal onClose={() => setModal(null)} onSaved={invalidate} />}
      {modal === 'edit' && target && (
        <AccountModal account={target} onClose={() => { setModal(null); setTarget(null) }} onSaved={invalidate} />
      )}
    </div>
  )
}
