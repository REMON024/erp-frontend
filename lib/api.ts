import axios from 'axios'

// Reads are cheap and a stalled one is worth giving up on quickly. Writes are not: posting a
// voucher fans out into approval, journal and estimate-actuals work, and against a remote database
// a cold connection alone can eat several seconds. Timing a write out does not undo it — the
// server finishes regardless — it only leaves the user staring at a failure for something that
// succeeded, so the write budget is deliberately generous.
const READ_TIMEOUT = 10_000
const WRITE_TIMEOUT = 45_000

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5235/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: READ_TIMEOUT,
})

api.interceptors.request.use((config) => {
  // Only when the caller has not asked for something specific: anything other than the instance
  // default arrived from a per-call override and is left alone.
  const isRead = (config.method ?? 'get').toLowerCase() === 'get'
  if (!isRead && config.timeout === READ_TIMEOUT) config.timeout = WRITE_TIMEOUT

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('erp_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url: string = error.config?.url ?? ''
    if (
      error.response?.status === 401 &&
      !url.includes('/auth/login') &&
      typeof window !== 'undefined'
    ) {
      localStorage.removeItem('erp_token')
      localStorage.removeItem('erp_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
