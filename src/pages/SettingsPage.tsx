import { useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, Loader2, Users } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useBackups, useDeleteAccount, useRestoreBackup } from '@/api/backups'
import { useMetrics } from '@/api/metrics'
import { useProfile } from '@/api/profile'
import { useRoutineItems } from '@/api/routine'
import { useNotificationPrefs, useSetNotificationPref, useUpdateProfileSettings } from '@/api/settings'
import { useAuth } from '@/app/auth-context'
import { exportCsv, exportEverything, insertMetricValues, type CsvExportKind } from '@/app/dataExport'
import { setTheme } from '@/app/theme'
import { useContactsCsvImport } from '@/app/useContactsCsvImport'
import { useUserToday } from '@/app/useUserToday'
import { CsvImportDialog } from '@/components/outreach/CsvImportDialog'
import { AppearanceSettings } from '@/components/settings/AppearanceSettings'
import { DataSettings } from '@/components/settings/DataSettings'
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings'
import { NotificationsSettings, type NotificationRowData } from '@/components/settings/NotificationsSettings'
import { SettingsHeader } from '@/components/settings/SettingsHeader'
import { SettingsTabs } from '@/components/settings/SettingsTabs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { parseMetricValuesCsv, type MetricValueRow } from '@/lib/exportData'
import type { CsvLineError } from '@/lib/csv'
import { formatDays } from '@/lib/todayList'
import type { DayEndHour, NotificationKey, NotificationPref, Theme, WeekStart } from '@/schemas/settings'
import { LoadError, Loading } from './stats/shared'

/** What each reminder starts as before it's ever been changed (design/settings.png). */
const DEFAULT_PREFS: Record<string, { enabled: boolean; time: string | null; time_end?: string | null }> = {
  master: { enabled: true, time: null },
  anytime: { enabled: true, time: '09:00' },
  followups: { enabled: true, time: '09:00' },
  close_day: { enabled: true, time: '21:00' },
  weekly_review: { enabled: true, time: '18:00' },
  email_summary: { enabled: false, time: '07:00' },
  quiet_hours: { enabled: true, time: '22:00', time_end: '06:00' },
}
const FIXED_ROWS = ['anytime', 'followups', 'close_day', 'weekly_review', 'email_summary'] as const

const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark' || v === 'system'

