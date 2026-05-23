'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { Eye, EyeOff, Lock, Mail, ChevronDown, ChevronUp, Building2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

type FormValues = { email: string; password: string }

const DEMO_ACCOUNTS = [
  { role: 'Super Admin',  email: 'admin@constructerp.bd', password: 'Admin@123456', color: 'bg-purple-100 text-purple-700' },
  { role: 'Operations',   email: 'ops@constructerp.bd',   password: 'Ops@123456',   color: 'bg-blue-100 text-blue-700'   },
  { role: 'Inventory',    email: 'store@constructerp.bd', password: 'Store@123456', color: 'bg-orange-100 text-orange-700' },
]

export function LoginForm() {
  const router  = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPass,     setShowPass]     = useState(false)
  const [error,        setError]        = useState('')
  const [showAccounts, setShowAccounts] = useState(false)

  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { email: 'admin@constructerp.bd', password: 'Admin@123456' },
  })

  const onSubmit = async (values: FormValues) => {
    setError('')
    try {
      const res = await api.post('/auth/login', values)
      const data = res.data
      setAuth(data.user ?? data, data.accessToken ?? data.token)
      router.push('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; title?: string; errors?: string[] } } }
      const msg = e.response?.data?.errors?.[0] ?? e.response?.data?.message ?? e.response?.data?.title ?? 'Invalid email or password.'
      setError(msg)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Construction ERP</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your workspace</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                {...register('password')}
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in…
              </span>
            ) : 'Sign in'}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAccounts(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm"
          >
            <span className="font-medium text-slate-700">Demo accounts</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              Click to fill
              {showAccounts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </button>
          {showAccounts && (
            <div className="divide-y divide-slate-100">
              {DEMO_ACCOUNTS.map(acc => (
                <button key={acc.email} type="button"
                  onClick={() => { setValue('email', acc.email); setValue('password', acc.password); setError('') }}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">{acc.role}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{acc.email}</p>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${acc.color}`}>{acc.password}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
