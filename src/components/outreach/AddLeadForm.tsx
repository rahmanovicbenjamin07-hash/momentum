import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, TriangleAlert, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type HTMLInputTypeAttribute, type ReactNode } from 'react'
import { useForm, type DefaultValues, type Path } from 'react-hook-form'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  addLeadFormSchema,
  type AddLeadFormInput,
  type AddLeadFormValues,
  type FollowUpChoice,
  type ProposalStatus,
  type Source,
} from '@/schemas/outreach'
import { SOURCE_META } from './meta'

/** The four sources the form offers (the design has no "Other"). */
export type FormSource = Exclude<Source, 'other'>
const FORM_SOURCES: readonly FormSource[] = ['linkedin', 'maps', 'inperson', 'upwork']

type FieldName = Exclude<Path<AddLeadFormInput>, 'source' | 'follow_up' | 'proposal_status'>

type FieldDef = {
  name: FieldName
  label: string
  placeholder?: string
  type?: HTMLInputTypeAttribute
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email' | 'url'
  autoComplete?: string
}

const FIELDS: Record<FormSource, FieldDef[]> = {
  linkedin: [
    { name: 'name', label: 'Name', placeholder: 'e.g. Emir Kovač', autoComplete: 'off' },
    { name: 'company', label: 'Company', placeholder: 'e.g. Bloom Studio', autoComplete: 'off' },
    { name: 'role', label: 'Role', placeholder: 'e.g. Founder', autoComplete: 'off' },
    { name: 'linkedin_url', label: 'Profile link', placeholder: 'linkedin.com/in/…', type: 'url' },
  ],
  maps: [
    { name: 'name', label: 'Business name', placeholder: 'e.g. Café Rondo', autoComplete: 'off' },
    { name: 'category', label: 'Type of business', placeholder: 'e.g. Café, dentist, gym', autoComplete: 'off' },
    { name: 'city', label: 'Address or city', placeholder: 'e.g. Sarajevo', autoComplete: 'off' },
    { name: 'phone', label: 'Phone', placeholder: '+387 …', type: 'tel', autoComplete: 'off' },
    { name: 'website', label: 'Website', placeholder: 'Leave empty if they have none', type: 'url' },
    { name: 'maps_url', label: 'Google Maps link', placeholder: 'Paste the link from Maps', type: 'url' },
  ],
  inperson: [
    { name: 'name', label: 'Name', placeholder: 'e.g. Sara Begić', autoComplete: 'off' },
    { name: 'company', label: 'Company', placeholder: 'e.g. Atelier Sara', autoComplete: 'off' },
    { name: 'met_where', label: 'Where we met', placeholder: 'e.g. Startup Meetup', autoComplete: 'off' },
    { name: 'phone', label: 'Phone', placeholder: '+387 …', type: 'tel', autoComplete: 'off' },
    { name: 'email', label: 'Email', placeholder: 'name@company.com', type: 'email', autoComplete: 'off' },
  ],
  upwork: [
    { name: 'upwork_job_title', label: 'Job title', placeholder: 'e.g. Shopify store redesign', autoComplete: 'off' },
    { name: 'client_name', label: 'Client name', placeholder: 'If you know it', autoComplete: 'off' },
    { name: 'upwork_budget', label: 'Budget (€)', placeholder: 'e.g. 800', inputMode: 'decimal' },
    { name: 'connects_spent', label: 'Connects spent', placeholder: 'e.g. 12', inputMode: 'numeric' },
    { name: 'upwork_job_url', label: 'Job link', placeholder: 'upwork.com/jobs/…', type: 'url' },
  ],
}

const HINTS: Partial<Record<FormSource, string>> = {
  maps: 'No website or an old one? That’s often your best opening — note it in the lead.',
  inperson: 'Add a phone number or an email so you can follow up.',
  upwork: 'Proposal status sets the stage: sent or viewed → Contacted, interview → Meeting booked, hired → Won.',
}

const FOLLOW_UP_OPTIONS: { value: FollowUpChoice; label: string }[] = [
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: '3_days', label: 'In 3 days' },
  { value: 'week', label: 'In a week' },
]

const PROPOSAL_OPTIONS: { value: ProposalStatus; label: string }[] = [
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'interview', label: 'Interview' },
  { value: 'hired', label: 'Hired' },
]

const selectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function defaultsFor(source: FormSource, followUp: FollowUpChoice = '3_days'): DefaultValues<AddLeadFormInput> {
  return (
    source === 'upwork' ? { source, follow_up: followUp, proposal_status: 'sent' } : { source, follow_up: followUp }
  ) as DefaultValues<AddLeadFormInput>
}

