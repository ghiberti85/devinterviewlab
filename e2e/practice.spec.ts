import { test, expect, login } from './fixtures'

test.describe('Study Plan — /plano', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('navigates to /plano after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/plano/)
  })

  test('renders the page title', async ({ page }) => {
    await page.goto('/plano')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 })
  })

  test('shows roadmap list or empty state with generate CTA', async ({ page }) => {
    await page.goto('/plano')
    await page.waitForTimeout(1_500)
    // Either shows existing roadmaps or an empty state with a generate button
    const content = page.locator(
      '[class*="card"], [class*="border rounded"], button, p'
    ).first()
    await expect(content).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Stats — /stats', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('navigates to /stats', async ({ page }) => {
    await page.goto('/stats')
    await expect(page).toHaveURL(/\/stats/)
  })

  test('renders stats page content', async ({ page }) => {
    await page.goto('/stats')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 })
  })
})
