import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '#/features/auth/server'
import { LoginForm } from '#/features/auth/components/LoginForm'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getSession()
    if (session) {
      throw redirect({ to: '/campaigns' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <LoginForm />
    </main>
  )
}
