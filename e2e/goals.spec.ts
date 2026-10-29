import { expect, test, type Page } from '@playwright/test'
import { mockSupabase, TEST_USER, type MockDb, type Row } from './support/mockSupabase.ts'

// Wednesday 28 Oct 2026, 10:00 in Sarajevo.
const NOW = new Date('2026-10-28T09:00:00Z')
const CREATED = '2026-01-01T08:00:00+00:00'
const WEEKDAYS = [true, true, true, true, true, false, false]

function dates(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/** Mon = 0 … Sun = 6 */
const weekday = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
// Real UUIDs: the New goal form checks that 'Measured by' is one.
const M_MONEY = '11111111-1111-4111-8111-111111111111'
const M_TRAININGS = '22222222-2222-4222-8222-222222222222'
const M_HOURS = '33333333-3333-4333-8333-333333333333'
const R_WAKE = '44444444-4444-4444-8444-444444444444'

const month = (i: number) => `2026-${String(i + 1).padStart(2, '0')}`

function seed(): MockDb {
  const base = { user_id: TEST_USER.id, created_at: CREATED }
  const entry = (metric_id: string, m: string, value: number): Row => ({
    ...base,
    id: `e-${metric_id}-${m}`,
    metric_id,
    entry_date: `${m}-01`,
    value,
    note: null,
    contact_id: null,
  })
  // Money earned Jan–Oct 2026 = €13,950 (design/progress.png).
  const money = [850, 920, 1100, 980, 1350, 1500, 1420, 1680, 1950, 2200]
  const goal = (id: string, title: string, short_label: string, extra: Row): Row => ({
    ...base,
    id,
    title,
    short_label,
    type: 'total',
    source_kind: 'metric',
    start_date: '2026-01-01',
    deadline: '2026-12-31',
    include_pipeline: false,
    ...extra,
  })
  const deal = (id: string, name: string, stage: string, deal_value: number): Row => ({ ...base, id, source: 'other', name, stage, deal_value })

  return {
    profiles: [{ ...base, id: TEST_USER.id, display_name: 'Test User', timezone: 'Europe/Sarajevo', week_start: 1, day_end_hour: 0, theme: 'light', language: 'en' }],
    routine_items: [{ ...base, id: R_WAKE, title: 'Wake up at 06:00', days: WEEKDAYS, time: '06:00:00', position: 0, active: true }],
    // Ticked every weekday since March: about 170 days, so 200 isn't reached yet.
    routine_checks: dates('2026-03-01', '2026-10-27')
      .filter((d) => weekday(d) < 5)
      .map((date) => ({ ...base, id: `c-${date}`, routine_item_id: R_WAKE, date, done: true, miss_reason: null })),
    metrics: [
      { ...base, id: M_MONEY, name: 'Money earned', unit: 'eur', log_every: 'monthly', yearly_goal: 18000, builtin: 'money_earned', position: 0 },
      { ...base, id: M_TRAININGS, name: 'Trainings', unit: 'count', log_every: 'weekly', yearly_goal: 150, builtin: 'trainings', position: 1 },
      { ...base, id: M_HOURS, name: 'Hours worked', unit: 'hours', log_every: 'weekly', yearly_goal: 1700, builtin: 'hours_worked', position: 2 },
    ],
    metric_entries: [
      ...money.map((v, i) => entry(M_MONEY, month(i), v)),
      ...money.map((_, i) => entry(M_TRAININGS, month(i), 12)),
      ...money.map((_, i) => entry(M_HOURS, month(i), 140)),
    ],
    goals: [
      goal('g-money', 'Earn €18,000 in 2026', '€18k in 2026', { source_id: M_MONEY, target: 18000, deadline: '2027-01-01', include_pipeline: true }),
      goal('g-trainings', '150 trainings this year', '150 trainings', { source_id: M_TRAININGS, target: 150 }),
      goal('g-hours', 'Work 1,650 hours this year', '1,650 hours', { source_id: M_HOURS, target: 1650 }),
      goal('g-wake', 'Wake up at 06:00 on 200 days', '200 early mornings', { source_kind: 'routine', source_id: R_WAKE, target: 200 }),
      goal('g-month', 'Earn €3,000 in a single month', '€3k month', { type: 'level', source_id: M_MONEY, target: 3000, deadline: '2027-06-30' }),
    ],
    // Open deals from design/goals.png: €1,910 expected in total.
    contacts: [
      deal('d-nova', 'Nova Dental', 'proposal', 2400),
      deal('d-sara', 'Atelier Sara', 'meeting', 1500),
      deal('d-bloom', 'Bloom Studio', 'replied', 1200),
      deal('d-bright', 'Brightline Logistics', 'contacted', 900),
      deal('d-mostar', 'Mostar Tours', 'contacted', 700),
      deal('d-new', 'Not counted', 'new', 5000),
      { ...base, id: 'd-novalue', source: 'other', name: 'No value yet', stage: 'proposal', deal_value: null },
    ],
    touches: [],
    templates: [],
    tasks: [],
    daily_logs: [],
  }
}

async function open(page: Page, path = '/goals'): Promise<MockDb> {
  await page.clock.setFixedTime(NOW)
  const db = await mockSupabase(page, seed(), { now: NOW })
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Goals', level: 1 })).toBeVisible()
  return db
}

const chip = (page: Page, name: string) => page.getByRole('group', { name: 'Goals' }).getByRole('button', { name: new RegExp(`^${name}`) })
const sentence = (page: Page) => page.locator('p[aria-live="polite"]').first()

// Money: €13,950 + €1,910 expected = €15,860. Real pace = Jul–Sep average €1,683.
// €2,140 left ÷ €1,683 a month = 39 days → 6 Dec 2026, 26 days before 1 Jan 2027.
const MONEY_SENTENCE =
  "At your current pace (€1,683 a month) you'll reach €18,000 on 6 Dec 2026 — 26 days before your deadline, counting €1,910 expected from open deals."

test.describe('Goals', () => {
  test.skip(({ isMobile }) => isMobile, 'Interaction flows run on desktop; phone layout is checked below')

  test('the first goal shows its forecast, pipeline and needed pace', async ({ page }) => {
    await open(page)
    await expect(chip(page, '€18k in 2026')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'Earn €18,000 in 2026' })).toBeVisible()
    await expect(sentence(page)).toHaveText(MONEY_SENTENCE)
    await expect(page.getByText('€13,950 + €1,910 expected of €18,000')).toBeVisible()
    await expect(page.getByText(/^To finish by 1 Jan 2027 you need €[\d,]+ a month\.$/)).toBeVisible()
    await expect(page.getByText('Nova Dental')).toBeVisible()
    await expect(page.getByText('Not counted')).toHaveCount(0)
  })

  test('the slider changes the finish date live; "My pace" puts it back', async ({ page }) => {
    await open(page)
    const slider = page.getByRole('slider', { name: 'Monthly pace' })
    await expect(sentence(page)).toHaveText(MONEY_SENTENCE)

    await slider.focus()
    await page.keyboard.press('End')
    await expect(sentence(page)).toHaveText(/^At €[\d,]+ a month you'll reach €18,000 on \d+ \w{3} 2026 — \d+ days before your deadline/)
    await expect(sentence(page)).not.toContainText('6 Dec 2026')

    await page.keyboard.press('Home')
    await expect(sentence(page)).toHaveText("At your current pace you won't reach €18,000 yet — log a few months first.")

    await page.getByRole('button', { name: 'My pace' }).click()
    await expect(sentence(page)).toHaveText(MONEY_SENTENCE)
  })

  test('the chips switch goals', async ({ page }) => {
    await open(page)
    await chip(page, '200 early mornings').click()
    await expect(page).toHaveURL(/goal=g-wake/)
    await expect(chip(page, '200 early mornings')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'Wake up at 06:00 on 200 days' })).toBeVisible()
    await expect(sentence(page)).toContainText("you'll reach 200 days on")
    await expect(page.getByText('Count open deals', { exact: false })).toHaveCount(0)

    // A level goal: growth, no pace slider.
    await chip(page, '€3k month').click()
    await expect(sentence(page)).toHaveText(/^At your current growth \(\+€[\d,]+ a month\) you'll reach €3,000 a month in \w{3} 20\d\d/)
    await expect(page.getByRole('slider', { name: 'Monthly pace' })).toHaveCount(0)
  })

  test('creating a goal adds and selects its chip', async ({ page }) => {
    const db = await open(page)
    await page.getByRole('button', { name: 'New goal' }).click()
    await page.getByLabel('Name').fill('Have 10,000 KM saved by May')
    await page.getByLabel('Short label').fill('10k KM')
    await page.getByLabel('Unit').selectOption({ label: 'Bosnian mark (KM)' })
    await page.getByLabel('Starting point').fill('3000')
    await page.getByLabel('Target', { exact: true }).fill('10,000')
    await page.getByLabel('Deadline').fill('2027-05-03')
    await page.getByRole('button', { name: 'Create goal' }).click()

    await expect(chip(page, '10k KM')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'Have 10,000 KM saved by May' })).toBeVisible()
    await expect(page.getByText('UPDATED BY HAND · no updates yet · deadline 3 May 2027')).toBeVisible()
    await expect(page.getByText('3,000 KM of 10,000 KM · started at 3,000 KM')).toBeVisible()
    await expect.poll(() => db.goals?.find((g) => g.short_label === '10k KM')).toMatchObject({
      type: 'total',
      source_kind: 'manual',
      source_id: null,
      unit: 'bam',
      start_value: 3000,
      target: 10000,
      deadline: '2027-05-03',
      start_date: '2026-10-28',
    })
  })

  test('a hand-updated goal: save an update, delete it, then delete the goal', async ({ page }) => {
    const db = await open(page)
    // A goal started in June at €3,000 with one update in September.
    db.goals?.push({
      user_id: TEST_USER.id,
      created_at: CREATED,
      id: 'g-saved',
      title: 'Have €10,000 saved by May',
      short_label: '€10k saved',
      type: 'total',
      source_kind: 'manual',
      source_id: null,
      unit: 'eur',
      start_value: 3000,
      target: 10000,
      start_date: '2026-06-01',
      deadline: '2027-05-03',
      include_pipeline: false,
    })
    ;(db.goal_updates ??= []).push({
      user_id: TEST_USER.id,
      created_at: CREATED,
      id: 'u-sep',
      goal_id: 'g-saved',
      date: '2026-09-01',
      value: 4000,
      note: null,
    })
    await page.goto('/goals?goal=g-saved')
    await expect(page.getByText('€4,000 of €10,000 · started at €3,000')).toBeVisible()
    await expect(page.getByText('UPDATED BY HAND · last update 1 Sep 2026 · deadline 3 May 2027')).toBeVisible()
    await expect(page.getByText('Count open deals', { exact: false })).toHaveCount(0)

    await page.getByRole('button', { name: 'Update', exact: true }).click()
    await page.getByLabel('Current number').fill('5200')
    await page.getByLabel('Note (optional)').fill('Salary')
    await page.getByRole('button', { name: 'Save update' }).click()

    await expect(page.getByText('€5,200 of €10,000 · started at €3,000')).toBeVisible()
    await expect(sentence(page)).toContainText("you'll reach €10,000 on")
    await expect.poll(() => db.goal_updates?.find((u) => u.date === '2026-10-28')).toMatchObject({
      goal_id: 'g-saved',
      value: 5200,
      note: 'Salary',
    })

    await page.getByRole('button', { name: 'Delete update from 28 Oct 2026' }).click()
    await expect(page.getByText('€4,000 of €10,000 · started at €3,000')).toBeVisible()
    await expect.poll(() => db.goal_updates?.map((u) => u.id)).toEqual(['u-sep'])

    await page.getByRole('button', { name: 'Delete goal' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete goal' }).click()
    await expect(chip(page, '€10k saved')).toHaveCount(0)
    await expect.poll(() => db.goals?.some((g) => g.id === 'g-saved')).toBe(false)
  })
})

test.describe('Goals at phone width', () => {
  test.skip(({ isMobile }) => !isMobile, 'Phone layout only')
  test.use({ viewport: { width: 390, height: 844 } })

  test('no sideways page scroll; only the chip row scrolls', async ({ page }) => {
    await open(page)
    await expect(sentence(page)).toHaveText(MONEY_SENTENCE)
    const chips = page.getByRole('group', { name: 'Goals' })

    const report = await page.locator('html').evaluate((html) => {
      const width = html.clientWidth
      // Chips past the edge are fine: they're inside the row that scrolls on its own.
      const wide = [...html.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > width + 1 && !el.closest('[role="group"][aria-label="Goals"] > *'))
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`)
      return { overflow: html.scrollWidth - width, wide }
    })
    expect(report.overflow, report.wide.join('\n')).toBeLessThanOrEqual(0)

    // The chips don't fit at 390px, so their row scrolls on its own.
    const row = await chips.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, overflowX: el.ownerDocument.defaultView?.getComputedStyle(el).overflowX }))
    expect(row.overflowX).toBe('auto')
    expect(row.scroll).toBeGreaterThan(row.client)
  })
})
