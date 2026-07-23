import { cn } from '@/utils/cn'

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONES: Record<BadgeTone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  danger:  'bg-danger/10 text-danger',
  info:    'bg-info/10 text-info',
  neutral: 'bg-surface-muted text-content-muted',
}

interface BadgeProps {
  children: React.ReactNode
  tone?: BadgeTone
  className?: string
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
      TONES[tone],
      className,
    )}>
      {children}
    </span>
  )
}

// Maps common ERP status strings to a tone, so lists stay consistent.
export function statusTone(status: string): BadgeTone {
  const s = status.toLowerCase()
  if (/(active|approved|paid|completed|success|done|confirmed)/.test(s)) return 'success'
  if (/(pending|draft|sent|in[\s-]?progress|processing|partial)/.test(s)) return 'warning'
  if (/(overdue|rejected|cancelled|canceled|failed|inactive|blocked|low)/.test(s)) return 'danger'
  if (/(new|info|open)/.test(s)) return 'info'
  return 'neutral'
}
