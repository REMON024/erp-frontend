import { http, HttpResponse } from 'msw'
import { MOCK_DASHBOARD } from '../fixtures/dashboard'

export const dashboardHandlers = [
  http.get('/api/dashboard/summary', () => HttpResponse.json(MOCK_DASHBOARD)),
]
