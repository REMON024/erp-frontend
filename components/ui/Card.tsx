'use client'
import { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import type { BadgeTone } from './Badge'

/** Standard surface card. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-surface rounded-xl border border-border-default', className)}>
      {children}
    </div>
  )
}

/** Tone → token classes for the StatCard icon chip. Never raw palette shades. */
const TONE_CHIP: Record<BadgeTone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  danger:  'bg-danger/10 text-danger',
  info:    'bg-info/10 text-info',
  neutral: 'bg-surface-muted text-content-muted',
}

/**
 * KPI / stat card. Replaces the ad-hoc `KpiCard` that passed literal
 * `iconBg="bg-green-50"` strings — pass a semantic `tone` instead so it
 * adapts to dark mode.
 */
export function StatCard({ label, value, sub, icon: Icon, tone = 'neutral', loading }: {
  label: string; value: string; sub?: string
  icon?: React.ElementType; tone?: BadgeTone; loading?: boolean
}) {
  return (
    <Card className="p-5 flex justify-between items-start">
      <div>
        <p className="text-sm text-content-muted font-medium">{label}</p>
        {loading
          ? <div className="h-7 w-24 bg-surface-muted rounded animate-pulse mt-1" />
          : <p className="text-2xl font-bold text-content mt-1">{value}</p>}
        {sub && <p className="text-xs text-content-muted mt-1">{sub}</p>}
      </div>
      {Icon && (
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', TONE_CHIP[tone])}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </Card>
  )
}
