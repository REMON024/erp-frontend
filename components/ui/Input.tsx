'use client'
import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react'
import { cn } from '@/utils/cn'

const BASE =
  'w-full border rounded-lg px-3 py-2 text-sm bg-surface text-content transition-colors ' +
  'focus:ring-2 focus:ring-primary/40 focus:outline-none disabled:opacity-60'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

/** Standard text input. Replaces the copy-pasted `inp` utility string. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(BASE, invalid ? 'border-danger focus:ring-danger/40' : 'border-border-default', className)}
      {...rest}
    />
  ),
)
Input.displayName = 'Input'

/** Standard field label. Replaces the copy-pasted `lbl` utility string. */
export function Label({ children, required, className, htmlFor }: {
  children: ReactNode; required?: boolean; className?: string; htmlFor?: string
}) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-sm font-medium text-content mb-1', className)}>
      {children}
      {required && <span className="text-danger"> *</span>}
    </label>
  )
}

/** Label + control + error message wrapper for form fields. */
export function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: ReactNode
}) {
  const id = useId()
  return (
    <div>
      <Label htmlFor={id} required={required}>{label}</Label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}
