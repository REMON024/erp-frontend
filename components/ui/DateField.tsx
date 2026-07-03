'use client'
import { forwardRef, InputHTMLAttributes } from 'react'
import { Calendar } from 'lucide-react'

interface DateFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

/**
 * Styled wrapper around a native <input type="date"> (also works for datetime-local /
 * time). Consistent border/focus styling + a themed calendar icon. The native picker
 * indicator is made invisible but stretched over the right gutter, so clicking anywhere
 * on the icon side opens the native calendar. Forwards ref for react-hook-form.
 */
export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ invalid, className = '', type = 'date', ...props }, ref) => (
    <div className="relative">
      <input
        ref={ref}
        type={type}
        {...props}
        className={
          'w-full bg-surface text-content border rounded-lg pl-3 pr-9 py-2 text-sm ' +
          'transition-colors focus:ring-2 focus:ring-primary/40 focus:border-primary focus:outline-none ' +
          'disabled:opacity-60 disabled:cursor-not-allowed hover:border-content-muted/50 ' +
          '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute ' +
          '[&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:top-0 ' +
          '[&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:h-full ' +
          '[&::-webkit-calendar-picker-indicator]:cursor-pointer ' +
          (invalid ? 'border-red-400 ' : 'border-border-default ') +
          className
        }
      />
      <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
    </div>
  )
)
DateField.displayName = 'DateField'
