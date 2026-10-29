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

type DeleteAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Throw an Error to show its message. */
  onConfirm: () => Promise<void> | void
}

const CONFIRM_WORD = 'DELETE'

/** Delete account: the red button only works after typing DELETE exactly. */
export function DeleteAccountDialog({ open, onOpenChange, onConfirm }: DeleteAccountDialogProps) {
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
      setError(e instanceof Error ? e.message : 'Couldn’t delete the account. Try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This removes all your tasks, contacts, metrics and goals for good. It can’t be undone.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            void confirm()
          }}
        >
          <Label htmlFor={`${id}-confirm`}>Type DELETE to confirm</Label>
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
            Delete my account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
