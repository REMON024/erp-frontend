import { http, HttpResponse } from 'msw'
import { MOCK_ACCOUNTS } from '@/mocks/fixtures/ledger'
import { sharedJournalEntries as journalEntries } from '@/mocks/shared-state'

export const ledgerHandlers = [
  // Accounts (Chart of Accounts)
  http.get('/api/accounts', ({ request }) => {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const data = type ? MOCK_ACCOUNTS.filter(a => a.type === type) : MOCK_ACCOUNTS
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/accounts/:id', ({ params }) => {
    const account = MOCK_ACCOUNTS.find(a => a.id === params.id)
    if (!account) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: account })
  }),

  http.post('/api/accounts', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newAccount = { id: `acc${Date.now()}`, balance: 0, ...body }
    return HttpResponse.json({ data: newAccount }, { status: 201 })
  }),

  // Journal Entries
  http.get('/api/journal-entries', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    let data = journalEntries.map(je => ({
      ...je,
      lines: je.lines.map(l => ({
        ...l,
        account: MOCK_ACCOUNTS.find(a => a.id === l.account_id),
      })),
    }))
    if (projectId) data = data.filter(je => je.project_id === projectId)
    if (from) data = data.filter(je => je.date >= from)
    if (to) data = data.filter(je => je.date <= to)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/journal-entries/:id', ({ params }) => {
    const je = journalEntries.find(j => j.id === params.id)
    if (!je) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({
      data: {
        ...je,
        lines: je.lines.map(l => ({
          ...l,
          account: MOCK_ACCOUNTS.find(a => a.id === l.account_id),
        })),
      },
    })
  }),

  http.post('/api/journal-entries', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newEntry = {
      id: `je${Date.now()}`,
      created_at: new Date().toISOString(),
      ...body,
    }
    return HttpResponse.json({ data: newEntry }, { status: 201 })
  }),

  // Ledger — transactions for a specific account
  http.get('/api/accounts/:id/ledger', ({ params, request }) => {
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const entries = journalEntries.filter(je => {
      if (from && je.date < from) return false
      if (to && je.date > to) return false
      return je.lines.some(l => l.account_id === params.id)
    })

    let runningBalance = 0
    const rows = entries.flatMap(je =>
      je.lines
        .filter(l => l.account_id === params.id)
        .map(l => {
          runningBalance += l.debit - l.credit
          return {
            date: je.date,
            reference: je.reference,
            description: je.description,
            debit: l.debit,
            credit: l.credit,
            balance: runningBalance,
          }
        })
    )

    return HttpResponse.json({ data: rows, total: rows.length })
  }),

  // Trial Balance
  http.get('/api/trial-balance', () => {
    const data = MOCK_ACCOUNTS.map(a => ({
      account_code: a.code,
      account_name: a.name,
      type: a.type,
      debit: ['asset', 'expense'].includes(a.type) ? a.balance : 0,
      credit: ['liability', 'equity', 'income'].includes(a.type) ? a.balance : 0,
    }))
    const totalDebit = data.reduce((s, r) => s + r.debit, 0)
    const totalCredit = data.reduce((s, r) => s + r.credit, 0)
    return HttpResponse.json({ data, total_debit: totalDebit, total_credit: totalCredit })
  }),
]
