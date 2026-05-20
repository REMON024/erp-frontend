import { http, HttpResponse } from 'msw'
import { MOCK_CONTRACTORS, MOCK_ATTENDANCE, MOCK_CONTRACTOR_PAYMENTS } from '../fixtures/contractors'
import { Contractor } from '@/types'

let contractors = [...MOCK_CONTRACTORS]

export const contractorHandlers = [
  http.get('/api/contractors', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase()
    const status = url.searchParams.get('status')
    let filtered = contractors
    if (search) filtered = filtered.filter((c) => c.company_name.toLowerCase().includes(search))
    if (status) filtered = filtered.filter((c) => c.status === status)
    return HttpResponse.json({ data: filtered, total: filtered.length })
  }),

  http.get('/api/contractors/:id', ({ params }) => {
    const c = contractors.find((c) => c.id === params.id)
    if (!c) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(c)
  }),

  http.post('/api/contractors', async ({ request }) => {
    const body = await request.json() as Partial<Contractor>
    const c: Contractor = { id: `c${Date.now()}`, company_name: body.company_name!, contact_person: body.contact_person!, email: body.email!, phone: body.phone!, address: body.address!, rating: 0, status: 'active', created_at: new Date().toISOString() }
    contractors = [c, ...contractors]
    return HttpResponse.json(c, { status: 201 })
  }),

  http.put('/api/contractors/:id', async ({ params, request }) => {
    const body = await request.json() as Partial<Contractor>
    const idx = contractors.findIndex((c) => c.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    contractors[idx] = { ...contractors[idx], ...body }
    return HttpResponse.json(contractors[idx])
  }),

  http.put('/api/contractors/:id/rating', async ({ params, request }) => {
    const body = await request.json() as { rating: number }
    const idx = contractors.findIndex((c) => c.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    contractors[idx].rating = body.rating
    return HttpResponse.json(contractors[idx])
  }),

  http.get('/api/contractors/:id/attendance', ({ params, request }) => {
    const url = new URL(request.url)
    const month = url.searchParams.get('month')
    const year = url.searchParams.get('year')
    let records = MOCK_ATTENDANCE.filter((a) => a.contractor_id === params.id)
    if (month && year) records = records.filter((a) => a.date.startsWith(`${year}-${month.padStart(2, '0')}`))
    return HttpResponse.json({ data: records })
  }),

  http.get('/api/contractors/:id/payments', ({ params }) => {
    const payments = MOCK_CONTRACTOR_PAYMENTS.filter((p) => p.contractor_id === params.id)
    return HttpResponse.json({ data: payments })
  }),
]
