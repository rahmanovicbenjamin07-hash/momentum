import { Ban, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { avatarTone, leadInitials } from '@/components/outreach/format'
import { StagePill } from '@/components/outreach/StagePill'
import type { Contact } from '@/schemas/outreach'
import { summaryLine, tagLabel, type SummaryLineFields } from './format'

export type ContactSummaryData = SummaryLineFields & Pick<Contact, 'id' | 'stage' | 'priority' | 'tags'>

type ContactSummaryProps = {
  contact: ContactSummaryData
  onLogTouch: () => void
  onUseTemplate: () => void
  onAddTask: () => void
  /** Items in the ⋯ menu; each one only shows when its callback is given. */
  onEdit?: () => void
  onMarkLost?: () => void
  onDelete?: () => void
  /** Shown under the header inside the same card: the stage stepper, and the won panel. */
  children?: ReactNode
}

/** "Outreach / Emir Kovač" above the summary card. */
export function ContactBreadcrumb({ name }: { name: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link to="/outreach" className="font-medium text-brand hover:underline">
            Outreach
          </Link>
        </li>
        <li aria-hidden="true" className="text-ink-3">
          /
        </li>
        <li aria-current="page" className="truncate text-foreground">
          {name}
        </li>
      </ol>
    </nav>
  )
}

const chip = 'inline-flex h-6 items-center rounded-lg px-2 text-xs font-semibold whitespace-nowrap'

/** Top card of the contact page: avatar, name, role line, stage + tags, actions. */
export function ContactSummary({
  contact,
  onLogTouch,
  onUseTemplate,
  onAddTask,
  onEdit,
  onMarkLost,
  onDelete,
  children,
}: ContactSummaryProps) {
  const id = useId()
  const line = summaryLine(contact)
  const hasMenu = Boolean(onEdit || onMarkLost || onDelete)

  return (
    <section aria-labelledby={`${id}-name`} className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'grid size-14 shrink-0 place-items-center rounded-full text-lg font-semibold',
            avatarTone(contact.id),
          )}
        >
          {leadInitials(contact)}
        </span>

        <div className="min-w-0 flex-1">
          <h1 id={`${id}-name`} className="text-2xl font-bold break-words text-foreground">
            {contact.name}
          </h1>
          {line && <p className="mt-0.5 text-sm text-ink-2">{line}</p>}
          <ul aria-label="Stage and tags" className="mt-2 flex flex-wrap gap-1.5">
            <li>
              <StagePill stage={contact.stage} />
            </li>
            {contact.priority === 'high' && (
              <li>
                <span className={cn(chip, 'bg-bad-tint text-bad')}>High priority</span>
              </li>
            )}
            {contact.tags.map((tag) => (
              <li key={tag}>
                <span className={cn(chip, 'bg-muted font-medium text-ink-2')}>{tagLabel(tag)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onLogTouch}>Log touch</Button>
          <Button variant="outline" className="bg-card" onClick={onUseTemplate}>
            Use template
          </Button>
          <Button variant="outline" className="bg-card" onClick={onAddTask}>
            Add task
          </Button>
          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="bg-card" aria-label="More actions">
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil />
                    Edit details
                  </DropdownMenuItem>
                )}
                {onMarkLost && contact.stage !== 'lost' && (
                  <DropdownMenuItem onSelect={onMarkLost}>
                    <Ban />
                    Mark as lost
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    {(onEdit || onMarkLost) && <DropdownMenuSeparator />}
                    <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                      <Trash2 />
                      Delete lead
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {children && <div className="mt-5 flex flex-col gap-5">{children}</div>}
    </section>
  )
}
