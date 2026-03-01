import { createMiddleware, createStart } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { auth } from '#/features/auth/server/auth'

// Paths that do not require authentication
const PUBLIC_PREFIXES = ['/login', '/api/auth']

const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const { pathname } = new URL(request.url)
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!isPublic) {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      throw redirect({ to: '/login' })
    }
  }

  return next()
})

export const startInstance = createStart(() => ({
  requestMiddleware: [authMiddleware],
}))
