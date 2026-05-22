import { http, HttpResponse } from 'msw'
import { MOCK_SITE_LOGS } from '@/mocks/fixtures/site-logs'
import { DailyLog } from '@/types'

let siteLogs = [...MOCK_SITE_LOGS]

export const siteLogHandlers = [
  http.get('/api/site-logs', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    let data = [...siteLogs].sort((a, b) => b.date.localeCompare(a.date))
    if (projectId) data = data.filter(l => l.project_id === projectId)
    if (from) data = data.filter(l => l.date >= from)
    if (to) data = data.filter(l => l.date <= to)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/site-logs/:id', ({ params }) => {
    const log = siteLogs.find(l => l.id === params.id)
    if (!log) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: log })
  }),

  http.post('/api/site-logs', async ({ request }) => {
    const body = await request.json() as Partial<DailyLog>
    const existing = siteLogs.find(l => l.project_id === body.project_id && l.date === body.date)
    if (existing) return HttpResponse.json({ message: 'Log already exists for this date' }, { status: 409 })
    const newLog: DailyLog = {
      id: `sl${Date.now()}`,
      project_id: body.project_id ?? '',
      date: body.date ?? new Date().toISOString().slice(0, 10),
      description: body.description ?? '',
      created_by: body.created_by ?? 'user2',
      weather: body.weather,
      workers_count: body.workers_count,
    }
    siteLogs.unshift(newLog)
    return HttpResponse.json({ data: newLog }, { status: 201 })
  }),

  http.patch('/api/site-logs/:id', async ({ params, request }) => {
    const idx = siteLogs.findIndex(l => l.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Partial<DailyLog>
    siteLogs[idx] = { ...siteLogs[idx], ...body }
    return HttpResponse.json({ data: siteLogs[idx] })
  }),

  http.delete('/api/site-logs/:id', ({ params }) => {
    const idx = siteLogs.findIndex(l => l.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    siteLogs.splice(idx, 1)
    return HttpResponse.json({ message: 'Deleted' })
  }),

  // Summary: worker days per project per month
  http.get('/api/site-logs/summary', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    let data = projectId ? siteLogs.filter(l => l.project_id === projectId) : siteLogs
    const totalWorkerDays = data.reduce((s, l) => s + (l.workers_count ?? 0), 0)
    const logDays = data.length
    const rainDays = data.filter(l => l.weather === 'rainy').length
    return HttpResponse.json({ data: { total_log_days: logDays, total_worker_days: totalWorkerDays, rain_days: rainDays } })
  }),
]
