import { Loader2 } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { Source } from '@/schemas/outreach'
import { SourceChip } from './SourceChip'

export type CsvPreviewRow = {
  /** Line number in the file (header is line 1). */
  line: number
  name: string
  source: Source
  /** Short extra info, e.g. "Designer · Pixel Lab". */
  detail?: string | null
}

export type CsvRowError = { line: number; message: string }

export type CsvPreview = {
  rows: readonly CsvPreviewRow[]
  errors: readonly CsvRowError[]
}

type CsvImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called when a file is chosen; the page parses it and passes `preview` back. */
  onFileSelect: (file: File) => void
  /** Parsed result of the chosen file, or null before a file is chosen. */
  preview: CsvPreview | null
  /** True while the file is being read. */
  parsing?: boolean
  /** Imports the good rows. Throw an Error to show its message. */
  onImport: () => Promise<void> | void
}

const MAX_PREVIEW_ROWS = 50

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Import CSV: pick a file, check the preview and the rows with problems, then import. */
export function CsvImportDialog({ open, onOpenChange, onFileSelect, preview, parsing, onImport }: CsvImportDialogProps) {
  const id = useId()
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rows = preview?.rows ?? []
  const errors = preview?.errors ?? []

  async function handleImport() {
    setError(null)
    setImporting(true)
    try {
      await onImport()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed. Try again.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Import leads from CSV</DialogTitle>
          <DialogDescription>
            The first row must hold column names. Each lead needs a name and a source (linkedin, maps, inperson, upwork or
            other).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-file`}>CSV file</Label>
          <input
            id={`${id}-file`}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              setError(null)
              if (file) onFileSelect(file)
            }}
            className="block w-full rounded-lg border border-input bg-card text-sm text-ink-2 file:mr-3 file:h-10 file:border-0 file:border-r file:border-border file:bg-background file:px-3 file:text-sm file:font-medium file:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </div>

        <div aria-live="polite" className="flex flex-col gap-3">
          {parsing && (
            <p className="flex items-center gap-2 text-sm text-ink-2">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Reading the file…
            </p>
          )}

          {preview && !parsing && (
            <p className="text-sm text-foreground">
              <span className="font-semibold">{plural(rows.length, 'lead', 'leads')} ready</span>
              {errors.length > 0 && (
                <span className="text-bad"> · {plural(errors.length, 'row', 'rows')} with problems (skipped)</span>
              )}
            </p>
          )}
        </div>

        {preview && !parsing && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <caption className="sr-only">Leads to import</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold tracking-wider text-ink-2 uppercase">
                  <th scope="col" className="px-3 py-2">
                    Line
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Found on
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, MAX_PREVIEW_ROWS).map((row) => (
                  <tr key={row.line}>
                    <td className="px-3 py-2 text-ink-2 tabular-nums">{row.line}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{row.name}</td>
                    <td className="px-3 py-2">
                      <SourceChip source={row.source} />
                    </td>
                    <td className="px-3 py-2 text-ink-2">{row.detail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > MAX_PREVIEW_ROWS && (
              <p className="border-t border-border px-3 py-2 text-xs text-ink-2">
                Showing the first {MAX_PREVIEW_ROWS} of {rows.length}.
              </p>
            )}
          </div>
        )}

        {preview && !parsing && errors.length > 0 && (
          <section aria-labelledby={`${id}-errors`} className="rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
            <h3 id={`${id}-errors`} className="mb-1 font-semibold">
              Rows that won’t be imported
            </h3>
            <ul className="flex flex-col gap-0.5">
              {errors.map((e) => (
                <li key={`${e.line}-${e.message}`}>
                  Line {e.line}: {e.message}
                </li>
              ))}
            </ul>
          </section>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleImport} disabled={rows.length === 0 || parsing || importing}>
            {importing && <Loader2 aria-hidden="true" className="animate-spin" />}
            {rows.length > 0 ? `Import ${plural(rows.length, 'lead', 'leads')}` : 'Import'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
