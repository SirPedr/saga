import '@testing-library/jest-dom'
import { vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from '#/mocks/node'

// The devtools components throw "Devtools is not mounted" in jsdom because they
// require a browser devtools panel host. Render nothing instead.
vi.mock('@tanstack/react-devtools', () => ({
  TanStackDevtools: () => null,
}))
vi.mock('@tanstack/react-router-devtools', () => ({
  TanStackRouterDevtoolsPanel: () => null,
}))
vi.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtoolsPanel: () => null,
}))

// The api/auth/$ route imports the server-side auth instance, which imports the
// Drizzle client, which throws if DATABASE_URL is not set. Mock it so the route
// tree can load in jsdom without a real database connection.
vi.mock('#/features/auth/server/auth', () => ({
  auth: {
    handler: vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    api: {
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}))

// better-auth loads React via Node module resolution (external to Vite), so its
// React binding has a null dispatcher in jsdom. Mock the client to keep useSession
// React-free while preserving signIn.email / getSession as real fetch calls so MSW
// can intercept them.
vi.mock('#/features/auth/server/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
    getSession: async () => {
      const res = await fetch('/api/auth/get-session')
      const data = await res.json()
      return { data }
    },
    signIn: {
      email: async (credentials: unknown) => {
        const res = await fetch('/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        })
        const body = await res.json()
        if (!res.ok) return { error: body, data: null }
        return { data: body, error: null }
      },
    },
    signOut: () => Promise.resolve(),
  },
}))

beforeAll(() => server.listen())
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

beforeEach(() => {
  localStorage.clear()
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})
