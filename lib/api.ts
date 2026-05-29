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
