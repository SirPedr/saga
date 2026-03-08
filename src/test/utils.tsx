import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import { getContext } from '#/integrations/tanstack-query/root-provider'
import { routeTree } from '#/routeTree.gen'

interface RenderWithRouterOptions extends Omit<RenderOptions, 'wrapper'> {
  initialPath?: string
  queryClient?: QueryClient
}

export function renderWithRouter({
  initialPath = '/',
  queryClient: providedQueryClient,
  ...renderOptions
}: RenderWithRouterOptions = {}) {
  const queryClient = providedQueryClient ?? getContext().queryClient
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })

  const result = render(<RouterProvider router={router} />, renderOptions)

  return { ...result, router }
}
