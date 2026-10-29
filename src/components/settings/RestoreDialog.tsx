import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type RestoreDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Which backup, e.g. "Today, 03:00". */
  label: string
  /** Throw an Error to show its message; the dialog closes when it resolves. */
  onConfirm: () => Promise<void> | void
}

/** "Restore the backup from Today, 03:00?" → Restore / Cancel. */
export function RestoreDialog({ open, onOpenChange, label, onConfirm }: RestoreDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const change = (next: boolean) => {
    if (busy) return
    if (!next) setError(null)
    onOpenChange(next)
  }

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      setBusy(false)
      onOpenChange(false)
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Couldn’t restore. Try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore the backup from {label}?</DialogTitle>
          <DialogDescription>Your current data is saved first, then replaced by this backup.</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={confirm} disabled={busy}>
            {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
            Restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
