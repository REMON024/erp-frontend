'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { useApiData } from '@/hooks/useApiData'

/**
 * Project → node scope picker, used wherever something is scoped to a part of the hierarchy
 * (the estimate form, the estimates filter bar, the order forms and the budget reports).
 *
 * Replaces the old Project → Block → Floor → Unit cascade. The hierarchy is now user-defined
 * data, so there is no fixed number of dropdowns to render: one project select plus one node
 * typeahead covers a three-level project and a six-level one identically.
 *
 * Lives outside components/ui because it fetches — components/ui is for dumb primitives.
 *
 * A node belongs to exactly one project, so changing the project always clears the node; a
 * stale node id can never survive a project change.
 */

export interface ScopeValue {
  projectId: string
  nodeId:    string
}

export const EMPTY_SCOPE: ScopeValue = { projectId: '', nodeId: '' }

/** Turns the picker's string state into the numeric payload the API expects. */
export function scopeToPayload(v: ScopeValue) {
  return {
    projectId: Number(v.projectId),
    nodeId:    v.nodeId ? Number(v.nodeId) : undefined,
  }
}

/** Turns the picker's string state into `?x=` query params, dropping the empties. */
export function scopeToParams(v: ScopeValue) {
  return {
    projectId: v.projectId || undefined,
    nodeId:    v.nodeId    || undefined,
  }
}

interface Project { id: number; projectName: string; projectCode: string }

/** The subset of ProjectNodeDto the picker needs. */
export interface ScopeNode {
  id: number
  parentId: number | null
  depth: number
  name: string
  levelCode: string
  levelName: string
  isAreaBearing: boolean
  breadcrumb: string
}

const lbl = 'block text-sm font-medium text-content mb-1'

/**
 * Every node of one project, flat and depth-ordered. Shared cache key so the picker, the
 * structure page and the report drill-downs all hit the same fetch.
 */
export function useProjectNodes(projectId: string | number | undefined) {
  const pid = projectId ? String(projectId) : ''
  return useApiData<ScopeNode[]>({
    url: '/project-nodes',
    params: { projectId: pid },
    queryKey: ['project-nodes', pid],
    enabled: !!pid,
  })
}

export function ScopePicker({ value, onChange, mode = 'form', className, nodeFilter }: {
  value: ScopeValue
  onChange: (next: ScopeValue) => void
  /** 'form' requires a project and disables the node picker until one is set.
   *  'filter' offers "All …" wording and never marks anything required.
   *  'inline' is 'form' semantics with no labels, wrapper or hint — two bare controls for a
   *  table row, where there is no space for the labelled grid. */
  mode?: 'form' | 'filter' | 'inline'
  className?: string
  /** Narrows which nodes may be chosen — e.g. materials can only be issued to area-bearing
   *  nodes, so IssueToProjectPage passes `n => n.isAreaBearing`. */
  nodeFilter?: (n: ScopeNode) => boolean
}) {
  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })
  const { data: nodes = [], isLoading } = useProjectNodes(value.projectId)

  // 'inline' shares every rule with 'form' — required project, disabled-until-parent, "Whole
  // project" wording — and differs only in what wraps the controls, decided at the return below.
  const isForm = mode === 'form' || mode === 'inline'

  const eligible = useMemo(
    () => (nodeFilter ? nodes.filter(nodeFilter) : nodes),
    [nodes, nodeFilter],
  )

  const set = (patch: Partial<ScopeValue>) => onChange({ ...value, ...patch })

  const controlCls =
    mode === 'inline' ? className
  : mode === 'filter' ? 'min-w-[150px]'
  :                     undefined

  const project = (
    <Select
      className={controlCls}
      value={value.projectId}
      // A node belongs to one project; changing the project must clear it.
      onChange={e => set({ projectId: e.target.value, nodeId: '' })}
    >
      <option value="">{isForm ? 'Select project' : 'All Projects'}</option>
      {projects.map(p => (
        <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>
      ))}
    </Select>
  )

  const node = (
    <NodeCombobox
      className={controlCls}
      nodes={eligible}
      loading={isLoading}
      value={value.nodeId}
      onChange={id => set({ nodeId: id })}
      disabled={!value.projectId}
      placeholder={
        !value.projectId ? (isForm ? 'Select a project first' : 'All Scopes')
        : isForm          ? 'Whole project'
        :                   'All Scopes'
      }
    />
  )

  // Both 'filter' and 'inline' hand back bare controls; the caller owns the layout.
  if (mode !== 'form') return <>{project}{node}</>

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Project <span className="text-danger">*</span></label>
          {project}
        </div>
        <div><label className={lbl}>Scope</label>{node}</div>
      </div>
      <p className="text-xs text-content-muted mt-2">
        Leave the scope blank to cover the whole project, or pick any part of the structure —
        a block, a floor, a single unit — to cover it and everything below it.
      </p>
    </div>
  )
}

