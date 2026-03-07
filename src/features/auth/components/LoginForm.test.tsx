import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { server } from '#/mocks/node'
import { renderWithRouter } from '#/test/utils'
import { getSession } from '#/features/auth/server'

vi.mock('#/features/auth/server', () => ({
  getSession: vi.fn().mockResolvedValue(null),
  signOut: vi.fn(),
}))

function renderLoginForm() {
  return renderWithRouter({ initialPath: '/login' })
}

describe('LoginForm', () => {
  it('renders email and password fields with a sign in button', async () => {
    renderLoginForm()

    expect(await screen.findByLabelText(/email/i)).toBeVisible()
    expect(screen.getByLabelText(/password/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  it('shows an invalid email error after blurring the email field', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(await screen.findByLabelText(/email/i), 'not-an-email')
    await user.tab()

    const input = screen.getByLabelText(/email/i)
    await screen.findByRole('alert')
    expect(input).toHaveAccessibleErrorMessage(/invalid/i)
  })

  it('shows a password-too-short error after blurring the password field', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(await screen.findByLabelText(/password/i), 'short')
    await user.tab()

    const input = screen.getByLabelText(/password/i)
    await screen.findByRole('alert')
    expect(input).toHaveAccessibleErrorMessage(/at least 8 characters/i)
  })

  it('associates the error message with the input via aria-errormessage', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(await screen.findByLabelText(/email/i), 'bad')
    await user.tab()

    const input = screen.getByLabelText(/email/i)
    await screen.findByRole('alert')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-errormessage', 'email-error')
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'email-error')
  })

  it('navigates to /campaigns after a successful sign in', async () => {
    server.use(
      http.post('/api/auth/sign-in/email', () =>
        HttpResponse.json({
          token: 'tok',
          user: { id: '1', email: 'dm@example.com' },
        }),
      ),
    )
    const user = userEvent.setup()
    const { router } = renderLoginForm()

    // Wait for login form to be visible (initial render complete, initial getSession call done)
    await screen.findByLabelText(/email/i)

    // Set session mock for the /campaigns navigation that happens after sign-in
    vi.mocked(getSession).mockResolvedValueOnce({
      session: {
        id: 'sess-1',
        userId: '1',
        token: 'tok',
        expiresAt: new Date(Date.now() + 60_000),
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: {
        id: '1',
        email: 'dm@example.com',
        name: 'DM',
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as any)

    await user.type(screen.getByLabelText(/email/i), 'dm@example.com')
    await user.type(screen.getByLabelText(/password/i), 'supersecret')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await screen.findByText('Campaigns', { selector: 'main' })
    expect(router.state.location.pathname).toBe('/campaigns')
  })

  it('displays the error message from the server when sign in fails', async () => {
    server.use(
      http.post('/api/auth/sign-in/email', () =>
        HttpResponse.json(
          { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
          { status: 401 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderLoginForm()

    await user.type(await screen.findByLabelText(/email/i), 'dm@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Invalid email or password')).toBeVisible()
  })

  it('stays on the login page when sign in fails', async () => {
    server.use(
      http.post('/api/auth/sign-in/email', () =>
        HttpResponse.json(
          { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
          { status: 401 },
        ),
      ),
    )

    const user = userEvent.setup()
    const { router } = renderLoginForm()

    await user.type(await screen.findByLabelText(/email/i), 'dm@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await screen.findByText('Invalid email or password')
    expect(router.state.location.pathname).toBe('/login')
  })
})
