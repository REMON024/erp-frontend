import { Material, StockTransaction, JournalEntry } from '@/types'
import { MOCK_MATERIALS, MOCK_STOCK_TRANSACTIONS } from './fixtures/inventory'
import { MOCK_JOURNAL_ENTRIES } from './fixtures/ledger'

// Shared mutable state — handlers import these instead of fixture arrays directly.
// This enables cross-handler side effects (e.g. GRN → auto stock-in, payment → auto GL posting).
export const sharedMaterials: Material[] = [...MOCK_MATERIALS] as Material[]
export const sharedStockTransactions: StockTransaction[] = [...MOCK_STOCK_TRANSACTIONS] as StockTransaction[]
export const sharedJournalEntries: JournalEntry[] = [...MOCK_JOURNAL_ENTRIES]

export function addStockIn(materialId: string, warehouseId: string, qty: number, ref: string, projectId?: string) {
  const mat = sharedMaterials.find(m => m.id === materialId)
  if (mat) mat.stock_quantity += qty
  sharedStockTransactions.unshift({
    id: `st${Date.now()}`,
    material_id: materialId,
    warehouse_id: warehouseId,
    type: 'in',
    quantity: qty,
    reference_no: ref,
    project_id: projectId,
    created_at: new Date().toISOString(),
  })
}

let jeSeq = 100
export function addJournalEntry(entry: Omit<JournalEntry, 'id' | 'created_at'>) {
  jeSeq++
  const je: JournalEntry = {
    ...entry,
    id: `je-auto-${jeSeq}`,
    created_at: new Date().toISOString(),
  }
  sharedJournalEntries.unshift(je)
  return je
}
