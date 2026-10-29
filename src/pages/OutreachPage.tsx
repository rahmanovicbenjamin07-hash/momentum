import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useContacts, useCreateContact, useImportContacts, useSetStage } from '@/api/contacts'
import { useCreateTemplate, useTemplates, useUpdateTemplate } from '@/api/templates'
import { useUserToday } from '@/app/useUserToday'
import { EmptyState } from '@/components/EmptyState'
import { AddLeadForm } from '@/components/outreach/AddLeadForm'
import { ContactsTable } from '@/components/outreach/ContactsTable'
import { CsvImportDialog, type CsvPreview } from '@/components/outreach/CsvImportDialog'
import { STAGE_META, type SourceFilterValue, type StageFilterValue } from '@/components/outreach/meta'
import { OutreachHeader, type OutreachView } from '@/components/outreach/OutreachHeader'
import { OutreachToolbar } from '@/components/outreach/OutreachToolbar'
import { PipelineBoard } from '@/components/outreach/PipelineBoard'
import { SourceFilter } from '@/components/outreach/SourceFilter'
import { StageCounts } from '@/components/outreach/StageCounts'
import { TemplatesDialog } from '@/components/outreach/TemplatesDialog'
import { Button } from '@/components/ui/button'
import { CSV_BOM, contactsToCsv, parseContactsCsv, type ContactImport } from '@/lib/csv'
import { findDuplicate, leadToContact, type LeadKeys } from '@/lib/outreach'
import { countsBySource, countsByStage, filterContacts, isFollowUpDue } from '@/lib/outreachList'
import { SOURCES, STAGES, type AddLeadFormInput, type Contact, type Source, type Stage } from '@/schemas/outreach'

const PAGE_SIZE = 25

const isSource = (v: string | null): v is Source => SOURCES.includes(v as Source)
const isStage = (v: string | null): v is Stage => STAGES.includes(v as Stage)

/** Short grey text for a CSV preview row, e.g. "Designer · Pixel Lab". */
function importDetail(c: ContactImport): string {
  return [c.role ?? c.category ?? c.upwork_job_title, c.company, c.city, c.email].filter(Boolean).join(' · ')
}

