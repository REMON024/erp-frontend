import { http, HttpResponse } from 'msw'
import { MOCK_CREDENTIALS } from '../fixtures/users'

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    const match = MOCK_CREDENTIALS.find(
      (c) => c.email === body.email && c.password === body.password
    )
    if (!match) {
      return HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString()
    return HttpResponse.json({
      accessToken:  `mock-jwt-${match.user.role}`,
      refreshToken: `mock-refresh-${match.user.id}`,
      expiresAt,
      user: match.user,
    })
  }),

  http.post('/api/auth/logout', () => HttpResponse.json({ message: 'Logged out' })),

  http.post('/api/auth/refresh', ({ request }) => {
    const auth = request.headers.get('Authorization') ?? ''
    const token = auth.replace('Bearer ', '')
    const role = token.startsWith('mock-jwt-') ? token.replace('mock-jwt-', '') : 'super_admin'
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    return HttpResponse.json({ accessToken: `mock-jwt-${role}`, expiresAt })
  }),

  http.post('/api/auth/forgot-password', async ({ request }) => {
    const body = await request.json() as { email: string }
    const exists = MOCK_CREDENTIALS.some((c) => c.email === body.email)
    if (!exists) return HttpResponse.json({ message: 'Email not found' }, { status: 404 })
    return HttpResponse.json({ message: 'Password reset link sent to your email' })
  }),
]
