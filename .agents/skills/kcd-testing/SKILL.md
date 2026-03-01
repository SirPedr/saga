---
name: kcd-testing
description: >
  Write, review, or plan tests for TypeScript code — unit, integration, component, or e2e — following Kent C.
  Dodds' principles (Vitest, @testing-library/react, TanStack Query/Router/Form, Playwright).

  Trigger this skill for ANY of the following:
  - Writing new tests: "write tests for X", "add test coverage", "TDD this", "test this function/component"
  - Checking behavior: "does X work correctly?", "make sure this behaves correctly", "does this logic work?"
  - After building something: "i just finished X, can you make sure it works"
  - Reviewing existing tests: "review my test file", "are these tests good?", "check my tests"
  - Planning tests: "what should I test?", "what cases should I cover before deploying?", "what should I manually test?"
  - E2E tests: "set up playwright tests", "write e2e tests for the login flow"
  - Implicit requests: "does the redirect logic actually work?", "confirm that X behaves as expected"

  When in doubt, trigger this skill — it's better to consult it and decide testing isn't needed than to miss it.
---

## Core Philosophy

Kent C. Dodds' guiding principle: **test behavior, not implementation**. Users don't care about internal state or private methods — they care about what they can see and do. Write tests that interact with the UI the way a real person would, and assert on what they'd observe.

Key tenets:
- Test what users experience, not how the code is structured
- Prefer integration tests over micro-unit tests
- Avoid mocking unless you're at a real system boundary (network, browser API)
- Never test internal state — only observable outputs

---

## Project Setup

**Stack**: Vitest + jsdom + @testing-library/react

**Required — install if missing:**
```bash
pnpm add -D @testing-library/user-event @testing-library/jest-dom
```

**Vitest config** — confirm `vite.config.ts` has a `test` block, or create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

**Setup file** (`src/test/setup.ts`) — this is where global mocks live, not in individual test files:
```ts
import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

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
```

Browser API mocks like `matchMedia` and `localStorage.clear()` belong in the global setup file — not scattered across individual test files' `beforeEach` blocks. This keeps tests lean and ensures consistent starting state without repetition.

---

## File Placement & Naming

Co-locate test files next to the source file:
```
src/
  components/
    ThemeToggle.tsx
    ThemeToggle.test.tsx   ← here
  lib/
    utils.ts
    utils.test.ts          ← here
```

---

## Query Priority

Always use the most semantic query available — in this exact order:

1. `getByRole` — buttons, headings, inputs, links, checkboxes, etc.
2. `getByLabelText` — form fields associated with a label
3. `getByPlaceholderText` — inputs without a label
4. `getByText` — visible text content
5. `getByDisplayValue` — current value of a form field
6. `getByAltText` — images
7. `getByTitle` — elements with a title attribute
8. `getByTestId` — **last resort only**, when no semantic query fits

Use `screen.*` for all queries — never destructure from `render()`.

**Use the `name` option in `getByRole` to assert text content and accessible name simultaneously.** This is both a query and an assertion — it's more expressive than getting a generic element and then asserting text separately.

```tsx
screen.getByRole('button', { name: /Auto/i })
screen.getByRole('button', { name: 'Theme mode: auto (system). Click to switch to light mode.' })
screen.getByRole('heading', { name: /settings/i })
```

---

## Assertion Hierarchy

Choose the most semantically accurate assertion. The more specific the matcher, the more confidence the test gives:

**For visibility** — prefer `toBeVisible()` over `toBeInTheDocument()`. Being in the document is a weaker guarantee than being visible to the user.
```tsx
expect(screen.getByRole('button', { name: /submit/i })).toBeVisible()
```

**For accessible names** — prefer `toHaveAccessibleName()` over `toHaveAttribute('aria-label', ...)`. Accessible names can come from aria-label, aria-labelledby, or visible text — `toHaveAccessibleName()` captures all of them correctly.
```tsx
expect(button).toHaveAccessibleName('Theme mode: auto (system). Click to switch to light mode.')
```

Use `toHaveAttribute('aria-label', ...)` only when you specifically need to assert on the raw HTML attribute rather than the computed accessible name.

**For form fields** — `toHaveValue()`, `toBeChecked()`, `toBeDisabled()` are more specific than text-content assertions.

---

## userEvent Over fireEvent

Always use `userEvent` — it simulates real browser events including focus, blur, keyboard events, and pointer interactions. `fireEvent` dispatches synthetic events and misses most of what a browser actually does.

```ts
import userEvent from '@testing-library/user-event'

const user = userEvent.setup()
await user.click(screen.getByRole('button', { name: /submit/i }))
await user.type(screen.getByLabelText(/email/i), 'test@example.com')
await user.selectOptions(screen.getByRole('combobox'), 'option-value')
```

Always call `userEvent.setup()` once per test (not inside beforeEach), and `await` every interaction.

---

## it.each() for Repetitive Test Cases

