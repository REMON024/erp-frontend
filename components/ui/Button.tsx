'use client'
import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:   'bg-primary text-white hover:bg-primary/90',
  secondary: 'bg-secondary text-white hover:bg-secondary/90',
  danger:    'bg-danger text-white hover:bg-danger/90',
  outline:   'border border-border-default text-content hover:bg-surface-muted',
  ghost:     'text-content-muted hover:text-content hover:bg-surface-muted',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
}

/**
 * Standard button. Encodes the app-wide `bg-primary … rounded-lg` +
 * focus-ring pattern so pages stop copy-pasting utility strings.
 * All colors go through semantic tokens — never raw palette shades.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, leftIcon, disabled, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary/40',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
