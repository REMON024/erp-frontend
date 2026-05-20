import { http, HttpResponse } from 'msw'
import { MOCK_VENDORS, MOCK_VENDOR_CONTRACTS, MOCK_VENDOR_PAYMENTS } from '../fixtures/vendors'
import { Vendor } from '@/types'

let vendors = [...MOCK_VENDORS]

export const vendorHandlers = [
  http.get('/api/vendors', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase()
    const status = url.searchParams.get('status')
    let filtered = vendors
    if (search) filtered = filtered.filter((v) => v.company_name.toLowerCase().includes(search) || v.contact_person.toLowerCase().includes(search))
    if (status) filtered = filtered.filter((v) => v.status === status)
    return HttpResponse.json({ data: filtered, total: filtered.length })
  }),

  http.get('/api/vendors/:id', ({ params }) => {
    const v = vendors.find((v) => v.id === params.id)
    if (!v) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(v)
  }),

  http.post('/api/vendors', async ({ request }) => {
    const body = await request.json() as Partial<Vendor>
    const v: Vendor = { id: `v${Date.now()}`, company_name: body.company_name!, contact_person: body.contact_person!, email: body.email!, phone: body.phone!, address: body.address!, rating: 0, status: 'active', created_at: new Date().toISOString() }
    vendors = [v, ...vendors]
    return HttpResponse.json(v, { status: 201 })
  }),

  http.put('/api/vendors/:id', async ({ params, request }) => {
    const body = await request.json() as Partial<Vendor>
    const idx = vendors.findIndex((v) => v.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    vendors[idx] = { ...vendors[idx], ...body }
    return HttpResponse.json(vendors[idx])
  }),

  http.get('/api/vendors/:id/contracts', ({ params }) => {
    const contracts = MOCK_VENDOR_CONTRACTS.filter((c) => c.vendor_id === params.id)
    return HttpResponse.json({ data: contracts })
  }),

  http.get('/api/vendors/:id/payments', ({ params }) => {
    const payments = MOCK_VENDOR_PAYMENTS.filter((p) => p.vendor_id === params.id)
    return HttpResponse.json({ data: payments })
  }),

  http.get('/api/vendors/:id/performance', ({ params }) => {
    const v = vendors.find((v) => v.id === params.id)
    return HttpResponse.json({
      on_time_delivery: 88,
      quality_score: Math.round((v?.rating ?? 4) * 20),
      response_time_hours: 6,
      total_orders: 24,
      completed_orders: 22,
    })
  }),
]
