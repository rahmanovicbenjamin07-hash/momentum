import { expect, test } from '@playwright/test'

test('login page loads', async ({ page }) => {
  await page.goto('/login')

  await expect(page).toHaveTitle('Momentum')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send magic link' })).toBeVisible()
})

test('private pages redirect to login when signed out', async ({ page }) => {
  await page.goto('/stats')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})
