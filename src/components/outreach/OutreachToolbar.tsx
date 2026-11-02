import { useId } from 'react'
import { Search } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

type OutreachToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  followUpDue: boolean
  onFollowUpDueChange: (value: boolean) => void
}

/** Search box (name, business, notes) and a "Follow-up due" checkbox. */
export function OutreachToolbar({ search, onSearchChange, followUpDue, onFollowUpDueChange }: OutreachToolbarProps) {
  const id = useId()
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="glass-input-wrap relative w-full sm:w-[405px]">
        <label htmlFor={`${id}-search`} className="sr-only">
          Search leads
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
        />
        <Input
          id={`${id}-search`}
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, business, notes"
          className="glass-input pl-9"
        />
      </div>
      <label
        htmlFor={`${id}-due`}
        className="glass-button inline-flex h-10 cursor-pointer items-center gap-2 border px-3 text-sm text-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
      >
        <Checkbox
          id={`${id}-due`}
          checked={followUpDue}
          onCheckedChange={(checked) => onFollowUpDueChange(checked === true)}
        />
        Follow-up due
      </label>
    </div>
  )
}
