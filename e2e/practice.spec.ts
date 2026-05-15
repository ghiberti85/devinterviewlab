import { test, expect, login } from './fixtures'

test.describe('Flashcard practice', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('navigates to practice page', async ({ page }) => {
    await page.goto('/practice')
    await expect(page).toHaveURL(/\/practice/)
  })

  test('shows mode selection (random / spaced)', async ({ page }) => {
    await page.goto('/practice')
    await expect(page.locator('text=/aleatório|random|spaced|espaçado/i').first()).toBeVisible()
  })

  test('starts a practice session in random mode', async ({ page }) => {
    await page.goto('/practice')

    const startBtn = page.locator('button', { hasText: /iniciar|start/i }).first()
    await startBtn.click()

    // Either shows a flashcard or empty state (if no questions exist)
    await expect(
      page.locator('[data-testid="flashcard"], text=/nenhuma|no questions|sem questões/i').first()
    ).toBeVisible({ timeout: 10_000 })
  })
})
