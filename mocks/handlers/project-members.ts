import { http, HttpResponse } from 'msw'
import { MOCK_PROJECT_MEMBERS, MOCK_DAILY_LOGS } from '../fixtures/project-members'
import { MOCK_USERS } from '../fixtures/users'
import { ProjectMember, DailyLog } from '@/types'

let members = [...MOCK_PROJECT_MEMBERS]
let logs = [...MOCK_DAILY_LOGS]

export const projectMemberHandlers = [
  http.get('/api/projects/:id/members', ({ params }) => {
    const projectMembers = members
      .filter((m) => m.project_id === params.id)
      .map((m) => ({ ...m, user: MOCK_USERS.find((u) => u.id === m.user_id) }))
    return HttpResponse.json({ data: projectMembers })
  }),

  http.post('/api/projects/:id/members', async ({ params, request }) => {
    const body = await request.json() as { user_id: string; role: string }
    const exists = members.find((m) => m.project_id === params.id && m.user_id === body.user_id)
    if (exists) return HttpResponse.json({ message: 'Member already assigned' }, { status: 409 })
    const newMember: ProjectMember = { id: `pm${Date.now()}`, project_id: params.id as string, user_id: body.user_id, role: body.role }
    members = [...members, newMember]
    return HttpResponse.json({ ...newMember, user: MOCK_USERS.find((u) => u.id === body.user_id) }, { status: 201 })
  }),

  http.delete('/api/projects/:id/members/:userId', ({ params }) => {
    members = members.filter((m) => !(m.project_id === params.id && m.user_id === params.userId))
    return HttpResponse.json({ message: 'Removed' })
  }),

  http.get('/api/projects/:id/logs', ({ params }) => {
    const projectLogs = logs
      .filter((l) => l.project_id === params.id)
      .sort((a, b) => b.date.localeCompare(a.date))
    return HttpResponse.json({ data: projectLogs })
  }),

  http.post('/api/projects/:id/logs', async ({ params, request }) => {
    const body = await request.json() as Partial<DailyLog>
    const newLog: DailyLog = {
      id: `dl${Date.now()}`,
      project_id: params.id as string,
      date: body.date ?? new Date().toISOString().split('T')[0],
      description: body.description!,
      created_by: body.created_by ?? 'u4',
      weather: body.weather,
      workers_count: body.workers_count,
    }
    logs = [newLog, ...logs]
    return HttpResponse.json(newLog, { status: 201 })
  }),
]
