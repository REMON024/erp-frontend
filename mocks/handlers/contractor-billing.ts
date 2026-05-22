import { http, HttpResponse } from 'msw'
import { MOCK_CONTRACTOR_BILLS } from '@/mocks/fixtures/contractor-billing'

export const contractorBillingHandlers = [
  // Summary — must come before /api/contractor-bills/:id
  http.get('/api/contractor-bills/summary', () => {
    const bills = MOCK_CONTRACTOR_BILLS
    const totalBilled = bills.reduce((s, b) => s + b.gross_amount, 0)
    const totalPaid = bills.reduce((s, b) => s + b.paid_amount, 0)
    const totalRetention = bills.reduce((s, b) => s + b.retention_amount, 0)
    const pending = bills.filter(b => ['submitted', 'verified', 'approved'].includes(b.status))
    return HttpResponse.json({
      data: {
        total_billed: totalBilled,
        total_paid: totalPaid,
        outstanding: totalBilled - totalPaid,
        total_retention_held: totalRetention,
        pending_approval_count: pending.length,
      },
    })
  }),

  http.get('/api/contractor-bills', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const contractorId = url.searchParams.get('contractor_id')
    const status = url.searchParams.get('status')
    let data = MOCK_CONTRACTOR_BILLS.map(b => ({ ...b, items: undefined }))
    if (projectId) data = data.filter(b => b.project_id === projectId)
    if (contractorId) data = data.filter(b => b.contractor_id === contractorId)
    if (status) data = data.filter(b => b.status === status)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/contractor-bills/:id', ({ params }) => {
    const bill = MOCK_CONTRACTOR_BILLS.find(b => b.id === params.id)
    if (!bill) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: bill })
  }),

  http.post('/api/contractor-bills', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newBill = {
      id: `bill${Date.now()}`,
      status: 'draft',
      paid_amount: 0,
      created_at: new Date().toISOString(),
      ...body,
    }
    return HttpResponse.json({ data: newBill }, { status: 201 })
  }),

  http.patch('/api/contractor-bills/:id', async ({ params, request }) => {
    const bill = MOCK_CONTRACTOR_BILLS.find(b => b.id === params.id)
    if (!bill) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ data: { ...bill, ...body } })
  }),

  // Approve / verify workflow actions
  http.post('/api/contractor-bills/:id/submit', ({ params }) => {
    const bill = MOCK_CONTRACTOR_BILLS.find(b => b.id === params.id)
    if (!bill) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: { ...bill, status: 'submitted' } })
  }),

  http.post('/api/contractor-bills/:id/verify', ({ params }) => {
    const bill = MOCK_CONTRACTOR_BILLS.find(b => b.id === params.id)
    if (!bill) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: { ...bill, status: 'verified' } })
  }),

  http.post('/api/contractor-bills/:id/approve', ({ params }) => {
    const bill = MOCK_CONTRACTOR_BILLS.find(b => b.id === params.id)
    if (!bill) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: { ...bill, status: 'approved' } })
  }),

  http.post('/api/contractor-bills/:id/pay', async ({ params, request }) => {
    const bill = MOCK_CONTRACTOR_BILLS.find(b => b.id === params.id)
    if (!bill) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as { amount?: number }
    return HttpResponse.json({
      data: { ...bill, status: 'paid', paid_amount: body.amount ?? bill.net_payable },
    })
  }),

  // Bill items
  http.get('/api/contractor-bills/:id/items', ({ params }) => {
    const bill = MOCK_CONTRACTOR_BILLS.find(b => b.id === params.id)
    if (!bill) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: bill.items, total: bill.items.length })
  }),

]
