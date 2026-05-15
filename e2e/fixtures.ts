import { test, expect, type Page } from '@playwright/test'

// Test credentials — set via environment or .env.test
export const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@devinterviewlab.local'
export const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'test-password-123'

export async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[name="email"]', TEST_EMAIL)
  await page.fill('input[name="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 10_000 })
}

export { test, expect }
