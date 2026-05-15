import { test, expect, login, TEST_EMAIL } from './fixtures'

test.describe('Auth flow', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows login form with email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    // Stays on login with error message
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('[data-testid="auth-error"], .text-destructive, [class*="error"]')).toBeVisible({ timeout: 5_000 })
  })

  test('logs in with valid credentials and lands on dashboard', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('persists session across page reload', async ({ page }) => {
    await login(page)
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
