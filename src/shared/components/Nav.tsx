import { Link, useRouter } from '@tanstack/react-router'
import { authClient } from '#/features/auth/server/auth-client'
import { signOut } from '#/features/auth/server'

export function Nav() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  const handleSignOut = async () => {
    await signOut()
    await router.navigate({ to: '/login' })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-(--line) bg-(--header-bg) px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2 border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5 text-sm text-(--ink) no-underline shadow-[0_6px_20px_rgba(10,8,5,0.08)] sm:px-4 sm:py-2"
          >
            <span className="h-2 w-2 bg-[linear-gradient(135deg,var(--amber),var(--amber-deep))]" />
            Saga
          </Link>
        </h2>

        <div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-nowrap sm:pb-0">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Home
          </Link>
          <Link
            to="/campaigns"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Campaigns
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isPending && (
            <div className="h-8 w-8 animate-pulse bg-(--vellum-3)" />
          )}
          {!isPending && session?.user && (
            <>
              <span className="hidden text-xs text-(--ink-soft) sm:block">
                {session.user.email}
              </span>
              <button
                onClick={() => void handleSignOut()}
                className="h-8 border border-(--line) bg-(--vellum-3) px-3 text-xs font-semibold text-(--ink-soft) transition hover:border-(--amber) hover:text-(--ink)"
              >
                Sign out
              </button>
            </>
          )}
          {!isPending && !session?.user && (
            <Link
              to="/login"
              className="inline-flex h-8 items-center border border-(--chip-line) bg-(--chip-bg) px-3 text-xs font-semibold text-(--amber) no-underline transition hover:border-(--amber) hover:text-(--amber-deep)"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
