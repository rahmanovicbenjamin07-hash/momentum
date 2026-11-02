import { Plus, X } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addDays, type DateKey } from '@/lib/dates'
import {
  GOAL_KIND_LABELS,
  GOAL_KINDS,
  GOAL_LIMITS,
  GOAL_UNIT_LABELS,
  GOAL_UNITS,
  HABIT_MANUAL,
  type KeyResultFormInput,
} from '@/schemas/goals'
import { GoalField } from './GoalField'

const option = 'rounded-lg py-2 pr-8 pl-2.5 data-[state=checked]:font-semibold'

type KeyResultFieldsProps = {
  today: DateKey
  /** Routine items a habit can be linked to. */
  routineItems: readonly { id: string; title: string }[]
  /** "New goal": the name may be left empty (it then uses the goal's name). */
  titleOptional?: boolean
}

/**
 * The fields of one key result: pick how it's measured, then that kind's fields.
 * Use inside a react-hook-form FormProvider whose values include KeyResultFormInput.
 */
export function KeyResultFields({ today, routineItems, titleOptional = false }: KeyResultFieldsProps) {
  const id = useId()
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<KeyResultFormInput>()
  const kind = useWatch({ control, name: 'kind' }) ?? 'number'
  const steps = useFieldArray({ control, name: 'steps' })

  const field = (name: 'kr_title' | 'start_value' | 'target') => ({
    'aria-invalid': errors[name] ? true : undefined,
    ...register(name),
  })
  const stepsError = errors.steps?.message ?? errors.steps?.root?.message

  /** A form date shown with the app's own calendar pop-up. */
  const datePicker = (
    name: 'start_date' | 'deadline' | `steps.${number}.due_date`,
    props: Omit<ComponentProps<typeof DatePicker>, 'value' | 'onChange' | 'today'>,
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur } }) => (
        <DatePicker placeholder="" {...props} today={today} value={value} onChange={onChange} onBlur={onBlur} />
      )}
    />
  )

  /** A form choice shown with the app's own dropdown (a styled list, unlike the browser's). */
  const choice = (name: 'unit' | 'per_week' | 'habit_source', fieldId: string, describedBy: string | undefined, items: ReactNode) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur, ref } }) => (
        <Select value={String(value ?? '')} onValueChange={onChange} onOpenChange={(open) => !open && onBlur()}>
          <SelectTrigger
            ref={ref}
            id={fieldId}
            aria-describedby={describedBy}
            aria-invalid={errors[name] ? true : undefined}
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={6} className="glass-menu">
            {items}
          </SelectContent>
        </Select>
      )}
    />
  )

  const dates = (withStart: boolean) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {withStart && (
        <GoalField floating id={`${id}-from`} label="Start date" error={errors.start_date?.message}>
          {(describedBy) =>
            datePicker('start_date', {
              id: `${id}-from`,
              max: today,
              'aria-invalid': errors.start_date ? true : undefined,
              'aria-describedby': describedBy,
            })
          }
        </GoalField>
      )}
      <GoalField floating id={`${id}-deadline`} label={kind === 'habit' ? 'Keep it up until' : 'Deadline'} error={errors.deadline?.message}>
        {(describedBy) =>
          datePicker('deadline', {
            id: `${id}-deadline`,
            min: addDays(today, 1),
            'aria-invalid': errors.deadline ? true : undefined,
            'aria-describedby': describedBy,
          })
        }
      </GoalField>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-foreground">How will you measure it?</legend>
        <div className="grid grid-cols-2 gap-2">
          {GOAL_KINDS.map((value) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer flex-col gap-0.5 rounded-lg border border-border bg-card p-2.5',
                'transition-[background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none',
                'has-checked:border-brand has-checked:bg-brand-tint has-focus-visible:ring-2 has-focus-visible:ring-brand',
              )}
            >
              <input type="radio" value={value} className="sr-only" {...register('kind')} />
              <span className="text-sm font-semibold text-foreground">{GOAL_KIND_LABELS[value].label}</span>
              <span className="text-xs leading-snug text-ink-2">{GOAL_KIND_LABELS[value].hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <GoalField
        floating
        id={`${id}-title`}
        label={titleOptional ? 'Key result (optional)' : 'Key result'}
        hint={titleOptional ? 'Empty = the same as the goal’s name.' : undefined}
        error={errors.kr_title?.message}
      >
        {(describedBy) => (
          <Input
            id={`${id}-title`}
            autoComplete="off"
            maxLength={GOAL_LIMITS.title}
            placeholder=" "
            aria-describedby={describedBy}
            {...field('kr_title')}
          />
        )}
      </GoalField>

      {/* Keyed by kind, so this kind's fields fade and slide in each time the choice changes. */}
      <div
        key={kind}
        className="flex flex-col gap-4 duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
      >
        {kind === 'number' && (
          <>
            <GoalField floating id={`${id}-unit`} label="Unit" error={errors.unit?.message}>
              {(describedBy) =>
                choice(
                  'unit',
                  `${id}-unit`,
                  describedBy,
                  GOAL_UNITS.map((value) => (
                    <SelectItem key={value} value={value} className={option}>
                      {GOAL_UNIT_LABELS[value]}
                    </SelectItem>
                  )),
                )
              }
            </GoalField>
            <div className="grid gap-4 sm:grid-cols-2">
              <GoalField floating id={`${id}-start`} label="Starting point" error={errors.start_value?.message}>
                {(describedBy) => (
                  <Input
                    id={`${id}-start`}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder=" "
                    aria-describedby={describedBy}
                    {...field('start_value')}
                  />
                )}
              </GoalField>
              <GoalField floating id={`${id}-target`} label="Target" error={errors.target?.message}>
                {(describedBy) => (
                  <Input
                    id={`${id}-target`}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder=" "
                    aria-describedby={describedBy}
                    {...field('target')}
                  />
                )}
              </GoalField>
            </div>
            {dates(true)}
          </>
        )}

        {kind === 'habit' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <GoalField floating id={`${id}-per-week`} label="Times a week" error={errors.per_week?.message}>
                {(describedBy) =>
                  choice(
                    'per_week',
                    `${id}-per-week`,
                    describedBy,
                    [1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <SelectItem key={n} value={String(n)} className={option}>
                        {n === 7 ? 'Every day' : `${n}× a week`}
                      </SelectItem>
                    )),
                  )
                }
              </GoalField>
              <GoalField
                floating
                id={`${id}-source`}
                label="Ticked"
                hint={routineItems.length ? 'Pick a routine item to count its ticks on Today.' : undefined}
                error={errors.habit_source?.message}
              >
                {(describedBy) =>
                  choice(
                    'habit_source',
                    `${id}-source`,
                    describedBy,
                    <>
                      <SelectItem value={HABIT_MANUAL} className={option}>
                        By hand, on this goal
                      </SelectItem>
                      {routineItems.length > 0 && <SelectSeparator />}
                      {routineItems.map((item) => (
                        <SelectItem key={item.id} value={item.id} className={option}>
                          On Today: {item.title}
                        </SelectItem>
                      ))}
                    </>,
                  )
                }
              </GoalField>
            </div>
            {dates(true)}
          </>
        )}

        {kind === 'milestones' && (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-foreground">Steps</legend>
              {steps.fields.map((step, i) => (
                <div key={step.id} className="flex items-start gap-2">
                  <Input
                    aria-label={`Step ${i + 1}`}
                    autoComplete="off"
                    maxLength={GOAL_LIMITS.milestoneTitle}
                    placeholder={`Step ${i + 1}`}
                    className="min-w-0 flex-1"
                    {...register(`steps.${i}.title`)}
                  />
                  <div className="flex w-40 flex-col gap-1">
                    {datePicker(`steps.${i}.due_date`, {
                      'aria-label': `Step ${i + 1} due date (optional)`,
                      'aria-invalid': errors.steps?.[i]?.due_date ? true : undefined,
                      placeholder: 'Due date',
                      clearable: true,
                    })}
                    {errors.steps?.[i]?.due_date?.message && (
                      <p className="text-xs text-bad">{errors.steps[i].due_date.message}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-ink-3"
                    aria-label={`Remove step ${i + 1}`}
                    disabled={steps.fields.length === 1}
                    onClick={() => steps.remove(i)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ))}
              {stepsError && <p className="text-xs text-bad">{stepsError}</p>}
              {steps.fields.length < GOAL_LIMITS.milestones && (
                <Button type="button" variant="outline" className="w-fit" onClick={() => steps.append({ title: '', due_date: '' })}>
                  <Plus aria-hidden="true" />
                  Add another step
                </Button>
              )}
              <p className="text-xs text-ink-2">Due dates are optional. Empty rows are skipped.</p>
            </fieldset>
            {dates(false)}
          </>
        )}

        {kind === 'done' && dates(false)}
      </div>
    </div>
  )
}
