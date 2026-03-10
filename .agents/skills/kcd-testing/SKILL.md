---
name: kcd-testing
description: >
  Write, review, or plan integration and E2E tests for this project using Playwright and a real PostgreSQL
  database. No mocks, no Vitest, no jsdom — full-stack tests only, seeding the DB with the data each test needs.

  Trigger this skill for ANY of the following:
  - Writing new tests: "write tests for X", "add test coverage", "TDD this", "test this flow"
  - Checking behavior: "does X work correctly?", "make sure this behaves correctly", "does this logic work?"
  - After building something: "i just finished X, can you make sure it works"
  - Reviewing existing tests: "review my test file", "are these tests good?", "check my tests"
  - Planning tests: "what should I test?", "what cases should I cover before deploying?", "what should I manually test?"
  - E2E tests: "set up playwright tests", "write e2e tests for the login flow"
  - Browser automation: "test if the page looks right", "check if login redirects correctly", "take a screenshot", "check responsive design", "validate UX", "test this form"
  - Ad-hoc browser tasks: "automate this browser interaction", "check for broken links", "fill out this form and see what happens"
  - Implicit requests: "does the redirect logic actually work?", "confirm that X behaves as expected"

  When in doubt, trigger this skill — it's better to consult it and decide testing isn't needed than to miss it.
---

## Core Philosophy

Kent C. Dodds' guiding principle: **test behavior, not implementation**. Users don't care about internal state or private methods — they care about what they can see and do.

Applied here: every test drives a real browser against a real server backed by a real PostgreSQL database. There are no mocks, no synthetic DOM, no unit-level isolation. Tests interact with the app the way a real person would and assert on what they observe in the UI.

Key tenets:

- Test what users experience, not how the code is structured
- Avoid mocking — use real infrastructure instead
- Each test owns its data: seed exactly what's needed, nothing more
- Never assert on internal state — only what the user can see

---

## Stack

| Concern | Tool |
|---|---|
| Test runner | Playwright (`@playwright/test`) |
| Browser | Chromium (headless in CI, visible locally) |
| Database | Real PostgreSQL — same schema as production, cleared between tests |
| DB access in tests | Drizzle ORM (direct queries for seeding and teardown) |
| Ad-hoc automation | playwright-skill runner (scripts to `/tmp`) |

There is no Vitest, no jsdom, no `@testing-library/react`, no `userEvent`. Everything comes from Playwright's API.

---

## Project Setup

**Check for an existing `playwright.config.ts`** first — if it exists, confirm it's wired to a test database. If not, install Playwright:

```bash
pnpm add -D @playwright/test
npx playwright install chromium
```

**`playwright.config.ts`** — configure a test database URL via env, and use `globalSetup` to run migrations on each full run:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,          // avoid DB conflicts; enable per-worker isolation if needed
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: !!process.env.CI,
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  globalSetup: './tests/global-setup.ts',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

**`tests/global-setup.ts`** — runs once before the entire suite:

```ts
import { execSync } from 'child_process'

export default async function globalSetup() {
  // Apply migrations to the test database
  execSync('pnpm db:migrate', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'inherit',
  })
}
```

**`.env.test`** — point to a separate PostgreSQL instance for tests:

```
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/saga_test
```

Start a test Postgres instance alongside the dev one (different port):

```bash
docker run -d \
  --name saga-test-db \
  -e POSTGRES_DB=saga_test \
  -e POSTGRES_PASSWORD=postgres \
  -p 5433:5432 \
  pgvector/pgvector:pg16
```

---

## File Placement & Naming

```
tests/
  helpers/
    db.ts          ← shared DB seeding and teardown utilities
    auth.ts        ← shared login helpers
  auth/
    login.spec.ts
    signup.spec.ts
  campaigns/
    campaign-crud.spec.ts
    campaign-detail.spec.ts
  sessions/
    session-planning.spec.ts
```

Keep spec files organized by feature domain, mirroring `src/features/`.

---

## Database Strategy

Each test is responsible for the data it needs. This keeps tests independent and avoids order-dependency.

