import { Loader2 } from 'lucide-react'

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-svh place-items-center bg-background text-ink-3">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {label}
      </div>
    </div>
  )
}
