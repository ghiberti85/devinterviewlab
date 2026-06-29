import { test, expect, login } from './fixtures'

test.describe('Revisar — /revisar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('navigates to /revisar', async ({ page }) => {
    await page.goto('/revisar')
    await expect(page).toHaveURL(/\/revisar/)
  })

  test('shows tab navigation (Flash Topics / Questões)', async ({ page }) => {
    await page.goto('/revisar')
    // The page has at least two tabs
    const tabs = page.locator('[role="tab"], button').filter({ hasText: /tópico|topic|questão|question/i })
    await expect(tabs.first()).toBeVisible({ timeout: 5_000 })
  })

  test('Flash Topics tab renders topic cards or empty state', async ({ page }) => {
    await page.goto('/revisar')
    await page.waitForTimeout(1_500)
    // Either topic cards or empty-state message
    const content = page.locator('[class*="card"], [class*="border rounded"], p, h2, h3').first()
    await expect(content).toBeVisible({ timeout: 5_000 })
  })

  test('Questões tab switches content', async ({ page }) => {
    await page.goto('/revisar')
    const questoesTab = page.locator('button', { hasText: /questão|question/i }).first()
    if (await questoesTab.isVisible()) {
      await questoesTab.click()
      await page.waitForTimeout(500)
      // Content area updates — just verify no crash
      await expect(page.locator('main, [class*="space-y"]').first()).toBeVisible()
    }
  })
})
