import { expect, test, type Locator, type Page } from '@playwright/test'
import { mockSupabase, TEST_USER, type MockDb, type Row } from './support/mockSupabase.ts'

// Wednesday 28 Oct 2026, 10:00 in Sarajevo.
const NOW = new Date('2026-10-28T09:00:00Z')
const TODAY = '2026-10-28'
const YESTERDAY = '2026-10-27'
const CREATED = '2026-10-01T08:00:00+00:00'
const WEEKDAYS = [true, true, true, true, true, false, false]
const EVERY_DAY = [true, true, true, true, true, true, true]

function dates(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/** Mon = 0 … Sun = 6 */
const weekday = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7

function seed(): MockDb {
  const base = { user_id: TEST_USER.id, created_at: CREATED }
  const routine = [
    { ...base, id: 'r-wake', title: 'Wake up', days: WEEKDAYS, time: '06:00:00', position: 0, active: true },
    { ...base, id: 'r-read', title: 'Read 20 pages', days: EVERY_DAY, time: '21:30:00', position: 1, active: true },
  ]
  // 1–26 Oct: everything done. 27 Oct: wake done, reading missed (no row). Today: nothing yet.
  const checks: Row[] = []
  for (const date of dates('2026-10-01', YESTERDAY)) {
    for (const item of routine) {
      if (!item.days[weekday(date)]) continue
      if (date === YESTERDAY && item.id === 'r-read') continue
      checks.push({ ...base, id: `c-${item.id}-${date}`, routine_item_id: item.id, date, done: true, miss_reason: null })
    }
  }
  const task = (id: string, title: string, extra: Row): Row => ({
    ...base,
    id,
    title,
    notes: null,
    due_date: TODAY,
    time: null,
    tag: null,
    priority: 'medium',
    status: 'todo',
    completed_at: null,
    position: 0,
    contact_id: null,
    ...extra,
  })
  return {
    profiles: [{ ...base, id: TEST_USER.id, display_name: 'Test User', timezone: 'Europe/Sarajevo', week_start: 1, day_end_hour: 0, theme: 'light', language: 'en' }],
    routine_items: routine,
    routine_checks: checks,
    tasks: [
      task('t-emir', 'Follow up with Emir', { time: '10:30:00', tag: 'outreach', priority: 'high' }),
      task('t-portfolio', 'Update portfolio', { tag: 'work', status: 'done', completed_at: '2026-10-28T08:00:00Z' }),
      task('t-lejla', 'Send proposal to Lejla', { due_date: YESTERDAY, tag: 'outreach', priority: 'high' }),
    ],
    daily_logs: [{ ...base, id: 'log-today', date: TODAY, note: null, energy: 4 }],
  }
}

async function openToday(page: Page): Promise<MockDb> {
  await page.clock.setFixedTime(NOW)
  const db = await mockSupabase(page, seed(), { now: NOW })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible()
  return db
}

const tasksCard = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: /Today’s tasks/ }) })

