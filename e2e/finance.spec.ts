import { expect, test, type Locator, type Page } from '@playwright/test'
import { mockSupabase, TEST_USER, type MockDb } from './support/mockSupabase.ts'

// Monday 2 Nov 2026, 10:00 in Sarajevo.
const NOW = new Date('2026-11-02T09:00:00Z')
const CREATED = '2026-10-01T08:00:00+00:00'
const SALARY_ID = '6f1c2b0a-1d2e-4f3a-8b4c-5d6e7f809101'
const RENT_ID = '6f1c2b0a-1d2e-4f3a-8b4c-5d6e7f809102'

function seed(): MockDb {
  const base = { user_id: TEST_USER.id, created_at: CREATED }
  return {
    profiles: [
      {
        ...base,
        id: TEST_USER.id,
        display_name: 'Test User',
        timezone: 'Europe/Sarajevo',
        week_start: 1,
        day_end_hour: 0,
        theme: 'light',
        language: 'en',
        backup_enabled: false,
        weekly_targets: { outreaches: 20, task_completion: 80, meetings: 2 },
      },
    ],
    routine_items: [],
    routine_checks: [],
    tasks: [],
    finance_entries: [
      { ...base, id: SALARY_ID, date: '2026-10-01', kind: 'income', name: 'October salary', amount: 2000, currency: 'eur', amount_eur: 2000, category: 'Salary', note: null },
      { ...base, id: RENT_ID, date: '2026-10-03', kind: 'expense', name: 'Rent', amount: 500, currency: 'eur', amount_eur: 500, category: 'Rent', note: 'Flat in Grbavica' },
    ],
    finance_settings: [],
  }
}

async function open(page: Page): Promise<MockDb> {
  await page.clock.setFixedTime(NOW)
  const db = await mockSupabase(page, seed(), { now: NOW })
  await page.goto('/finance')
  await expect(page.getByRole('heading', { name: 'Finance', level: 1 })).toBeVisible()
  return db
}

const addDialog = (page: Page) => page.getByRole('dialog', { name: 'Add log' })
const tile = (page: Page, label: string) => page.getByRole('group', { name: label, exact: true })
const logs = (page: Page, month: string) => page.getByRole('table', { name: `Logs for ${month}` })

