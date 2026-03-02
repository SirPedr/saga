import { authClient } from '#/features/auth/server/auth-client'
import { Link } from '@tanstack/react-router'

export default function BetterAuthHeader() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="h-8 w-8 animate-pulse bg-(--vellum-3)" />
    )
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="h-8 w-8 border border-(--line)"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center border border-(--chip-line) bg-(--chip-bg)">
            <span className="font-display text-xs font-semibold text-(--amber)">
              {session.user.name.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        )}
        <button
          onClick={() => {
            void authClient.signOut()
          }}
          className="h-8 border border-(--line) bg-(--vellum-3) px-3 text-xs font-semibold text-(--ink-soft) transition hover:border-(--amber) hover:text-(--ink)"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <Link
      to="/login"
      className="inline-flex h-8 items-center border border-(--chip-line) bg-(--chip-bg) px-3 text-xs font-semibold text-(--amber) no-underline transition hover:border-(--amber) hover:text-(--amber-deep)"
    >
      Sign in
    </Link>
  )
}
