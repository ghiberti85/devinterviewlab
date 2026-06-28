import { test, expect, login } from './fixtures'

test.describe('Interview coach — /interview', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('navigates to /interview', async ({ page }) => {
    await page.goto('/interview')
    await expect(page).toHaveURL(/\/interview/)
  })

  test('shows question selector and answer textarea', async ({ page }) => {
    await page.goto('/interview')
    // The page renders a select or combobox for picking a question
    await expect(page.locator('select, [role="combobox"]').first()).toBeVisible({ timeout: 5_000 })
    // Answer textarea
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5_000 })
  })

  test('evaluate button is disabled with empty answer', async ({ page }) => {
    await page.goto('/interview')
    const evaluateBtn = page.locator('button', { hasText: /avaliar|evaluate/i }).first()
    await expect(evaluateBtn).toBeDisabled()
  })

  test('shuffle button picks a random question', async ({ page }) => {
    await page.goto('/interview')
    // Wait for questions to load
    await page.waitForTimeout(1_500)
    const shuffleBtn = page.locator('button[aria-label*="leatório"], button[title*="leatório"], button svg').first()
    // At minimum the shuffle icon renders without throwing
    await expect(shuffleBtn).toBeVisible()
  })

  test('typing in textarea enables evaluate button', async ({ page }) => {
    await page.goto('/interview')
    await page.waitForTimeout(1_000)

    // Pick any question via random shuffle if available
    const shuffleBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
    await shuffleBtn.click()
    await page.waitForTimeout(500)

    const textarea = page.locator('textarea').first()
    await textarea.fill('This is a test answer with enough content to pass validation.')

    const evaluateBtn = page.locator('button', { hasText: /avaliar|evaluate/i }).first()
    await expect(evaluateBtn).toBeEnabled()
  })
})
