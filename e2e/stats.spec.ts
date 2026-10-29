import { expect, test, type Locator, type Page } from '@playwright/test'
import { mockSupabase, TEST_USER, type MockDb, type Row, type RpcHandler } from './support/mockSupabase.ts'

// Wednesday 28 Oct 2026, 10:00 in Sarajevo.
const NOW = new Date('2026-10-28T09:00:00Z')
const CREATED = '2026-01-01T08:00:00+00:00'
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
    { ...base, id: 'r-wake', title: 'Wake up at 06:00', days: WEEKDAYS, time: '06:00:00', position: 0, active: true },
    { ...base, id: 'r-read', title: 'Read 20 pages', days: EVERY_DAY, time: '21:30:00', position: 1, active: true },
  ]
  // 1 Jan – 27 Oct: everything done except Mondays in March (Tired) and some reading.
  const checks: Row[] = []
  for (const date of dates('2026-01-01', '2026-10-27')) {
    for (const item of routine) {
      if (!item.days[weekday(date)]) continue
      const missed = (item.id === 'r-wake' && date.startsWith('2026-03') && weekday(date) === 0) || (item.id === 'r-read' && date.endsWith('-13'))
      checks.push({ ...base, id: `c-${item.id}-${date}`, routine_item_id: item.id, date, done: !missed, miss_reason: missed && item.id === 'r-wake' ? 'Tired' : null })
    }
  }
  const money = [850, 920, 1100, 980, 1350, 1500, 1420, 1680, 1950] // Jan–Sep 2026 (October not logged yet)
  const moneyLastYear = [500, 550, 600, 650, 750, 800, 950, 1100, 1200, 1050, 1300, 1400]
  const entry = (metric_id: string, month: string, value: number): Row => ({
    ...base,
    id: `e-${metric_id}-${month}`,
    metric_id,
    entry_date: `${month}-01`,
    value,
    note: null,
    contact_id: null,
  })
  return {
    profiles: [{ ...base, id: TEST_USER.id, display_name: 'Test User', timezone: 'Europe/Sarajevo', week_start: 1, day_end_hour: 0, theme: 'light', language: 'en' }],
    routine_items: routine,
    routine_checks: checks,
    tasks: [],
    daily_logs: [],
    metrics: [
      { ...base, id: 'm-money', name: 'Money earned', unit: 'eur', log_every: 'monthly', yearly_goal: 18000, builtin: 'money_earned', position: 0 },
      { ...base, id: 'm-trainings', name: 'Trainings', unit: 'count', log_every: 'weekly', yearly_goal: 150, builtin: 'trainings', position: 1 },
    ],
    metric_entries: [
      ...money.map((v, i) => entry('m-money', `2026-${String(i + 1).padStart(2, '0')}`, v)),
      ...moneyLastYear.map((v, i) => entry('m-money', `2025-${String(i + 1).padStart(2, '0')}`, v)),
      entry('m-trainings', '2026-10', 12),
    ],
    contacts: [{ ...base, id: 'c-rondo', source: 'maps', name: 'Café Rondo', stage: 'won', won_amount: 1500, won_month: '2026-10-01' }],
    touches: [],
    templates: [],
  }
}

/** Small stand-ins for the stats SQL functions (supabase/migrations/…_stats_views.sql). */
const rpc: Record<string, RpcHandler> = {
  stats_daily_completion: ({ p_from, p_to }) =>
    dates(String(p_from), String(p_to)).map((day) => ({
      day,
      tasks_done: 3,
      tasks_total: 4,
      routine_done: 2,
      routine_total: 2,
      done: 5,
      total: 6,
      percent: 83,
    })),
  stats_outreach_funnel: () => [
    { stage: 'contacted', step: 1, contacts: 10, pct_of_previous: null },
    { stage: 'replied', step: 2, contacts: 3, pct_of_previous: 30 },
    { stage: 'meeting', step: 3, contacts: 2, pct_of_previous: 66.7 },
    { stage: 'proposal', step: 4, contacts: 1, pct_of_previous: 50 },
    { stage: 'won', step: 5, contacts: 1, pct_of_previous: 100 },
  ],
  stats_reply_rates: () => [
    { dimension: 'channel', key: 'email', label: null, sent: 10, replies: 3, rate: 30 },
    { dimension: 'source', key: 'maps', label: null, sent: 10, replies: 3, rate: 30 },
    { dimension: 'template', key: 't-a', label: 'Opener A', sent: 10, replies: 3, rate: 30 },
  ],
  stats_revenue: () => [{ dimension: 'channel', key: 'email', label: null, deals: 1, amount: 1500 }],
  stats_tasks_by_tag: () => [{ tag: 'work', done: 12 }],
  // One row per item per scheduled day (or ticked day), like the SQL function.
  stats_routine_days: ({ p_from, p_to }, db) =>
    dates(String(p_from), String(p_to)).flatMap((day) =>
      (db.routine_items ?? []).flatMap((item) => {
        const scheduled = Boolean(item.active) && (item.days as boolean[])[weekday(day)] === true && String(item.created_at).slice(0, 10) <= day
        const check = db.routine_checks?.find((c) => c.routine_item_id === item.id && c.date === day)
        if (!scheduled && !check) return []
        return [{ routine_item_id: item.id, title: item.title, day, scheduled, done: Boolean(check?.done), miss_reason: check?.miss_reason ?? null }]
      }),
    ),
}