**Shared DB helper** (`tests/helpers/db.ts`):

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as campaignSchema from '#/features/campaigns/db/schema'
import * as sessionSchema from '#/features/sessions/db/schema'

const client = postgres(process.env.TEST_DATABASE_URL!)
export const testDb = drizzle(client, { schema: { ...campaignSchema, ...sessionSchema } })

export async function clearDatabase() {
  // Delete in reverse dependency order
  await testDb.delete(sessionSchema.sessions)
  await testDb.delete(campaignSchema.campaigns)
  // ... other tables
}

export async function seedCampaign(overrides?: Partial<typeof campaignSchema.campaigns.$inferInsert>) {
  const [campaign] = await testDb.insert(campaignSchema.campaigns).values({
    name: 'Test Campaign',
    system: 'D&D 5e',
    ...overrides,
  }).returning()
  return campaign
}
```

**Pattern in each spec file:**

```ts
import { test, expect } from '@playwright/test'
import { clearDatabase, seedCampaign } from '../helpers/db'

test.beforeEach(async () => {
  await clearDatabase()
})

test('shows campaign in the list', async ({ page }) => {
  const campaign = await seedCampaign({ name: 'The Forgotten Realm' })

  await page.goto('/campaigns')

  await expect(page.getByRole('heading', { name: 'The Forgotten Realm' })).toBeVisible()
})
```

Feed the DB the exact data the test needs — no shared fixtures, no global seed state.

---

## Semantic Locators

Always use the most semantic locator available. Tests should read like a description of what a user does — not like DOM queries.

**Priority order** (use the highest that applies):

1. `getByRole` — buttons, headings, inputs, links, checkboxes
2. `getByLabel` — form fields with an associated label
3. `getByPlaceholder` — inputs without a visible label
4. `getByText` — visible text content
5. `getByAltText` — images
6. `getByTitle` — elements with a title attribute
7. `getByTestId` — **last resort only**

**Good:**

```ts
await page.getByRole('button', { name: /create campaign/i }).click()
await page.getByLabel('Campaign name').fill('The Forgotten Realm')
await page.getByRole('combobox', { name: /system/i }).selectOption('D&D 5e')
```

**Bad — never write this:**

```ts
await page.click('button[type="submit"]')
await page.fill('input[name="campaignName"]', 'The Forgotten Realm')
await page.locator('.campaign-card').first().click()
```

CSS selectors test structure. Semantic locators test what the user sees. When the markup changes but the button still says "Create campaign", the semantic test survives; the CSS selector breaks.

The `name` option in `getByRole` is simultaneously a selector and an assertion — targeting the element by its accessible name means you've already verified what it says:

```ts
page.getByRole('button', { name: /sign in/i })         // finds AND verifies label
page.getByRole('heading', { name: /your campaigns/i })  // finds AND verifies heading text
```

---

## Assertions

Playwright assertions are auto-retrying — they poll until passing or timing out. Prefer them over checking synchronous state.

**For visibility** — `toBeVisible()` is the primary assertion. It checks the element exists and is visible to the user:

```ts
await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
await expect(page.getByText(/session saved/i)).toBeVisible()
```

**For URL changes:**

```ts
await expect(page).toHaveURL('/dashboard')
await expect(page).toHaveURL(/\/campaigns\/\d+/)
```

**For form values:**

```ts
await expect(page.getByLabel('Campaign name')).toHaveValue('The Forgotten Realm')
```

**For absence:**

```ts
await expect(page.getByText(/delete campaign/i)).not.toBeVisible()
```

**For page title:**

```ts
await expect(page).toHaveTitle(/campaigns/i)
```

Don't assert on CSS classes, internal component state, or network request payloads. Assert on what the user sees.

---

## Patterns by Flow Type

### Authentication Flows

```ts
import { test, expect } from '@playwright/test'
import { clearDatabase, seedUser } from '../helpers/db'

test.beforeEach(async () => {
  await clearDatabase()
})

