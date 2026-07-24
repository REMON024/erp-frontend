'use client'
import { ReactNode } from 'react'
import { cn } from '@/utils/cn'

/**
 * Composable table shell. Encodes the app-wide
 * `overflow-x-auto` + `min-w-[…]` + themed header/row classes so pages keep
 * custom cells while the chrome stays consistent. Usage:
 *
 *   <Table head={<><TH>Name</TH><TH>Status</TH></>}>
 *     {rows.map(r => <TR key={r.id}><TD>{r.name}</TD>…</TR>)}
 *   </Table>
 */
export function Table({ head, children, minWidth = 700, className }: {
  head: ReactNode; children: ReactNode; minWidth?: number; className?: string
}) {
  return (
    <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
      <div className="overflow-x-auto">
        <table className={cn('w-full text-sm', className)} style={{ minWidth }}>
          <thead className="bg-surface-muted border-b border-border-default">
            <tr>{head}</tr>
          </thead>
          <tbody className="divide-y divide-border-default">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

type Align = 'left' | 'right' | 'center'

// Right-aligned columns are numeric (money, qty, %) — line up digits with tabular-nums.
function alignClasses(align?: Align, num?: boolean): string {
  const a = num ? 'right' : align
  if (a === 'right') return 'text-right tabular-nums'
  if (a === 'center') return 'text-center'
  return ''
}

export function TH({ children, className, align, num }: {
  children?: ReactNode; className?: string; align?: Align; num?: boolean
}) {
  return (
    <th className={cn(
      'px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide',
      alignClasses(align, num) || 'text-left',
      className,
    )}>
      {children}
    </th>
  )
}

export function TR({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('hover:bg-surface-muted', className)} {...rest}>{children}</tr>
}

export function TD({ children, className, align, num }: {
  children?: ReactNode; className?: string; align?: Align; num?: boolean
}) {
  return <td className={cn('px-4 py-3', alignClasses(align, num), className)}>{children}</td>
}
