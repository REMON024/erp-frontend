import { Material, Warehouse, StockTransaction } from '@/types'

export const MOCK_WAREHOUSES: Warehouse[] = [
  { id: 'w1', name: 'Main Store – Gulshan', location: 'Gulshan, Dhaka' },
  { id: 'w2', name: 'Site Store – Uttara', location: 'Uttara, Dhaka' },
  { id: 'w3', name: 'Central Depot',        location: 'Narayanganj' },
]

export const MOCK_MATERIALS: Material[] = [
  { id: 'm1',  name: 'Steel Rebar (12mm)',    sku: 'STL-012',  unit: 'ton',    stock_quantity: 8.5,   reorder_level: 15,   warehouse_id: 'w1', category: 'Steel' },
  { id: 'm2',  name: 'Portland Cement',       sku: 'CEM-001',  unit: 'bag',    stock_quantity: 320,   reorder_level: 500,  warehouse_id: 'w1', category: 'Cement' },
  { id: 'm3',  name: 'Coarse Aggregate',      sku: 'AGG-001',  unit: 'cft',    stock_quantity: 1200,  reorder_level: 800,  warehouse_id: 'w2', category: 'Aggregate' },
  { id: 'm4',  name: 'Fine Sand',             sku: 'SND-001',  unit: 'cft',    stock_quantity: 950,   reorder_level: 600,  warehouse_id: 'w2', category: 'Aggregate' },
  { id: 'm5',  name: 'Steel Rebar (16mm)',    sku: 'STL-016',  unit: 'ton',    stock_quantity: 4.2,   reorder_level: 10,   warehouse_id: 'w1', category: 'Steel' },
  { id: 'm6',  name: 'Brick (1st class)',     sku: 'BRK-001',  unit: 'pcs',    stock_quantity: 12000, reorder_level: 5000, warehouse_id: 'w3', category: 'Masonry' },
  { id: 'm7',  name: 'PVC Pipe (4 inch)',     sku: 'PVC-004',  unit: 'pcs',    stock_quantity: 85,    reorder_level: 100,  warehouse_id: 'w2', category: 'Plumbing' },
  { id: 'm8',  name: 'Electrical Conduit',    sku: 'ELC-001',  unit: 'mtr',    stock_quantity: 600,   reorder_level: 200,  warehouse_id: 'w1', category: 'Electrical' },
  { id: 'm9',  name: 'Tiles (600x600)',       sku: 'TIL-001',  unit: 'box',    stock_quantity: 42,    reorder_level: 80,   warehouse_id: 'w3', category: 'Finishing' },
  { id: 'm10', name: 'Paint (White – 20L)',   sku: 'PNT-001',  unit: 'drum',   stock_quantity: 18,    reorder_level: 30,   warehouse_id: 'w1', category: 'Finishing' },
]

// Items below reorder level
export const MOCK_STOCK_ALERTS = MOCK_MATERIALS.filter(
  (m) => m.stock_quantity < m.reorder_level
)

export const MOCK_STOCK_TRANSACTIONS: StockTransaction[] = [
  { id: 'st1', material_id: 'm1', warehouse_id: 'w1', type: 'in',       quantity: 20,  reference_no: 'GRN-2025-041', project_id: 'p1', created_at: '2025-05-18T09:00:00Z' },
  { id: 'st2', material_id: 'm2', warehouse_id: 'w1', type: 'out',      quantity: 150, reference_no: 'REQ-2025-031', project_id: 'p1', created_at: '2025-05-19T10:00:00Z' },
  { id: 'st3', material_id: 'm3', warehouse_id: 'w2', type: 'in',       quantity: 500, reference_no: 'GRN-2025-042', project_id: 'p2', created_at: '2025-05-20T08:00:00Z' },
  { id: 'st4', material_id: 'm1', warehouse_id: 'w1', type: 'wastage',  quantity: 1.5, reference_no: 'WST-2025-005', project_id: 'p1', created_at: '2025-05-20T15:00:00Z' },
  { id: 'st5', material_id: 'm5', warehouse_id: 'w1', type: 'transfer', quantity: 3,   reference_no: 'TRF-2025-009', project_id: undefined, created_at: '2025-05-21T07:30:00Z' },
]
