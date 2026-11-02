import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import {
  useCreateFinanceEntry,
  useDeleteFinanceEntry,
  useFinanceEntries,
  useFinanceSettings,
  useSaveStartingSavings,
  useUpdateFinanceEntry,
} from '@/api/finance'
import { useUserToday } from '@/app/useUserToday'
import { PageHeader } from '@/components/PageHeader'
import { FinanceEntriesList } from '@/components/finance/FinanceEntriesList'
import { FinanceEntryForm } from '@/components/finance/FinanceEntryForm'
import { CategoryBreakdown, FinanceSummary, MoneyTile } from '@/components/finance/FinanceSummary'
import { FinanceTabs } from '@/components/finance/FinanceTabs'
import { FINANCE_PANEL_ID, financeTabId, isFinanceTab, type FinanceTab } from '@/components/finance/meta'
import { FinanceYearCharts } from '@/components/finance/FinanceYearCharts'
import { StartingSavingsCard } from '@/components/finance/StartingSavingsCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate } from '@/lib/dates'
import {
  addMonths,
  byCategory,
  categoryOptions,
  entriesInMonth,
  formatEur,
  formatMonthLong,
  monthEnd,
  monthOf,
  savedOn,
  toEur,
  totals,
  yearByMonth,
  type MonthKey,
} from '@/lib/finance'
import type { FinanceEntry } from '@/schemas/finance'
import { LoadError, Loading } from './stats/shared'

const isMonthKey = (value: string | null): value is MonthKey => value !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)

/**
 * Finance: the Logs tab lists the month's money in and out with the month's total on top.
 * Monthly, Yearly and Savings show how it adds up. Tab and month live in the address (?tab=yearly&month=2026-10).
 */
