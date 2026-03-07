import { config } from 'dotenv'

import { db } from './client'
import { systems } from '#/features/campaigns/db/schema'

config({ path: ['.env.local', '.env'] })

const DEFAULT_SYSTEMS = [
  { name: 'D&D 5e', slug: 'dnd5e' },
  { name: 'Call of Cthulhu 7e', slug: 'coc7e' },
  { name: 'Pathfinder 2e', slug: 'pf2e' },
  { name: 'Shadowrun 6e', slug: 'sr6e' },
]

export async function seed() {
  await db.insert(systems).values(DEFAULT_SYSTEMS).onConflictDoNothing()
  console.log('Seed complete')
}

// Run when executed directly as a script
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
