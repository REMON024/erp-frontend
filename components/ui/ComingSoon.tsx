import { Construction } from 'lucide-react'

export function ComingSoon({ module }: { module: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
        <Construction className="w-8 h-8 text-blue-500" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-800">{module}</h2>
        <p className="text-slate-500 mt-1 text-sm">This module is being built. Coming in the next sprint.</p>
      </div>
    </div>
  )
}
