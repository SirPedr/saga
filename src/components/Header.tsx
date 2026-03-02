import { Link } from '@tanstack/react-router'
import BetterAuthHeader from '../integrations/better-auth/header-user.tsx'

export default function Header() {
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

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <BetterAuthHeader />
        </div>
      </nav>
    </header>
  )
}
