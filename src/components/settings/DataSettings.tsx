import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DeleteAccountDialog } from './DeleteAccountDialog'
import { sectionClass, settingsSectionId } from './meta'
import { RestoreDialog } from './RestoreDialog'
import { ToggleSwitch } from './ToggleSwitch'

export type ExportTable = 'tasks' | 'contacts' | 'metric_values'

export type Backup = {
  /** Storage path, passed back to onRestore. */
  path: string
  /** e.g. "Today, 03:00". */
  label: string
  /** e.g. "2.1 MB". */
  size: string
}

type DataSettingsProps = {
  backupEnabled: boolean
  /** Newest first. */
  backups: Backup[]
  onExportCsv: (table: ExportTable) => void
  onExportJson: () => void
  onImportCsv: () => void
  onToggleBackup: (enabled: boolean) => void
  /** Throw an Error to show its message in the dialog. */
  onRestore: (path: string) => Promise<void> | void
  /** Throw an Error to show its message in the dialog. */
  onDeleteAccount: () => Promise<void> | void
}

const EXPORT_TABLES: { value: ExportTable; label: string }[] = [
  { value: 'tasks', label: 'Tasks' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'metric_values', label: 'Metric values' },
]

/** "Data & backups" card: exports, import, daily backups with Restore, and Delete account. */
export function DataSettings({
  backupEnabled,
  backups,
  onExportCsv,
  onExportJson,
  onImportCsv,
  onToggleBackup,
  onRestore,
  onDeleteAccount,
}: DataSettingsProps) {
  const id = useId()
  const [restoring, setRestoring] = useState<Backup | null>(null)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <section
      id={settingsSectionId('data')}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className={cn(sectionClass, 'p-5')}
    >
      <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">
        Data &amp; backups
      </h2>
      <p className="text-[13px] text-ink-2">Your data is yours — take it with you any time</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="lg" className="bg-card">
              Export CSV
              <ChevronDown aria-hidden="true" className="text-ink-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {EXPORT_TABLES.map((table) => (
              <DropdownMenuItem key={table.value} onSelect={() => onExportCsv(table.value)}>
                {table.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="lg" className="bg-card" onClick={onExportJson}>
          Export everything (JSON)
        </Button>
        <Button variant="outline" size="lg" className="bg-card" onClick={onImportCsv}>
          Import CSV
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3">
        <div className="min-w-0">
          <p id={`${id}-backup`} className="text-sm font-semibold text-foreground">
            Automatic daily backup
          </p>
          <p id={`${id}-backup-sub`} className="text-xs text-ink-2">
            Every night at 03:00 · kept for 30 days
          </p>
        </div>
        <ToggleSwitch
          checked={backupEnabled}
          onCheckedChange={onToggleBackup}
          aria-labelledby={`${id}-backup`}
          aria-describedby={`${id}-backup-sub`}
        />
      </div>

      {backups.length === 0 ? (
        <p className="mt-4 text-sm text-ink-2">No backups yet — the first one runs tonight at 03:00.</p>
      ) : (
        <ul aria-label="Backups" className="mt-4 divide-y divide-border border-t border-border">
          {backups.map((backup) => (
            <li key={backup.path} className="flex items-center gap-4 py-2.5">
              <span className="min-w-0 flex-1 text-sm text-foreground">{backup.label}</span>
              <span className="text-xs text-ink-2 tabular-nums">{backup.size}</span>
              <Button
                variant="outline"
                size="sm"
                className="bg-card"
                onClick={() => {
                  setRestoring(backup)
                  setRestoreOpen(true)
                }}
              >
                Restore<span className="sr-only"> backup from {backup.label}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-border pt-5">
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-sm font-semibold text-bad">Delete account</p>
          <p className="text-xs text-ink-2">
            Removes all tasks, contacts, metrics and goals for good. You’ll type DELETE to confirm.
          </p>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="border-bad bg-card text-bad hover:bg-bad-tint hover:text-bad"
          onClick={() => setDeleteOpen(true)}
        >
          Delete account
        </Button>
      </div>

      <RestoreDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        label={restoring?.label ?? ''}
        onConfirm={() => (restoring ? onRestore(restoring.path) : undefined)}
      />
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={onDeleteAccount} />
    </section>
  )
}