function downloadCsv(contacts: readonly Contact[], today: string) {
  const blob = new Blob([CSV_BOM + contactsToCsv(contacts)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `momentum-leads-${today}.csv`
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export default function OutreachPage() {
  const { today } = useUserToday()
  const [params, setParams] = useSearchParams()

  // Filters live in the URL, so Back and reload keep them (e.g. /outreach?view=board&source=maps).
  const view: OutreachView = params.get('view') === 'board' ? 'board' : 'table'
  const sourceParam = params.get('source')
  const stageParam = params.get('stage')
  const source: SourceFilterValue = isSource(sourceParam) ? sourceParam : 'all'
  const stage: StageFilterValue = isStage(stageParam) ? stageParam : 'all'
  const search = params.get('q') ?? ''
  const dueOnly = params.get('due') === '1'
  const page = Math.max(1, Number(params.get('page')) || 1)

  /** Changes URL params; any filter change goes back to page 1. */
  function setParam(changes: Record<string, string | null>) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === '') next.delete(key)
          else next.set(key, value)
        }
        if (!('page' in changes)) next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const contacts = useContacts()
  const templates = useTemplates()
  const createContact = useCreateContact()
  const importContacts = useImportContacts()
  const setStage = useSetStage()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Partial<AddLeadFormInput>>({})
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [csvRows, setCsvRows] = useState<ContactImport[]>([])
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null)
  const [parsing, setParsing] = useState(false)

  const all = useMemo(() => contacts.data ?? [], [contacts.data])
  // Source chips count every lead; stage counts follow the chosen source (like the design).
  const sourceCounts = useMemo(() => countsBySource(all), [all])
  const bySource = useMemo(() => filterContacts(all, { source }, today), [all, source, today])
  const stageCounts = useMemo(() => countsByStage(bySource), [bySource])
  const filtered = useMemo(
    () => filterContacts(all, { source, stage: view === 'board' ? 'all' : stage, search, dueOnly }, today),
    [all, source, stage, search, dueOnly, today, view],
  )

  const followUpsDue = all.filter((c) => isFollowUpDue(c, today)).length
  const openPipeline = all
    .filter((c) => c.stage !== 'won' && c.stage !== 'lost')
    .reduce((sum, c) => sum + (c.deal_value ?? 0), 0)

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const anyFilter = source !== 'all' || stage !== 'all' || search !== '' || dueOnly

  const duplicate = adding ? findDuplicate(draft as LeadKeys, all) : null

  async function handleFile(file: File) {
    setParsing(true)
    try {
      const parsed = parseContactsCsv(await file.text())
      setCsvRows(parsed.rows.map((r) => r.contact))
      setCsvPreview({
        rows: parsed.rows.map(({ line, contact }) => ({
          line,
          name: contact.name,
          source: contact.source,
          detail: importDetail(contact) || null,
        })),
        errors: parsed.errors.map(({ line, messages }) => ({ line, message: messages.join('; ') })),
      })
    } catch {
      setCsvRows([])
      setCsvPreview({ rows: [], errors: [{ line: 1, message: 'Couldn’t read that file. Is it a CSV?' }] })
    } finally {
      setParsing(false)
    }
  }

  function closeCsv() {
    setCsvOpen(false)
    setCsvPreview(null)
    setCsvRows([])
  }

  const header = (
    <OutreachHeader
      leadCount={all.length}
      followUpsDue={followUpsDue}
      openPipeline={openPipeline}
      view={view}
      onViewChange={(v) => setParam({ view: v === 'board' ? 'board' : null })}
      onTemplates={() => setTemplatesOpen(true)}
      onImportCsv={() => setCsvOpen(true)}
      onExportCsv={() => {
        if (all.length === 0) {
          toast('No leads to export yet.')
          return
        }
        downloadCsv(all, today)
        toast.success(`Exported ${all.length} ${all.length === 1 ? 'lead' : 'leads'}`)
      }}
      onAddLead={() => setAdding(true)}
    />
  )

  const dialogs = (
    <>
      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        templates={templates.data ?? []}
        onSave={async (values, id) => {
          try {
            if (id) await updateTemplate.mutateAsync({ id, values })
            else await createTemplate.mutateAsync(values)
            toast.success('Template saved')
          } catch {
            throw new Error("Couldn't save the template. Try again.")
          }
        }}
      />
      <CsvImportDialog
        open={csvOpen}
        onOpenChange={(next) => (next ? setCsvOpen(true) : closeCsv())}
        preview={csvPreview}
        parsing={parsing}
        onFileSelect={(file) => void handleFile(file)}
        onImport={async () => {
          if (csvRows.length === 0) throw new Error('There are no good rows to import.')
          try {
            const count = await importContacts.mutateAsync(csvRows)
            toast.success(`Imported ${count} ${count === 1 ? 'lead' : 'leads'}`)
            closeCsv()
          } catch {
            throw new Error("Couldn't import the leads. Nothing was lost; try again.")
          }
        }}
      />
    </>
  )

  if (contacts.isError) {
    return (
      <>
        {header}
        <EmptyState title="Couldn't load your leads" description="Check your connection and try again.">
          <Button onClick={() => void contacts.refetch()}>Try again</Button>
        </EmptyState>
        {dialogs}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {header}

      {adding && (
        <AddLeadForm
          onDraftChange={setDraft}
          duplicateWarning={
            duplicate && (
              <>
                <strong>{duplicate.contact.name}</strong> already has this{' '}
                {duplicate.field === 'email' ? 'email' : 'link'}. You can still save it.
              </>
            )
          }
          onCancel={() => {
            setAdding(false)
            setDraft({})
          }}
          onSubmit={async (values) => {
            try {
              const contact = await createContact.mutateAsync(leadToContact(values, today))
              toast.success(`${contact.name} added · ${STAGE_META[contact.stage].label}`)
              setAdding(false)
              setDraft({})
            } catch {
              throw new Error("Couldn't save the lead. Your text is still here, so try again.")
            }
          }}
        />
      )}

      <SourceFilter counts={sourceCounts} value={source} onChange={(v) => setParam({ source: v === 'all' ? null : v })} />
      {view === 'table' && (
        <StageCounts counts={stageCounts} value={stage} onChange={(v) => setParam({ stage: v === 'all' ? null : v })} />
      )}
      <OutreachToolbar
        search={search}
        onSearchChange={(v) => setParam({ q: v })}
        followUpDue={dueOnly}
        onFollowUpDueChange={(v) => setParam({ due: v ? '1' : null })}
      />

      {contacts.isPending ? (
        <div role="status" className="flex items-center gap-2 py-12 text-sm text-ink-3">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading your leads…
        </div>
      ) : view === 'board' ? (
        <PipelineBoard
          contacts={filtered}
          today={today}
          onMove={(id, to) => {
            const lead = all.find((c) => c.id === id)
            setStage.mutate(
              { id, stage: to, today },
              { onSuccess: () => toast.success(`${lead?.name ?? 'Lead'} → ${STAGE_META[to].label}`) },
            )
          }}
        />
      ) : (
        <ContactsTable
          contacts={pageRows}
          today={today}
          filtered={anyFilter}
          onClearFilters={() => setParams({}, { replace: true })}
          onAddLead={() => setAdding(true)}
          footer={
            filtered.length > PAGE_SIZE ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2">
                <span aria-live="polite">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{(currentPage - 1) * PAGE_SIZE + pageRows.length} of{' '}
                  {filtered.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="bg-card"
                    disabled={currentPage === 1}
                    onClick={() => setParam({ page: String(currentPage - 1) })}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-card"
                    disabled={currentPage === pageCount}
                    onClick={() => setParam({ page: String(currentPage + 1) })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-2">
                Showing {filtered.length} of {all.length}
              </p>
            )
          }
        />
      )}

      {dialogs}
    </div>
  )
}
