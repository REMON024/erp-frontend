import { authHandlers } from './auth'
import { userHandlers } from './users'
import { roleHandlers } from './roles'
import { menuHandlers } from './menus'
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
import { salesHandlers } from './sales'
import { ledgerHandlers } from './ledger'
import { costingHandlers } from './costing'
import { contractorBillingHandlers } from './contractor-billing'
import { changeOrderHandlers } from './change-orders'
import { siteLogHandlers } from './site-logs'
import { snaggingHandlers } from './snagging'
import { advancesHandlers } from './advances'

export const handlers = [
  ...authHandlers,
  ...userHandlers,
  ...roleHandlers,
  ...menuHandlers,
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
  ...salesHandlers,
  ...ledgerHandlers,
  ...costingHandlers,
  ...contractorBillingHandlers,
  ...changeOrderHandlers,
  ...siteLogHandlers,
  ...snaggingHandlers,
  ...advancesHandlers,
]
