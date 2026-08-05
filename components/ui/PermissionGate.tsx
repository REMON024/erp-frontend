'use client'
import { useAuthStore, type PermissionAction } from '@/store/auth.store'

interface Props {
  module: string
  /** Which action to check. Defaults to 'view' — the original behaviour. */
  action?: PermissionAction
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Renders its children only if the current user may perform `action` on `module`.
 *
 * Mirrors the server's `[HasPermission(menuCode, action)]`, so a control the API would refuse is
 * never offered in the first place. Before Aug 2026 this only answered the `view` question, which
 * meant an admin could grant view-only access and the user would still see — and click — every
 * Create, Edit and Delete button, collecting a 403 each time.
 *
 * Hiding rather than disabling: a disabled button invites the user to hunt for a permission they
 * were never meant to have, while an absent one simply is not part of their job. Pass `fallback`
 * where the layout needs the space held.
 */
export function PermissionGate({ module, action = 'view', fallback = null, children }: Props) {
  const can = useAuthStore((s) => s.can)
  return can(module, action) ? <>{children}</> : <>{fallback}</>
}
