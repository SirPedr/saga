import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import { routeTree } from '#/routeTree.gen'

interface RenderWithRouterOptions extends Omit<RenderOptions, 'wrapper'> {
  initialPath?: string
}

export function renderWithRouter({
  initialPath = '/',
  ...renderOptions
}: RenderWithRouterOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })

  const result = render(<RouterProvider router={router} />, renderOptions)

  return { ...result, router }
}
