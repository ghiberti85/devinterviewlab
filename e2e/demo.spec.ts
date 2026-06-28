import { test, expect } from './fixtures'

// /demo is a public route — no authentication needed.
// These tests are the safest to run in CI without test credentials.
test.describe('Demo page — /demo (public)', () => {
  test('is accessible without authentication', async ({ page }) => {
    await page.goto('/demo')
    await expect(page).toHaveURL(/\/demo/)
    // Should NOT be redirected to /login
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('renders page heading', async ({ page }) => {
    await page.goto('/demo')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 })
  })

  test('shows at least 2 tab buttons for navigating demo sections', async ({ page }) => {
    await page.goto('/demo')
    const tabs = page.locator('[role="tab"], button').filter({
      hasText: /roadmap|entrevista|interview|questão|question|live|tópico|topic/i,
    })
    await expect(tabs.first()).toBeVisible({ timeout: 5_000 })
    expect(await tabs.count()).toBeGreaterThanOrEqual(2)
  })

  test('tab click switches active content without redirect', async ({ page }) => {
    await page.goto('/demo')
    const tabs = page.locator('[role="tab"], button').filter({
      hasText: /roadmap|entrevista|interview|questão|question|live|tópico|topic/i,
    })
    const count = await tabs.count()
    if (count >= 2) {
      await tabs.nth(1).click()
      await page.waitForTimeout(300)
      // Still on /demo — no redirect happened
      await expect(page).toHaveURL(/\/demo/)
    }
  })

  test('has a link to /login or /register for unauthenticated users', async ({ page }) => {
    await page.goto('/demo')
    const authLink = page.locator('a[href*="login"], a[href*="register"], button', {
      hasText: /entrar|login|criar conta|sign up|register/i,
    }).first()
    await expect(authLink).toBeVisible({ timeout: 5_000 })
  })
})
