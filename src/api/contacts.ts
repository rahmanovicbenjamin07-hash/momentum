import { useMutation, useQuery, useQueryClient, type MutateOptions, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth-context'
import type { TablesInsert, TablesUpdate } from '@/lib/database.types'
import type { DateKey } from '@/lib/dates'
import { nextFollowUp, type NewContact } from '@/lib/outreach'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/uuid'
import type { Contact, Stage, WonDealFormValues } from '@/schemas/outreach'
import { queryKeys } from './keys'
import { invalidateWhenIdle, patchCachedLists, requireUserId, restoreCache, type CacheSnapshot } from './optimistic'

const contactsPrefix = queryKeys.outreach.contactsAll()
const contactPrefix = queryKeys.outreach.contactAll()

/**
 * Shared by every contact and touch write (touches also change the contact),
 * so a refetch only runs after the last of them and never undoes a newer change.
 */
export const pipelineMutationKey = ['outreach', 'pipeline'] as const

type Rollback = { snapshot: CacheSnapshot }

/** Fields a write may change. id / user_id / created_at never change; last_touch_at comes from a trigger. */
export type ContactPatch = Partial<Omit<Contact, 'id' | 'user_id' | 'created_at' | 'last_touch_at'>>

// ===========================================================================
// Queries
// ===========================================================================

/**
 * Every lead, newest first. The list is small, so filter and search in the
 * page with `filterContacts` (src/lib/outreachList.ts) instead of asking the server.
 */
export function useContacts() {
  return useQuery({
    queryKey: queryKeys.outreach.contacts(),
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Contact[]
    },
  })
}

/** One lead, or null if it doesn't exist (or isn't yours). Shows the list's copy straight away while loading. */
export function useContact(id: string | undefined) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: queryKeys.outreach.contact(id ?? 'none'),
    queryFn: async (): Promise<Contact | null> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id as string)
        .maybeSingle()
      if (error) throw error
      return data as Contact | null
    },
    enabled: Boolean(id),
    placeholderData: () => (id ? findCachedContact(queryClient, id) : undefined),
  })
}

function findCachedContact(queryClient: QueryClient, id: string): Contact | undefined {
  for (const [, list] of queryClient.getQueriesData<Contact[]>({ queryKey: contactsPrefix })) {
    const found = list?.find((c) => c.id === id)
    if (found) return found
  }
  return undefined
}

// ===========================================================================
// Pure cache helpers (tested in outreach-hooks.test.tsx)
// ===========================================================================

export function patchContact(list: Contact[], id: string, update: (contact: Contact) => Contact): Contact[] {
  return list.map((c) => (c.id === id ? update(c) : c))
}

export function withoutContact(list: Contact[], id: string): Contact[] {
  return list.filter((c) => c.id !== id)
}

/** The full row for a new lead, built in the browser so the cache and the database get the same id. */
export function buildContact(input: NewContact, ids: { id: string; userId: string }): Contact {
  return {
    company: null,
    role: null,
    category: null,
    city: null,
    phone: null,
    email: null,
    website: null,
    linkedin_url: null,
    maps_url: null,
    met_where: null,
    upwork_job_title: null,
    upwork_job_url: null,
    upwork_budget: null,
    connects_spent: null,
    proposal_status: null,
    channel: null,
    priority: 'medium',
    deal_value: null,
    won_amount: null,
    won_month: null,
    last_touch_at: null,
    lost_reason: null,
    notes: [],
    ...input,
    name: input.name.trim(),
    id: ids.id,
    user_id: ids.userId,
    created_at: new Date().toISOString(),
  }
}

export type SetStageInput = {
  id: string
  stage: Stage
  /** The user's today; the next follow-up is counted from it. */
  today: DateKey
  /** Moving to Won: amount and month from the Won dialog. */
  won?: WonDealFormValues
  /** Moving to Lost: optional reason. */
  lostReason?: string | null
}

/**
 * What changes when a lead moves stage: the stage, the next follow-up
 * (contacted +3, replied +2, meeting +1, proposal +3; none for new/won/lost),
 * and the Won / Lost details when given.
 */
export function stagePatch({ stage, today, won, lostReason }: SetStageInput): ContactPatch {
  const patch: ContactPatch = { stage, next_follow_up: nextFollowUp(stage, today) }
  if (stage === 'won' && won) {
    patch.won_amount = won.amount
    patch.won_month = `${won.month}-01`
  }
  if (stage === 'lost' && lostReason !== undefined) patch.lost_reason = lostReason
  return patch
}

/**
 * Changes one contact in every cached list and in its own cache entry.
 * Returns what was there before, for rolling back. Used by touches.ts too.
 */
export async function updateCachedContact(
  queryClient: QueryClient,
  id: string,
  update: (contact: Contact) => Contact,
): Promise<CacheSnapshot> {
  const lists = await patchCachedLists<Contact>(queryClient, contactsPrefix, (list) => patchContact(list, id, update))
  const key = queryKeys.outreach.contact(id)
  await queryClient.cancelQueries({ queryKey: key })
  const one = queryClient.getQueryData<Contact | null>(key)
  if (!one) return lists
  queryClient.setQueryData<Contact>(key, update(one))
  return [...lists, [key, one]]
}

