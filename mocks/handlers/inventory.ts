import { http, HttpResponse } from 'msw'
import { MOCK_MATERIALS, MOCK_WAREHOUSES, MOCK_STOCK_TRANSACTIONS, MOCK_STOCK_ALERTS } from '../fixtures/inventory'
import { StockTransaction } from '@/types'

let materials = [...MOCK_MATERIALS]
let transactions = [...MOCK_STOCK_TRANSACTIONS]

export const inventoryHandlers = [
  http.get('/api/materials', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase()
    const category = url.searchParams.get('category')
    let filtered = materials
    if (search) filtered = filtered.filter((m) => m.name.toLowerCase().includes(search) || m.sku.toLowerCase().includes(search))
    if (category) filtered = filtered.filter((m) => m.category === category)
    return HttpResponse.json({ data: filtered, total: filtered.length })
  }),

  http.get('/api/materials/alerts', () =>
    HttpResponse.json({ data: MOCK_STOCK_ALERTS, total: MOCK_STOCK_ALERTS.length })
  ),

  http.get('/api/warehouses', () =>
    HttpResponse.json({ data: MOCK_WAREHOUSES })
  ),

  http.get('/api/stock/transactions', ({ request }) => {
    const url = new URL(request.url)
    const material_id = url.searchParams.get('material_id')
    let filtered = transactions
    if (material_id) filtered = filtered.filter((t) => t.material_id === material_id)
    return HttpResponse.json({ data: filtered, total: filtered.length })
  }),

  http.post('/api/stock/in', async ({ request }) => {
    const body = await request.json() as Partial<StockTransaction>
    const mat = materials.find((m) => m.id === body.material_id)
    if (mat) mat.stock_quantity += body.quantity ?? 0
    const tx: StockTransaction = { id: `st${Date.now()}`, type: 'in', material_id: body.material_id!, warehouse_id: body.warehouse_id!, quantity: body.quantity!, reference_no: body.reference_no, created_at: new Date().toISOString() }
    transactions = [tx, ...transactions]
    return HttpResponse.json(tx, { status: 201 })
  }),

  http.post('/api/stock/out', async ({ request }) => {
    const body = await request.json() as Partial<StockTransaction>
    const mat = materials.find((m) => m.id === body.material_id)
    if (mat) mat.stock_quantity -= body.quantity ?? 0
    const tx: StockTransaction = { id: `st${Date.now()}`, type: 'out', material_id: body.material_id!, warehouse_id: body.warehouse_id!, quantity: body.quantity!, reference_no: body.reference_no, project_id: body.project_id, created_at: new Date().toISOString() }
    transactions = [tx, ...transactions]
    return HttpResponse.json(tx, { status: 201 })
  }),
]
