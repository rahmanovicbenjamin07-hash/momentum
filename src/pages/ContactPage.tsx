import { Loader2 } from 'lucide-react'
import { useRef } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { useContact, useSetStage, useUpdateContact } from '@/api/contacts'
import { useSaveWonDeal } from '@/api/metrics'
import { useCreateTask, useContactTasks, useToggleTask } from '@/api/tasks'
import { useTemplates } from '@/api/templates'
import { useLogTouch, useTouches } from '@/api/touches'
import { useUserToday } from '@/app/useUserToday'
import { EmptyState } from '@/components/EmptyState'
import { ContactLayout } from '@/components/contact/ContactLayout'
import { ContactBreadcrumb, ContactSummary } from '@/components/contact/ContactSummary'
import { DetailsList } from '@/components/contact/DetailsList'
import { LinkedTasks } from '@/components/contact/LinkedTasks'
import { LogTouchForm, type LogTouchFormHandle } from '@/components/contact/LogTouchForm'
import { NotesCard } from '@/components/contact/NotesCard'
import { StageStepper } from '@/components/contact/StageStepper'
import { Timeline } from '@/components/contact/Timeline'
import { WonPanel } from '@/components/contact/WonPanel'
import { STAGE_META } from '@/components/outreach/meta'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/dates'
import { nextFollowUp } from '@/lib/outreach'
import { uuid } from '@/lib/uuid'
import type { Contact } from '@/schemas/outreach'

export default function ContactPage() {
  const { id } = useParams()
  const { today, timeZone } = useUserToday()

  const contact = useContact(id)
  const touches = useTouches(id)
  const templates = useTemplates()
  const tasks = useContactTasks(id)

  const setStage = useSetStage()
  const updateContact = useUpdateContact()
  const saveWonDeal = useSaveWonDeal()
  const logTouch = useLogTouch()
  const createTask = useCreateTask()
  const toggleTask = useToggleTask()

  const touchForm = useRef<LogTouchFormHandle>(null)

  if (contact.isError) {
    return (
      <>
        <ContactBreadcrumb name="Lead" />
        <EmptyState title="Couldn't load this lead" description="Check your connection and try again.">
          <Button onClick={() => void contact.refetch()}>Try again</Button>
        </EmptyState>
      </>
    )
  }

  if (contact.isPending) {
    return (
      <div role="status" className="flex items-center gap-2 py-12 text-sm text-ink-3">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading the lead…
      </div>
    )
  }

  const lead = contact.data
  if (!lead) {
    return (
      <EmptyState title="Lead not found" description="It may have been deleted.">
        <Button asChild>
          <Link to="/outreach">Back to Outreach</Link>
        </Button>
      </EmptyState>
    )
  }

  const timeline = touches.data ?? []
  const newest = timeline.find((t) => t.direction !== 'note') ?? null

  function moveTo(stage: Contact['stage']) {
    if (!lead) return
    const followUp = nextFollowUp(stage, today)
    setStage.mutate(
      { id: lead.id, stage, today },
      {
        onSuccess: () =>
          toast.success(
            `Moved to ${STAGE_META[stage].label}${followUp ? ` · follow up ${formatDate(followUp)}` : ''}`,
          ),
      },
    )
  }

  return (
    <ContactLayout
      header={
        <>
          <ContactBreadcrumb name={lead.name} />
          <ContactSummary
            contact={lead}
            onLogTouch={() => touchForm.current?.focusMessage()}
            onUseTemplate={() => touchForm.current?.focusTemplate()}
            onAddTask={() => {
              const dueDate = lead.next_follow_up && lead.next_follow_up > today ? lead.next_follow_up : today
              createTask.mutate(
                { title: `Follow up with ${lead.name}`, dueDate, tag: 'outreach', contactId: lead.id },
                {
                  onSuccess: () =>
                    toast.success(dueDate === today ? 'Task added to Today' : `Task added for ${formatDate(dueDate)}`),
                },
              )
            }}
            onMarkLost={() => moveTo('lost')}
          >
            <StageStepper stage={lead.stage} onChange={moveTo} />
            {lead.stage === 'won' && (
              <WonPanel
                key={lead.id}
                contact={lead}
                today={today}
                // Stores the deal on the lead and adds it to (or removes it from) Money earned.
                // Errors come back with a message the panel shows.
                onSave={({ amount, month, add_to_money_earned }) =>
                  saveWonDeal.mutateAsync({
                    contactId: lead.id,
                    contactName: lead.name,
                    amount,
                    month,
                    addToMoneyEarned: add_to_money_earned,
                  })
                }
              />
            )}
          </ContactSummary>
        </>
      }
      aside={
        <>
          <DetailsList contact={lead} lastTouch={newest} today={today} timeZone={timeZone} />
          <NotesCard
            notes={lead.notes}
            onSave={async (drafts) => {
              const now = new Date().toISOString()
              const notes = drafts.map((d) => ({
                id: d.id ?? uuid(),
                body: d.body,
                created_at: lead.notes.find((n) => n.id === d.id)?.created_at ?? now,
              }))
              try {
                await updateContact.mutateAsync({ id: lead.id, patch: { notes } })
              } catch {
                throw new Error("Couldn't save the notes. Try again.")
              }
            }}
          />
          <LinkedTasks
            tasks={tasks.data ?? []}
            today={today}
            onToggle={(task, done) => toggleTask.mutate({ id: task.id, done })}
          />
        </>
      }
      main={
        <>
          <LogTouchForm
            ref={touchForm}
            contactName={lead.name}
            defaultChannel={lead.channel}
            templates={templates.data ?? []}
            onSubmit={async (values) => {
              try {
                await logTouch.mutateAsync({ contactId: lead.id, values, today })
                toast.success(values.direction === 'sent' ? 'Touch saved · follow-up in 3 days' : 'Saved')
              } catch {
                throw new Error("Couldn't save it. Your text is still here, so try again.")
              }
            }}
          />
          {touches.isError ? (
            <EmptyState title="Couldn't load the timeline">
              <Button variant="outline" onClick={() => void touches.refetch()}>
                Try again
              </Button>
            </EmptyState>
          ) : (
            <Timeline touches={timeline} templates={templates.data ?? []} today={today} timeZone={timeZone} />
          )}
        </>
      }
    />
  )
}
