import { http, HttpResponse } from 'msw'
import { MOCK_ESTIMATES } from '@/mocks/fixtures/costing'

export const costingHandlers = [
  // Cost Estimates (BOQ)
  http.get('/api/cost-estimates', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const status = url.searchParams.get('status')
    let data = MOCK_ESTIMATES.map(e => ({ ...e, items: undefined })) // list without items
    if (projectId) data = data.filter(e => e.project_id === projectId)
    if (status) data = data.filter(e => e.status === status)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/cost-estimates/:id', ({ params }) => {
    const estimate = MOCK_ESTIMATES.find(e => e.id === params.id)
    if (!estimate) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: estimate })
  }),

  http.post('/api/cost-estimates', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newEstimate = {
      id: `est${Date.now()}`,
      version: 1,
      status: 'draft',
      total_estimated: 0,
      total_actual: 0,
      variance: 0,
      items: [],
      created_at: new Date().toISOString(),
      ...body,
    }
    return HttpResponse.json({ data: newEstimate }, { status: 201 })
  }),

  http.patch('/api/cost-estimates/:id', async ({ params, request }) => {
    const estimate = MOCK_ESTIMATES.find(e => e.id === params.id)
    if (!estimate) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ data: { ...estimate, ...body } })
  }),

  // BOQ Items
  http.get('/api/cost-estimates/:id/items', ({ params }) => {
    const estimate = MOCK_ESTIMATES.find(e => e.id === params.id)
    if (!estimate) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: estimate.items, total: estimate.items.length })
  }),

  http.post('/api/cost-estimates/:id/items', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const newItem = { id: `boq${Date.now()}`, estimate_id: params.id, actual_amount: 0, ...body }
    return HttpResponse.json({ data: newItem }, { status: 201 })
  }),

  http.patch('/api/boq-items/:id', async ({ params, request }) => {
    let found = null
    for (const est of MOCK_ESTIMATES) {
      const item = est.items.find(i => i.id === params.id)
      if (item) { found = item; break }
    }
    if (!found) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ data: { ...found, ...body } })
  }),

  http.delete('/api/boq-items/:id', () => {
    return HttpResponse.json({ message: 'Deleted' })
  }),

  // BOQ Summary by category for a project
  http.get('/api/cost-estimates/:id/summary', ({ params }) => {
    const estimate = MOCK_ESTIMATES.find(e => e.id === params.id)
    if (!estimate) return HttpResponse.json({ message: 'Not found' }, { status: 404 })

    const byCategory: Record<string, { estimated: number; actual: number }> = {}
    for (const item of estimate.items) {
      if (!byCategory[item.category]) byCategory[item.category] = { estimated: 0, actual: 0 }
      byCategory[item.category].estimated += item.estimated_amount
      byCategory[item.category].actual += item.actual_amount
    }

    const data = Object.entries(byCategory).map(([category, vals]) => ({
      category,
      estimated_amount: vals.estimated,
      actual_amount: vals.actual,
      variance: vals.actual - vals.estimated,
      completion_pct: vals.estimated > 0 ? Math.round((vals.actual / vals.estimated) * 100) : 0,
    }))

    return HttpResponse.json({ data })
  }),
]