test('redirects to dashboard after login', async ({ page }) => {
  await seedUser({ email: 'dm@saga.app', password: 'password123' })

  await page.goto('/login')
  await page.getByLabel('Email').fill('dm@saga.app')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByRole('heading', { name: /your campaigns/i })).toBeVisible()
})

test('shows error on invalid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('nobody@example.com')
  await page.getByLabel('Password').fill('wrong')
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page.getByText(/invalid credentials/i)).toBeVisible()
  await expect(page).toHaveURL('/login')
})
```

**Shared login helper** (`tests/helpers/auth.ts`) — reuse across specs that need an authenticated session:

```ts
import { Page } from '@playwright/test'

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/dashboard')
}
```

### CRUD Flows

```ts
test('creates a campaign and shows it in the list', async ({ page }) => {
  await loginAs(page, 'dm@saga.app', 'password123')

  await page.goto('/campaigns')
  await page.getByRole('button', { name: /new campaign/i }).click()

  await page.getByLabel('Campaign name').fill('The Forgotten Realm')
  await page.getByRole('combobox', { name: /system/i }).selectOption('D&D 5e')
  await page.getByRole('button', { name: /create/i }).click()

  await expect(page.getByRole('heading', { name: 'The Forgotten Realm' })).toBeVisible()
})

test('deletes a campaign after confirmation', async ({ page }) => {
  const campaign = await seedCampaign({ name: 'Disposable Campaign' })
  await loginAs(page, 'dm@saga.app', 'password123')

  await page.goto(`/campaigns/${campaign.id}`)
  await page.getByRole('button', { name: /delete/i }).click()

  // Confirm dialog
  await page.getByRole('button', { name: /confirm delete/i }).click()

  await expect(page).toHaveURL('/campaigns')
  await expect(page.getByText('Disposable Campaign')).not.toBeVisible()
})
```

### Form Validation

```ts
test('shows validation errors when required fields are empty', async ({ page }) => {
  await loginAs(page, 'dm@saga.app', 'password123')
  await page.goto('/campaigns/new')

  await page.getByRole('button', { name: /create/i }).click()

  await expect(page.getByText(/name is required/i)).toBeVisible()
})
```

### Responsive Design

```ts
test('navigation collapses on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')

  await expect(page.getByRole('navigation')).not.toBeVisible()
  await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()
})
```

---

## Ad-hoc Browser Automation

For quick exploration, screenshots, UX checks, and tasks that don't belong in a formal spec file, use the playwright-skill runner. Scripts go to `/tmp` — no project clutter, auto-cleaned by the OS.

**CRITICAL WORKFLOW — follow in order:**

### Step 1: Detect running dev servers

```bash
SKILL_DIR=$(find ~/.claude/plugins/cache/playwright-skill -name "run.js" | head -1 | xargs dirname)
cd $SKILL_DIR && node -e "require('./lib/helpers').detectDevServers().then(s => console.log(JSON.stringify(s)))"
```

- **1 server found** → use it automatically, inform the user
- **Multiple servers** → ask which one
- **None found** → ask for URL or offer to start the dev server

### Step 2: Write the script to /tmp

Apply the same KCD principles here — use semantic locators, assert on what users observe:

```javascript
// /tmp/playwright-test-login.js
const { chromium } = require('playwright')
const helpers = require('./lib/helpers')

const TARGET_URL = 'http://localhost:3000'

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const context = await helpers.createContext(browser)
  const page = await context.newPage()

  await page.goto(`${TARGET_URL}/login`)

  await page.getByLabel('Email').fill('user@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /sign in/i }).click()

  await page.waitForURL('**/dashboard')
  console.log('✅ Login successful — redirected to dashboard')

  await browser.close()
})()
```

### Step 3: Execute

```bash
cd $SKILL_DIR && node run.js /tmp/playwright-test-login.js
```

### Common Ad-hoc Patterns

**Screenshot:**

```javascript
// /tmp/playwright-test-screenshot.js
const { chromium } = require('playwright')

const TARGET_URL = 'http://localhost:3000'

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 10000 })
    await page.screenshot({ path: '/tmp/screenshot.png', fullPage: true })
    console.log('📸 Screenshot saved to /tmp/screenshot.png')
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await browser.close()
  }
})()
```

**Responsive check:**

```javascript
// /tmp/playwright-test-responsive.js
const { chromium } = require('playwright')

