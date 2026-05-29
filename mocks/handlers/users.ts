import { http, HttpResponse } from 'msw'
import type { User } from '@/types'

let mockUsers: User[] = [
  { id: 'u1', firstName: 'System',     lastName: 'Admin',   fullName: 'System Admin',       email: 'admin@constructerp.bd',  role: 'super_admin', roleId: 'r1', isActive: true,  createdAt: '2024-01-01T00:00:00Z', lastLoginAt: '2026-05-22T08:00:00Z' },
  { id: 'u2', firstName: 'Operations', lastName: 'Manager', fullName: 'Operations Manager',  email: 'ops@constructerp.bd',    role: 'operations',  roleId: 'r2', isActive: true,  createdAt: '2024-01-15T00:00:00Z', lastLoginAt: '2026-05-21T10:00:00Z' },
  { id: 'u3', firstName: 'Store',      lastName: 'Manager', fullName: 'Store Manager',       email: 'store@constructerp.bd',  role: 'inventory',   roleId: 'r3', isActive: true,  createdAt: '2024-02-01T00:00:00Z', lastLoginAt: null },
  { id: 'u4', firstName: 'Rashida',    lastName: 'Khanam',  fullName: 'Rashida Khanam',      email: 'rashida@constructerp.bd',role: 'operations',  roleId: 'r2', isActive: true,  createdAt: '2024-03-10T00:00:00Z', lastLoginAt: '2026-05-20T09:30:00Z' },
  { id: 'u5', firstName: 'Karim',      lastName: 'Uddin',   fullName: 'Karim Uddin',         email: 'karim@constructerp.bd',  role: 'inventory',   roleId: 'r3', isActive: false, createdAt: '2024-04-01T00:00:00Z', lastLoginAt: null },
]

function parseRole(req: Request): string {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  if (token.startsWith('mock-jwt-')) return token.replace('mock-jwt-', '')
  return 'super_admin'
}

export const userHandlers = [
  // GET /api/users?page=1&pageSize=10&search=&role=
  http.get('/api/users', ({ request }) => {
    const url  = new URL(request.url)
    const page     = parseInt(url.searchParams.get('page')     ?? '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '10')
    const search   = (url.searchParams.get('search') ?? '').toLowerCase()
    const roleFilter = url.searchParams.get('role') ?? ''

    let filtered = mockUsers
    if (search)     filtered = filtered.filter(u => u.fullName.toLowerCase().includes(search) || u.email.toLowerCase().includes(search))
    if (roleFilter) filtered = filtered.filter(u => u.role === roleFilter)

    const total = filtered.length
    const items = filtered.slice((page - 1) * pageSize, page * pageSize)
    return HttpResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  }),

  // GET /api/users/:id
  http.get('/api/users/:id', ({ params }) => {
    const user = mockUsers.find(u => u.id === params.id)
    if (!user) return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    return HttpResponse.json(user)
  }),

  // POST /api/users
  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as Partial<User> & { password?: string }
    const newUser: User = {
      id:          `u${Date.now()}`,
      firstName:   body.firstName ?? '',
      lastName:    body.lastName  ?? '',
      fullName:    `${body.firstName ?? ''} ${body.lastName ?? ''}`.trim(),
      email:       body.email   ?? '',
      role:        body.role    ?? 'operations',
      roleId:      body.roleId  ?? 'r2',
      isActive:    true,
      createdAt:   new Date().toISOString(),
      lastLoginAt: null,
    }
    mockUsers.push(newUser)
    return HttpResponse.json(newUser, { status: 201 })
  }),

  // PUT /api/users/:id
  http.put('/api/users/:id', async ({ params, request }) => {
    const idx = mockUsers.findIndex(u => u.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    const body = await request.json() as Partial<User>
    mockUsers[idx] = {
      ...mockUsers[idx],
      ...body,
      fullName: `${body.firstName ?? mockUsers[idx].firstName} ${body.lastName ?? mockUsers[idx].lastName}`.trim(),
    }
    return HttpResponse.json(mockUsers[idx])
  }),

  // PATCH /api/users/:id/toggle-status
  http.patch('/api/users/:id/toggle-status', ({ params }) => {
    const idx = mockUsers.findIndex(u => u.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    mockUsers[idx] = { ...mockUsers[idx], isActive: !mockUsers[idx].isActive }
    return HttpResponse.json(mockUsers[idx])
  }),

  // PATCH /api/users/:id/assign-role
  http.patch('/api/users/:id/assign-role', async ({ params, request }) => {
    const body = await request.json() as { roleId: string; role: string }
    const idx = mockUsers.findIndex(u => u.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    mockUsers[idx] = { ...mockUsers[idx], roleId: body.roleId, role: body.role as User['role'] }
    return HttpResponse.json(mockUsers[idx])
  }),

  // DELETE /api/users/:id
  http.delete('/api/users/:id', ({ params }) => {
    const idx = mockUsers.findIndex(u => u.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    mockUsers.splice(idx, 1)
    return HttpResponse.json({ message: 'User deleted' })
  }),
]