export type AddLeadFormProps = {
  /** Saves the lead. Throw an Error to show its message above the buttons. */
  onSubmit: (values: AddLeadFormValues) => Promise<void> | void
  onCancel: () => void
  /** Pre-selects a source; without it the user picks one first. */
  defaultSource?: FormSource
  /** Called on every change, so the page can look for duplicates (same email or link). */
  onDraftChange?: (draft: Partial<AddLeadFormInput>) => void
  /** Warning shown above the buttons, e.g. "Emir Kovač already has this LinkedIn link". */
  duplicateWarning?: ReactNode
}

/** "Add a lead": choose where you found them, fill that source's fields, pick the first follow-up. */
export function AddLeadForm({ onSubmit, onCancel, defaultSource, onDraftChange, duplicateWarning }: AddLeadFormProps) {
  const id = useId()
  const [source, setSource] = useState<FormSource | null>(defaultSource ?? null)

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    subscribe,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddLeadFormInput, unknown, AddLeadFormValues>({
    resolver: zodResolver(addLeadFormSchema),
    defaultValues: defaultSource ? defaultsFor(defaultSource) : undefined,
  })

  const draftListener = useRef(onDraftChange)
  useEffect(() => {
    draftListener.current = onDraftChange
  })
  useEffect(() => {
    return subscribe({
      formState: { values: true },
      callback: ({ values }) => draftListener.current?.(values as Partial<AddLeadFormInput>),
    })
  }, [subscribe])

  function pickSource(next: FormSource) {
    if (next === source) return
    setSource(next)
    reset(defaultsFor(next, getValues('follow_up')))
  }

  const fieldErrors = errors as Partial<Record<string, { message?: string }>>
  const errorOf = (name: string) => fieldErrors[name]?.message

  const save = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t save the lead. Try again.' })
    }
  })

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-brand/30 bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">
          Add a lead
        </h2>
        <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onCancel}>
          <X aria-hidden="true" />
        </Button>
      </div>

      <form noValidate onSubmit={save} className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-foreground">Where did you find them?</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FORM_SOURCES.map((s) => {
              const { label, icon: Icon, className: tone } = SOURCE_META[s]
              return (
                <label
                  key={s}
                  className="flex h-12 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-background has-checked:border-brand has-checked:ring-1 has-checked:ring-brand has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <input
                    type="radio"
                    name={`${id}-source`}
                    value={s}
                    checked={source === s}
                    onChange={() => pickSource(s)}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className={cn('grid size-7 place-items-center rounded-md', tone)}>
                    <Icon className="size-4" />
                  </span>
                  {label}
                </label>
              )
            })}
          </div>
        </fieldset>

        {source ? (
          <>
            <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              {FIELDS[source].map((field) => {
                const fieldId = `${id}-${field.name}`
                const error = errorOf(field.name)
                return (
                  <div key={`${source}-${field.name}`} className="grid content-start gap-1.5">
                    <Label htmlFor={fieldId}>{field.label}</Label>
                    <Input
                      id={fieldId}
                      type={field.type ?? 'text'}
                      inputMode={field.inputMode}
                      autoComplete={field.autoComplete}
                      placeholder={field.placeholder}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? `${fieldId}-error` : undefined}
                      {...register(field.name)}
                    />
                    {error && (
                      <p id={`${fieldId}-error`} className="text-xs text-bad">
                        {error}
                      </p>
                    )}
                  </div>
                )
              })}

              {source === 'upwork' && (
                <div className="grid content-start gap-1.5">
                  <Label htmlFor={`${id}-proposal`}>Proposal status</Label>
                  <select id={`${id}-proposal`} className={selectClass} {...register('proposal_status')}>
                    {PROPOSAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid content-start gap-1.5">
                <Label htmlFor={`${id}-follow-up`}>First follow-up</Label>
                <select id={`${id}-follow-up`} className={selectClass} {...register('follow_up')}>
                  {FOLLOW_UP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {HINTS[source] && <p className="text-[13px] text-ink-2">{HINTS[source]}</p>}
          </>
        ) : (
          <p className="text-sm text-ink-2">Pick a source to see the fields for it.</p>
        )}

        <div aria-live="polite">
          {duplicateWarning && (
            <div className="flex gap-2 rounded-lg bg-warn-tint p-3 text-[13px] text-warn">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <div>{duplicateWarning}</div>
            </div>
          )}
        </div>

        {errors.root?.message && (
          <p role="alert" className="rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
            {errors.root.message}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!source || isSubmitting}>
            {isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
            Save lead
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  )
}
