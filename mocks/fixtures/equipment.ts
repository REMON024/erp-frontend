import type { Equipment, EquipmentMaintenance } from '@/types'
import data from './equipment.json'
export const MOCK_EQUIPMENT       = data.equipment  as unknown as Equipment[]
export const MOCK_EQUIPMENT_ALERTS = data.equipment.filter((e) => e.status === 'maintenance') as unknown as Equipment[]
export const MOCK_MAINTENANCE     = data.maintenance as unknown as EquipmentMaintenance[]
