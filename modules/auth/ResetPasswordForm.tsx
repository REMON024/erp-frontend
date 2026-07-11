'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

const schema = z.object({
  newPassword:     z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type FormValues = z.infer<typeof schema>

export function ResetPasswordForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  const [done,      setDone]      = useState(false)
  const [showPass,  setShowPass]  = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [errorMsg,  setErrorMsg]  = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    setErrorMsg('')
    if (!token) {
      setErrorMsg('Reset token is missing. Please use the link from your email.')
      return
    }
    try {
      await api.post('/auth/reset-password', { token, newPassword: values.newPassword })
      setDone(true)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; title?: string; errors?: string[] } } }
      setErrorMsg(
        e.response?.data?.errors?.[0] ??
        e.response?.data?.message ??
        e.response?.data?.title ??
        'Failed to reset password. The link may have expired.'
      )
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-content">Invalid reset link</h2>
          <p className="text-content-muted text-sm mt-2">
            This link is missing a required token. Please request a new password reset link.
          </p>
          <Link href="/forgot-password" className="inline-block mt-6 text-sm text-primary hover:underline">
            Request new link
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-content">Password reset</h2>
          <p className="text-content-muted text-sm mt-2">
            Your password has been updated successfully.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="mt-6 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-surface rounded-2xl shadow-xl p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-content">Set new password</h1>
          <p className="text-content-muted text-sm mt-1">Choose a strong password for your account.</p>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-content mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
              <input
                {...register('newPassword')}
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${errors.newPassword ? 'border-red-400' : 'border-border-default'}`}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-content mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
              <input
                {...register('confirmPassword')}
                type={showConf ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${errors.confirmPassword ? 'border-red-400' : 'border-border-default'}`}
              />
              <button type="button" onClick={() => setShowConf(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content">
                {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Resetting…
              </span>
            ) : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  )
}
