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
    return HttpResponse.json({
      token: `mock-jwt-token-${match.user.id}-${Date.now()}`,
      refresh_token: `mock-refresh-${match.user.id}`,
      expires_in: 900,
      user: match.user,
    })
  }),

  http.post('/api/auth/logout', () => HttpResponse.json({ message: 'Logged out' })),

  http.post('/api/auth/refresh', () =>
    HttpResponse.json({ token: `mock-jwt-refreshed-${Date.now()}`, expires_in: 900 })
  ),

  http.post('/api/auth/forgot-password', async ({ request }) => {
    const body = await request.json() as { email: string }
    const exists = MOCK_CREDENTIALS.some((c) => c.email === body.email)
    if (!exists) return HttpResponse.json({ message: 'Email not found' }, { status: 404 })
    return HttpResponse.json({ message: 'Password reset link sent to your email' })
  }),
]
