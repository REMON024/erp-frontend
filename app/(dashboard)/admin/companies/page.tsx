'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { CompaniesPage } from '@/modules/admin/CompaniesPage'

export default function Page() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    if (user && user.role !== 'super_admin') router.replace('/dashboard')
  }, [user, router])

  if (user && user.role !== 'super_admin') return null
  return <CompaniesPage />
}
