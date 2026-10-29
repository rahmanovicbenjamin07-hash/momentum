import { TZDate } from '@date-fns/tz'
import { useMutation, useQuery, useQueryClient, type MutateOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth-context'
import { addDays, DEFAULT_TIME_ZONE, toDateKey, weekStart, type DateKey } from '@/lib/dates'
import { SENT_TOUCH_FOLLOW_UP_DAYS } from '@/lib/outreach'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/uuid'
import type { Contact, LogTouchFormValues, Touch } from '@/schemas/outreach'
import { pipelineMutationKey, updateCachedContact } from './contacts'
import { queryKeys } from './keys'
import { invalidateWhenIdle, patchCachedLists, requireUserId, restoreCache, type CacheSnapshot } from './optimistic'

type Rollback = { snapshot: CacheSnapshot }

// ===========================================================================
// Queries
// ===========================================================================

/** A contact's timeline, newest first. Pass undefined while the id isn't known yet. */
export function useTouches(contactId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.outreach.touches(contactId ?? 'none'),
    queryFn: async (): Promise<Touch[]> => {
      const { data, error } = await supabase
        .from('touches')
        .select('*')
        .eq('contact_id', contactId as string)
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Touch[]
    },
    enabled: Boolean(contactId),
  })
}

/** Midnight at the start of `day` in the time zone, as a UTC timestamp. */
function dayStartIso(day: DateKey, timeZone: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return new Date(new TZDate(y, m - 1, d, timeZone).getTime()).toISOString()
}

/** Monday 00:00 up to (not including) next Monday 00:00 of the week that contains `today`, local time. */
export function weekRange(today: DateKey, timeZone: string = DEFAULT_TIME_ZONE): { from: string; to: string } {
  const monday = weekStart(today)
  return { from: dayStartIso(monday, timeZone), to: dayStartIso(addDays(monday, 7), timeZone) }
}

/**
 * Every touch (all contacts) in the week (Mon–Sun) that contains `today`.
 * Count the outreach with `weekOutreachCount` (src/lib/outreachList.ts).
 */
export function useWeekTouches(today: DateKey) {
  const monday = weekStart(today)
  return useQuery({
    queryKey: queryKeys.outreach.weekTouches(monday),
    queryFn: async (): Promise<Touch[]> => {
      const { from, to } = weekRange(monday)
      const { data, error } = await supabase
        .from('touches')
        .select('*')
        .gte('occurred_at', from)
        .lt('occurred_at', to)
        .order('occurred_at')
      if (error) throw error
      return data as Touch[]
    },
  })
}

// ===========================================================================
// Pure cache helpers (tested in outreach-hooks.test.tsx)
// ===========================================================================

/** The full row for a new touch, built in the browser so the cache and the database get the same id. */
export function buildTouch(
  values: LogTouchFormValues,
  ids: { id: string; userId: string; contactId: string; occurredAt: string },
): Touch {
  return {
    id: ids.id,
    user_id: ids.userId,
    created_at: new Date().toISOString(),
    contact_id: ids.contactId,
    occurred_at: ids.occurredAt,
    channel: values.channel,
    direction: values.direction,
    template_id: values.template_id ?? null,
    body: values.body ?? null,
    got_reply: values.got_reply,
  }
}

/** Adds a touch to a timeline and keeps it newest first. */
export function addToTimeline(list: Touch[], touch: Touch): Touch[] {
  return [touch, ...list].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
}

/**
 * How the contact changes after a touch: a sent message pushes the follow-up
 * to today + 3 days; anything but a note updates "last touch" (like the DB trigger).
 */
export function contactAfterTouch(contact: Contact, touch: Touch, today: DateKey): Contact {
  const next = { ...contact }
  if (touch.direction === 'sent') next.next_follow_up = addDays(today, SENT_TOUCH_FOLLOW_UP_DAYS)
  if (touch.direction !== 'note') {
    const last = contact.last_touch_at
    if (!last || Date.parse(touch.occurred_at) > Date.parse(last)) next.last_touch_at = touch.occurred_at
  }
  return next
}

// ===========================================================================
// Mutations
// ===========================================================================

export type LogTouchInput = {
  contactId: string
  /** Parsed Log touch form. */
  values: LogTouchFormValues
  /** The user's today; a sent touch's follow-up is counted from it. */
  today: DateKey
  /** When it happened; defaults to now. */
  occurredAt?: string
}

type LogTouchVars = { touch: Touch; today: DateKey }

/**
 * Logs a message / call / note on a contact. Shows on the timeline and in the
 * week count instantly; a sent touch also sets the follow-up to today + 3 days.
 * Rolls back with a toast if saving fails.
 */
export function useLogTouch() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const mutation = useMutation({
    mutationKey: pipelineMutationKey,
    mutationFn: async ({ touch, today }: LogTouchVars) => {
      const { error } = await supabase.from('touches').insert({
        id: touch.id,
        contact_id: touch.contact_id,
        occurred_at: touch.occurred_at,
        channel: touch.channel,
        direction: touch.direction,
        template_id: touch.template_id,
        body: touch.body,
        got_reply: touch.got_reply,
      })
      if (error) throw error
      // last_touch_at is set by a database trigger; only the follow-up is ours to write.
      if (touch.direction === 'sent') {
        const { error: followUpError } = await supabase
          .from('contacts')
          .update({ next_follow_up: addDays(today, SENT_TOUCH_FOLLOW_UP_DAYS) })
          .eq('id', touch.contact_id)
        if (followUpError) throw followUpError
      }
    },
    onMutate: async ({ touch, today }): Promise<Rollback> => {
      const touchWeek = weekStart(toDateKey(new Date(touch.occurred_at)))
      const timeline = await patchCachedLists<Touch>(queryClient, queryKeys.outreach.touches(touch.contact_id), (list) =>
        addToTimeline(list, touch),
      )
      const week = await patchCachedLists<Touch>(queryClient, queryKeys.outreach.weekTouches(touchWeek), (list) => [
        ...list,
        touch,
      ])
      const contact = await updateCachedContact(queryClient, touch.contact_id, (c) => contactAfterTouch(c, touch, today))
      return { snapshot: [...timeline, ...week, ...contact] }
    },
    onError: (_error, _vars, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't log that. Try again.")
    },
    onSettled: () =>
      invalidateWhenIdle(
        queryClient,
        pipelineMutationKey,
        queryKeys.outreach.touchesAll(),
        queryKeys.outreach.weekTouchesAll(),
        queryKeys.outreach.contactsAll(),
        queryKeys.outreach.contactAll(),
      ),
  })

  const toVars = ({ contactId, values, today, occurredAt }: LogTouchInput): LogTouchVars => ({
    today,
    touch: buildTouch(values, {
      id: uuid(),
      userId: requireUserId(user?.id),
      contactId,
      occurredAt: occurredAt ?? new Date().toISOString(),
    }),
  })

  return {
    ...mutation,
    mutate: (input: LogTouchInput, options?: MutateOptions<void, Error, LogTouchVars, Rollback>) =>
      mutation.mutate(toVars(input), options),
    mutateAsync: (input: LogTouchInput, options?: MutateOptions<void, Error, LogTouchVars, Rollback>) =>
      mutation.mutateAsync(toVars(input), options),
  }
}
