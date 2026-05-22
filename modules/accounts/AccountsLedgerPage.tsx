'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Account, JournalEntry, LedgerRow } from '@/types'

type Tab = 'chart' | 'journal' | 'ledger' | 'trial'

function fmt(n: number) {
  return '৳' + Math.abs(n).toLocaleString('en-BD')
}

const TYPE_COLORS: Record<string, string> = {
  asset: 'text-blue-700 bg-blue-50',
  liability: 'text-red-700 bg-red-50',
  equity: 'text-purple-700 bg-purple-50',
  income: 'text-green-700 bg-green-50',
  expense: 'text-orange-700 bg-orange-50',
}

function ChartTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
  })
  const accounts: Account[] = data?.data ?? []
  const grouped = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = []
    acc[a.type].push(a)
    return acc
  }, {})
  const types = ['asset', 'liability', 'equity', 'income', 'expense']

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading…</div>

  return (
    <div className="space-y-4">
      {types.map(type => {
        const list = grouped[type] ?? []
        const total = list.reduce((s, a) => s + a.balance, 0)
        return (
          <div key={type} className="bg-white rounded-xl border border-slate-200">
            <div className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between`}>
              <h3 className={`font-semibold capitalize px-2 py-0.5 rounded-md text-sm ${TYPE_COLORS[type]}`}>{type}</h3>
              <span className="text-sm font-semibold text-slate-700">{fmt(total)}</span>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-50">
                {list.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-slate-500">{a.code}</td>
                    <td className="px-4 py-2 text-slate-800">{a.name}</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-700">{fmt(a.balance)}</td>
                    {a.is_system && <td className="px-4 py-2 text-xs text-slate-400">system</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

function JournalTab() {
  const [projectFilter, setProjectFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selected, setSelected] = useState<JournalEntry | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries', projectFilter, fromDate, toDate],
    queryFn: () => api.get('/journal-entries', {
      params: {
        project_id: projectFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      },
    }).then(r => r.data),
  })
  const entries: JournalEntry[] = data?.data ?? []

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Projects</option>
            <option value="p1">Residential Complex (P1)</option>
            <option value="p2">Luxury Villas (P2)</option>
          </select>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading…</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.map(je => (
                <button
                  key={je.id}
                  onClick={() => setSelected(selected?.id === je.id ? null : je)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === je.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{je.description}</p>
                      <p className="text-xs text-slate-400">{je.date} · {je.reference}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      {fmt(je.lines.reduce((s, l) => s + l.debit, 0))}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">
            {selected ? `${selected.reference} — ${selected.description}` : 'Select an entry to view details'}
          </h3>
        </div>
        {selected ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Account</th>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {selected.lines.map(l => (
                <tr key={l.id}>
                  <td className="px-4 py-2 text-slate-700">{(l as any).account?.name ?? l.account_id}</td>
                  <td className="px-4 py-2 text-right text-slate-800">{l.debit > 0 ? fmt(l.debit) : '—'}</td>
                  <td className="px-4 py-2 text-right text-slate-800">{l.credit > 0 ? fmt(l.credit) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="px-4 py-2 text-slate-700">Total</td>
                <td className="px-4 py-2 text-right">{fmt(selected.lines.reduce((s, l) => s + l.debit, 0))}</td>
                <td className="px-4 py-2 text-right">{fmt(selected.lines.reduce((s, l) => s + l.credit, 0))}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">Click a journal entry to see its lines</div>
        )}
      </div>
    </div>
  )
}

function LedgerTab() {
  const { data: accountsRes } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
  })
  const accounts: Account[] = accountsRes?.data ?? []
  const [accountId, setAccountId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['ledger', accountId, fromDate, toDate],
    queryFn: () => accountId
      ? api.get(`/accounts/${accountId}/ledger`, { params: { from: fromDate || undefined, to: toDate || undefined } }).then(r => r.data)
      : null,
    enabled: !!accountId,
  })
  const rows: LedgerRow[] = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <select
          value={accountId}
          onChange={e => setAccountId(e.target.value)}
          className="flex-1 min-w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Account…</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
          ))}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {!accountId ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">Select an account to view its ledger</div>
      ) : isLoading ? (
        <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-600">{row.date}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.reference}</td>
                  <td className="px-4 py-2 text-slate-700">{row.description}</td>
                  <td className="px-4 py-2 text-right text-slate-800">{row.debit > 0 ? fmt(row.debit) : '—'}</td>
                  <td className="px-4 py-2 text-right text-slate-800">{row.credit > 0 ? fmt(row.credit) : '—'}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${row.balance >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                    {fmt(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="p-8 text-center text-slate-400">No transactions for selected period</div>
          )}
        </div>
      )}
    </div>
  )
}

function TrialBalanceTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['trial-balance'],
    queryFn: () => api.get('/trial-balance').then(r => r.data),
  })
  const rows: Array<{ account_code: string; account_name: string; type: string; debit: number; credit: number }> = data?.data ?? []
  const totalDebit = data?.total_debit ?? 0
  const totalCredit = data?.total_credit ?? 0

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading…</div>

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Trial Balance</h3>
        {totalDebit === totalCredit ? (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Balanced ✓</span>
        ) : (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Unbalanced ✗</span>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
            <th className="px-4 py-3 text-left">Code</th>
            <th className="px-4 py-3 text-left">Account</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-right">Debit</th>
            <th className="px-4 py-3 text-right">Credit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map(row => (
            <tr key={row.account_code} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-mono text-slate-500">{row.account_code}</td>
              <td className="px-4 py-2 text-slate-800">{row.account_name}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[row.type] ?? ''}`}>{row.type}</span>
              </td>
              <td className="px-4 py-2 text-right text-slate-800">{row.debit > 0 ? fmt(row.debit) : '—'}</td>
              <td className="px-4 py-2 text-right text-slate-800">{row.credit > 0 ? fmt(row.credit) : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 font-bold bg-slate-50">
            <td colSpan={3} className="px-4 py-3 text-slate-700">Total</td>
            <td className="px-4 py-3 text-right text-slate-800">{fmt(totalDebit)}</td>
            <td className="px-4 py-3 text-right text-slate-800">{fmt(totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function AccountsLedgerPage() {
  const [tab, setTab] = useState<Tab>('chart')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'chart', label: 'Chart of Accounts' },
    { id: 'journal', label: 'Journal Entries' },
    { id: 'ledger', label: 'Account Ledger' },
    { id: 'trial', label: 'Trial Balance' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Accounts & Ledger</h1>
        <p className="text-sm text-slate-500">Double-entry bookkeeping, journal entries and account ledgers</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'chart' && <ChartTab />}
      {tab === 'journal' && <JournalTab />}
      {tab === 'ledger' && <LedgerTab />}
      {tab === 'trial' && <TrialBalanceTab />}
    </div>
  )
}
