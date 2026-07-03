'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import api from '@/lib/api'

const schema = z.object({ email: z.string().email('Enter a valid email') })
type FormValues = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    await api.post('/auth/forgot-password', values)
    setSent(true)
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-surface rounded-2xl shadow-xl p-8">
        {sent ? (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-content">Check your email</h2>
            <p className="text-content-muted text-sm mt-2">We sent a password reset link to your email address.</p>
            <Link href="/login" className="inline-block mt-6 text-sm text-primary hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-content-muted hover:text-content">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
              <h1 className="text-2xl font-bold text-content mt-4">Forgot password?</h1>
              <p className="text-content-muted text-sm mt-1">Enter your email and we'll send a reset link.</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-content mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
