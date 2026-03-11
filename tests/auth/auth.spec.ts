import { test, expect, type Page } from '@playwright/test'
import { createTestUser, cleanAuth, TEST_USER } from '../helpers/auth'

/**
 * Fill the login form and submit.
 * Waits for client-side hydration by checking that the Nav's auth state
 * has resolved (the "Sign in" link appears only after useSession() runs).
 */
async function login(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password
) {
  await page.goto('/login')
  // The Nav shows a "Sign in" link only after authClient.useSession() resolves
  // (client-side only). This proves React hydration is complete.
  await page.locator('header').getByRole('link', { name: 'Sign in' }).waitFor()

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.describe('Authentication', () => {
  test.beforeEach(async () => {
    await cleanAuth()
  })

  test.afterAll(async () => {
    await cleanAuth()
  })

  test('sign up via API creates account and grants access', async ({
    request,
    page,
  }) => {
    const response = await request.post('/api/auth/sign-up/email', {
      data: {
        name: TEST_USER.name,
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    })

    expect(response.ok()).toBe(true)

    const body = await response.json()
    expect(body.user).toBeDefined()
    expect(body.user.email).toBe(TEST_USER.email)
    expect(body.user.name).toBe(TEST_USER.name)

    // The signup response sets a session cookie on the request context.
    // Use the same context's cookies to verify authenticated access.
    const storageState = await request.storageState()
    await page.context().addCookies(storageState.cookies)

    await page.goto('/campaigns')
    await expect(page).toHaveURL(/\/campaigns/)
  })

  test('login with valid credentials navigates to campaigns', async ({
    page,
  }) => {
    await createTestUser()
    await login(page)

    await expect(page).toHaveURL(/\/campaigns/)
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await createTestUser()
    await login(page, TEST_USER.email, 'wrongpassword99')

    const alert = page.locator('p[role="alert"]').first()
    await expect(alert).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('authenticated user can sign out and is redirected to login', async ({
    page,
  }) => {
    await createTestUser()
    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await page.getByRole('button', { name: 'Sign out' }).click()

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
  })

  test('unauthenticated user is redirected to login from protected route', async ({
    page,
  }) => {
    await page.goto('/campaigns')

    await expect(page).toHaveURL(/\/login/)
  })
})
