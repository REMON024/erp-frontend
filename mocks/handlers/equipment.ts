import { http, HttpResponse } from 'msw'
import { MOCK_EQUIPMENT, MOCK_MAINTENANCE } from '../fixtures/equipment'
import { Equipment, EquipmentMaintenance } from '@/types'

let equipment = [...MOCK_EQUIPMENT]
let maintenance = [...MOCK_MAINTENANCE]

export const equipmentHandlers = [
  http.get('/api/equipment', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('search')?.toLowerCase()
    let data = [...equipment]
    if (status) data = data.filter((e) => e.status === status)
    if (category) data = data.filter((e) => e.category === category)
    if (search) data = data.filter((e) => e.name.toLowerCase().includes(search) || e.code.toLowerCase().includes(search))
    return HttpResponse.json({ data, total: data.length })
  }),

  http.get('/api/equipment/alerts', () => {
    const alerts = equipment.filter((e) => e.status === 'maintenance')
    return HttpResponse.json(alerts)
  }),

  http.get('/api/equipment/:id', ({ params }) => {
    const item = equipment.find((e) => e.id === params.id)
    if (!item) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  http.post('/api/equipment', async ({ request }) => {
    const body = (await request.json()) as Partial<Equipment>
    const newItem: Equipment = {
      id: `eq${Date.now()}`,
      name: body.name ?? '',
      code: body.code ?? `EQ-${String(equipment.length + 1).padStart(3, '0')}`,
      category: body.category ?? '',
      status: 'available',
      purchase_date: body.purchase_date ?? new Date().toISOString().split('T')[0],
    }
    equipment.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),

  http.put('/api/equipment/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Equipment>
    const idx = equipment.findIndex((e) => e.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    equipment[idx] = { ...equipment[idx], ...body }
    return HttpResponse.json(equipment[idx])
  }),

  http.delete('/api/equipment/:id', ({ params }) => {
    const idx = equipment.findIndex((e) => e.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    equipment.splice(idx, 1)
    return HttpResponse.json({ success: true })
  }),

  // Allocate equipment to project
  http.post('/api/equipment/:id/allocate', async ({ params, request }) => {
    const body = (await request.json()) as { project_id: string }
    const idx = equipment.findIndex((e) => e.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    equipment[idx] = { ...equipment[idx], status: 'allocated', allocated_project_id: body.project_id }
    return HttpResponse.json(equipment[idx])
  }),

  // Release equipment from project
  http.post('/api/equipment/:id/release', ({ params }) => {
    const idx = equipment.findIndex((e) => e.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const { allocated_project_id: _, ...rest } = equipment[idx]
    equipment[idx] = { ...rest, status: 'available' }
    return HttpResponse.json(equipment[idx])
  }),

  // Maintenance records
  http.get('/api/equipment/:id/maintenance', ({ params }) => {
    const records = maintenance.filter((m) => m.equipment_id === params.id)
    return HttpResponse.json(records)
  }),

  http.post('/api/equipment/:id/maintenance', async ({ params, request }) => {
    const body = (await request.json()) as Partial<EquipmentMaintenance>
    const newRecord: EquipmentMaintenance = {
      id: `em${Date.now()}`,
      equipment_id: params.id as string,
      service_date: body.service_date ?? new Date().toISOString().split('T')[0],
      cost: body.cost ?? 0,
      remarks: body.remarks ?? '',
      next_service_date: body.next_service_date,
    }
    maintenance.push(newRecord)
    // mark equipment as maintenance status
    const eqIdx = equipment.findIndex((e) => e.id === params.id)
    if (eqIdx !== -1) equipment[eqIdx] = { ...equipment[eqIdx], status: 'maintenance' }
    return HttpResponse.json(newRecord, { status: 201 })
  }),

  http.put('/api/maintenance/:id/complete', ({ params }) => {
    const idx = maintenance.findIndex((m) => m.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const eqId = maintenance[idx].equipment_id
    const eqIdx = equipment.findIndex((e) => e.id === eqId)
    if (eqIdx !== -1) equipment[eqIdx] = { ...equipment[eqIdx], status: 'available' }
    return HttpResponse.json(maintenance[idx])
  }),
]
