'use client'
import { useAuthStore } from '@/store/auth.store'

interface Props {
  module: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({ module, fallback = null, children }: Props) {
  const hasAccess = useAuthStore((s) => s.hasAccess)
  return hasAccess(module) ? <>{children}</> : <>{fallback}</>
}
