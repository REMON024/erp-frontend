'use client'
import { Plus } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useApiData } from '@/hooks/useApiData'
import type { ResourceType } from '@/modules/inventory/ResourceMasterPage'

export interface ResourceCategory {
  id: number
  code: string
  name: string
  /** null = applies to every resource type. */
  resourceType?: string | null
  isActive: boolean
  sortOrder: number
  resourceCount: number
}

interface Props {
  value: number | '' | null
  onChange: (categoryId: number | '', category?: ResourceCategory) => void
  /** Narrows the list to this type's categories plus the type-agnostic ones. */
  resourceType?: ResourceType | string
  /** Include retired rows — an edit form must still be able to display one. */
  includeInactive?: boolean
  /** Renders a "+" button beside the select that fires onRequestCreate. */
  allowCreate?: boolean
  onRequestCreate?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
  invalid?: boolean
}

/**
 * Resource category dropdown, fed by the ResourceCategories master.
 *
 * Lives outside components/ui because it fetches — components/ui is for dumb primitives.
 *
 * The inline-create affordance is a sibling button, NOT a sentinel `<option value="__new__">`.
 * The sentinel looks obvious but breaks against our Select: commit() writes the sentinel into the
 * hidden native select and fires `change` before the parent sees it, and the label sync effect
 * only re-runs when `value`/`options` change — which they haven't — so the trigger stays stuck
 * reading "+ New category…". A sibling button sidesteps the internals and reads better to
 * screen readers.
 */
export function CategorySelect({
  value, onChange, resourceType, includeInactive, allowCreate, onRequestCreate,
  placeholder = 'No category', className, disabled, invalid,
}: Props) {
  // Prefix 'resource-categories' is what every mutation invalidates, so a quick-create
  // instantly refreshes every mounted picker.
  const { data: categories = [] } = useApiData<ResourceCategory[]>({
    url: '/resource-categories',
    params: { activeOnly: !includeInactive, resourceType: resourceType || undefined },
    queryKey: ['resource-categories', resourceType ?? 'all', includeInactive ?? false],
  })

  const select = (
    <Select
      className={allowCreate ? `flex-1 ${className ?? ''}` : className}
      disabled={disabled}
      invalid={invalid}
      value={value ?? ''}
      onChange={e => {
        const id = e.target.value ? Number(e.target.value) : ''
        onChange(id, id ? categories.find(c => c.id === id) : undefined)
      }}
    >
      <option value="">{placeholder}</option>
      {categories.map(c => (
        <option key={c.id} value={c.id}>
          {c.name}{c.resourceType ? '' : ' · all types'}{c.isActive ? '' : ' (inactive)'}
        </option>
      ))}
    </Select>
  )

  if (!allowCreate) return select

  return (
    <div className="flex gap-2">
      {select}
      {/* type="button" is essential — this renders inside a <form> and would otherwise submit it. */}
      <Button type="button" variant="outline" onClick={onRequestCreate} disabled={disabled}
        aria-label="Add a new category" title="Add a new category" className="shrink-0 px-3">
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  )
}
