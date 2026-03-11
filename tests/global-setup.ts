import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

export default async function globalSetup() {
  config({ path: '.env.test' })

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool)

  await db.execute('CREATE EXTENSION IF NOT EXISTS vector')
  await migrate(db, { migrationsFolder: './drizzle' })

  await pool.end()
}
