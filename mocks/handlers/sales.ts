import { http, HttpResponse } from 'msw'
import { MOCK_CUSTOMERS, MOCK_UNITS, MOCK_SALES, MOCK_SCHEDULES, MOCK_COLLECTIONS } from '@/mocks/fixtures/sales'

export const salesHandlers = [
  // Customers
  http.get('/api/customers', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''
    const data = search
      ? MOCK_CUSTOMERS.filter(c => c.name.toLowerCase().includes(search) || c.phone.includes(search))
      : MOCK_CUSTOMERS
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/customers/:id', ({ params }) => {
    const customer = MOCK_CUSTOMERS.find(c => c.id === params.id)
    if (!customer) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: customer })
  }),

  http.post('/api/customers', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newCustomer = { id: `cust${Date.now()}`, created_at: new Date().toISOString(), ...body }
    return HttpResponse.json({ data: newCustomer }, { status: 201 })
  }),

  // Units
  http.get('/api/units', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const status = url.searchParams.get('status')
    let data = [...MOCK_UNITS]
    if (projectId) data = data.filter(u => u.project_id === projectId)
    if (status) data = data.filter(u => u.status === status)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/units/:id', ({ params }) => {
    const unit = MOCK_UNITS.find(u => u.id === params.id)
    if (!unit) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: unit })
  }),

  // Summary stats for dashboard — must be before /api/sales/:id
  http.get('/api/sales/summary', () => {
    const totalSales = MOCK_SALES.reduce((s, x) => s + x.net_price, 0)
    const totalCollected = MOCK_COLLECTIONS.reduce((s, x) => s + x.amount, 0)
    const overdue = MOCK_SCHEDULES.filter(s => s.status === 'overdue').reduce((s, x) => s + x.amount, 0)
    return HttpResponse.json({
      data: {
        total_sales: MOCK_SALES.length,
        total_revenue: totalSales,
        total_collected: totalCollected,
        outstanding: totalSales - totalCollected,
        overdue_amount: overdue,
      },
    })
  }),

  // Sales
  http.get('/api/sales', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const status = url.searchParams.get('status')
    const customerId = url.searchParams.get('customer_id')
    let data = MOCK_SALES.map(s => ({
      ...s,
      customer: MOCK_CUSTOMERS.find(c => c.id === s.customer_id),
      unit: MOCK_UNITS.find(u => u.id === s.unit_id),
    }))
    if (projectId) data = data.filter(s => s.project_id === projectId)
    if (status) data = data.filter(s => s.status === status)
    if (customerId) data = data.filter(s => s.customer_id === customerId)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/sales/:id', ({ params }) => {
    const sale = MOCK_SALES.find(s => s.id === params.id)
    if (!sale) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({
      data: {
        ...sale,
        customer: MOCK_CUSTOMERS.find(c => c.id === sale.customer_id),
        unit: MOCK_UNITS.find(u => u.id === sale.unit_id),
      },
    })
  }),

  http.post('/api/sales', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newSale = { id: `sale${Date.now()}`, created_at: new Date().toISOString(), ...body }
    return HttpResponse.json({ data: newSale }, { status: 201 })
  }),

  http.patch('/api/sales/:id', async ({ params, request }) => {
    const sale = MOCK_SALES.find(s => s.id === params.id)
    if (!sale) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ data: { ...sale, ...body } })
  }),

  // Payment Schedules
  http.get('/api/sales/:id/schedules', ({ params }) => {
    const data = MOCK_SCHEDULES.filter(s => s.sale_id === params.id)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.post('/api/sales/:id/schedules', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const newSchedule = { id: `sch${Date.now()}`, sale_id: params.id, ...body }
    return HttpResponse.json({ data: newSchedule }, { status: 201 })
  }),

  http.patch('/api/schedules/:id', async ({ params, request }) => {
    const schedule = MOCK_SCHEDULES.find(s => s.id === params.id)
    if (!schedule) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ data: { ...schedule, ...body } })
  }),

  // Collections
  http.get('/api/collections', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const saleId = url.searchParams.get('sale_id')
    const customerId = url.searchParams.get('customer_id')
    let data = MOCK_COLLECTIONS.map(col => ({
      ...col,
      customer: MOCK_CUSTOMERS.find(c => c.id === col.customer_id),
    }))
    if (projectId) data = data.filter(c => c.project_id === projectId)
    if (saleId) data = data.filter(c => c.sale_id === saleId)
    if (customerId) data = data.filter(c => c.customer_id === customerId)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.post('/api/collections', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newCollection = { id: `col${Date.now()}`, created_at: new Date().toISOString(), ...body }
    return HttpResponse.json({ data: newCollection }, { status: 201 })
  }),

]
