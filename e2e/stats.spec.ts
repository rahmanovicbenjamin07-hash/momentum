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

test.describe('Stats', () => {
  test.skip(({ isMobile }) => isMobile, 'Interaction flows run on desktop; phone layout is checked below')

  test('Overview shows real numbers and the range toggle changes the period', async ({ page }) => {
    await open(page, '/stats')
    await expect(page).toHaveURL(/\/stats\/overview$/)
    await expect(page.getByText('Last 30 days · compared with the period before')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Tasks completed' })).toContainText('12')
    await expect(page.getByRole('region', { name: 'Task completion', exact: true })).toContainText('83%')
    await expect(page.getByRole('region', { name: 'Reply rate', exact: true })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Outreach funnel' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Revenue from outreach' })).toHaveCount(0)

    await page.getByRole('button', { name: '7 days' }).click()
    await expect(page).toHaveURL(/range=7/)
    await expect(page.getByText('Last 7 days · compared with the period before')).toBeVisible()
    await expect(page.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('works with the keyboard only', async ({ page }) => {
    await open(page, '/stats/overview')

    await tabTo(page, page.getByRole('button', { name: '90 days' }))
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/range=90/)
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

  test('Overview fits the screen, and old tab links land on it', async ({ page }) => {
    await open(page, '/stats/overview')
    await expect(page.getByRole('heading', { name: 'Outreach funnel' })).toHaveCount(0)
    await expectNoSideScroll(page)

    await page.goto('/stats/reports')
    await expect(page).toHaveURL(/\/stats\/overview$/)
  })
})
