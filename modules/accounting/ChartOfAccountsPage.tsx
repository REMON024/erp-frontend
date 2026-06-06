'use client'
import { useState } from 'react'
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
  Asset:     'bg-blue-100 text-blue-700',
  Liability: 'bg-orange-100 text-orange-700',
  Equity:    'bg-purple-100 text-purple-700',
  Revenue:   'bg-green-100 text-green-700',
  Expense:   'bg-red-100 text-red-700',
}
const TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

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
            <select {...register('accountType')} className={inp}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
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
          <label htmlFor="isPosting" className="text-sm text-gray-700">Allow posting transactions to this account</label>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
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
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Account
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {TYPES.map(t => (
          <div key={t} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{byType(t)}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search account name or code…" onRefresh={refetch}>
        <select value={type} onChange={e => setType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load accounts.' : null} onRetry={refetch}
        empty={accounts.length === 0} emptyMessage="No accounts yet.">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Code', 'Account Name', 'Type', 'Category', 'Opening Balance', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 font-semibold">{a.accountCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {a.accountName}
                        {a.isSystem && <Lock className="w-3 h-3 text-gray-300" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[a.accountType] ?? 'bg-gray-100 text-gray-600'}`}>{a.accountType}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{a.accountCategory ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{a.openingBalance ? fmt(a.openingBalance) : '—'}</td>
                    <td className="px-4 py-3">
                      {!a.isSystem && (
                        <button onClick={() => { setTarget(a); setModal('edit') }} className="text-gray-400 hover:text-blue-600 p-1">
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