test.describe('Today page', () => {
  test.skip(({ isMobile }) => isMobile, 'Interaction flow runs on desktop; layout is checked separately')

  test('shows the day, top cards, sidebar badge and streak', async ({ page }) => {
    await openToday(page)

    await expect(page.getByText('Wednesday, 28 October 2026')).toBeVisible()
    // 4 items today (wake, read, emir, portfolio), 1 done.
    await expect(page.getByRole('region', { name: 'Today’s progress' })).toContainText('25%')
    await expect(page.getByRole('region', { name: 'Today’s progress' })).toContainText('Repeating 0/2 · One-off 1/2')
    // 1–26 Oct complete (26 days), 27 Oct forgiven.
    await expect(page.getByRole('region', { name: 'Current streak' })).toContainText('26')
    await expect(page.getByRole('link', { name: 'Today, 3 open tasks' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Main' })).toContainText('26 days')
    await expect(page.getByRole('region', { name: 'Outreaches this week' })).toContainText('0')
  })

  test('ticks a routine item and a task', async ({ page }) => {
    const db = await openToday(page)

    await page.getByRole('checkbox', { name: 'Wake up' }).click()
    await expect(page.getByRole('region', { name: 'Today’s progress' })).toContainText('50%')
    await expect
      .poll(() => db.routine_checks?.find((c) => c.routine_item_id === 'r-wake' && c.date === TODAY)?.done)
      .toBe(true)

    await page.getByRole('checkbox', { name: 'Follow up with Emir' }).click()
    await expect.poll(() => db.tasks?.find((t) => t.id === 't-emir')?.status).toBe('done')
    await expect(page.getByRole('link', { name: 'Today, 1 open tasks' })).toBeVisible()
  })

  test('answers the missed-yesterday prompt', async ({ page }) => {
    const db = await openToday(page)

    await expect(page.getByText('Yesterday you missed')).toBeVisible()
    await expect(page.getByText('Your streak is safe')).toBeVisible()
    await page.getByRole('group', { name: 'Why did you miss Read 20 pages?' }).getByRole('button', { name: 'Tired' }).click()

    await expect(page.getByText('Yesterday you missed')).toBeHidden()
    await expect
      .poll(() => db.routine_checks?.find((c) => c.routine_item_id === 'r-read' && c.date === YESTERDAY)?.miss_reason)
      .toBe('Tired')
  })

  test('moves an overdue task to today', async ({ page }) => {
    const db = await openToday(page)

    await expect(page.getByText('Overdue · 1')).toBeVisible()
    await page.getByRole('button', { name: 'Move to today' }).click()

    await expect(page.getByText('Overdue · 1')).toBeHidden()
    await expect(tasksCard(page).getByText('Send proposal to Lejla')).toBeVisible()
    await expect.poll(() => db.tasks?.find((t) => t.id === 't-lejla')?.due_date).toBe(TODAY)
  })

  test('quick-add makes a task for "Just today" and a routine item otherwise', async ({ page }) => {
    const db = await openToday(page)

    const text = page.getByRole('textbox', { name: 'Task' })
    await text.fill('Call accountant #personal !low 15:00')
    await text.press('Enter')
    await expect(page.getByText('Task added')).toBeVisible()
    await expect(tasksCard(page).getByText('Call accountant')).toBeVisible()
    await expect
      .poll(() => db.tasks?.find((t) => t.title === 'Call accountant'))
      .toMatchObject({ tag: 'personal', priority: 'low', time: '15:00:00', due_date: TODAY })

    await text.fill('Stretch')
    await page.getByRole('combobox', { name: 'Repeat' }).selectOption('weekdays')
    await page.getByRole('button', { name: 'Add task' }).click()
    await expect(page.getByText('Repeating task added · Mon–Fri')).toBeVisible()
    await expect(tasksCard(page).getByText('Stretch')).toBeVisible()
    await expect.poll(() => db.routine_items?.find((r) => r.title === 'Stretch')?.days).toEqual(WEEKDAYS)
  })

  test('adds a task, ticks it, and it moves to the bottom', async ({ page }) => {
    const db = await openToday(page)
    const rows = tasksCard(page).getByRole('list', { name: 'Tasks' }).getByRole('listitem')

    const text = page.getByRole('textbox', { name: 'Task' })
    await text.fill('Buy printer ink')
    await text.press('Enter')

    // Unfinished "Anytime" task: after the timed ones, above the done one.
    await expect(rows).toHaveText([/Wake up/, /Follow up with Emir/, /Read 20 pages/, /Buy printer ink/, /Update portfolio/])

    await page.getByRole('checkbox', { name: 'Buy printer ink' }).click()

    await expect(rows.last()).toContainText('Buy printer ink')
    await expect(page.getByRole('checkbox', { name: 'Buy printer ink' })).toBeChecked()
    await expect(rows).toHaveText([/Wake up/, /Follow up with Emir/, /Read 20 pages/, /Update portfolio/, /Buy printer ink/])
    await expect.poll(() => db.tasks?.find((t) => t.title === 'Buy printer ink')?.status).toBe('done')
  })

  test('works with the keyboard only', async ({ page }) => {
    const db = await openToday(page)

    /** Presses Tab (or Shift+Tab to go back up) until `target` has focus (fails if it never does). */
    async function tabTo(target: Locator, { back = false } = {}) {
      for (let i = 0; i < 100; i++) {
        await page.keyboard.press(back ? 'Shift+Tab' : 'Tab')
        if (await target.evaluate((el) => el === el.ownerDocument.activeElement)) return
      }
      throw new Error(`Tab never reached ${String(target)}`)
    }

    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()

    // Add a task with the keyboard; the field stays focused for the next one.
    const text = page.getByRole('textbox', { name: 'Task' })
    await tabTo(text)
    await page.keyboard.type('Water plants')
    await page.keyboard.press('Enter')
    await expect(tasksCard(page).getByText('Water plants')).toBeVisible()
    await expect(text).toBeFocused()

    // Tick it with Space; focus follows the row to the bottom.
    const checkbox = page.getByRole('checkbox', { name: 'Water plants' })
    await tabTo(checkbox)
    await page.keyboard.press('Space')
    await expect(checkbox).toBeChecked()
    await expect(checkbox).toBeFocused()
    await expect.poll(() => db.tasks?.find((t) => t.title === 'Water plants')?.status).toBe('done')

    // Answering the prompt removes it; focus moves to the next control instead of the top of the page.
    await tabTo(page.getByRole('button', { name: 'Tired' }), { back: true })
    await page.keyboard.press('Enter')
    await expect(page.getByText('Yesterday you missed')).toBeHidden()
    const moveButton = page.getByRole('button', { name: 'Move to today' })
    await expect(moveButton).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByText('Overdue · 1')).toBeHidden()
    await expect(tasksCard(page).getByRole('button', { name: /^All/ })).toBeFocused()
    await expect.poll(() => db.tasks?.find((t) => t.id === 't-lejla')?.due_date).toBe(TODAY)

    // Ctrl+K jumps to search from anywhere.
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('searchbox', { name: 'Search' })).toBeFocused()
  })

  test('filters and edits repeating items', async ({ page }) => {
    const db = await openToday(page)
    const card = tasksCard(page)

    await card.getByRole('button', { name: /^Repeating/ }).click()
    await expect(card.getByText('Wake up')).toBeVisible()
    await expect(card.getByText('Follow up with Emir')).toBeHidden()
    await card.getByRole('button', { name: /^One-off/ }).click()
    await expect(card.getByText('Follow up with Emir')).toBeVisible()
    await expect(card.getByText('Wake up')).toBeHidden()

    await card.getByRole('button', { name: 'Edit repeating' }).click()
    await card.getByRole('group', { name: 'Days for Wake up' }).getByRole('button', { name: 'Saturday' }).click()
    await expect.poll(() => db.routine_items?.find((r) => r.id === 'r-wake')?.days).toEqual([true, true, true, true, true, true, false])

    await card.getByRole('button', { name: 'Remove Read 20 pages' }).click()
    await expect.poll(() => db.routine_items?.find((r) => r.id === 'r-read')?.active).toBe(false)
    await expect(card.getByText('Read 20 pages')).toBeHidden()
  })

  test('saves the daily note and energy', async ({ page }) => {
    const db = await openToday(page)

    await page.getByRole('textbox', { name: 'Daily note' }).fill('Good focus before lunch')
    await page.getByRole('textbox', { name: 'Daily note' }).blur()
    await expect.poll(() => db.daily_logs?.find((l) => l.date === TODAY)?.note).toBe('Good focus before lunch')

    await page.getByRole('button', { name: 'Energy 2 of 5' }).click()
    await expect.poll(() => db.daily_logs?.find((l) => l.date === TODAY)?.energy).toBe(2)
  })

  test('steps to another day and back', async ({ page }) => {
    await openToday(page)

    await page.getByRole('button', { name: 'Previous day' }).click()
    await expect(page.getByText('Tuesday, 27 October 2026')).toBeVisible()
    await expect(page).toHaveURL(/day=2026-10-27/)
    await expect(page.getByText('Yesterday you missed')).toBeHidden()

    await page.getByRole('button', { name: 'Back to today' }).click()
    await expect(page.getByText('Wednesday, 28 October 2026')).toBeVisible()
  })
})

test('Today page fits a phone screen', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Phone only')
  await openToday(page)
  await expect(page.getByRole('region', { name: 'Today’s progress' })).toBeVisible()
  // A string so this file doesn't need browser types; > 0 means the page scrolls sideways.
  const overflow = Number(await page.evaluate('document.documentElement.scrollWidth - window.innerWidth'))
  expect(overflow).toBeLessThanOrEqual(0)
})
