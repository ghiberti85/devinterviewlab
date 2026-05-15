import { test, expect, login } from './fixtures'

test.describe('Questions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('navigates to questions page', async ({ page }) => {
    await page.goto('/questions')
    await expect(page).toHaveURL(/\/questions/)
  })

  test('can open create question form', async ({ page }) => {
    await page.goto('/questions')
    const createBtn = page.locator('button', { hasText: /nova|new|criar|create/i }).first()
    await createBtn.click()
    await expect(page.locator('input[name="title"], input[placeholder*="título"], input[placeholder*="title"]').first()).toBeVisible({ timeout: 5_000 })
  })

  test('can create a new question', async ({ page }) => {
    await page.goto('/questions')

    const createBtn = page.locator('button', { hasText: /nova|new|criar|create/i }).first()
    await createBtn.click()

    const titleInput = page.locator('input[name="title"], input[placeholder*="título"], input[placeholder*="title"]').first()
    await titleInput.fill('E2E test question — can be deleted')

    // Submit form
    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    // Question should appear in the list
    await expect(page.locator('text=E2E test question — can be deleted')).toBeVisible({ timeout: 10_000 })
  })
})
