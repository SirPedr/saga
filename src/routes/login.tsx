import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '#/features/auth/server/auth-client'
import { LoginForm } from '#/features/auth/components/LoginForm'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
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
