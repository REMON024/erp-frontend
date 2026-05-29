import { http, HttpResponse } from 'msw'

export interface MockMenu {
  id: string; code: string; name: string; icon: string; route: string
  parentId: string | null; sortOrder: number; isActive: boolean
  children?: MockMenu[]
}

// Flat list — 29 menus. Field names match the backend DTO (route, sortOrder).
let mockMenusFlat: MockMenu[] = [
  // Root menus
  { id: 'm1',  code: 'DASHBOARD',           name: 'Dashboard',            icon: 'LayoutDashboard', route: '/dashboard',                   parentId: null,  sortOrder: 1,  isActive: true },
  { id: 'm2',  code: 'PROJECTS',            name: 'Projects',             icon: 'FolderKanban',    route: '/projects',                    parentId: null,  sortOrder: 2,  isActive: true },
  { id: 'm3',  code: 'INVESTORS',           name: 'Investors',            icon: 'TrendingUp',      route: '/investors',                   parentId: null,  sortOrder: 3,  isActive: true },
  { id: 'm4',  code: 'SALES',              name: 'Sales',                icon: 'Receipt',         route: '/sales',                       parentId: null,  sortOrder: 4,  isActive: true },
  { id: 'm5',  code: 'PURCHASE',           name: 'Purchase',             icon: 'ShoppingCart',    route: '/purchase',                    parentId: null,  sortOrder: 5,  isActive: true },
  { id: 'm6',  code: 'INVENTORY',          name: 'Inventory',            icon: 'Package',         route: '/inventory',                   parentId: null,  sortOrder: 6,  isActive: true },
  { id: 'm7',  code: 'ACCOUNTING',         name: 'Accounting',           icon: 'BookOpen',        route: '/accounting',                  parentId: null,  sortOrder: 7,  isActive: true },
  { id: 'm8',  code: 'PROFIT_DISTRIBUTION',name: 'Profit Distribution',  icon: 'PieChart',        route: '/profit-distribution',         parentId: null,  sortOrder: 8,  isActive: true },
  { id: 'm9',  code: 'REPORTS',            name: 'Reports',              icon: 'BarChart2',       route: '/reports',                     parentId: null,  sortOrder: 9,  isActive: true },
  { id: 'm10', code: 'ADMINISTRATION',     name: 'Administration',       icon: 'Shield',          route: '/administration',              parentId: null,  sortOrder: 10, isActive: true },
  { id: 'm11', code: 'SETTINGS',           name: 'Settings',             icon: 'Settings',        route: '/settings',                    parentId: null,  sortOrder: 11, isActive: true },

  // Under Investors (m3)
  { id: 'm12', code: 'INVESTMENT_RECORDS', name: 'Investment Records',   icon: 'TrendingUp',      route: '/investors/records',           parentId: 'm3',  sortOrder: 1,  isActive: true },

  // Under Sales (m4)
  { id: 'm13', code: 'CLIENTS',            name: 'Clients',              icon: 'Users',           route: '/sales/clients',               parentId: 'm4',  sortOrder: 1,  isActive: true },
  { id: 'm14', code: 'UNITS',              name: 'Units',                icon: 'Building2',       route: '/sales/units',                 parentId: 'm4',  sortOrder: 2,  isActive: true },
  { id: 'm15', code: 'BOOKINGS',           name: 'Bookings',             icon: 'Calendar',        route: '/sales/bookings',              parentId: 'm4',  sortOrder: 3,  isActive: true },
  { id: 'm16', code: 'INVOICES',           name: 'Invoices',             icon: 'FileText',        route: '/sales/invoices',              parentId: 'm4',  sortOrder: 4,  isActive: true },
  { id: 'm17', code: 'PAYMENT_SCHEDULES',  name: 'Payment Schedules',    icon: 'Calendar',        route: '/sales/schedules',             parentId: 'm4',  sortOrder: 5,  isActive: true },
  { id: 'm18', code: 'COLLECTIONS',        name: 'Collections',          icon: 'DollarSign',      route: '/sales/collections',           parentId: 'm4',  sortOrder: 6,  isActive: true },

  // Under Purchase (m5)
  { id: 'm19', code: 'VENDORS',            name: 'Vendors',              icon: 'Building2',       route: '/purchase/vendors',            parentId: 'm5',  sortOrder: 1,  isActive: true },

  // Under Inventory (m6)
  { id: 'm20', code: 'MATERIAL_MASTER',    name: 'Material Master',      icon: 'List',            route: '/inventory/materials',         parentId: 'm6',  sortOrder: 1,  isActive: true },
  { id: 'm21', code: 'STOCK_IN',           name: 'Stock In',             icon: 'ArrowDownCircle', route: '/inventory/stock-in',          parentId: 'm6',  sortOrder: 2,  isActive: true },
  { id: 'm22', code: 'ISSUE_TO_PROJECT',   name: 'Issue to Project',     icon: 'ArrowUpCircle',   route: '/inventory/issue',             parentId: 'm6',  sortOrder: 3,  isActive: true },

  // Under Accounting (m7)
  { id: 'm23', code: 'CHART_OF_ACCOUNTS',  name: 'Chart of Accounts',    icon: 'List',            route: '/accounting/chart',            parentId: 'm7',  sortOrder: 1,  isActive: true },
  { id: 'm24', code: 'PROJECT_LEDGER',     name: 'Project Ledger',       icon: 'BookOpen',        route: '/accounting/ledger',           parentId: 'm7',  sortOrder: 2,  isActive: true },
  { id: 'm25', code: 'PROFIT_LOSS',        name: 'Profit & Loss',        icon: 'TrendingUp',      route: '/accounting/pnl',              parentId: 'm7',  sortOrder: 3,  isActive: true },

  // Under Administration (m10)
  { id: 'm26', code: 'USERS',              name: 'Users',                icon: 'Users',           route: '/administration/users',        parentId: 'm10', sortOrder: 1,  isActive: true },
  { id: 'm27', code: 'ROLES',              name: 'Roles',                icon: 'Shield',          route: '/administration/roles',        parentId: 'm10', sortOrder: 2,  isActive: true },
  { id: 'm28', code: 'MENUS',              name: 'Menus',                icon: 'Menu',            route: '/administration/menus',        parentId: 'm10', sortOrder: 3,  isActive: true },
  { id: 'm29', code: 'AUDIT_LOGS',         name: 'Audit Logs',           icon: 'ClipboardList',   route: '/administration/audit-logs',   parentId: 'm10', sortOrder: 4,  isActive: true },
]

