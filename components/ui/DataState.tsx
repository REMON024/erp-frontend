import { AlertCircle, Loader2 } from 'lucide-react'

interface DataStateProps {
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyMessage?: string
  onRetry?: () => void
  children: React.ReactNode
}

// Renders loading / error / empty states, falls through to children when data is ready.
export function DataState({ loading, error, empty, emptyMessage = 'No data found.', onRetry, children }: DataStateProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="flex-1">{error}</span>
        {onRetry && (
          <button onClick={onRetry} className="ml-auto text-xs underline hover:no-underline">
            Retry
          </button>
        )}
      </div>
    )
  }

  if (empty) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">{emptyMessage}</div>
    )
  }

  return <>{children}</>
}
