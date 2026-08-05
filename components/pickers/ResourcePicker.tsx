'use client'
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select } from '@/components/ui/Select'
import { useApiData } from '@/hooks/useApiData'
import api from '@/lib/api'
import type { Resource, ResourceType } from '@/modules/inventory/ResourceMasterPage'

export interface ResolvedRate {
  resourceId: number
  rate: number
  unit: string
  rateBasis?: string
  /** VendorRate | StandardRate | AverageCost | None */
  source: string
  vendorId?: number
  resourceRateId?: number
}

interface Props {
  value: number | '' | null
  onChange: (resourceId: number | '', resource?: Resource) => void
  /** Restrict the list, e.g. ['Material'] on stock screens. Omit for all types. */
  types?: ResourceType[]
  /** Narrows the list to one resource category. Omit/null for every category. */
  categoryId?: number | '' | null
  /** Vendor context so vendor-specific rates resolve. */
  vendorId?: number | null
  /** Document date, so back-dated documents get period-correct rates. */
  asOf?: string
  /** Fired when a rate has been resolved for the selected resource. */
  onResolved?: (rate: ResolvedRate, resource: Resource) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  invalid?: boolean
}

/**
 * Resource dropdown that also resolves the effective rate for the picked resource.
 *
 * Lives outside components/ui because it fetches — components/ui is for dumb primitives.
 * It never writes to the form itself: it reports the resolved rate through `onResolved`
 * and lets the caller decide whether to prefill, so a rate the user already typed is
 * never silently overwritten.
 */
export function ResourcePicker({
  value, onChange, types, categoryId, vendorId, asOf, onResolved,
  placeholder = 'Select a resource…', className, disabled, invalid,
}: Props) {
  const typeParam = types?.length ? types.join(',') : undefined
  const catParam  = categoryId ? Number(categoryId) : undefined

  const { data: resources = [] } = useApiData<Resource[]>({
    url: '/resources',
    params: { types: typeParam, categoryId: catParam },
    queryKey: ['resources-picker', typeParam ?? 'all', catParam ?? 'all'],
  })

  const resourceId = value ? Number(value) : 0

  const { data: resolved } = useQuery<ResolvedRate | null>({
    queryKey: ['effective-rate', resourceId, vendorId ?? null, asOf ?? 'today'],
    enabled: resourceId > 0,
    queryFn: async () => {
      const res = await api.get<ResolvedRate>('/resource-rates/effective', {
        params: { resourceId, vendorId: vendorId ?? undefined, asOf: asOf || undefined },
      })
      return (res.data as any)?.data ?? res.data
    },
  })

  // Report each distinct resolution once. Without this guard the effect re-fires on every
  // render of the parent and would fight the user's own edits to the rate box.
  const lastReported = useRef<string>('')
  useEffect(() => {
    if (!resolved || !resourceId) return
    const key = `${resourceId}|${vendorId ?? ''}|${asOf ?? ''}|${resolved.rate}|${resolved.source}`
    if (lastReported.current === key) return
    lastReported.current = key
    const resource = resources.find(r => r.id === resourceId)
    if (resource) onResolved?.(resolved, resource)
  }, [resolved, resourceId, vendorId, asOf, resources, onResolved])

  return (
    <Select
      className={className}
      disabled={disabled}
      invalid={invalid}
      value={value ?? ''}
      onChange={e => {
        const id = e.target.value ? Number(e.target.value) : ''
        onChange(id, id ? resources.find(r => r.id === id) : undefined)
      }}
    >
      <option value="">{placeholder}</option>
      {resources.map(r => (
        <option key={r.id} value={r.id}>
          {r.resourceCode} — {r.resourceName}{types?.length === 1 ? '' : ` (${r.resourceType})`}
        </option>
      ))}
    </Select>
  )
}

const SOURCE_LABEL: Record<string, string> = {
  VendorRate:   'Vendor rate',
  StandardRate: 'Standard rate',
  AverageCost:  'Avg cost',
  None:         'No rate',
}

/**
 * Small chip that says where a suggested rate came from, and offers to apply it when the
 * user has already typed something different. Showing the provenance is what makes the
 * auto-fill trustworthy rather than magic.
 */
export function RateSourceChip({ resolved, currentValue, onApply }: {
  resolved?: ResolvedRate | null
  currentValue?: number
  onApply?: (rate: number) => void
}) {
  if (!resolved) return null

  const label = SOURCE_LABEL[resolved.source] ?? resolved.source
  const none  = resolved.source === 'None'
  const differs = !none && currentValue != null && Number(currentValue) !== resolved.rate

  return (
    <span className={`text-xs inline-flex items-center gap-1.5 ${none ? 'text-content-muted' : 'text-info'}`}>
      <span className={`px-1.5 py-0.5 rounded ${none ? 'bg-surface-muted' : 'bg-info/10'}`}>
        {label}{!none && ` · ৳${resolved.rate.toLocaleString('en-BD', { maximumFractionDigits: 4 })}`}
      </span>
      {differs && onApply && (
        <button type="button" onClick={() => onApply(resolved.rate)}
          className="underline hover:text-primary">
          use ৳{resolved.rate.toLocaleString('en-BD', { maximumFractionDigits: 4 })}
        </button>
      )}
    </span>
  )
}
