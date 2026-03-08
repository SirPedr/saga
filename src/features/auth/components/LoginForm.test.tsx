import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { server } from '#/mocks/node'
import { renderWithRouter } from '#/test/utils'
import { createSessionResponse } from '#/test/factories'
import * as authServer from '#/features/auth/server'

function renderLoginForm() {
  return renderWithRouter({ initialPath: '/login' })
}

describe('LoginForm', () => {
  it('should render email and password fields when the page loads', async () => {
    renderLoginForm()

    expect(await screen.findByLabelText(/email/i)).toBeVisible()
    expect(screen.getByLabelText(/password/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  it('should show an invalid email error when the email field is blurred with a bad value', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(await screen.findByLabelText(/email/i), 'not-an-email')
    await user.tab()

    const input = screen.getByLabelText(/email/i)
    await screen.findByRole('alert')
    expect(input).toHaveAccessibleErrorMessage(/invalid/i)
  })

  it('should show a password-too-short error when the password field is blurred with fewer than 8 characters', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(await screen.findByLabelText(/password/i), 'short')
    await user.tab()

    const input = screen.getByLabelText(/password/i)
    await screen.findByRole('alert')
    expect(input).toHaveAccessibleErrorMessage(/at least 8 characters/i)
  })

  it('should associate the error message with the input via aria-errormessage when email is invalid', async () => {
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

  it('should navigate to /campaigns when sign in succeeds', async () => {
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

    await screen.findByLabelText(/email/i)

    vi.spyOn(authServer, 'getSession').mockResolvedValueOnce(
      createSessionResponse(
        { userId: '1', token: 'tok' },
        { id: '1', email: 'dm@example.com' },
      ) as any,
    )

    await user.type(screen.getByLabelText(/email/i), 'dm@example.com')
    await user.type(screen.getByLabelText(/password/i), 'supersecret')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await screen.findByRole('heading', { name: /campaigns/i, level: 1 })
    expect(router.state.location.pathname).toBe('/campaigns')
  })

  it('should display the server error message when sign in fails', async () => {
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

  it('should stay on the login page when sign in fails', async () => {
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
