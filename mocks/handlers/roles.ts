import { http, HttpResponse } from 'msw'

export interface MockRole {
  id: string; name: string; normalizedName: string; description: string; usersCount: number
}

export const MOCK_ROLES: MockRole[] = [
  { id: 'r1', name: 'super_admin', normalizedName: 'SUPER_ADMIN', description: 'Full system access',          usersCount: 1 },
  { id: 'r2', name: 'operations',  normalizedName: 'OPERATIONS',  description: 'Operations & sales access',   usersCount: 2 },
  { id: 'r3', name: 'inventory',   normalizedName: 'INVENTORY',   description: 'Inventory & purchase access', usersCount: 2 },
]

// menuId → { roleId → { canView, canCreate, canEdit, canDelete } }
const MENU_IDS = ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12','m13','m14','m15','m16','m17','m18','m19','m20','m21','m22','m23','m24','m25','m26','m27','m28','m29']

interface Perm { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }

function allTrue():  Perm { return { canView: true,  canCreate: true,  canEdit: true,  canDelete: true  } }
function allFalse(): Perm { return { canView: false, canCreate: false, canEdit: false, canDelete: false } }
function viewOnly(): Perm { return { canView: true,  canCreate: false, canEdit: false, canDelete: false } }

// ops can view everything except Administration group (m10,m26,m27,m28,m29)
const OPS_NO_VIEW  = new Set(['m10','m26','m27','m28','m29'])
// inventory can only view core modules
const INV_CAN_VIEW = new Set(['m1','m2','m5','m6','m9','m11','m19','m20','m21','m22'])

type PermMap = Record<string, Record<string, Perm>>
const permissionsMap: PermMap = {}

for (const mid of MENU_IDS) {
  permissionsMap[mid] = {
    r1: allTrue(),
    r2: OPS_NO_VIEW.has(mid)  ? allFalse() : viewOnly(),
    r3: INV_CAN_VIEW.has(mid) ? viewOnly() : allFalse(),
  }
}

export const roleHandlers = [
  // GET /api/roles
  http.get('/api/roles', () => {
    return HttpResponse.json(MOCK_ROLES)
  }),

  // GET /api/roles/:id
  http.get('/api/roles/:id', ({ params }) => {
    const role = MOCK_ROLES.find(r => r.id === params.id)
    if (!role) return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    return HttpResponse.json(role)
  }),

  // GET /api/roles/:id/permissions  — returns array of { menuId, ...perm }
  http.get('/api/roles/:id/permissions', ({ params }) => {
    const roleId = params.id as string
    const result = MENU_IDS.map(mid => ({
      menuId: mid,
      ...(permissionsMap[mid]?.[roleId] ?? allFalse()),
    }))
    return HttpResponse.json(result)
  }),

  // PUT /api/roles/:id/permissions
  http.put('/api/roles/:id/permissions', async ({ params, request }) => {
    const roleId = params.id as string
    const body = await request.json() as Array<{ menuId: string } & Perm>
    for (const item of body) {
      if (!permissionsMap[item.menuId]) permissionsMap[item.menuId] = {}
      permissionsMap[item.menuId][roleId] = {
        canView:   item.canView,
        canCreate: item.canCreate,
        canEdit:   item.canEdit,
        canDelete: item.canDelete,
      }
    }
    return HttpResponse.json({ message: 'Permissions updated' })
  }),

  // POST /api/roles  (super_admin only in real app — mock allows it)
  http.post('/api/roles', async ({ request }) => {
    const body = await request.json() as { name: string; description?: string }
    const newRole: MockRole = {
      id:             `r${Date.now()}`,
      name:           body.name,
      normalizedName: body.name.toUpperCase(),
      description:    body.description ?? '',
      usersCount:     0,
    }
    MOCK_ROLES.push(newRole)
    for (const mid of MENU_IDS) {
      if (!permissionsMap[mid]) permissionsMap[mid] = {}
      permissionsMap[mid][newRole.id] = allFalse()
    }
    return HttpResponse.json(newRole, { status: 201 })
  }),

  // PUT /api/roles/:id
  http.put('/api/roles/:id', async ({ params, request }) => {
    const idx = MOCK_ROLES.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    const body = await request.json() as Partial<MockRole>
    MOCK_ROLES[idx] = { ...MOCK_ROLES[idx], ...body }
    return HttpResponse.json(MOCK_ROLES[idx])
  }),

  // DELETE /api/roles/:id
  http.delete('/api/roles/:id', ({ params }) => {
    const idx = MOCK_ROLES.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    MOCK_ROLES.splice(idx, 1)
    return HttpResponse.json({ message: 'Role deleted' })
  }),
]
