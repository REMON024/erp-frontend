import { http, HttpResponse } from 'msw'
import { MOCK_INCIDENTS, MOCK_HAZARDS, MOCK_INSPECTIONS, MOCK_TRAINING, HazardReport, SafetyInspection, TrainingRecord } from '../fixtures/safety'
import { SafetyIncident } from '@/types'

let incidents = [...MOCK_INCIDENTS]
let hazards = [...MOCK_HAZARDS]
let inspections = [...MOCK_INSPECTIONS]
let training = [...MOCK_TRAINING]

export const safetyHandlers = [
  // Incidents
  http.get('/api/safety/incidents', ({ request }) => {
    const url = new URL(request.url)
    const project_id = url.searchParams.get('project_id')
    const severity = url.searchParams.get('severity')
    const status = url.searchParams.get('status')
    let data = [...incidents]
    if (project_id) data = data.filter((i) => i.project_id === project_id)
    if (severity) data = data.filter((i) => i.severity === severity)
    if (status) data = data.filter((i) => i.status === status)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/safety/incidents/:id', ({ params }) => {
    const item = incidents.find((i) => i.id === params.id)
    if (!item) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  http.post('/api/safety/incidents', async ({ request }) => {
    const body = (await request.json()) as Partial<SafetyIncident>
    const newItem: SafetyIncident = {
      id: `si${Date.now()}`,
      project_id: body.project_id ?? '',
      title: body.title ?? '',
      description: body.description ?? '',
      severity: body.severity ?? 'low',
      date: body.date ?? new Date().toISOString().split('T')[0],
      reported_by: body.reported_by ?? 'u4',
      status: 'open',
    }
    incidents.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),

  http.put('/api/safety/incidents/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<SafetyIncident>
    const idx = incidents.findIndex((i) => i.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    incidents[idx] = { ...incidents[idx], ...body }
    return HttpResponse.json(incidents[idx])
  }),

  // Hazards
  http.get('/api/safety/hazards', ({ request }) => {
    const url = new URL(request.url)
    const project_id = url.searchParams.get('project_id')
    const status = url.searchParams.get('status')
    let data = [...hazards]
    if (project_id) data = data.filter((h) => h.project_id === project_id)
    if (status) data = data.filter((h) => h.status === status)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.post('/api/safety/hazards', async ({ request }) => {
    const body = (await request.json()) as Partial<HazardReport>
    const newItem: HazardReport = {
      id: `hz${Date.now()}`,
      project_id: body.project_id ?? '',
      title: body.title ?? '',
      location: body.location ?? '',
      description: body.description ?? '',
      risk_level: body.risk_level ?? 'low',
      reported_by: body.reported_by ?? 'u4',
      date: body.date ?? new Date().toISOString().split('T')[0],
      status: 'open',
    }
    hazards.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),

  http.put('/api/safety/hazards/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<HazardReport>
    const idx = hazards.findIndex((h) => h.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    hazards[idx] = { ...hazards[idx], ...body }
    return HttpResponse.json(hazards[idx])
  }),

  // Inspections
  http.get('/api/safety/inspections', ({ request }) => {
    const url = new URL(request.url)
    const project_id = url.searchParams.get('project_id')
    let data = [...inspections]
    if (project_id) data = data.filter((i) => i.project_id === project_id)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.post('/api/safety/inspections', async ({ request }) => {
    const body = (await request.json()) as Partial<SafetyInspection>
    const score = body.score ?? 0
    const newItem: SafetyInspection = {
      id: `ins${Date.now()}`,
      project_id: body.project_id ?? '',
      title: body.title ?? '',
      inspector: body.inspector ?? '',
      date: body.date ?? new Date().toISOString().split('T')[0],
      score,
      status: score >= 70 ? 'passed' : 'failed',
      notes: body.notes ?? '',
    }
    inspections.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),

  // Training
  http.get('/api/safety/training', () => {
    return HttpResponse.json({ data: training, total: training.length })
  }),

  http.post('/api/safety/training', async ({ request }) => {
    const body = (await request.json()) as Partial<TrainingRecord>
    const newItem: TrainingRecord = {
      id: `tr${Date.now()}`,
      title: body.title ?? '',
      conducted_by: body.conducted_by ?? '',
      date: body.date ?? new Date().toISOString().split('T')[0],
      participants: body.participants ?? 0,
      validity_months: body.validity_months ?? 12,
      expiry_date: body.expiry_date ?? '',
    }
    training.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),
]
