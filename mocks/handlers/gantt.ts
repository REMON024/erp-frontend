import { http, HttpResponse } from 'msw'
import { MOCK_TASKS } from '../fixtures/tasks'
import { MOCK_MILESTONES } from '../fixtures/milestones'
import { Milestone } from '@/types'

let milestones = [...MOCK_MILESTONES]

export const ganttHandlers = [
  http.get('/api/projects/:id/gantt', ({ params }) => {
    const tasks = MOCK_TASKS
      .filter((t) => t.project_id === params.id)
      .map((t) => ({
        id: t.id, text: t.title, start_date: t.start_date,
        end_date: t.due_date, progress: t.progress / 100, status: t.status,
        priority: t.priority,
      }))
    const mils = milestones.filter((m) => m.project_id === params.id)
    return HttpResponse.json({ tasks, milestones: mils })
  }),

  http.get('/api/milestones', ({ request }) => {
    const url = new URL(request.url)
    const project_id = url.searchParams.get('project_id')
    const filtered = project_id ? milestones.filter((m) => m.project_id === project_id) : milestones
    return HttpResponse.json({ data: filtered })
  }),

  http.post('/api/milestones', async ({ request }) => {
    const body = await request.json() as Partial<Milestone>
    const m: Milestone = { id: `ml${Date.now()}`, project_id: body.project_id!, name: body.name!, due_date: body.due_date!, status: 'pending' }
    milestones = [...milestones, m]
    return HttpResponse.json(m, { status: 201 })
  }),

  http.put('/api/milestones/:id', async ({ params, request }) => {
    const body = await request.json() as Partial<Milestone>
    const idx = milestones.findIndex((m) => m.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    milestones[idx] = { ...milestones[idx], ...body }
    return HttpResponse.json(milestones[idx])
  }),
]
