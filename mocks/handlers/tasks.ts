import { http, HttpResponse } from 'msw'
import { MOCK_TASKS } from '../fixtures/tasks'
import { Task } from '@/types'

let tasks = [...MOCK_TASKS]

export const taskHandlers = [
  http.get('/api/tasks', ({ request }) => {
    const url = new URL(request.url)
    const project_id = url.searchParams.get('project_id')
    const status = url.searchParams.get('status')
    const assigned_to = url.searchParams.get('assigned_to')

    let filtered = tasks
    if (project_id) filtered = filtered.filter((t) => t.project_id === project_id)
    if (status) filtered = filtered.filter((t) => t.status === status)
    if (assigned_to) filtered = filtered.filter((t) => t.assigned_to === assigned_to)

    return HttpResponse.json({ data: filtered, total: filtered.length })
  }),

  http.get('/api/tasks/:id', ({ params }) => {
    const task = tasks.find((t) => t.id === params.id)
    if (!task) return HttpResponse.json({ message: 'Task not found' }, { status: 404 })
    return HttpResponse.json(task)
  }),

  http.post('/api/tasks', async ({ request }) => {
    const body = await request.json() as Partial<Task>
    const newTask: Task = {
      id: `t${Date.now()}`,
      project_id: body.project_id!,
      title: body.title!,
      description: body.description,
      assigned_to: body.assigned_to!,
      start_date: body.start_date!,
      due_date: body.due_date!,
      priority: body.priority || 'medium',
      status: 'pending',
      progress: 0,
      subtasks: [],
      comments: [],
    }
    tasks = [newTask, ...tasks]
    return HttpResponse.json(newTask, { status: 201 })
  }),

  http.put('/api/tasks/:id', async ({ params, request }) => {
    const body = await request.json() as Partial<Task>
    const index = tasks.findIndex((t) => t.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    tasks[index] = { ...tasks[index], ...body }
    return HttpResponse.json(tasks[index])
  }),

  http.post('/api/tasks/:id/comments', async ({ params, request }) => {
    const body = await request.json() as { text: string; user_id: string }
    const task = tasks.find((t) => t.id === params.id)
    if (!task) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const comment = { id: `c${Date.now()}`, task_id: params.id as string, user_id: body.user_id, text: body.text, created_at: new Date().toISOString() }
    task.comments = [...(task.comments || []), comment]
    return HttpResponse.json(comment, { status: 201 })
  }),
]
