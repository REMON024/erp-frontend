import { Suspense } from 'react'
import { ResetPasswordForm } from '@/modules/auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