When multiple tests share the same structure and only differ in input/output values, use `it.each()` instead of repeating the same `it()` block. This keeps tests DRY without sacrificing readability.

```ts
it.each([
  ['false', false],
  ['undefined', undefined],
  ['null', null],
])('ignores %s values', (_label, falsy) => {
  expect(cn('foo', falsy, 'bar')).toBe('foo bar')
})

it.each([
  ['p-4', 'p-6', 'p-6'],
  ['text-red-500', 'text-blue-700', 'text-blue-700'],
  ['m-2', 'm-8', 'm-8'],
])('resolves conflicting %s and %s by keeping the last', (a, b, expected) => {
  expect(cn(a, b)).toBe(expected)
})
```

Use `it.each()` when 3 or more tests have the same shape. For just 2 tests, repeating is fine.

---

## Provider Wrappers

Components that use TanStack Query, Router, or Form need their providers. Create a shared render helper per test file (or in `src/test/utils.tsx` if reused widely):

**TanStack Query:**
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}
```

**TanStack Router** (for components that call `useNavigate`, `useParams`, etc.):
```tsx
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from '#/routeTree.gen'

function renderWithRouter(ui: React.ReactElement, { initialPath = '/' } = {}) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
  return render(<RouterProvider router={router} />)
}
```

Compose them when a component needs both.

---

## Patterns by Code Type

### Utility Functions

Pure logic — no providers needed. Use `it.each()` for value-driven tests:

```ts
import { describe, it, expect } from 'vitest'
import { cn } from '#/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it.each([
    ['false', false],
    ['undefined', undefined],
    ['null', null],
  ])('ignores %s values', (_label, falsy) => {
    expect(cn('foo', falsy, 'bar')).toBe('foo bar')
  })

  it.each([
    ['p-4', 'p-6', 'p-6'],
    ['text-red-500', 'text-blue-700', 'text-blue-700'],
  ])('resolves conflicting %s vs %s, keeping the last', (a, b, expected) => {
    expect(cn(a, b)).toBe(expected)
  })
})
```

### React Components

Render → interact → assert. Use the `name` option in `getByRole` to target elements precisely. Prefer `toBeVisible()` and `toHaveAccessibleName()` over weaker alternatives:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import ThemeToggle from '#/components/ThemeToggle'

describe('ThemeToggle', () => {
  it('shows auto mode by default', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /theme mode: auto/i })).toBeVisible()
  })

  it('cycles through modes on click', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: /theme mode: auto/i }))
    expect(screen.getByRole('button', { name: /theme mode: light/i })).toBeVisible()

    await user.click(screen.getByRole('button', { name: /theme mode: light/i }))
    expect(screen.getByRole('button', { name: /theme mode: dark/i })).toBeVisible()

    await user.click(screen.getByRole('button', { name: /theme mode: dark/i }))
    expect(screen.getByRole('button', { name: /theme mode: auto/i })).toBeVisible()
  })
})
```

### Forms (TanStack Form + Zod)

Test submission, validation errors, and field interactions — not the form's internal field state:

```tsx
it('shows validation error when email is empty', async () => {
  const user = userEvent.setup()
  renderWithQuery(<MyForm />)

  await user.click(screen.getByRole('button', { name: /submit/i }))

  expect(await screen.findByText(/email is required/i)).toBeVisible()
})
```

### Data-Fetching Components (TanStack Query)

Mock at the network level with `vi.fn()` on the query function, or use `msw` for full integration:

```tsx
import { vi } from 'vitest'

vi.mock('#/lib/api', () => ({
  fetchUser: vi.fn().mockResolvedValue({ name: 'Alice', email: 'alice@example.com' }),
}))

it('displays user data after loading', async () => {
  renderWithQuery(<UserProfile userId="1" />)

  expect(screen.getByText(/loading/i)).toBeVisible()
  expect(await screen.findByText('Alice')).toBeVisible()
})
```

---

## What Not to Do

- No `wrapper.state()`, no `instance()`, no internal state assertions
- No `fireEvent` — always `userEvent`
- No `getByTestId` unless there's truly no semantic alternative
- No shallow rendering
- No `toBeInTheDocument()` — use `toBeVisible()` instead
- No `toHaveAttribute('aria-label', ...)` when `toHaveAccessibleName()` or `getByRole({ name })` applies
- No `toHaveTextContent()` when the `name` option in `getByRole` achieves the same thing
- No per-test `beforeEach` for browser API mocks (localStorage, matchMedia) — put these in `src/test/setup.ts`
- No comments in test files

---

## Output Requirements

- Co-locate test files with source (same directory)
- No comments anywhere in the output
- `describe` blocks named after the module/component
- `it` descriptions read as plain sentences from the user's perspective
- All `userEvent` calls awaited
- Use `it.each()` when 3+ tests share identical structure
- Cover: happy path, error states, edge cases, and accessibility where relevant