export default function FinancePage() {
  const { today } = useUserToday()
  const [params, setParams] = useSearchParams()
  const thisMonth = monthOf(today)
  const rawMonth = params.get('month')
  const month = isMonthKey(rawMonth) ? rawMonth : thisMonth
  const rawTab = params.get('tab')
  const tab: FinanceTab = isFinanceTab(rawTab) ? rawTab : 'logs'

  // Change the tab and/or month in one go; the defaults (Logs, this month) are left out of the address.
  const show = (next: { tab?: FinanceTab; month?: MonthKey }) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev)
        if (next.tab !== undefined) {
          if (next.tab === 'logs') out.delete('tab')
          else out.set('tab', next.tab)
        }
        if (next.month !== undefined) {
          if (next.month === thisMonth) out.delete('month')
          else out.set('month', next.month)
        }
        return out
      },
      { replace: true },
    )
  const goTo = (next: MonthKey) => show({ month: next })

  const entries = useFinanceEntries()
  const settings = useFinanceSettings()
  const createEntry = useCreateFinanceEntry()
  const updateEntry = useUpdateFinanceEntry()
  const deleteEntry = useDeleteFinanceEntry()
  const saveStart = useSaveStartingSavings()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<FinanceEntry | null>(null)

  const all = useMemo(() => entries.data ?? [], [entries.data])
  const start = useMemo(
    () =>
      settings.data
        ? { amount_eur: toEur(settings.data.starting_savings, settings.data.starting_currency), date: settings.data.starting_date }
        : null,
    [settings.data],
  )
  const monthEntries = useMemo(() => entriesInMonth(all, month), [all, month])
  const monthTotals = useMemo(() => totals(monthEntries), [monthEntries])
  const year = Number(month.slice(0, 4))
  const rows = useMemo(() => yearByMonth(all, start, year, today), [all, start, year, today])
  const categories = useMemo(
    () => ({ income: categoryOptions(all, 'income'), expense: categoryOptions(all, 'expense') }),
    [all],
  )
  const end = monthEnd(month)
  const saved = month > thisMonth ? null : savedOn(all, start, end < today ? end : today)
  const savedNote = start ? `Counting from ${formatEur(start.amount_eur)} on ${formatDate(start.date)}` : 'Add your starting savings in the Savings tab'
  const monthLabel = formatMonthLong(month)

  const header = (
    <>
      <PageHeader
        title="Finance"
        actions={
          <>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="glass-button" aria-label="Previous month" onClick={() => goTo(addMonths(month, -1))}>
                <ChevronLeft aria-hidden="true" />
              </Button>
              <p aria-live="polite" className="min-w-[132px] text-center text-sm font-semibold text-foreground">
                {monthLabel}
              </p>
              <Button variant="outline" size="icon" className="glass-button" aria-label="Next month" onClick={() => goTo(addMonths(month, 1))}>
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
            {month !== thisMonth && (
              <Button variant="outline" className="glass-button" onClick={() => goTo(thisMonth)}>
                This month
              </Button>
            )}
            <Button className="glass-button glass-button-primary" onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" />
              Add log
            </Button>
          </>
        }
      />
      <FinanceTabs active={tab} onSelect={(next) => show({ tab: next })} />
    </>
  )

  if (entries.isError || settings.isError) {
    return (
      <div className="today-glass">
        {header}
        <LoadError
          title="Couldn't load your finances"
          onRetry={() => {
            void entries.refetch()
            void settings.refetch()
          }}
        />
      </div>
    )
  }
  if (!entries.data || settings.data === undefined) {
    return (
      <div className="today-glass">
        {header}
        <Loading label="Loading your finances…" />
      </div>
    )
  }

  function panel() {
    switch (tab) {
      case 'logs':
        return (
          <FinanceEntriesList
            monthLabel={monthLabel}
            totals={monthTotals}
            entries={monthEntries}
            onEdit={setEditing}
            onDelete={(entry) => {
              const undo = deleteEntry.remove(entry)
              toast('Log deleted', { duration: 5000, action: { label: 'Undo', onClick: undo } })
            }}
          />
        )
      case 'monthly':
        return (
          <div className="flex flex-col gap-4">
            <FinanceSummary monthLabel={monthLabel} totals={monthTotals} saved={saved} savedNote={savedNote} />
            <CategoryBreakdown spent={byCategory(monthEntries, 'expense')} earned={byCategory(monthEntries, 'income')} />
          </div>
        )
      case 'yearly':
        return <FinanceYearCharts year={year} rows={rows} selectedMonth={month} onSelectMonth={(next) => show({ tab: 'monthly', month: next })} />
      case 'savings':
        return (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyTile
                label="Saved today"
                value={formatEur(savedOn(all, start, today))}
                note={start ? savedNote : 'Add your starting savings below'}
              />
              <MoneyTile
                label={`Saved at the end of ${monthLabel}`}
                value={saved === null ? '—' : formatEur(saved)}
                note={saved === null ? 'This month is still ahead' : undefined}
              />
            </div>
            <StartingSavingsCard
              key={settings.data?.id ?? 'new'}
              current={
                settings.data
                  ? { amount: settings.data.starting_savings, currency: settings.data.starting_currency, date: settings.data.starting_date }
                  : null
              }
              today={today}
              onSave={async (values) => {
                try {
                  await saveStart.mutateAsync(values)
                } catch (error) {
                  throw new Error("Couldn't save your starting savings. Try again.", { cause: error })
                }
                toast.success('Starting savings saved')
              }}
            />
          </div>
        )
    }
  }

  return (
    <div className="today-glass">
      {header}
      <div role="tabpanel" id={FINANCE_PANEL_ID} aria-labelledby={financeTabId(tab)}>
        {panel()}
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="glass-form max-h-[90dvh] overflow-y-auto sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add log</DialogTitle>
            <DialogDescription>Money you earned or spent: a name, how much and which day.</DialogDescription>
          </DialogHeader>
          <FinanceEntryForm
            categories={categories}
            today={month === thisMonth ? today : `${month}-01`}
            onCancel={() => setAdding(false)}
            onSubmit={async (values) => {
              try {
                await createEntry.mutateAsync(values)
              } catch (error) {
                throw new Error("Couldn't save it. Your log is still here, so try again.", { cause: error })
              }
              setAdding(false)
              const what = `${values.kind === 'income' ? 'Earned' : 'Spent'} ${formatEur(toEur(values.amount, values.currency))}`
              const entryMonth = monthOf(values.date)
              if (entryMonth === month) toast.success(`${what} added`)
              else toast.success(`${what} added to ${formatMonthLong(entryMonth)}`, { action: { label: 'View', onClick: () => goTo(entryMonth) } })
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="glass-form max-h-[90dvh] overflow-y-auto sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit log</DialogTitle>
            <DialogDescription>Change the name, amount, day, description or category.</DialogDescription>
          </DialogHeader>
          {editing && (
            <FinanceEntryForm
              categories={categories}
              today={today}
              submitLabel="Save"
              defaultValues={{
                kind: editing.kind,
                name: editing.name,
                amount: String(editing.amount),
                currency: editing.currency,
                category: editing.category,
                date: editing.date,
                note: editing.note ?? '',
              }}
              onCancel={() => setEditing(null)}
              onSubmit={async (values) => {
                await updateEntry.mutateAsync({ id: editing.id, values })
                setEditing(null)
                toast.success('Log saved')
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
