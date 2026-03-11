import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import {
  user,
  session,
  account,
  verification,
} from '../../src/features/auth/db/schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

const BASE_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3001'

/** Default test user credentials */
export const TEST_USER = {
  name: 'Test User',
  email: 'test@saga.dev',
  password: 'password123',
}

/**
 * Create a user via Better Auth's signup API.
 * The test server must be running when this is called.
 */
export async function createTestUser(
  overrides?: Partial<{ name: string; email: string; password: string }>
) {
  const userData = { ...TEST_USER, ...overrides }

  const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE_URL,
    },
    body: JSON.stringify(userData),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to create test user: ${response.status} ${body}`)
  }

  return response.json()
}

/**
 * Delete all auth data from the test database.
 * Respects FK constraints: session & account reference user.
 */
export async function cleanAuth() {
  await db.delete(session)
  await db.delete(account)
  await db.delete(verification)
  await db.delete(user)
}
