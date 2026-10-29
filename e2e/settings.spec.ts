import { expect, test, type Page } from '@playwright/test'
import { mockSupabase, TEST_USER, type MockDb } from './support/mockSupabase.ts'

// Wednesday 28 Oct 2026, 10:00 in Sarajevo.
const NOW = new Date('2026-10-28T09:00:00Z')
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
        backup_enabled: true,
        weekly_targets: { outreaches: 20, task_completion: 80, meetings: 2 },
      },
    ],
    routine_items: [],
    routine_checks: [],
    tasks: [],
    notification_prefs: [],
  }
}

async function open(page: Page): Promise<MockDb> {
  await page.clock.setFixedTime(NOW)
  const db = await mockSupabase(page, seed(), {
    now: NOW,
    // 02:00 UTC = 03:00 in Sarajevo.
    backups: [{ name: '2026-10-28.json', size: 2_200_000, updated_at: '2026-10-28T02:00:00Z' }],
  })
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  return db
}

const html = (page: Page) => page.locator('html')
const pickTheme = (page: Page, name: string) => page.locator('label', { has: page.getByRole('radio', { name }) }).click()

test.describe('Settings', () => {
  test.skip(({ isMobile }) => isMobile, 'Interaction flows run on desktop')

  test('dark mode switches at once, is saved, and stays after a reload', async ({ page }) => {
    const db = await open(page)
    await expect(html(page)).not.toHaveClass(/dark/)

    await pickTheme(page, 'Dark')
    await expect(html(page)).toHaveClass(/dark/)
    await expect.poll(() => db.profiles?.[0]?.theme).toBe('dark')

    // Comes back dark straight away (from this device), then from the profile.
    await page.reload()
    await expect(html(page)).toHaveClass(/dark/)
    await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked()

    await pickTheme(page, 'Light')
    await expect(html(page)).not.toHaveClass(/dark/)
  })

  test('"Match my device" follows the system setting as it changes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await open(page)
    await pickTheme(page, 'Match my device')
    await expect(html(page)).not.toHaveClass(/dark/)
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(html(page)).toHaveClass(/dark/)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(html(page)).not.toHaveClass(/dark/)
  })

  test('restore a backup', async ({ page }) => {
    const db = await open(page)
    await page.getByRole('button', { name: 'Restore backup from Today, 03:00' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Restore the backup from Today, 03:00?')
    await dialog.getByRole('button', { name: 'Restore' }).click()
    await expect(page.getByText('Backup restored')).toBeVisible()
    expect(db.functionCalls).toEqual([{ name: 'restore', body: { path: `${TEST_USER.id}/2026-10-28.json` } }])
  })

  test('delete the account → back to the login page', async ({ page }) => {
    const db = await open(page)
    await page.getByRole('button', { name: 'Delete account' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: 'Delete my account' })).toBeDisabled()
    await dialog.getByLabel('Type DELETE to confirm').fill('DELETE')
    await dialog.getByRole('button', { name: 'Delete my account' }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText('Your account was deleted')).toBeVisible()
    expect(db.functionCalls?.map((f) => f.name)).toEqual(['delete-account'])
  })
})
