import { test, expect, login } from './fixtures'

test.describe('Interview coach — evaluate answer', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('navigates to interview page', async ({ page }) => {
    await page.goto('/interview')
    await expect(page).toHaveURL(/\/interview/)
  })

  test('shows question selector and answer textarea', async ({ page }) => {
    await page.goto('/interview')
    // Question selector
    await expect(page.locator('select, [role="combobox"]').first()).toBeVisible()
    // Answer textarea
    await expect(page.locator('textarea').first()).toBeVisible()
  })

  test('evaluate button is disabled with empty answer', async ({ page }) => {
    await page.goto('/interview')
    const evaluateBtn = page.locator('button', { hasText: /avaliar|evaluate/i }).first()
    await expect(evaluateBtn).toBeDisabled()
  })

  test('full evaluate flow: select question → type answer → get feedback', async ({ page }) => {
    await page.goto('/interview')

    // Select first available question
    const selector = page.locator('select, [role="combobox"]').first()
    await selector.selectOption({ index: 1 })

    // Type a sample answer
    const textarea = page.locator('textarea').first()
    await textarea.fill(
      'This is a test answer for the E2E evaluation flow. ' +
      'I understand the core concepts and can apply them in practice. ' +
      'The key aspects include performance, maintainability, and scalability.'
    )

    // Submit evaluation
    const evaluateBtn = page.locator('button', { hasText: /avaliar|evaluate/i }).first()
    await expect(evaluateBtn).toBeEnabled()
    await evaluateBtn.click()

    // Wait for AI feedback (may take a few seconds)
    await expect(
      page.locator('[data-testid="ai-feedback"], .feedback, text=/score|pontuação|strengths|pontos fortes/i').first()
    ).toBeVisible({ timeout: 30_000 })
  })
})
