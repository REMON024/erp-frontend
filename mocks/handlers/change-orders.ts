import { http, HttpResponse } from 'msw'
import { MOCK_CHANGE_ORDERS } from '@/mocks/fixtures/change-orders'
import { ChangeOrder } from '@/types'

let changeOrders = [...MOCK_CHANGE_ORDERS]

export const changeOrderHandlers = [
  http.get('/api/change-orders', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const status = url.searchParams.get('status')
    let data = [...changeOrders]
    if (projectId) data = data.filter(c => c.project_id === projectId)
    if (status) data = data.filter(c => c.status === status)
    const totalImpact = data.reduce((s, c) => s + c.impact_cost, 0)
    return HttpResponse.json({ data, total: data.length, total_impact_cost: totalImpact })
  }),

  http.get('/api/change-orders/:id', ({ params }) => {
    const co = changeOrders.find(c => c.id === params.id)
    if (!co) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: co })
  }),

  http.post('/api/change-orders', async ({ request }) => {
    const body = await request.json() as Partial<ChangeOrder>
    const newCO: ChangeOrder = {
      id: `co${Date.now()}`,
      project_id: body.project_id ?? '',
      sale_id: body.sale_id,
      reference: `VO-${body.project_id?.toUpperCase()}-${String(changeOrders.length + 1).padStart(3, '0')}`,
      title: body.title ?? '',
      description: body.description ?? '',
      impact_cost: body.impact_cost ?? 0,
      impact_days: body.impact_days ?? 0,
      status: 'draft',
      submitted_by: body.submitted_by ?? 'user1',
      created_at: new Date().toISOString(),
    }
    changeOrders.push(newCO)
    return HttpResponse.json({ data: newCO }, { status: 201 })
  }),

  http.patch('/api/change-orders/:id', async ({ params, request }) => {
    const idx = changeOrders.findIndex(c => c.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Partial<ChangeOrder>
    changeOrders[idx] = { ...changeOrders[idx], ...body }
    return HttpResponse.json({ data: changeOrders[idx] })
  }),

  http.post('/api/change-orders/:id/submit', ({ params }) => {
    const idx = changeOrders.findIndex(c => c.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    changeOrders[idx] = { ...changeOrders[idx], status: 'submitted' }
    return HttpResponse.json({ data: changeOrders[idx] })
  }),

  http.post('/api/change-orders/:id/approve', ({ params }) => {
    const idx = changeOrders.findIndex(c => c.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    changeOrders[idx] = { ...changeOrders[idx], status: 'approved', approved_by: 'user1' }
    return HttpResponse.json({ data: changeOrders[idx] })
  }),

  http.post('/api/change-orders/:id/reject', ({ params }) => {
    const idx = changeOrders.findIndex(c => c.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    changeOrders[idx] = { ...changeOrders[idx], status: 'rejected' }
    return HttpResponse.json({ data: changeOrders[idx] })
  }),

  http.delete('/api/change-orders/:id', ({ params }) => {
    const idx = changeOrders.findIndex(c => c.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    changeOrders.splice(idx, 1)
    return HttpResponse.json({ message: 'Deleted' })
  }),
]
