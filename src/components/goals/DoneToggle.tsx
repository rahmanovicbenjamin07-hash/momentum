import { CircleCheck, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type DoneToggleProps = {
  done: boolean
  onChange: (done: boolean) => void
}

/** A done / not done key result: "Mark as done", or "Not done yet" to undo. */
export function DoneToggle({ done, onChange }: DoneToggleProps) {
  return done ? (
    <Button variant="outline" className="w-fit" onClick={() => onChange(false)}>
      <Undo2 aria-hidden="true" />
      Not done yet
    </Button>
  ) : (
    <Button className="w-fit" onClick={() => onChange(true)}>
      <CircleCheck aria-hidden="true" />
      Mark as done
    </Button>
  )
}