/** Settings (design/settings.png): notifications, appearance, data & backups, integrations. */
export default function SettingsPage() {
  const { user } = useAuth()
  const { today } = useUserToday()
  const navigate = useNavigate()
  const profile = useProfile(user?.id)
  const prefs = useNotificationPrefs()
  const routine = useRoutineItems()
  const backups = useBackups()
  const setPref = useSetNotificationPref()
  const updateSettings = useUpdateProfileSettings()
  const restore = useRestoreBackup()
  const deleteAccount = useDeleteAccount()
  const contactsImport = useContactsCsvImport()
  const [importChoiceOpen, setImportChoiceOpen] = useState(false)
  const [metricImportOpen, setMetricImportOpen] = useState(false)

  // A routine reminder is created the first time the page sees the item: its own time, or 09:00 for "anytime" items.
  const created = useRef(new Set<string>())
  useEffect(() => {
    if (!prefs.data || !routine.data) return
    const have = new Set(prefs.data.map((p) => p.key))
    for (const item of routine.data) {
      const key = `routine:${item.id}` as const
      if (have.has(key) || created.current.has(key)) continue
      created.current.add(key)
      setPref.mutate({ key, enabled: true, time: item.time ? item.time.slice(0, 5) : '09:00' })
    }
  }, [prefs.data, routine.data, setPref])

  const prefByKey = useMemo(() => new Map((prefs.data ?? []).map((p) => [p.key, p])), [prefs.data])
  const pref = (key: NotificationKey): Pick<NotificationPref, 'enabled' | 'time' | 'time_end'> => {
    const saved = prefByKey.get(key)
    if (saved) return saved
    const fallback = DEFAULT_PREFS[key] ?? { enabled: true, time: '09:00' }
    return { enabled: fallback.enabled, time: fallback.time, time_end: fallback.time_end ?? null }
  }

  const rows: NotificationRowData[] = [
    ...(routine.data ?? []).map((item) => {
      const key = `routine:${item.id}` as const
      const p = pref(key)
      return { key, title: item.title, daysLabel: formatDays(item.days), enabled: p.enabled, time: p.time ?? (item.time?.slice(0, 5) ?? '09:00') }
    }),
    ...FIXED_ROWS.map((key) => ({ key, enabled: pref(key).enabled, time: pref(key).time })),
  ]
  const quiet = pref('quiet_hours')

  const p = profile.data
  const theme: Theme = isTheme(p?.theme) ? p.theme : 'light'
  const weekStart: WeekStart = p?.week_start === 0 ? 0 : 1
  const dayEndHour: DayEndHour = p?.day_end_hour === 2 || p?.day_end_hour === 4 ? p.day_end_hour : 0

  async function runExport(work: () => Promise<number>, noun: string) {
    const id = toast.loading('Preparing your file…')
    try {
      const count = await work()
      toast.success(`Exported ${count} ${noun}`, { id })
    } catch {
      toast.error("Couldn't export. Check your connection and try again.", { id })
    }
  }

  const loading = profile.isPending || prefs.isPending || routine.isPending
  const failed = profile.isError || prefs.isError || routine.isError

  return (
    <>
      <SettingsHeader />
      <SettingsTabs />
      {failed ? (
        <LoadError
          title="Couldn't load your settings"
          onRetry={() => {
            void profile.refetch()
            void prefs.refetch()
            void routine.refetch()
          }}
        />
      ) : loading ? (
        <Loading label="Loading your settings…" />
      ) : (
        <div className="flex flex-col gap-5">
          <NotificationsSettings
            master={pref('master').enabled}
            rows={rows}
            quietHours={{ enabled: quiet.enabled, start: quiet.time, end: quiet.time_end ?? null }}
            onChange={(change) => setPref.mutate(change)}
          />
          <AppearanceSettings
            theme={theme}
            weekStart={weekStart}
            dayEndHour={dayEndHour}
            language="en"
            onChange={(change) => {
              if (change.theme) setTheme(change.theme)
              updateSettings.mutate(change)
            }}
          />
          <DataSettings
            backupEnabled={p?.backup_enabled ?? false}
            backups={(backups.data ?? []).map((b) => ({
              path: b.path,
              label: b.beforeRestore ? `${b.label} (before restore)` : b.label,
              size: `${b.sizeMB.toFixed(1)} MB`,
            }))}
            onExportCsv={(kind: CsvExportKind) =>
              void runExport(() => exportCsv(kind, today), kind === 'tasks' ? 'tasks' : kind === 'contacts' ? 'contacts' : 'values')
            }
            onExportJson={() => void runExport(() => exportEverything(today), 'rows')}
            onImportCsv={() => setImportChoiceOpen(true)}
            onToggleBackup={(enabled) => updateSettings.mutate({ backup_enabled: enabled })}
            onRestore={async (path) => {
              try {
                await restore.mutateAsync(path)
              } catch (error) {
                throw new Error("Couldn't restore the backup. Your data was not changed.", { cause: error })
              }
              toast.success('Backup restored')
            }}
            onDeleteAccount={async () => {
              try {
                await deleteAccount.mutateAsync()
              } catch (error) {
                throw new Error("Couldn't delete the account. Try again.", { cause: error })
              }
              navigate('/login', { replace: true })
              toast('Your account was deleted')
            }}
          />
          <IntegrationsSettings />
        </div>
      )}

      <ImportChoiceDialog
        open={importChoiceOpen}
        onOpenChange={setImportChoiceOpen}
        onPick={(kind) => {
          setImportChoiceOpen(false)
          if (kind === 'contacts') contactsImport.open()
          else setMetricImportOpen(true)
        }}
      />
      <CsvImportDialog {...contactsImport.dialog} />
      <MetricValuesImportDialog open={metricImportOpen} onOpenChange={setMetricImportOpen} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Import CSV: pick what to import
// ---------------------------------------------------------------------------

function ImportChoiceDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (kind: 'contacts' | 'metric_values') => void
}) {
  const choices = [
    { kind: 'contacts', icon: Users, title: 'Contacts', text: 'Leads for Outreach, e.g. a list exported from a spreadsheet.' },
    { kind: 'metric_values', icon: FileSpreadsheet, title: 'Metric values', text: 'Columns: metric, month (YYYY-MM or a date), value, note.' },
  ] as const
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Import CSV</DialogTitle>
          <DialogDescription>What does the file contain?</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {choices.map(({ kind, icon: Icon, title, text }) => (
            <button
              key={kind}
              type="button"
              onClick={() => onPick(kind)}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left outline-none hover:border-brand/50 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
              <span>
                <span className="block text-sm font-semibold text-foreground">{title}</span>
                <span className="block text-[13px] text-ink-2">{text}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Import metric values
// ---------------------------------------------------------------------------

const PREVIEW_ROWS = 50

function MetricValuesImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Import metric values</DialogTitle>
          <DialogDescription>
            One row per value: metric (its name), month (YYYY-MM or YYYY-MM-DD), value, and an optional note. Values are added as new
            entries.
          </DialogDescription>
        </DialogHeader>
        {open && <MetricValuesImport onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function MetricValuesImport({ onDone }: { onDone: () => void }) {
  const id = useId()
  const queryClient = useQueryClient()
  const metrics = useMetrics()
  const [parsed, setParsed] = useState<{ rows: MetricValueRow[]; errors: CsvLineError[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const names = new Map((metrics.data ?? []).map((m) => [m.id, m.name]))

  async function pick(file: File | undefined) {
    setError(null)
    if (!file) return
    try {
      setParsed(parseMetricValuesCsv(await file.text(), metrics.data ?? []))
    } catch {
      setParsed({ rows: [], errors: [{ line: 1, messages: ['Couldn’t read that file. Is it a CSV?'] }] })
    }
  }

  async function save() {
    if (!parsed?.rows.length) return
    setSaving(true)
    setError(null)
    try {
      await insertMetricValues(parsed.rows, queryClient)
      toast.success(`Imported ${parsed.rows.length} ${parsed.rows.length === 1 ? 'value' : 'values'}`)
      onDone()
    } catch {
      setError("Couldn't import the values. Nothing was saved; try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-file`} className="text-sm font-medium text-foreground">
          CSV file
        </label>
        <input
          id={`${id}-file`}
          type="file"
          accept=".csv,text/csv"
          disabled={!metrics.data}
          onChange={(e) => void pick(e.target.files?.[0])}
          className="text-sm file:mr-3 file:h-9 file:rounded-lg file:border file:border-border file:bg-card file:px-3 file:text-sm file:font-medium"
        />
      </div>

      {parsed && (
        <>
          <p className="text-sm text-foreground" aria-live="polite">
            {parsed.rows.length} {parsed.rows.length === 1 ? 'value' : 'values'} ready
            {parsed.errors.length > 0 && ` · ${parsed.errors.length} ${parsed.errors.length === 1 ? 'row' : 'rows'} with problems (skipped)`}
          </p>
          {parsed.rows.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-lg border border-border">
              <table className="w-full text-left text-[13px]">
                <caption className="sr-only">Values to import</caption>
                <thead className="bg-background text-xs text-ink-2">
                  <tr>
                    <th className="px-3 py-2 font-medium">Metric</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 text-right font-medium">Value</th>
                    <th className="px-3 py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsed.rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5">{names.get(r.metric_id)}</td>
                      <td className="px-3 py-1.5 tabular-nums">{r.entry_date}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{r.value}</td>
                      <td className="max-w-40 truncate px-3 py-1.5 text-ink-2">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {parsed.errors.length > 0 && (
            <ul className="max-h-32 overflow-auto rounded-lg bg-warn-tint p-3 text-[13px] text-warn">
              {parsed.errors.map((e) => (
                <li key={e.line}>
                  Line {e.line}: {e.messages.join('; ')}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" disabled={!parsed?.rows.length || saving} onClick={() => void save()}>
          {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
          Import {parsed?.rows.length ? parsed.rows.length : ''} {parsed?.rows.length === 1 ? 'value' : 'values'}
        </Button>
      </div>
    </div>
  )
}
