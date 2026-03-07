import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db } from './client'
import { seed } from './seed'

export async function runMigrations() {
  // Enable pgvector before any Mastra PgVector initialization
  await db.execute('CREATE EXTENSION IF NOT EXISTS vector')
  await migrate(db, { migrationsFolder: './drizzle' })
  await seed()
}

// Run when executed directly as a script
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log('Migrations complete')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Migration failed:', err)
      process.exit(1)
    })
}
