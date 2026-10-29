import { useMemo, useRef, useState, type ComponentProps, type KeyboardEventHandler, type MouseEvent, type ReactNode, type RefObject } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'
import type { DateKey } from '@/lib/dates'
import { FollowUpText } from './FollowUpText'
import { formatEuro, leadShortLine, leadValue, type LeadSummary } from './format'
import { LEAD_STAGES, STAGE_META, type LeadStage } from './meta'
import { SourceChip } from './SourceChip'

type PipelineBoardProps = {
  contacts: readonly LeadSummary[]
  today: DateKey
  /** Called when a lead is dropped on another stage. */
  onMove: (id: string, stage: LeadStage) => void
  /** Columns to show, left to right. Defaults to every stage. */
  stages?: readonly LeadStage[]
}

const isStage = (id: UniqueIdentifier | undefined): id is LeadStage =>
  typeof id === 'string' && (LEAD_STAGES as readonly string[]).includes(id)

/** Mouse: the column under the pointer. Keyboard: the column the card overlaps most. */
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : rectIntersection(args)
}

/** Keyboard: ← / → jump the card to the previous / next column. */
const coordinateGetter: KeyboardCoordinateGetter = (event, { context }) => {
  if (event.code !== KeyboardCode.Left && event.code !== KeyboardCode.Right) return undefined
  event.preventDefault()
  const { droppableContainers, droppableRects, over } = context
  const columns = droppableContainers
    .getEnabled()
    .map((container) => ({ id: container.id, rect: droppableRects.get(container.id) }))
    .filter((c): c is { id: UniqueIdentifier; rect: NonNullable<typeof c.rect> } => c.rect !== undefined)
    .sort((a, b) => a.rect.left - b.rect.left)

  const current = columns.findIndex((c) => c.id === over?.id)
  const next = columns[current + (event.code === KeyboardCode.Right ? 1 : -1)]
  if (!next) return undefined
  return { x: next.rect.left + 8, y: next.rect.top + 40 }
}

/** Pipeline board: one column per stage; drag cards (or use the keyboard) to change stage. */
export function PipelineBoard({ contacts, today, onMove, stages = LEAD_STAGES }: PipelineBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  /** Stops the name link from opening right after a mouse drag ends on it. */
  const justDragged = useRef(false)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on phones, so swiping still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  )

  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts])
  const nameOf = (id: UniqueIdentifier) => byId.get(String(id))?.name ?? 'Lead'
  const stageLabel = (id: UniqueIdentifier | undefined) => (isStage(id) ? STAGE_META[id].label : 'no stage')

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) => `${nameOf(active.id)} is over ${stageLabel(over?.id)}.`,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} moved to ${stageLabel(over.id)}.` : `${nameOf(active.id)} was put back.`,
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  }

  function finish() {
    setActiveId(null)
    justDragged.current = true
    setTimeout(() => {
      justDragged.current = false
    }, 0)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    finish()
    const lead = byId.get(String(active.id))
    if (lead && isStage(over?.id) && over.id !== lead.stage) onMove(lead.id, over.id)
  }

  const active = activeId ? byId.get(activeId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To move this lead, press Space or Enter. Use the left and right arrow keys to choose a stage, then press Space or Enter to drop it, or Escape to cancel.',
        },
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={finish}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <BoardColumn
            key={stage}
            stage={stage}
            contacts={contacts.filter((c) => c.stage === stage)}
            today={today}
            justDragged={justDragged}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? <LeadCardBody lead={active} today={today} className="rotate-1 border-brand" /> : null}
      </DragOverlay>
    </DndContext>
  )
}

type BoardColumnProps = {
  stage: LeadStage
  contacts: readonly LeadSummary[]
  today: DateKey
  justDragged: RefObject<boolean>
}

function BoardColumn({ stage, contacts, today, justDragged }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const label = STAGE_META[stage].label

  return (
    <section
      ref={setNodeRef}
      aria-label={`${label}, ${contacts.length}`}
      data-board-column={stage}
      className={cn(
        'flex w-[200px] shrink-0 flex-col gap-2 self-start rounded-xl border bg-sunken p-2 transition-colors',
        isOver ? 'border-brand bg-brand-tint' : 'border-transparent',
      )}
    >
      <h3 className="flex items-center justify-between px-1 pt-1 text-sm font-semibold text-foreground">
        {label}
        <span className="text-xs font-medium text-ink-2 tabular-nums">{contacts.length}</span>
      </h3>
      {contacts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-input px-3 py-4 text-center text-xs text-ink-2">
          Drop a lead here
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {contacts.map((lead) => (
            <li key={lead.id}>
              <DraggableLeadCard lead={lead} today={today} justDragged={justDragged} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DraggableLeadCard({ lead, today, justDragged }: { lead: LeadSummary; today: DateKey; justDragged: RefObject<boolean> }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: lead.id })
  // Mouse and touch drag the whole card; the keyboard uses the grip button.
  const { onKeyDown, ...pointerListeners } = listeners ?? {}

  function blockClickAfterDrag(event: MouseEvent) {
    if (justDragged.current) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  return (
    <LeadCardBody
      ref={setNodeRef}
      lead={lead}
      today={today}
      data-dragging={isDragging || undefined}
      className={cn('cursor-grab touch-manipulation', isDragging && 'opacity-40')}
      onClickCapture={blockClickAfterDrag}
      {...pointerListeners}
      handle={
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          onKeyDown={onKeyDown as KeyboardEventHandler | undefined}
          aria-label={`Move ${lead.name}`}
          className="-mt-1 -mr-1 grid size-7 shrink-0 cursor-grab place-items-center rounded-md text-ink-3 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      }
    />
  )
}

type LeadCardBodyProps = ComponentProps<'div'> & {
  lead: LeadSummary
  today: DateKey
  handle?: ReactNode
}

/** The card itself; also used as the floating copy while dragging. */
function LeadCardBody({ lead, today, handle, className, ref, ...rest }: LeadCardBodyProps) {
  const shortLine = leadShortLine(lead)
  const closed = lead.stage === 'won' || lead.stage === 'lost'

  return (
    <div
      ref={ref}
      data-board-card=""
      className={cn('rounded-lg border border-border bg-card p-3 text-left select-none', className)}
      {...rest}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {handle ? (
            <Link
              to={`/outreach/${lead.id}`}
              draggable={false}
              className="font-semibold break-words text-foreground outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {lead.name}
            </Link>
          ) : (
            <p className="font-semibold break-words text-foreground">{lead.name}</p>
          )}
          {shortLine && <p className="mt-0.5 text-xs text-ink-2">{shortLine}</p>}
        </div>
        {handle}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <SourceChip source={lead.source} className="h-5 px-1.5 text-[11px]" />
        <span className="text-sm font-semibold text-foreground tabular-nums">{formatEuro(leadValue(lead))}</span>
      </div>
      <p className="mt-2 text-xs">
        {closed ? (
          <span className="text-ink-2">Closed</span>
        ) : (
          <FollowUpText date={lead.next_follow_up} today={today} prefix="Next: " />
        )}
      </p>
    </div>
  )
}
