import { useState } from 'react'
import { toast } from 'sonner'
import { useImportContacts } from '@/api/contacts'
import type { CsvPreview } from '@/components/outreach/CsvImportDialog'
import { parseContactsCsv, type ContactImport } from '@/lib/csv'

/** Short grey text for a CSV preview row, e.g. "Designer · Pixel Lab". */
function importDetail(c: ContactImport): string {
  return [c.role ?? c.category ?? c.upwork_job_title, c.company, c.city, c.email].filter(Boolean).join(' · ')
}

/**
 * Everything the contacts CsvImportDialog needs (Outreach and Settings):
 * spread `dialog` onto <CsvImportDialog /> and call `open()`.
 */
export function useContactsCsvImport() {
  const importContacts = useImportContacts()
  const [isOpen, setOpen] = useState(false)
  const [rows, setRows] = useState<ContactImport[]>([])
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [parsing, setParsing] = useState(false)

  function close() {
    setOpen(false)
    setPreview(null)
    setRows([])
  }

  async function onFileSelect(file: File) {
    setParsing(true)
    try {
      const parsed = parseContactsCsv(await file.text())
      setRows(parsed.rows.map((r) => r.contact))
      setPreview({
        rows: parsed.rows.map(({ line, contact }) => ({
          line,
          name: contact.name,
          source: contact.source,
          detail: importDetail(contact) || null,
        })),
        errors: parsed.errors.map(({ line, messages }) => ({ line, message: messages.join('; ') })),
      })
    } catch {
      setRows([])
      setPreview({ rows: [], errors: [{ line: 1, message: 'Couldn’t read that file. Is it a CSV?' }] })
    } finally {
      setParsing(false)
    }
  }

  async function onImport() {
    if (rows.length === 0) throw new Error('There are no good rows to import.')
    try {
      const count = await importContacts.mutateAsync(rows)
      toast.success(`Imported ${count} ${count === 1 ? 'lead' : 'leads'}`)
      close()
    } catch (error) {
      throw new Error("Couldn't import the leads. Nothing was lost; try again.", { cause: error })
    }
  }

  return {
    open: () => setOpen(true),
    dialog: {
      open: isOpen,
      onOpenChange: (next: boolean) => (next ? setOpen(true) : close()),
      preview,
      parsing,
      onFileSelect: (file: File) => void onFileSelect(file),
      onImport,
    },
  }
}
