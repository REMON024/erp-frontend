import { authHandlers } from './auth'
import { dashboardHandlers } from './dashboard'
import { projectHandlers } from './projects'
import { projectMemberHandlers } from './project-members'
import { taskHandlers } from './tasks'
import { inventoryHandlers } from './inventory'
import { ganttHandlers } from './gantt'
import { vendorHandlers } from './vendors'
import { contractorHandlers } from './contractors'
import { procurementHandlers } from './procurement'
import { equipmentHandlers } from './equipment'
import { safetyHandlers } from './safety'
import { complianceHandlers } from './compliance'
import { financeHandlers } from './finance'
import { documentHandlers } from './documents'

export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...projectHandlers,
  ...projectMemberHandlers,
  ...taskHandlers,
  ...inventoryHandlers,
  ...ganttHandlers,
  ...vendorHandlers,
  ...contractorHandlers,
  ...procurementHandlers,
  ...equipmentHandlers,
  ...safetyHandlers,
  ...complianceHandlers,
  ...financeHandlers,
  ...documentHandlers,
]
