import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockCsvPreview } from '@/mocks/outreach'
import { CsvImportDialog, type CsvPreview } from './CsvImportDialog'

function setup(preview: CsvPreview | null, onImport: () => Promise<void> | void = vi.fn<() => void>()) {
  const onFileSelect = vi.fn<(file: File) => void>()
  render(
    <CsvImportDialog open onOpenChange={() => {}} preview={preview} onFileSelect={onFileSelect} onImport={onImport} />,
  )
  return { onFileSelect, user: userEvent.setup() }
}

describe('CsvImportDialog', () => {
  it('passes the chosen file up and waits for a preview', async () => {
    const { user, onFileSelect } = setup(null)
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
    const file = new File(['name,source\nLejla,linkedin'], 'leads.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('CSV file'), file)
    expect(onFileSelect).toHaveBeenCalledWith(file)
  })

  it('shows good rows, skipped rows and imports', async () => {
    const onImport = vi.fn<() => void>()
    const { user } = setup(mockCsvPreview, onImport)
    expect(screen.getByText('4 leads ready')).toBeInTheDocument()
    expect(screen.getByText(/2 rows with problems/)).toBeInTheDocument()

    const table = screen.getByRole('table', { name: 'Leads to import' })
    expect(within(table).getAllByRole('row')).toHaveLength(5)
    expect(within(table).getByText('Café Rondo')).toBeInTheDocument()
    expect(screen.getByText('Line 5: Missing name')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Import 4 leads' }))
    expect(onImport).toHaveBeenCalledOnce()
  })

  it('shows an import error', async () => {
    const { user } = setup(mockCsvPreview, () => Promise.reject(new Error('Server is busy')))
    await user.click(screen.getByRole('button', { name: 'Import 4 leads' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Server is busy')
  })
})
