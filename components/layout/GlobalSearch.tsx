'use client'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { useApiData } from '@/hooks/useApiData'

interface SearchHit { label: string; sublabel: string; route: string }
interface SearchGroup { type: string; hits: SearchHit[] }
interface GlobalSearchDto { groups: SearchGroup[] }

/** Below this the server returns nothing, so there is no point asking. */
const MIN_CHARS = 2

/** Long enough that typing a project code is one request, short enough to feel instant. */
const DEBOUNCE_MS = 250

/**
 * The Topbar search.
 *
 * Until Aug 2026 this input had no value, no onChange and no handler — it rendered on every screen
 * of the product and did nothing at all. Results are permission-filtered server-side, so a group the
 * user cannot open never appears rather than appearing and then 403-ing.
 */
export function GlobalSearch() {
  const router = useRouter()
  const [term, setTerm]       = useState('')
  const [debounced, setDeb]   = useState('')
  const [open, setOpen]       = useState(false)
  const [active, setActive]   = useState(0)
  const boxRef  = useRef<HTMLDivElement>(null)
  const listId  = useId()
  const optId   = (i: number) => `${listId}-opt-${i}`

  useEffect(() => {
    const t = setTimeout(() => setDeb(term.trim()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [term])

  const { data, isFetching } = useApiData<GlobalSearchDto>({
    url: '/search',
    params: { q: debounced },
    queryKey: ['global-search', debounced],
    enabled: debounced.length >= MIN_CHARS,
  })

  // Flattened for keyboard traversal — the user arrows through hits, not through groups.
  const flat = useMemo(
    () => (data?.groups ?? []).flatMap(g => g.hits.map(h => ({ ...h, type: g.type }))),
    [data],
  )

  useEffect(() => { setActive(0) }, [debounced])

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  const go = (hit: { route: string }) => {
    setOpen(false)
    setTerm('')
    setDeb('')
    router.push(hit.route)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (!open || flat.length === 0) return

    if (e.key === 'ArrowDown')      { e.preventDefault(); setActive(i => (i + 1) % flat.length) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => (i - 1 + flat.length) % flat.length) }
    else if (e.key === 'Enter')     { e.preventDefault(); go(flat[active]) }
  }

  const showPanel = open && debounced.length >= MIN_CHARS
  let index = -1 // running position across groups, to match `flat`

  return (
    <div className="flex-1 max-w-sm hidden sm:block" ref={boxRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && flat.length > 0 ? optId(active) : undefined}
          aria-label="Search projects, vendors, clients, units and work orders"
          value={term}
          onChange={e => { setTerm(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search projects, vendors…"
          className="w-full pl-9 pr-8 py-1.5 text-sm border border-border-default rounded-lg bg-surface-muted text-content placeholder:text-content-muted focus:bg-surface focus:ring-2 focus:ring-primary/40 focus:outline-none transition"
        />
        {isFetching && debounced.length >= MIN_CHARS && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted animate-spin" />
        )}

        {showPanel && (
          <div
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border-default bg-surface shadow-lg z-50"
          >
            {flat.length === 0 ? (
              <p className="px-4 py-3 text-sm text-content-muted">
                {isFetching ? 'Searching…' : `No matches for “${debounced}”.`}
              </p>
            ) : (
              (data?.groups ?? []).map(group => (
                <div key={group.type}>
                  <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-content-muted">
                    {group.type}
                  </p>
                  {group.hits.map(hit => {
                    index++
                    const i = index
                    return (
                      <button
                        key={`${group.type}-${hit.route}-${hit.label}`}
                        id={optId(i)}
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(hit)}
                        className={`flex w-full items-baseline gap-2 px-4 py-2 text-left transition-colors ${
                          i === active ? 'bg-primary/10' : 'hover:bg-surface-muted'
                        }`}
                      >
                        <span className="text-sm font-medium text-content truncate">{hit.label}</span>
                        <span className="text-xs text-content-muted truncate">{hit.sublabel}</span>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
