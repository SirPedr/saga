import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <section
      aria-labelledby="home-heading"
      className="page-wrap px-4 pb-8 pt-14"
    >
      {/* Hero */}
      <section className="island-shell rise-in relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 bg-[radial-gradient(circle,var(--hero-a),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 bg-[radial-gradient(circle,var(--hero-b),transparent_66%)]" />
        <p className="island-kicker mb-3">Campaign planning, reimagined</p>
        <h1
          id="home-heading"
          className="display-title mb-5 max-w-3xl text-4xl font-bold leading-[1.02] tracking-tight text-(--silver) sm:text-6xl"
        >
          Your world. Every thread, remembered.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-(--silver-soft) sm:text-lg">
          Saga is an AI-first sanctum for dungeon masters. Track NPCs,
          factions, and sessions — let the AI surface connections you've
          forgotten, propose world changes, and plan your next session with you.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/campaigns"
            className="border border-(--cta-crimson-border) bg-(--cta-crimson-bg) px-5 py-2.5 text-sm font-semibold text-(--crimson) no-underline transition hover:-translate-y-0.5 hover:bg-(--cta-crimson-bg-hover)"
          >
            Open Campaigns
          </a>
          <a
            href="/login"
            className="border border-(--line) bg-(--cta-ghost-bg) px-5 py-2.5 text-sm font-semibold text-(--silver-soft) no-underline transition hover:-translate-y-0.5 hover:border-(--crimson) hover:text-(--silver)"
          >
            Sign In
          </a>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            'NPC & Faction Tracking',
            'Keep every character, rival, and faction organised with relationships mapped across your world.',
          ],
          [
            'AI-Assisted Planning',
            'Describe your next session and the Planning Agent surfaces relevant lore, NPCs, and unresolved threads.',
          ],
          [
            'Session Analysis',
            'After each session the Analysis Agent proposes world-state changes — you approve before anything is written.',
          ],
          [
            'World Event Log',
            'An append-only record of everything that has changed. AI always sees only the approved canon.',
          ],
        ].map(([title, desc], index) => (
          <article
            key={title}
            className="island-shell feature-card rise-in p-5"
            style={{ animationDelay: `${index * 90 + 80}ms` }}
          >
            <h2 className="mb-2 text-base font-semibold text-(--silver)">
              {title}
            </h2>
            <p className="m-0 text-sm text-(--silver-soft)">{desc}</p>
          </article>
        ))}
      </section>

      {/* Status note */}
      <section className="island-shell mt-8 p-6">
        <p className="island-kicker mb-2">Early Access</p>
        <p className="m-0 text-sm text-(--silver-soft)">
          Saga is in active development. Sign in to start building your first
          campaign, or{' '}
          <a href="/campaigns" className="font-medium">
            explore the demo campaign
          </a>{' '}
          to see the planning tools in action.
        </p>
      </section>
    </section>
  )
}
