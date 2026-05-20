import { http, HttpResponse } from 'msw'
import { MOCK_DOCUMENTS } from '../fixtures/documents'
import { Document } from '@/types'

let documents = [...MOCK_DOCUMENTS]

export const documentHandlers = [
  http.get('/api/documents', ({ request }) => {
    const url = new URL(request.url)
    const module_name = url.searchParams.get('module_name')
    const reference_id = url.searchParams.get('reference_id')
    const search = url.searchParams.get('search')?.toLowerCase()
    let data = [...documents]
    if (module_name) data = data.filter((d) => d.module_name === module_name)
    if (reference_id) data = data.filter((d) => d.reference_id === reference_id)
    if (search) data = data.filter((d) => d.file_name.toLowerCase().includes(search))
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/documents/:id', ({ params }) => {
    const doc = documents.find((d) => d.id === params.id)
    if (!doc) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(doc)
  }),

  http.post('/api/documents/upload', async ({ request }) => {
    const body = (await request.json()) as Partial<Document>
    const newDoc: Document = {
      id: `doc${Date.now()}`,
      module_name: body.module_name ?? 'general',
      reference_id: body.reference_id ?? '',
      file_name: body.file_name ?? 'untitled.pdf',
      file_url: '#',
      file_size: body.file_size ?? 0,
      file_type: body.file_type ?? 'application/pdf',
      version: 1,
      uploaded_by: body.uploaded_by ?? 'u2',
      uploaded_at: new Date().toISOString(),
    }
    documents.push(newDoc)
    return HttpResponse.json(newDoc, { status: 201 })
  }),

  http.delete('/api/documents/:id', ({ params }) => {
    const idx = documents.findIndex((d) => d.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    documents.splice(idx, 1)
    return HttpResponse.json({ success: true })
  }),

  // Versions (simulated: return all docs with same file stem)
  http.get('/api/documents/:id/versions', ({ params }) => {
    const doc = documents.find((d) => d.id === params.id)
    if (!doc) return HttpResponse.json([])
    const stem = doc.file_name.replace(/v\d+/, '').toLowerCase()
    const versions = documents.filter((d) => d.module_name === doc.module_name && d.file_name.toLowerCase().includes(stem.split('.')[0]))
    return HttpResponse.json(versions)
  }),
]