async function open(page: Page, path: string): Promise<MockDb> {
  await page.clock.setFixedTime(NOW)
  const db = await mockSupabase(page, seed(), { now: NOW, rpc })
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Stats', level: 1 })).toBeVisible()
  return db
}

/** Presses Tab (or Shift+Tab) until `target` has focus. */
async function tabTo(page: Page, target: Locator, { back = false } = {}) {
  for (let i = 0; i < 200; i++) {
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab')
    if (await target.evaluate((el) => el === el.ownerDocument.activeElement)) return
  }
  throw new Error(`Tab never reached ${String(target)}`)
}

const moneySlider = (page: Page) => page.getByRole('slider', { name: 'Money earned 2026, choose a month' })

test.describe('Stats', () => {
  test.skip(({ isMobile }) => isMobile, 'Interaction flows run on desktop; phone layout is checked below')

  test('Overview shows real numbers and the range toggle changes the period', async ({ page }) => {
    await open(page, '/stats')
    await expect(page).toHaveURL(/\/stats\/overview$/)
    await expect(page.getByText('Last 30 days · compared with the period before')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Tasks completed' })).toContainText('12')
    await expect(page.getByRole('region', { name: 'Task completion', exact: true })).toContainText('83%')
    await expect(page.getByRole('region', { name: 'Reply rate', exact: true })).toContainText('30%')
    await expect(page.getByRole('heading', { name: 'Outreach funnel' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Revenue from outreach' })).toBeVisible()

    await page.getByRole('button', { name: '7 days' }).click()
    await expect(page).toHaveURL(/range=7/)
    await expect(page.getByText('Last 7 days · compared with the period before')).toBeVisible()
    await expect(page.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('log a value → it shows in the chart and the entries table', async ({ page }) => {
    const db = await open(page, '/stats/metrics')
    await expect(page.getByRole('button', { name: /^Money earned/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'Money earned · 2026' })).toBeVisible()

    await expect(page.getByLabel('Month', { exact: true })).toHaveValue('2026-10')
    await page.getByLabel('Amount (€) for the month').fill('2200')
    await page.getByLabel('Note (optional)').fill('2 new clients')
    await page.getByRole('button', { name: 'Save entry' }).click()

    // Jan–Sep €11,750 + October €2,200
    await expect(moneySlider(page)).toHaveAttribute('aria-valuetext', /^October 2026: €13,950 so far/)
    await expect(moneySlider(page)).toHaveAttribute('aria-valuetext', /2 new clients/)
    await expect(page.getByRole('button', { name: /^Money earned/ })).toContainText('€13,950')
    // Entries table: month, value, change, running total, note.
    await expect(page.getByRole('row', { name: /^October €2,200 .*€13,950 2 new clients$/ })).toBeVisible()
    await expect
      .poll(() => db.metric_entries?.find((e) => e.metric_id === 'm-money' && e.entry_date === '2026-10-01')?.value)
      .toBe(2200)

    // Per month: the October bar on its own.
    await page.getByRole('button', { name: 'Per month' }).click()
    await expect(moneySlider(page)).toHaveAttribute('aria-valuetext', /^October 2026: €2,200 this month/)
  })

  test('adds a new metric and selects it', async ({ page }) => {
    const db = await open(page, '/stats/metrics')
    await page.getByRole('button', { name: /New metric/ }).click()
    await page.getByLabel('Name').fill('Kilometres run')
    await page.getByLabel('Unit').selectOption('km')
    await page.getByRole('button', { name: 'Create metric' }).click()
    await expect(page.getByRole('button', { name: /^Kilometres run/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'Kilometres run · 2026' })).toBeVisible()
    await expect.poll(() => db.metrics?.some((m) => m.name === 'Kilometres run' && m.unit === 'km')).toBe(true)
  })

  test('Routine progress: pick an item, see chart, facts, reasons and months', async ({ page }) => {
    await open(page, '/stats/routine')
    await expect(page.getByRole('button', { name: /^Wake up at 06:00/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'Wake up at 06:00 · Mon–Fri' })).toBeVisible()
    await expect(page.getByText('Tired')).toBeVisible()
    await expect(page.getByText(/Most misses are on Mondays/)).toBeVisible()
    await expect(page.getByRole('row', { name: /^October 19 of 19/ })).toBeVisible()

    await page.getByRole('button', { name: /^Read 20 pages/ }).click()
    await expect(page).toHaveURL(/item=r-read/)
    await expect(page.getByRole('heading', { name: 'Read 20 pages · Every day' })).toBeVisible()
  })

  test('Reports: month and year, Download PDF prints, Share image downloads a PNG', async ({ page }) => {
    // No share sheet in the test browser: Share image falls back to a download.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    })
    await open(page, '/stats/reports')
    const card = page.getByRole('group', { name: 'My October summary card' })
    await expect(card).toBeVisible()
    await expect(card).toContainText('outreach messages')
    await expect(card).not.toContainText('Café Rondo')
    // The deal's name is only in the key numbers, not on the share card.
    await expect(page.getByText('Café Rondo')).toBeVisible()

    await page.evaluate(() => {
      const w = globalThis as unknown as { print: () => void; printed?: boolean }
      w.print = () => {
        w.printed = true
      }
    })
    await page.getByRole('button', { name: 'Download PDF' }).click()
    expect(await page.evaluate(() => (globalThis as unknown as { printed?: boolean }).printed)).toBe(true)

    await page.getByRole('button', { name: '2026 so far' }).click()
    await expect(page).toHaveURL(/period=year/)
    await expect(page.getByRole('group', { name: 'My 2026 summary card' })).toBeVisible()

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Share image' }).click()
    expect((await download).suggestedFilename()).toBe('momentum-my-2026.png')
  })

  test('works with the keyboard only', async ({ page }) => {
    const db = await open(page, '/stats/overview')

    await tabTo(page, page.getByRole('button', { name: '90 days' }))
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/range=90/)

    await tabTo(page, page.getByRole('link', { name: 'My metrics' }))
    await page.keyboard.press('Enter')
    await expect(moneySlider(page)).toBeVisible()

    await tabTo(page, page.getByLabel('Amount (€) for the month'))
    await page.keyboard.type('2000')
    await page.keyboard.press('Enter')
    await expect
      .poll(() => db.metric_entries?.find((e) => e.metric_id === 'm-money' && e.entry_date === '2026-10-01')?.value)
      .toBe(2000)

    // Pick a month on the chart with the arrow keys.
    await tabTo(page, moneySlider(page), { back: true })
    await page.keyboard.press('Home')
    await expect(moneySlider(page)).toHaveAttribute('aria-valuetext', /^January 2026: €850 so far/)

    await tabTo(page, page.getByRole('link', { name: 'Routine progress' }), { back: true })
    await page.keyboard.press('Enter')
    await tabTo(page, page.getByRole('button', { name: /^Read 20 pages/ }))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Read 20 pages · Every day' })).toBeVisible()

    await tabTo(page, page.getByRole('link', { name: 'Reports' }), { back: true })
    await page.keyboard.press('Enter')
    await tabTo(page, page.getByRole('button', { name: '2026 so far' }))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('group', { name: 'My 2026 summary card' })).toBeVisible()
  })
})

test.describe('Stats at phone width', () => {
  test.skip(({ isMobile }) => !isMobile, 'Phone layout only')

  /** No sideways scrolling; on failure, names the elements that stick out. */
  async function expectNoSideScroll(page: Page) {
    const report = await page.locator('html').evaluate((html) => {
      const width = html.clientWidth
      const wide = [...html.querySelectorAll('main *')]
        .filter((el) => el.getBoundingClientRect().right > width + 1 && !el.closest('[aria-label="Stats sections"]'))
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}" right=${Math.round(el.getBoundingClientRect().right)}`)
      return { overflow: html.scrollWidth - width, wide }
    })
    expect(report.overflow, report.wide.join('\n')).toBeLessThanOrEqual(0)
  }

  test('every tab fits the screen', async ({ page }) => {
    await open(page, '/stats/overview')
    await expect(page.getByRole('heading', { name: 'Outreach funnel' })).toBeVisible()
    await expectNoSideScroll(page)

    await page.goto('/stats/metrics')
    await expect(moneySlider(page)).toBeVisible()
    await expectNoSideScroll(page)
    await page.getByRole('button', { name: /New metric/ }).click()
    await expect(page.getByRole('button', { name: 'Create metric' })).toBeVisible()
    await expectNoSideScroll(page)
    await page.getByRole('button', { name: 'Cancel' }).click()

    await page.goto('/stats/routine')
    await expect(page.getByRole('heading', { name: 'Wake up at 06:00 · Mon–Fri' })).toBeVisible()
    await expectNoSideScroll(page)

    await page.goto('/stats/reports')
    await expect(page.getByRole('group', { name: 'My October summary card' })).toBeVisible()
    await expectNoSideScroll(page)
  })
})
