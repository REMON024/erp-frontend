import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns'

export const formatDate = (date: string) => format(new Date(date), 'dd MMM yyyy')
export const formatDateTime = (date: string) => format(new Date(date), 'dd MMM yyyy, HH:mm')
export const timeAgo = (date: string) => formatDistanceToNow(new Date(date), { addSuffix: true })
export const isOverdue = (date: string) => isPast(new Date(date))
export const daysUntil = (date: string) => differenceInDays(new Date(date), new Date())

export const formatCurrency = (amount: number, currency = 'BDT') =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)

export const formatNumber = (n: number) => new Intl.NumberFormat('en-BD').format(n)

export const formatPercent = (n: number) => `${Math.round(n)}%`
