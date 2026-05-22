import { http, HttpResponse } from 'msw'
import { MOCK_SNAG_ITEMS } from '@/mocks/fixtures/snagging'
import { SnagItem } from '@/types'

let snagItems = [...MOCK_SNAG_ITEMS]

export const snaggingHandlers = [
  http.get('/api/snag-items', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const unitId = url.searchParams.get('unit_id')
    const status = url.searchParams.get('status')
    const severity = url.searchParams.get('severity')
    let data = [...snagItems]
    if (projectId) data = data.filter(s => s.project_id === projectId)
    if (unitId) data = data.filter(s => s.unit_id === unitId)
    if (status) data = data.filter(s => s.status === status)
    if (severity) data = data.filter(s => s.severity === severity)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/snag-items/:id', ({ params }) => {
    const item = snagItems.find(s => s.id === params.id)
    if (!item) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: item })
  }),

  http.post('/api/snag-items', async ({ request }) => {
    const body = await request.json() as Partial<SnagItem>
    const newItem: SnagItem = {
      id: `sn${Date.now()}`,
      project_id: body.project_id ?? '',
      unit_id: body.unit_id,
      title: body.title ?? '',
      description: body.description ?? '',
      location: body.location ?? '',
      severity: body.severity ?? 'minor',
      status: 'open',
      reported_by: body.reported_by ?? 'user1',
      assigned_to: body.assigned_to,
      reported_date: body.reported_date ?? new Date().toISOString().slice(0, 10),
      target_date: body.target_date,
    }
    snagItems.push(newItem)
    return HttpResponse.json({ data: newItem }, { status: 201 })
  }),

  http.patch('/api/snag-items/:id', async ({ params, request }) => {
    const idx = snagItems.findIndex(s => s.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Partial<SnagItem>
    snagItems[idx] = { ...snagItems[idx], ...body }
    return HttpResponse.json({ data: snagItems[idx] })
  }),

  http.post('/api/snag-items/:id/resolve', async ({ params, request }) => {
    const idx = snagItems.findIndex(s => s.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as { resolved_date?: string }
    snagItems[idx] = { ...snagItems[idx], status: 'resolved', resolved_date: body.resolved_date ?? new Date().toISOString().slice(0, 10) }
    return HttpResponse.json({ data: snagItems[idx] })
  }),

  http.post('/api/snag-items/:id/close', ({ params }) => {
    const idx = snagItems.findIndex(s => s.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    snagItems[idx] = { ...snagItems[idx], status: 'closed' }
    return HttpResponse.json({ data: snagItems[idx] })
  }),

  http.delete('/api/snag-items/:id', ({ params }) => {
    const idx = snagItems.findIndex(s => s.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    snagItems.splice(idx, 1)
    return HttpResponse.json({ message: 'Deleted' })
  }),

  // Summary by project
  http.get('/api/snag-items/summary', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const data = projectId ? snagItems.filter(s => s.project_id === projectId) : snagItems
    return HttpResponse.json({
      data: {
        total: data.length,
        open: data.filter(s => s.status === 'open').length,
        in_progress: data.filter(s => s.status === 'in_progress').length,
        resolved: data.filter(s => s.status === 'resolved').length,
        closed: data.filter(s => s.status === 'closed').length,
        critical: data.filter(s => s.severity === 'critical').length,
        major: data.filter(s => s.severity === 'major').length,
        minor: data.filter(s => s.severity === 'minor').length,
      },
    })
  }),
]
