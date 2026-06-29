import { test, expect, login, TEST_EMAIL } from './fixtures'

test.describe('Auth flow', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/plano')
    await expect(page).toHaveURL(/\/login/)
  })

  test('protected route /revisar redirects to login', async ({ page }) => {
    await page.goto('/revisar')
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
    await expect(page).toHaveURL(/\/login/)
    // Error is shown as a query param ?error= rendered by the page
    await expect(page.locator('[class*="destructive"], [class*="error"], .text-red')).toBeVisible({ timeout: 5_000 })
  })

  test('logs in with valid credentials and lands on /plano', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/plano/)
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('persists session across page reload', async ({ page }) => {
    await login(page)
    await page.reload()
    await expect(page).toHaveURL(/\/plano/)
  })

  test('sign out redirects to /login', async ({ page }) => {
    await login(page)
    // Trigger signout via the API route (form POST)
    await page.goto('/api/auth/signout', { waitUntil: 'commit' })
    await page.waitForURL('**/login', { timeout: 5_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
