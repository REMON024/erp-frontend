import { http, HttpResponse } from 'msw'
import { MOCK_PURCHASE_REQUESTS, MOCK_PURCHASE_ORDERS } from '../fixtures/procurement'
import { PurchaseRequest, PurchaseOrder } from '@/types'

let prs = [...MOCK_PURCHASE_REQUESTS]
let pos = [...MOCK_PURCHASE_ORDERS]

export const procurementHandlers = [
  // Purchase Requests
  http.get('/api/purchase-requests', ({ request }) => {
    const url = new URL(request.url)
    const project_id = url.searchParams.get('project_id')
    const status = url.searchParams.get('status')
    let data = [...prs]
    if (project_id) data = data.filter((r) => r.project_id === project_id)
    if (status) data = data.filter((r) => r.status === status)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/purchase-requests/:id', ({ params }) => {
    const pr = prs.find((r) => r.id === params.id)
    if (!pr) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(pr)
  }),

  http.post('/api/purchase-requests', async ({ request }) => {
    const body = (await request.json()) as Partial<PurchaseRequest>
    const newPR: PurchaseRequest = {
      id: `pr${Date.now()}`,
      project_id: body.project_id ?? '',
      requested_by: body.requested_by ?? 'u4',
      status: 'draft',
      created_at: new Date().toISOString(),
      items: body.items ?? [],
    }
    prs.push(newPR)
    return HttpResponse.json(newPR, { status: 201 })
  }),

  http.put('/api/purchase-requests/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<PurchaseRequest>
    const idx = prs.findIndex((r) => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    prs[idx] = { ...prs[idx], ...body }
    return HttpResponse.json(prs[idx])
  }),

  http.post('/api/purchase-requests/:id/submit', ({ params }) => {
    const idx = prs.findIndex((r) => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    prs[idx] = { ...prs[idx], status: 'submitted' }
    return HttpResponse.json(prs[idx])
  }),

  http.post('/api/purchase-requests/:id/approve', ({ params }) => {
    const idx = prs.findIndex((r) => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    prs[idx] = { ...prs[idx], status: 'approved' }
    return HttpResponse.json(prs[idx])
  }),

  http.post('/api/purchase-requests/:id/reject', ({ params }) => {
    const idx = prs.findIndex((r) => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    prs[idx] = { ...prs[idx], status: 'rejected' }
    return HttpResponse.json(prs[idx])
  }),

  http.delete('/api/purchase-requests/:id', ({ params }) => {
    const idx = prs.findIndex((r) => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    prs.splice(idx, 1)
    return HttpResponse.json({ success: true })
  }),

  // Purchase Orders
  http.get('/api/purchase-orders', ({ request }) => {
    const url = new URL(request.url)
    const project_id = url.searchParams.get('project_id')
    const vendor_id = url.searchParams.get('vendor_id')
    const status = url.searchParams.get('status')
    let data = [...pos]
    if (project_id) data = data.filter((o) => o.project_id === project_id)
    if (vendor_id) data = data.filter((o) => o.vendor_id === vendor_id)
    if (status) data = data.filter((o) => o.status === status)
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/purchase-orders/:id', ({ params }) => {
    const po = pos.find((o) => o.id === params.id)
    if (!po) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(po)
  }),

  http.post('/api/purchase-orders', async ({ request }) => {
    const body = (await request.json()) as Partial<PurchaseOrder>
    const newPO: PurchaseOrder = {
      id: `po${Date.now()}`,
      vendor_id: body.vendor_id ?? '',
      project_id: body.project_id ?? '',
      po_number: `PO-2025-${String(pos.length + 50).padStart(3, '0')}`,
      total_amount: body.total_amount ?? 0,
      status: 'draft',
      created_at: new Date().toISOString(),
      items: body.items ?? [],
    }
    pos.push(newPO)
    // mark linked PR as po_created
    if (body.project_id) {
      const prIdx = prs.findIndex((r) => r.project_id === body.project_id && r.status === 'approved')
      if (prIdx !== -1) prs[prIdx] = { ...prs[prIdx], status: 'po_created' }
    }
    return HttpResponse.json(newPO, { status: 201 })
  }),

  http.put('/api/purchase-orders/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<PurchaseOrder>
    const idx = pos.findIndex((o) => o.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    pos[idx] = { ...pos[idx], ...body }
    return HttpResponse.json(pos[idx])
  }),

  // GRN — mark PO as received
  http.post('/api/purchase-orders/:id/receive', ({ params }) => {
    const idx = pos.findIndex((o) => o.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    pos[idx] = { ...pos[idx], status: 'received' }
    return HttpResponse.json(pos[idx])
  }),
]
