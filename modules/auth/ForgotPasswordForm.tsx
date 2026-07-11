'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Info } from 'lucide-react'
import api from '@/lib/api'

const schema = z.object({ email: z.string().email('Enter a valid email') })
type FormValues = z.infer<typeof schema>

type Status = 'idle' | 'success' | 'not_supported' | 'error'

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { message?: string; title?: string; errors?: string[] } } }
  return (
    e.response?.data?.errors?.[0] ??
    e.response?.data?.message ??
    e.response?.data?.title ??
    'Something went wrong. Please try again.'
  )
}

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    setStatus('idle')
    setErrorMsg('')
    try {
      await api.post('/auth/forgot-password', values)
      setStatus('success')
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } }
      if (e.response?.status === 501 || e.response?.status === 404) {
        // Backend explicitly does not support forgot-password
        setStatus('not_supported')
      } else {
        setStatus('error')
        setErrorMsg(extractErrorMessage(err))
      }
    }
  }

  if (status === 'success') {
    return (
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-content">Check your email</h2>
          <p className="text-content-muted text-sm mt-2">
            If an account exists for that address, a password reset link has been sent.
          </p>
          <Link href="/login" className="inline-block mt-6 text-sm text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'not_supported') {
    return (
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl shadow-xl p-8 text-center">
          <Info className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-content">Self-service reset unavailable</h2>
          <p className="text-content-muted text-sm mt-2">
            Automated password reset is not currently available. Please contact your system administrator to reset your password.
          </p>
          <Link href="/login" className="inline-block mt-6 text-sm text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-surface rounded-2xl shadow-xl p-8">
        <div className="mb-6">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-content-muted hover:text-content">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
          <h1 className="text-2xl font-bold text-content mt-4">Forgot password?</h1>
          <p className="text-content-muted text-sm mt-1">Enter your email and we'll send a reset link.</p>
        </div>

        {status === 'error' && (
          <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-content mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
              <input
                {...register('email')}
                type="email"
                placeholder="you@company.com"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${errors.email ? 'border-red-400' : 'border-border-default'}`}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending…
              </span>
            ) : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  )
}
