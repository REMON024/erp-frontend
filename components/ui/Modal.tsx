'use client'
import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// Desktop: centred dialog. Mobile: slides up from bottom (bottom-sheet).
const SIZES = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-2xl' }

/**
 * How many modals are open. Nesting one modal inside another (the resource form opening a
 * quick-create dialog) used to break twice: the inner one's unmount cleared body overflow while
 * the outer was still open, and a single Escape closed both because both listeners fired.
 */
let openModals = 0

/** Everything a user can Tab to, in document order. */
const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    openModals++
    const depth = openModals

    // Where focus was before we took it, so it can be handed back on close. Without this, closing a
    // dialog drops focus to the document body and a keyboard user restarts from the top of the page.
    const previouslyFocused = document.activeElement as HTMLElement | null

    const onKey = (e: KeyboardEvent) => {
      // Only the top-most modal reacts, so Escape closes one layer at a time and the trap belongs
      // to the dialog actually in front of the user.
      if (depth !== openModals) return

      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return

      // Focus trap. The candidate list is read at keydown rather than on mount because modal bodies
      // are forms — fields appear and disappear as the user fills them in, and a list captured once
      // would send focus to elements that no longer exist.
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(el => el.offsetParent !== null || el === document.activeElement)
      if (items.length === 0) { e.preventDefault(); panel.focus(); return }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault(); first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    // Move focus in, so the first Tab continues inside the dialog rather than behind it.
    const panel = panelRef.current
    const target = panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel
    target?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      openModals--
      if (openModals === 0) document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-surface text-content flex flex-col shadow-2xl outline-none',
          'max-h-[92dvh] sm:max-h-[90vh]',
          'rounded-t-2xl sm:rounded-2xl',
          SIZES[size],
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default shrink-0">
          <h2 id={titleId} className="text-base font-semibold text-content">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog"
            className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors text-content-muted hover:text-content">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
