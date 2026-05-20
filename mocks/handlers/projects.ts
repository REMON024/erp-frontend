import { http, HttpResponse } from 'msw'
import { MOCK_PROJECTS } from '../fixtures/projects'
import { Project } from '@/types'

let projects = [...MOCK_PROJECTS]

export const projectHandlers = [
  http.get('/api/projects', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')?.toLowerCase()
    const page = parseInt(url.searchParams.get('page') || '1')
    const per_page = parseInt(url.searchParams.get('per_page') || '10')

    let filtered = projects
    if (status) filtered = filtered.filter((p) => p.status === status)
    if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search))

    const total = filtered.length
    const data = filtered.slice((page - 1) * per_page, page * per_page)

    return HttpResponse.json({ data, total, page, per_page, total_pages: Math.ceil(total / per_page) })
  }),

  http.get('/api/projects/:id', ({ params }) => {
    const project = projects.find((p) => p.id === params.id)
    if (!project) return HttpResponse.json({ message: 'Project not found' }, { status: 404 })
    return HttpResponse.json(project)
  }),

  http.post('/api/projects', async ({ request }) => {
    const body = await request.json() as Partial<Project>
    const newProject: Project = {
      id: `p${Date.now()}`,
      name: body.name!,
      code: body.code!,
      client_name: body.client_name!,
      location: body.location!,
      start_date: body.start_date!,
      end_date: body.end_date!,
      budget: body.budget!,
      spent: 0,
      status: 'planning',
      progress: 0,
      manager_id: body.manager_id!,
      created_at: new Date().toISOString(),
    }
    projects = [newProject, ...projects]
    return HttpResponse.json(newProject, { status: 201 })
  }),

  http.put('/api/projects/:id', async ({ params, request }) => {
    const body = await request.json() as Partial<Project>
    const index = projects.findIndex((p) => p.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    projects[index] = { ...projects[index], ...body }
    return HttpResponse.json(projects[index])
  }),

  http.delete('/api/projects/:id', ({ params }) => {
    projects = projects.filter((p) => p.id !== params.id)
    return HttpResponse.json({ message: 'Deleted' })
  }),
]
