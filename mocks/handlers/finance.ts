import { http, HttpResponse } from 'msw'
import { MOCK_INVOICES, MOCK_PAYMENTS, MOCK_EXPENSES, MOCK_CASHFLOW, MOCK_PROFITABILITY } from '../fixtures/finance'
import { Invoice, Payment, Expense } from '@/types'

let invoices = [...MOCK_INVOICES]
let payments = [...MOCK_PAYMENTS]
let expenses = [...MOCK_EXPENSES]

export const financeHandlers = [
  // Overview summary
  http.get('/api/finance/overview', () => {
    const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0)
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const overdue = invoices.filter((i) => i.status === 'overdue').length
    return HttpResponse.json({ totalInvoiced, totalPaid, totalExpenses, overdue, balance: totalPaid - totalExpenses })
  }),

  http.get('/api/finance/cashflow', () => HttpResponse.json(MOCK_CASHFLOW)),

  http.get('/api/finance/profitability', () => HttpResponse.json(MOCK_PROFITABILITY)),

  // Invoices
  http.get('/api/invoices', ({ request }) => {
    const url = new URL(request.url)
    const project_id = url.searchParams.get('project_id')
    const status = url.searchParams.get('status')
    let data = [...invoices]
    if (project_id) data = data.filter((i) => i.project_id === project_id)
    if (status) data = data.filter((i) => i.status === status)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/invoices/:id', ({ params }) => {
    const inv = invoices.find((i) => i.id === params.id)
    if (!inv) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(inv)
  }),

  http.post('/api/invoices', async ({ request }) => {
    const body = (await request.json()) as Partial<Invoice>
    const newInv: Invoice = {
      id: `inv${Date.now()}`,
      project_id: body.project_id ?? '',
      invoice_number: `INV-2025-${String(invoices.length + 1).padStart(3, '0')}`,
      amount: body.amount ?? 0,
      due_date: body.due_date ?? '',
      status: 'draft',
      created_at: new Date().toISOString(),
    }
    invoices.push(newInv)
    return HttpResponse.json(newInv, { status: 201 })
  }),

  http.put('/api/invoices/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Invoice>
    const idx = invoices.findIndex((i) => i.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    invoices[idx] = { ...invoices[idx], ...body }
    return HttpResponse.json(invoices[idx])
  }),

  http.post('/api/invoices/:id/send', ({ params }) => {
    const idx = invoices.findIndex((i) => i.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    invoices[idx] = { ...invoices[idx], status: 'sent' }
    return HttpResponse.json(invoices[idx])
  }),

  http.post('/api/invoices/:id/pay', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Payment>
    const idx = invoices.findIndex((i) => i.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    invoices[idx] = { ...invoices[idx], status: 'paid' }
    const newPayment: Payment = {
      id: `pay${Date.now()}`,
      invoice_id: params.id as string,
      amount: invoices[idx].amount,
      payment_date: body.payment_date ?? new Date().toISOString().split('T')[0],
      payment_method: body.payment_method ?? 'bank_transfer',
    }
    payments.push(newPayment)
    return HttpResponse.json(newPayment, { status: 201 })
  }),

  http.delete('/api/invoices/:id', ({ params }) => {
    const idx = invoices.findIndex((i) => i.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    invoices.splice(idx, 1)
    return HttpResponse.json({ success: true })
  }),

  // Payments
  http.get('/api/payments', ({ request }) => {
    const url = new URL(request.url)
    const invoice_id = url.searchParams.get('invoice_id')
    let data = [...payments]
    if (invoice_id) data = data.filter((p) => p.invoice_id === invoice_id)
    return HttpResponse.json({ data, total: data.length })
  }),

  // Expenses
  http.get('/api/expenses', ({ request }) => {
    const url = new URL(request.url)
    const project_id = url.searchParams.get('project_id')
    const category = url.searchParams.get('category')
    let data = [...expenses]
    if (project_id) data = data.filter((e) => e.project_id === project_id)
    if (category) data = data.filter((e) => e.category === category)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.post('/api/expenses', async ({ request }) => {
    const body = (await request.json()) as Partial<Expense>
    const newExp: Expense = {
      id: `exp${Date.now()}`,
      project_id: body.project_id ?? '',
      category: body.category ?? '',
      amount: body.amount ?? 0,
      expense_date: body.expense_date ?? new Date().toISOString().split('T')[0],
      description: body.description ?? '',
      created_by: body.created_by ?? 'u4',
    }
    expenses.push(newExp)
    return HttpResponse.json(newExp, { status: 201 })
  }),

  http.delete('/api/expenses/:id', ({ params }) => {
    const idx = expenses.findIndex((e) => e.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    expenses.splice(idx, 1)
    return HttpResponse.json({ success: true })
  }),
]