// ===========================================================================
// Mutations
// ===========================================================================

type CreateVars = { row: Contact; insert: TablesInsert<'contacts'> }

/**
 * Adds a lead (give it the result of `leadToContact`). It shows in the list
 * instantly; rolls back with a toast if saving fails. `mutateAsync` resolves
 * with the new contact, e.g. to open its page.
 */
export function useCreateContact() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const mutation = useMutation({
    mutationKey: pipelineMutationKey,
    mutationFn: async ({ row, insert }: CreateVars): Promise<Contact> => {
      const { error } = await supabase.from('contacts').insert(insert)
      if (error) throw error
      return row
    },
    onMutate: async ({ row }): Promise<Rollback> => {
      const snapshot = await patchCachedLists<Contact>(queryClient, contactsPrefix, (list) => [row, ...list])
      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't add the lead. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, pipelineMutationKey, contactsPrefix),
  })

  const toVars = (input: NewContact): CreateVars => {
    const row = buildContact(input, { id: uuid(), userId: requireUserId(user?.id) })
    return { row, insert: { ...input, name: row.name, id: row.id } }
  }

  return {
    ...mutation,
    mutate: (input: NewContact, options?: MutateOptions<Contact, Error, CreateVars, Rollback>) =>
      mutation.mutate(toVars(input), options),
    mutateAsync: (input: NewContact, options?: MutateOptions<Contact, Error, CreateVars, Rollback>) =>
      mutation.mutateAsync(toVars(input), options),
  }
}

/** Rows per insert request when importing, so a big file doesn't hit request size limits. */
export const IMPORT_CHUNK_SIZE = 500

/**
 * Adds many leads at once (CSV import). Not optimistic: the list refreshes
 * when it's done. Resolves with how many were added.
 */
export function useImportContacts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: pipelineMutationKey,
    mutationFn: async (rows: readonly TablesInsert<'contacts'>[]): Promise<number> => {
      for (let i = 0; i < rows.length; i += IMPORT_CHUNK_SIZE) {
        const { error } = await supabase.from('contacts').insert(rows.slice(i, i + IMPORT_CHUNK_SIZE).map((r) => ({ ...r })))
        if (error) throw error
      }
      return rows.length
    },
    onError: () => toast.error("Couldn't import the leads. Try again."),
    onSettled: () => invalidateWhenIdle(queryClient, pipelineMutationKey, contactsPrefix),
  })
}

/** Shared by update / set stage: optimistic over every cached copy of the contact. */
function useContactPatch<TInput extends { id: string }>(toPatch: (input: TInput) => ContactPatch, errorMessage: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: pipelineMutationKey,
    mutationFn: async (input: TInput) => {
      const patch: TablesUpdate<'contacts'> = toPatch(input)
      const { error } = await supabase.from('contacts').update(patch).eq('id', input.id)
      if (error) throw error
    },
    onMutate: async (input): Promise<Rollback> => {
      const patch = toPatch(input)
      return { snapshot: await updateCachedContact(queryClient, input.id, (c) => ({ ...c, ...patch })) }
    },
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error(errorMessage)
    },
    onSettled: () => invalidateWhenIdle(queryClient, pipelineMutationKey, contactsPrefix, contactPrefix),
  })
}

export type UpdateContactInput = { id: string; patch: ContactPatch }

/** Edits any fields of a lead (details, notes, tags, follow-up…). Instant; rolls back with a toast. */
export function useUpdateContact() {
  return useContactPatch(({ patch }: UpdateContactInput) => patch, "Couldn't save the changes. Try again.")
}

/**
 * Moves a lead to another stage (pipeline drag, stage menu, Won / Lost dialogs)
 * and sets its next follow-up from the stage. Stage history is written by a database trigger.
 */
export function useSetStage() {
  return useContactPatch(stagePatch, "Couldn't move the lead. Try again.")
}

/**
 * Deletes a lead with its touches and stage history. Linked Today tasks stay,
 * only the link is cleared. Gone from lists instantly; rolls back with a toast.
 */
export function useDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: pipelineMutationKey,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id): Promise<Rollback> => {
      const snapshot = await patchCachedLists<Contact>(queryClient, contactsPrefix, (list) => withoutContact(list, id))
      return { snapshot }
    },
    onError: (_error, _id, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't delete the lead. Try again.")
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.outreach.contact(id) })
      queryClient.removeQueries({ queryKey: queryKeys.outreach.touches(id) })
    },
    onSettled: () =>
      invalidateWhenIdle(
        queryClient,
        pipelineMutationKey,
        contactsPrefix,
        queryKeys.outreach.weekTouchesAll(),
        queryKeys.today.tasksAll(),
        queryKeys.today.overdueTasksAll(),
      ),
  })
}