/** Opens the dropdown labelled `label` and picks the option named `option`. */
async function choose(page: Page, scope: Locator, label: string, option: string) {
  await scope.getByLabel(label, { exact: true }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
  await expect(page.getByRole('listbox')).toHaveCount(0)
}

/** Opens the date picker labelled `label`, steps to the month of `key` and clicks that day. */
async function pickDate(page: Page, scope: Locator, label: string, key: string) {
  await scope.getByLabel(label, { exact: true }).click()
  const calendar = page.locator('[data-slot="popover-content"]')
  // The 15th cell of the 6-week grid is always inside the month on screen.
  const shownMonth = async () => ((await calendar.locator('[data-day]').nth(14).getAttribute('data-day')) ?? '').slice(0, 7)
  for (let shown = await shownMonth(), i = 0; shown !== key.slice(0, 7) && i < 36; shown = await shownMonth(), i++) {
    await calendar.getByRole('button', { name: shown < key.slice(0, 7) ? 'Next month' : 'Previous month' }).click()
  }
  await calendar.locator(`[data-day="${key}"]`).click()
  await expect(calendar).toHaveCount(0)
}

test.describe('Finance', () => {
  test.skip(({ isMobile }) => isMobile, 'Interaction flows run on desktop')

  test('opens on Logs, adds logs spent and earned (in € and KM) and totals the month', async ({ page }) => {
    const db = await open(page)
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Finance' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('tab', { name: 'Logs' })).toHaveAttribute('aria-selected', 'true')
    await expect(logs(page, 'November 2026')).toBeVisible()
    await expect(page.getByText(/Nothing logged this month/)).toBeVisible()

    // Spent €12.50 on groceries (Spent is the default), with Enter; no category → Other.
    await page.getByRole('button', { name: 'Add log' }).click()
    await addDialog(page).getByLabel('Name').fill('Groceries')
    await addDialog(page).getByLabel('Description (optional)').fill('Weekly shop')
    await addDialog(page).getByLabel('Amount').fill('12,50')
    await addDialog(page).getByLabel('Amount').press('Enter')
    await expect(page.getByText('Spent €12.50 added')).toBeVisible()
    await expect(addDialog(page)).toBeHidden()
    await expect.poll(() => db.finance_entries?.find((e) => e.name === 'Groceries')).toMatchObject({
      kind: 'expense',
      amount: 12.5,
      currency: 'eur',
      category: 'Other',
      note: 'Weekly shop',
      date: '2026-11-02',
    })

    // Earned 195.58 KM = €100.
    await page.getByRole('button', { name: 'Add log' }).click()
    await addDialog(page).getByRole('button', { name: 'Earned' }).click()
    await addDialog(page).getByLabel('Name').fill('Logo for Bloom')
    await choose(page, addDialog(page), 'Currency', 'KM')
    await addDialog(page).getByLabel('Amount').fill('195.58')
    await addDialog(page).getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText('Earned €100 added')).toBeVisible()

    const list = logs(page, 'November 2026')
    await expect(list.getByRole('row')).toHaveCount(3)
    await expect(list.getByRole('row').filter({ hasText: 'Groceries' })).toContainText('Weekly shop')
    await expect(list.getByRole('row').filter({ hasText: 'Logo for Bloom' })).toContainText('195.58 KM')
    await expect(page.getByText('+€87.50', { exact: true })).toBeVisible()

    // Monthly: the four totals. Without starting savings, Saved counts everything logged: 2000 − 500 + 87.50.
    await page.getByRole('tab', { name: 'Monthly' }).click()
    await expect(page).toHaveURL(/tab=monthly/)
    await expect(tile(page, 'Earned')).toContainText('€100')
    await expect(tile(page, 'Spent')).toContainText('€12.50')
    await expect(tile(page, 'Profit')).toContainText('+€87.50')
    await expect(tile(page, 'Saved')).toContainText('€1,587.50')
  })

  test('savings, the year chart, other months, edit and delete with Undo', async ({ page }) => {
    const db = await open(page)

    // Savings: I had €3,000 on 1 Oct; everything from that day on counts on top.
    await page.getByRole('tab', { name: 'Savings' }).click()
    const savings = page.getByRole('form', { name: 'Starting savings' })
    await savings.getByLabel('Amount').fill('3000')
    await pickDate(page, savings, 'Saved on', '2026-10-01')
    await savings.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Starting savings saved')).toBeVisible()
    await expect.poll(() => db.finance_settings?.[0]).toMatchObject({ starting_savings: 3000, starting_date: '2026-10-01' })
    await expect(tile(page, 'Saved today')).toContainText('€4,500')

    // Yearly: click October → that month's Monthly tab.
    await page.getByRole('tab', { name: 'Yearly' }).click()
    await page.getByRole('button', { name: 'October 2026: earned €2,000, spent €500' }).click()
    await expect(page).toHaveURL(/month=2026-10/)
    await expect(page.getByRole('tab', { name: 'Monthly' })).toHaveAttribute('aria-selected', 'true')
    await expect(tile(page, 'Profit')).toContainText('+€1,500')

    // Logs for October: edit the rent 500 → 550.
    await page.getByRole('tab', { name: 'Logs' }).click()
    await expect(logs(page, 'October 2026').getByRole('row').filter({ hasText: 'Rent' })).toContainText('Flat in Grbavica')
    await page.getByRole('button', { name: 'Edit Rent on 3 Oct 2026' }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit log' })
    await dialog.getByLabel('Amount').fill('550')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('+€1,450', { exact: true })).toBeVisible()
    await expect.poll(() => db.finance_entries?.find((e) => e.id === RENT_ID)?.amount).toBe(550)

    // Delete it, then Undo.
    await page.getByRole('button', { name: 'Delete Rent on 3 Oct 2026' }).click()
    await expect(page.getByText('+€2,000', { exact: true })).toBeVisible()
    await expect.poll(() => db.finance_entries?.some((e) => e.id === RENT_ID)).toBe(false)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('+€1,450', { exact: true })).toBeVisible()
    await expect.poll(() => db.finance_entries?.some((e) => e.id === RENT_ID)).toBe(true)

    // Back to this month.
    await page.getByRole('button', { name: 'This month' }).click()
    await expect(logs(page, 'November 2026')).toBeVisible()
  })
})

test('Finance fits a phone screen', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Phone only')
  await open(page)
  await page.goto('/finance?month=2026-10')
  await expect(page.getByRole('button', { name: 'Edit Rent on 3 Oct 2026' })).toBeVisible()
  const overflow = await page.locator('html').evaluate((html) => html.scrollWidth - html.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
