import { http, HttpResponse } from 'msw'
import { MOCK_PERMITS, MOCK_COMPLIANCE_DOCS, ComplianceDocument } from '../fixtures/compliance'
import { CompliancePermit } from '@/types'

let permits = [...MOCK_PERMITS]
let docs = [...MOCK_COMPLIANCE_DOCS]

export const complianceHandlers = [
  http.get('/api/compliance/permits', ({ request }) => {
    const url = new URL(request.url)
    const project_id = url.searchParams.get('project_id')
    const status = url.searchParams.get('status')
    let data = [...permits]
    if (project_id) data = data.filter((p) => p.project_id === project_id)
    if (status) data = data.filter((p) => p.status === status)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.post('/api/compliance/permits', async ({ request }) => {
    const body = (await request.json()) as Partial<CompliancePermit>
    const newItem: CompliancePermit = {
      id: `cp${Date.now()}`,
      project_id: body.project_id ?? '',
      title: body.title ?? '',
      permit_number: body.permit_number ?? '',
      issuing_authority: body.issuing_authority ?? '',
      issue_date: body.issue_date ?? '',
      expiry_date: body.expiry_date ?? '',
      status: 'active',
    }
    permits.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),

  http.put('/api/compliance/permits/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<CompliancePermit>
    const idx = permits.findIndex((p) => p.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    permits[idx] = { ...permits[idx], ...body }
    return HttpResponse.json(permits[idx])
  }),

  http.delete('/api/compliance/permits/:id', ({ params }) => {
    const idx = permits.findIndex((p) => p.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    permits.splice(idx, 1)
    return HttpResponse.json({ success: true })
  }),

  http.get('/api/compliance/documents', ({ request }) => {
    const url = new URL(request.url)
    const project_id = url.searchParams.get('project_id')
    const category = url.searchParams.get('category')
    let data = [...docs]
    if (project_id) data = data.filter((d) => d.project_id === project_id)
    if (category) data = data.filter((d) => d.category === category)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.post('/api/compliance/documents', async ({ request }) => {
    const body = (await request.json()) as Partial<ComplianceDocument>
    const newDoc: ComplianceDocument = {
      id: `cd${Date.now()}`,
      project_id: body.project_id ?? '',
      title: body.title ?? '',
      category: body.category ?? 'legal',
      file_name: body.file_name ?? '',
      uploaded_by: body.uploaded_by ?? 'u2',
      uploaded_at: new Date().toISOString(),
      notes: body.notes ?? '',
    }
    docs.push(newDoc)
    return HttpResponse.json(newDoc, { status: 201 })
  }),

  http.delete('/api/compliance/documents/:id', ({ params }) => {
    const idx = docs.findIndex((d) => d.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    docs.splice(idx, 1)
    return HttpResponse.json({ success: true })
  }),
]
