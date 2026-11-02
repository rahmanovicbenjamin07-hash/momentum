import { Loader2 } from 'lucide-react'
import { useId, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ResetDataDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "Download a copy first": the JSON export. */
  onExportJson: () => void
  /** Throw an Error to show its message. */
  onConfirm: () => Promise<void> | void
}

const CONFIRM_WORD = 'RESET'

/** Reset everything: the red button only works after typing RESET exactly. */
export function ResetDataDialog({ open, onOpenChange, onExportJson, onConfirm }: ResetDataDialogProps) {
  const id = useId()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = typed === CONFIRM_WORD

  const change = (next: boolean) => {
    if (busy) return
    if (!next) {
      setTyped('')
      setError(null)
    }
    onOpenChange(next)
  }

  const confirm = async () => {
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      setBusy(false)
      setTyped('')
      onOpenChange(false)
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Couldn’t reset your data. Try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset everything?</DialogTitle>
          <DialogDescription>
            This deletes all your tasks, repeating tasks, contacts, metrics, goals, notes and reviews, so you start from
            the beginning. Your account, settings and saved backups stay.
          </DialogDescription>
        </DialogHeader>
        <Button variant="outline" className="justify-self-start bg-card" disabled={busy} onClick={onExportJson}>
          Download a copy first (JSON)
        </Button>
        <form
          noValidate
          className="grid gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            void confirm()
          }}
        >
          <Label htmlFor={`${id}-confirm`}>Type RESET to confirm</Label>
          <Input
            id={`${id}-confirm`}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </form>
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
          <Button className="bg-bad-strong text-white hover:bg-bad-strong/90" disabled={!ready || busy} onClick={confirm}>
            {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
            Reset everything
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