// Which menu IDs each role can see
const ROLE_VISIBLE: Record<string, Set<string>> = {
  super_admin: new Set(mockMenusFlat.map(m => m.id)),
  operations:  new Set(['m1','m2','m3','m4','m5','m6','m7','m8','m9','m11','m12','m13','m14','m15','m16','m17','m18','m19','m20','m21','m22','m23','m24','m25']),
  inventory:   new Set(['m1','m2','m5','m6','m9','m11','m19','m20','m21','m22']),
}

function buildTree(menus: MockMenu[], parentId: string | null): MockMenu[] {
  return menus
    .filter(m => m.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(m => ({ ...m, children: buildTree(menus, m.id) }))
}

function getRoleFromRequest(req: Request): string {
  const auth  = req.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  if (token.startsWith('mock-jwt-')) return token.replace('mock-jwt-', '')
  return 'super_admin'
}

export const menuHandlers = [
  // GET /api/menus/tree  — full tree (admin)
  http.get('/api/menus/tree', () => {
    return HttpResponse.json(buildTree(mockMenusFlat, null))
  }),

  // GET /api/menus/my-menus  — role-filtered tree for sidebar
  http.get('/api/menus/my-menus', ({ request }) => {
    const role    = getRoleFromRequest(request)
    const visible = ROLE_VISIBLE[role] ?? ROLE_VISIBLE['inventory']
    const filtered = mockMenusFlat.filter(m => m.isActive && visible.has(m.id))
    return HttpResponse.json(buildTree(filtered, null))
  }),

  // GET /api/menus  — flat list
  http.get('/api/menus', () => {
    return HttpResponse.json(mockMenusFlat)
  }),

  // GET /api/menus/:id
  http.get('/api/menus/:id', ({ params }) => {
    const menu = mockMenusFlat.find(m => m.id === params.id)
    if (!menu) return HttpResponse.json({ message: 'Menu not found' }, { status: 404 })
    return HttpResponse.json(menu)
  }),

  // POST /api/menus
  http.post('/api/menus', async ({ request }) => {
    const body = await request.json() as Partial<MockMenu>
    const newMenu: MockMenu = {
      id:        `m${Date.now()}`,
      code:      body.code      ?? `MENU_${Date.now()}`,
      name:      body.name      ?? 'New Menu',
      icon:      body.icon      ?? 'Circle',
      route:     body.route     ?? '/',
      parentId:  body.parentId  ?? null,
      sortOrder: body.sortOrder ?? mockMenusFlat.length + 1,
      isActive:  body.isActive  ?? true,
    }
    mockMenusFlat.push(newMenu)
    // Grant super_admin access automatically
    ROLE_VISIBLE['super_admin'].add(newMenu.id)
    return HttpResponse.json(newMenu, { status: 201 })
  }),

  // PUT /api/menus/:id
  http.put('/api/menus/:id', async ({ params, request }) => {
    const idx = mockMenusFlat.findIndex(m => m.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Menu not found' }, { status: 404 })
    const body = await request.json() as Partial<MockMenu>
    mockMenusFlat[idx] = { ...mockMenusFlat[idx], ...body }
    return HttpResponse.json(mockMenusFlat[idx])
  }),

  // DELETE /api/menus/:id
  http.delete('/api/menus/:id', ({ params }) => {
    const idx = mockMenusFlat.findIndex(m => m.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Menu not found' }, { status: 404 })
    mockMenusFlat.splice(idx, 1)
    return HttpResponse.json({ message: 'Menu deleted' })
  }),

  // PUT /api/menus/:id/toggle-active
  http.put('/api/menus/:id/toggle-active', ({ params }) => {
    const idx = mockMenusFlat.findIndex(m => m.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Menu not found' }, { status: 404 })
    mockMenusFlat[idx] = { ...mockMenusFlat[idx], isActive: !mockMenusFlat[idx].isActive }
    return HttpResponse.json(mockMenusFlat[idx])
  }),
]