/**
 * Searchable node picker.
 *
 * A native select was fine for the old cascade, where each list held a handful of siblings.
 * A project's whole tree can run to hundreds of nodes, so this filters as you type and matches
 * on the full breadcrumb — typing "A-101" or "Block A / Level 3" both find their node.
 * Indentation shows depth; the breadcrumb line disambiguates the "Level 1" that exists under
 * every block.
 */
function NodeCombobox({
  nodes, value, onChange, disabled, placeholder, loading, className = '',
}: {
  nodes: ScopeNode[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  placeholder: string
  loading?: boolean
  className?: string
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(0)
  const wrapRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = nodes.find(n => String(n.id) === value)

  const matches = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return nodes
    // Matching the breadcrumb, not just the name, is what makes "block a level 3" work.
    return nodes.filter(n =>
      n.name.toLowerCase().includes(s) || n.breadcrumb.toLowerCase().includes(s))
  }, [nodes, search])

  useEffect(() => { setActive(0) }, [search, open])

  // Close on outside click. Kept here rather than in a shared hook because the popup also has
  // to reset the search box, which a generic click-away hook would not know to do.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const pick = (id: string) => { onChange(id); setOpen(false); setSearch('') }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape')    { setOpen(false); setSearch(''); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, matches.length - 1)); return }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); return }
    if (e.key === 'Enter')     {
      e.preventDefault()
      if (matches[active]) pick(String(matches[active].id))
    }
  }

  const base =
    'w-full flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 ' +
    'text-sm text-left text-content disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {open ? (
        <input
          ref={inputRef}
          autoFocus
          className={base}
          value={search}
          placeholder="Search the structure…"
          onChange={e => setSearch(e.target.value)}
          onKeyDown={onKeyDown}
        />
      ) : (
        <button type="button" className={base} disabled={disabled} onClick={() => setOpen(true)}>
          <span className={`flex-1 truncate ${selected ? '' : 'text-content-muted'}`}>
            {selected ? selected.breadcrumb : placeholder}
          </span>
          {selected && (
            <X
              className="h-4 w-4 shrink-0 text-content-muted hover:text-content"
              onClick={e => { e.stopPropagation(); onChange('') }}
            />
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-content-muted" />
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-border bg-surface shadow-lg">
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-content-muted hover:bg-surface-muted"
            onClick={() => pick('')}
          >
            {placeholder}
          </button>
          {loading && <p className="px-3 py-2 text-sm text-content-muted">Loading structure…</p>}
          {!loading && matches.length === 0 && (
            <p className="px-3 py-2 text-sm text-content-muted">No matching part of the structure.</p>
          )}
          {matches.map((n, i) => (
            <button
              key={n.id}
              type="button"
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-surface-muted ${
                i === active ? 'bg-surface-muted' : ''
              } ${String(n.id) === value ? 'text-primary' : 'text-content'}`}
              // Depth indent is capped so a deep tree cannot push the label off the popup.
              style={{ paddingLeft: `${12 + Math.min(n.depth, 5) * 14}px` }}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(String(n.id))}
            >
              <span className="truncate">{n.name}</span>
              <span className="ml-2 text-xs text-content-muted">{n.levelName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
