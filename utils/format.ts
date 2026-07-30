import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns'

export const formatDate = (date: string) => format(new Date(date), 'dd MMM yyyy')
export const formatDateTime = (date: string) => format(new Date(date), 'dd MMM yyyy, HH:mm')
export const timeAgo = (date: string) => formatDistanceToNow(new Date(date), { addSuffix: true })
export const isOverdue = (date: string) => isPast(new Date(date))
export const daysUntil = (date: string) => differenceInDays(new Date(date), new Date())

export const formatCurrency = (amount: number) =>
  `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(amount)}`

export const formatNumber = (n: number) => new Intl.NumberFormat('en-BD').format(n)

/**
 * Square footage, formatted the same way at every level of the hierarchy
 * (project → block → floor → unit). Renders an em dash when not recorded.
 */
export const formatArea = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(n)

export const formatPercent = (n: number) => `${Math.round(n)}%`
