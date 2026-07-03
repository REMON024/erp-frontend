'use client'
import {
  forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState,
  SelectHTMLAttributes, ReactNode, Children, isValidElement,
} from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

interface Opt { value: string; label: string; disabled?: boolean }

/** Recursively extract the visible text from an option's children (handles composite
 *  children like `{code} — {name}` which arrive as an array of nodes). */
function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children)
  return ''
}

/** Flatten <option> children (incl. arrays from .map) into a simple list. */
function readOptions(children: ReactNode): Opt[] {
  const out: Opt[] = []
  Children.toArray(children).forEach(child => {
    if (!isValidElement(child)) return
    if (child.type === 'option') {
      const p = child.props as { value?: unknown; children?: ReactNode; disabled?: boolean }
      const value = p.value === undefined ? '' : String(p.value)
      const label = nodeText(p.children) || value
      out.push({ value, label, disabled: p.disabled })
    } else if (child.type === 'optgroup') {
      out.push(...readOptions((child.props as { children?: ReactNode }).children))
    }
  })
  return out
}

/**
 * Drop-in replacement for a native <select>: same API (accepts <option> children and
 * either `value`/`onChange` or a spread react-hook-form `register()`), but renders a
 * custom popup so the option list is themed, compact, and width-pinned to the field
 * (never spills over neighbouring fields). A real but visually-hidden <select> holds the
 * value so forms / RHF / controlled usage keep working unchanged.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid, className = '', children, onChange, disabled, ...rest }, ref) => {
    const options = useMemo(() => readOptions(children), [children])
    const selectRef = useRef<HTMLSelectElement>(null)
    const wrapRef = useRef<HTMLDivElement>(null)
    const listId = useId()

    // expose the inner native select to RHF / parent refs
    useImperativeHandle(ref, () => selectRef.current as HTMLSelectElement, [])

    const [value, setLocalValue] = useState<string>('')
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)

    // keep display value in sync with the underlying native select (covers RHF
    // defaultValues / reset that set the value imperatively via the ref)
    useEffect(() => {
      if (selectRef.current) setLocalValue(selectRef.current.value)
    }, [rest.value, rest.defaultValue, options])

    const selected = options.find(o => o.value === value)

    // drive the hidden native select so RHF + controlled onChange both fire
    const commit = (v: string) => {
      const el = selectRef.current
      if (!el) return
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLSelectElement.prototype, 'value',
      )?.set
      setter?.call(el, v)
      el.dispatchEvent(new Event('change', { bubbles: true }))
      setLocalValue(v)
    }

    // close on outside click
    useEffect(() => {
      if (!open) return
      const onDoc = (e: MouseEvent) => {
        if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('mousedown', onDoc)
      return () => document.removeEventListener('mousedown', onDoc)
    }, [open])

    const openMenu = () => {
      if (disabled) return
      const idx = options.findIndex(o => o.value === value)
      setActive(idx < 0 ? 0 : idx)
      setOpen(true)
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); openMenu() }
        return
      }
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, options.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        const opt = options[active]
        if (opt && !opt.disabled) { commit(opt.value); setOpen(false) }
      }
    }

    const trigger =
      'w-full appearance-none bg-surface text-content border rounded-lg pl-3 pr-9 py-2 ' +
      'text-sm text-left cursor-pointer transition-colors flex items-center ' +
      'focus:ring-2 focus:ring-primary/40 focus:border-primary focus:outline-none ' +
      'disabled:opacity-60 disabled:cursor-not-allowed hover:border-content-muted/50 ' +
      (invalid ? 'border-red-400 ' : 'border-border-default ') + className

    return (
      <div className="relative" ref={wrapRef}>
        {/* real value holder — hidden but functional (forms, RHF, controlled) */}
        <select
          ref={selectRef}
          {...rest}
          onChange={onChange}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        >
          {children}
        </select>

        <button
          type="button"
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={onKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          className={trigger}
        >
          <span className={'block truncate ' + (selected ? '' : 'text-content-muted')}>
            {selected ? selected.label : (options[0]?.label ?? '')}
          </span>
        </button>
        <ChevronDown
          className={'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted transition-transform '
            + (open ? 'rotate-180' : '')}
        />

        {open && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-auto rounded-lg
                       border border-border-default bg-surface shadow-lg py-1"
          >
            {options.map((o, i) => {
              const isSel = o.value === value
              return (
                <li
                  key={o.value + i}
                  role="option"
                  aria-selected={isSel}
                  title={o.label}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={e => { e.preventDefault() }}
                  onClick={() => { if (!o.disabled) { commit(o.value); setOpen(false) } }}
                  className={
                    'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ' +
                    (o.disabled ? 'opacity-40 cursor-not-allowed ' : '') +
                    (i === active ? 'bg-surface-muted ' : '') +
                    (isSel ? 'text-primary font-medium ' : 'text-content ')
                  }
                >
                  <span className="block truncate flex-1">{o.label}</span>
                  {isSel && <Check className="w-3.5 h-3.5 shrink-0" />}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'
