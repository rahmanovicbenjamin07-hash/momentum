import { expect, test, type Page } from '@playwright/test'
import { mockSupabase, TEST_USER, type MockDb } from './support/mockSupabase.ts'

// Wednesday 28 Oct 2026, 10:00 in Sarajevo → the week of Mon 26 Oct (ISO week 44).
const NOW = new Date('2026-10-28T09:00:00Z')
const TODAY = '2026-10-28'
const WEEK = '2026-10-26'
const WEEK_LABEL = 'Week 44 · 26 Oct–1 Nov'
const CREATED = '2026-10-01T08:00:00+00:00'

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
    daily_logs: [],
    contacts: [],
    touches: [],
    stage_history: [],
    reviews: [],
    lessons: [],
    experiments: [],
    ideas: [],
  }
}

async function open(page: Page, path = '/improve'): Promise<MockDb> {
  await page.clock.setFixedTime(NOW)
  const db = await mockSupabase(page, seed(), { now: NOW })
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Improvements', level: 1 })).toBeVisible()
  return db
}

const pastReviews = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: 'Past reviews' }) })

test.describe('Improvements', () => {
  test.skip(({ isMobile }) => isMobile, 'Interaction flows run on desktop')

  test('write a review → Save → "Saved" and it shows in Past reviews', async ({ page }) => {
    const db = await open(page)
    await expect(page.getByText(WEEK_LABEL)).toBeVisible()
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()

    await page.getByLabel('Wins this week').fill('Booked 2 meetings.')
    await page.getByLabel('What didn’t work').fill('Email openers to logistics got no replies.')
    await page.getByLabel('Lesson learned').fill('Name one thing from their website.')
    await page.getByLabel('One focus for next week').fill('Send follow-ups on day 3.')

    // Typing autosaves a draft after a short pause.
    await expect.poll(() => db.reviews?.find((r) => r.week_start === WEEK)?.status).toBe('draft')

    await page.getByRole('button', { name: 'Save review' }).click()
    await expect(page.getByText('Review saved')).toBeVisible()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    await expect(pastReviews(page).getByText(WEEK_LABEL)).toBeVisible()
    await expect(pastReviews(page)).toContainText('Send follow-ups on day 3.')
    await expect.poll(() => db.reviews?.filter((r) => r.week_start === WEEK)).toEqual([
      expect.objectContaining({
        status: 'saved',
        wins: 'Booked 2 meetings.',
        focus: 'Send follow-ups on day 3.',
        stats_snapshot: { task_completion: 0, outreach_sent: 0, replies: 0, meetings: 0 },
      }),
    ])
  })

  test('add a lesson', async ({ page }) => {
    const db = await open(page)
    await page.getByRole('tab', { name: /^Lessons/ }).click()
    await expect(page).toHaveURL(/tab=lessons/)
    await page.getByLabel('Area').selectOption('Outreach')
    await page.getByLabel('Lesson', { exact: true }).fill('Mention one concrete detail from their website.')
    await page.getByRole('button', { name: 'Add lesson' }).click()

    await expect(page.getByText('Mention one concrete detail from their website.')).toBeVisible()
    await expect(page.getByRole('tab', { name: /^Lessons/ })).toContainText('1')
    await expect.poll(() => db.lessons?.[0]).toMatchObject({ area: 'Outreach', text: 'Mention one concrete detail from their website.' })
  })

  test('idea → "Make task" → the task is on Today', async ({ page }) => {
    const db = await open(page, '/improve?tab=ideas')
    await page.getByLabel('New idea').fill('Ask happy clients for one referral each')
    await page.getByRole('button', { name: 'Add idea' }).click()
    await expect(page.getByText('Ask happy clients for one referral each')).toBeVisible()

    await page.getByRole('button', { name: 'Make task' }).click()
    await expect(page.getByText('Added to today’s tasks')).toBeVisible()
    await expect.poll(() => db.ideas?.[0]?.status).toBe('done')
    await expect.poll(() => db.tasks?.find((t) => t.title === 'Ask happy clients for one referral each')?.due_date).toBe(TODAY)

    await page.getByRole('link', { name: /^Today/ }).click()
    const tasksCard = page.locator('section', { has: page.getByRole('heading', { name: /Today’s tasks/ }) })
    await expect(tasksCard.getByText('Ask happy clients for one referral each')).toBeVisible()
  })
})
