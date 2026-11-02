import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type DeleteLeadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadName: string
  onConfirm: () => void
}

/** "Delete this lead?" with Cancel / Delete lead. Linked Today tasks stay. */
export function DeleteLeadDialog({ open, onOpenChange, leadName, onConfirm }: DeleteLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Delete this lead?</DialogTitle>
          <DialogDescription>
            “{leadName}” will be deleted with all its messages, notes and stage history. Tasks linked to it stay on
            Today. This can’t be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
