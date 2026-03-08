import '@testing-library/jest-dom'
import { vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from '#/mocks/node'
import * as campaignServer from '#/features/campaigns/server/index'

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

// Server functions call getRequest() which requires H3's AsyncLocalStorage —
// that runtime context does not exist in jsdom. Mock them so beforeLoad hooks
// in routes like /login can run without crashing.
vi.mock('#/features/auth/server', () => ({
  getSession: vi.fn().mockResolvedValue(null),
  signOut: vi.fn().mockResolvedValue(undefined),
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

// Replace the TanStack Query singleton provider with a test-friendly version.
// Components call useQueryClient() which reads from QueryClientProvider —
// whichever client wraps the component tree. By mocking the root provider here,
// all components in tests share the same QueryClient that renderWithRouter uses.
vi.mock('#/integrations/tanstack-query/root-provider', async () => {
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
  const React = await import('react')
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  return {
    getContext: () => ({ queryClient }),
    default: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  }
})

// Campaign server functions call getRequest() / auth / DB — none of which exist in
// jsdom. The factory prevents the real module (and its DB client) from loading.
// Return values come from vi.spyOn() defaults in beforeEach below.
vi.mock('#/features/campaigns/server/index', () => ({
  listCampaigns: vi.fn(),
  listSystems: vi.fn(),
  getCampaign: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
}))

beforeAll(() => server.listen())
afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  server.resetHandlers()
  const { getContext } = await import('#/integrations/tanstack-query/root-provider')
  getContext().queryClient.clear()
})
afterAll(() => server.close())

beforeEach(() => {
  localStorage.clear()
  // Re-establish safe defaults after vi.restoreAllMocks() clears them.
  // Individual tests override these with their own vi.spyOn() calls in beforeEach or inline.
  vi.spyOn(campaignServer, 'listCampaigns').mockResolvedValue([])
  vi.spyOn(campaignServer, 'listSystems').mockResolvedValue([])
  vi.spyOn(campaignServer, 'getCampaign').mockResolvedValue(null as any)
  vi.spyOn(campaignServer, 'createCampaign').mockResolvedValue(null as any)
  vi.spyOn(campaignServer, 'updateCampaign').mockResolvedValue(null as any)
  vi.spyOn(campaignServer, 'deleteCampaign').mockResolvedValue(undefined)
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

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

window.HTMLElement.prototype.scrollIntoView = vi.fn()
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()

// Radix UI components check animation-duration to decide whether to wait for
// exit animations before unmounting. Returning "0s" makes them skip the wait,
// preventing tests from hanging on dialog/popover close.
const _getComputedStyle = window.getComputedStyle
window.getComputedStyle = (el, pseudoEl) => {
  const style = _getComputedStyle(el, pseudoEl)
  return new Proxy(style, {
    get(target, prop) {
      if (prop === 'animationDuration' || prop === 'transitionDuration')
        return '0s'
      return typeof target[prop as keyof typeof target] === 'function'
        ? (target[prop as keyof typeof target] as () => unknown).bind(target)
        : target[prop as keyof typeof target]
    },
  })
}
