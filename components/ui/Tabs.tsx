'use client'
import { createContext, useContext, useState } from 'react'
import { cn } from '@/utils/cn'

interface TabsContextValue { active: string; setActive: (id: string) => void }
const TabsContext = createContext<TabsContextValue>({ active: '', setActive: () => {} })

export function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [active, setActive] = useState(defaultTab)
  return <TabsContext.Provider value={{ active, setActive }}>{children}</TabsContext.Provider>
}

export function TabList({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-1 border-b border-border-default mb-6">
      {children}
    </div>
  )
}

export function Tab({ id, label }: { id: string; label: string }) {
  const { active, setActive } = useContext(TabsContext)
  return (
    <button
      onClick={() => setActive(id)}
      className={cn(
        'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
        active === id
          ? 'border-primary text-primary'
          : 'border-transparent text-content-muted hover:text-content'
      )}
    >
      {label}
    </button>
  )
}

export function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  const { active } = useContext(TabsContext)
  if (active !== id) return null
  return <>{children}</>
}