const TARGET_URL = 'http://localhost:3000'

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  for (const viewport of [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto(TARGET_URL)
    await page.screenshot({ path: `/tmp/${viewport.name.toLowerCase()}.png`, fullPage: true })
    console.log(`✅ ${viewport.name} screenshot saved`)
  }

  await browser.close()
})()
```

**Broken link check:**

```javascript
// /tmp/playwright-test-links.js
const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  await page.goto('http://localhost:3000')

  const links = await page.locator('a[href^="http"]').all()
  const broken = []

  for (const link of links) {
    const href = await link.getAttribute('href')
    try {
      const response = await page.request.head(href)
      if (!response.ok()) broken.push({ url: href, status: response.status() })
    } catch (e) {
      broken.push({ url: href, error: e.message })
    }
  }

  console.log(`✅ Working: ${links.length - broken.length}`)
  console.log(`❌ Broken:`, broken)
  await browser.close()
})()
```

### Inline Execution (Quick One-offs)

```bash
cd $SKILL_DIR && node run.js "
const browser = await chromium.launch({ headless: false })
const page = await browser.newPage()
await page.goto('http://localhost:3000')
await page.screenshot({ path: '/tmp/quick-screenshot.png', fullPage: true })
console.log('Screenshot saved')
await browser.close()
"
```

### Setup (First Time)

```bash
cd $SKILL_DIR && npm run setup
```

Installs Playwright and Chromium for the skill runner. Only needed once.

### Available Helpers

```javascript
const helpers = require('./lib/helpers')

const servers = await helpers.detectDevServers()          // Detect running dev servers
await helpers.safeClick(page, locator, { retries: 3 })   // Click with retry
await helpers.safeType(page, locator, 'text')             // Type with clear
await helpers.takeScreenshot(page, 'label')               // Timestamped screenshot
await helpers.handleCookieBanner(page)                    // Dismiss cookie banners
const data = await helpers.extractTableData(page, 'table') // Table → JS object
const context = await helpers.createContext(browser)      // Context with custom headers
```

### Custom HTTP Headers

```bash
PW_HEADER_NAME=X-Automated-By PW_HEADER_VALUE=playwright \
  cd $SKILL_DIR && node run.js /tmp/my-script.js

PW_EXTRA_HEADERS='{"X-Automated-By":"playwright","X-Debug":"true"}' \
  cd $SKILL_DIR && node run.js /tmp/my-script.js
```

### Tips

- **Detect servers FIRST** — run `detectDevServers()` before writing test code for localhost
- **Write to `/tmp`** — never to the project or skill directory
- **Parameterize URLs** — `TARGET_URL` constant at the top of every script
- **Visible browser by default** — `headless: false` unless user explicitly asks otherwise
- **Wait strategies** — `waitForURL`, `waitForSelector`, `waitForLoadState` over fixed timeouts
- **SlowMo** — use `slowMo: 100` when you want actions visible and easy to follow

---

## What Not to Do

- No Vitest, no jsdom, no `@testing-library/react`, no `userEvent` — Playwright only
- No CSS selectors in tests — always `getByRole`, `getByLabel`, `getByText`, etc.
- No network mocks — use a real database seeded with exactly what the test needs
- No shared global seed state — each test seeds its own data in `beforeEach`
- No assertions on internal state, CSS classes, or DOM structure
- No `getByTestId` unless there is truly no semantic alternative
- No comments in test files

---

## Output Requirements

- Spec files go in `tests/`, organized by feature domain
- Shared helpers go in `tests/helpers/`
- No comments anywhere in the output
- `test.describe` blocks named after the feature or flow
- `test` descriptions read as plain sentences from the user's perspective
- All locators use Playwright's semantic API (`getByRole`, `getByLabel`, etc.)
- Every test seeds its own data and calls `clearDatabase()` in `beforeEach`
- Cover: happy path, error states, edge cases, and accessibility where relevant
