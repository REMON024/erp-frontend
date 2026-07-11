import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5235/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('erp_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth endpoints that should never trigger a redirect on 401
const AUTH_PUBLIC_PATHS = ['/auth/login', '/auth/forgot-password', '/auth/reset-password']

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url: string = error.config?.url ?? ''
    const isPublicAuthPath = AUTH_PUBLIC_PATHS.some((p) => url.includes(p))
    if (
      error.response?.status === 401 &&
      !isPublicAuthPath &&
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
