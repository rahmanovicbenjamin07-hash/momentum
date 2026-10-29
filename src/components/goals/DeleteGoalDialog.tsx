import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type DeleteGoalDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalTitle: string
  /** True for hand-updated goals: their updates are deleted too. */
  hasUpdates: boolean
  onConfirm: () => void
}

/** "Delete this goal?" with Cancel / Delete. */
export function DeleteGoalDialog({ open, onOpenChange, goalTitle, hasUpdates, onConfirm }: DeleteGoalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Delete this goal?</DialogTitle>
          <DialogDescription>
            “{goalTitle}” will be deleted{hasUpdates ? ' with all its updates' : ''}. This can’t be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete goal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
