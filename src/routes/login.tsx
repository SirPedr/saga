import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginForm } from '#/features/auth/components/LoginForm'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.session) {
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
