'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { Eye, EyeOff, Lock, Mail, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

type FormValues = { email: string; password: string }

const DEMO_ACCOUNTS = [
  { role: 'Super Admin',         email: 'superadmin@erp.com',  password: 'admin123' },
  { role: 'Company Admin',       email: 'admin@erp.com',        password: 'admin123' },
  { role: 'Project Manager',     email: 'pm@erp.com',           password: 'pm123'    },
  { role: 'Site Engineer',       email: 'engineer@erp.com',     password: 'eng123'   },
  { role: 'Procurement Officer', email: 'procurement@erp.com',  password: 'proc123'  },
  { role: 'Accountant',          email: 'accounts@erp.com',     password: 'acc123'   },
  { role: 'Store Manager',       email: 'store@erp.com',        password: 'store123' },
  { role: 'Contractor',          email: 'contractor@erp.com',   password: 'con123'   },
  { role: 'Vendor',              email: 'vendor@erp.com',       password: 'ven123'   },
  { role: 'Employee',            email: 'emp@erp.com',          password: 'emp123'   },
]

export function LoginForm() {
  const router  = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPass,     setShowPass]     = useState(false)
  const [error,        setError]        = useState('')
  const [showAccounts, setShowAccounts] = useState(false)

  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      email:    'superadmin@erp.com',
      password: 'admin123',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setError('')
    try {
      const res = await api.post('/auth/login', values)
      setAuth(res.data.user, res.data.token)
      router.push('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? 'Invalid email or password. Please try again.')
    }
  }

  function fillAccount(email: string, password: string) {
    setValue('email', email, { shouldValidate: true })
    setValue('password', password, { shouldValidate: true })
    setError('')
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg mx-auto mb-3">
            ERP
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Construction ERP</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                {...register('password')}
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Forgot */}
          <div className="flex justify-end -mt-1">
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
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
            onClick={() => setShowAccounts((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm"
          >
            <span className="font-medium text-slate-700">Demo accounts</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              Click any to fill
              {showAccounts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </button>

          {showAccounts && (
            <div className="divide-y divide-slate-100">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillAccount(acc.email, acc.password)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">{acc.role}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{acc.email}</p>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-700 text-slate-500 px-2 py-0.5 rounded">
                    {acc.password}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
