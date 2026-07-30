'use client'
import { Input, Label } from '@/components/ui/Input'
import { formatArea } from '@/utils/format'

/**
 * The three area inputs shared by Project, Block and Floor.
 *
 * Common and service area are components carved out of the gross total, never added on top,
 * so net = total − common − service. The server enforces `common + service <= total`; this
 * mirrors it live so the user sees the problem while typing instead of on submit.
 *
 * Lives in components/ui because it is presentational — it takes `register` from the caller's
 * form and fetches nothing.
 */
export function AreaBreakdownFields({ register, areaSqFt, commonAreaSqFt, serviceAreaSqFt }: {
  // Loosely typed on purpose: callers pass their own zod-inferred RHF register.
  register: any
  areaSqFt?: number | string
  commonAreaSqFt?: number | string
  serviceAreaSqFt?: number | string
}) {
  const total   = Number(areaSqFt || 0)
  const common  = Number(commonAreaSqFt || 0)
  const service = Number(serviceAreaSqFt || 0)
  const hasTotal = areaSqFt !== undefined && areaSqFt !== null && areaSqFt !== ''
  const net = total - common - service
  const invalid = hasTotal && net < 0

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>Total Area (sqft)</Label>
          <Input type="number" step="0.01" min={0} placeholder="2390" {...register('areaSqFt')} />
        </div>
        <div>
          <Label>Common Area (sqft)</Label>
          <Input type="number" step="0.01" min={0} placeholder="240"
            invalid={invalid} {...register('commonAreaSqFt')} />
        </div>
        <div>
          <Label>Service Area (sqft)</Label>
          <Input type="number" step="0.01" min={0} placeholder="110"
            invalid={invalid} {...register('serviceAreaSqFt')} />
        </div>
      </div>

      {hasTotal && (
        invalid ? (
          <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            Common + service area cannot exceed the total area.
          </p>
        ) : (
          <div className="bg-surface-muted rounded-lg px-4 py-2 flex justify-between items-center text-sm">
            <span className="text-content-muted">Net / saleable area</span>
            <span className="font-bold text-content tabular-nums">{formatArea(net)} sqft</span>
          </div>
        )
      )}
    </div>
  )
}
