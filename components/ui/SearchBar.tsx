'use client'
import { Search, RefreshCw } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onRefresh?: () => void
  children?: React.ReactNode
}

export function SearchBar({ value, onChange, placeholder = 'Search…', onRefresh, children }: SearchBarProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      {children}
      {onRefresh && (
        <button onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 shrink-0">
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
