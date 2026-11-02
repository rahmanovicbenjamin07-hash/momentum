import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type DeleteGoalDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalTitle: string
  /** A whole goal (with its key results and check-ins) or one key result. Defaults to the goal. */
  what?: 'goal' | 'key result'
  /** Key results with typed-in updates, ticks or steps: those are deleted too. */
  hasUpdates?: boolean
  onConfirm: () => void
}

/** "Delete this goal?" / "Delete this key result?" with Cancel / Delete. */
export function DeleteGoalDialog({ open, onOpenChange, goalTitle, what = 'goal', hasUpdates = false, onConfirm }: DeleteGoalDialogProps) {
  const extra = what === 'goal' ? ' with all its key results and check-ins' : hasUpdates ? ' with all its updates' : ''
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Delete this {what}?</DialogTitle>
          <DialogDescription>
            “{goalTitle}” will be deleted{extra}. This can’t be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete {what}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
