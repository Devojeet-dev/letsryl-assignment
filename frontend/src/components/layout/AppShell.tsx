import { NavLink, Outlet } from 'react-router-dom';
import { Database, FilePlus2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/primitives';
import { useAuth } from '@/providers/auth-provider';

const NAV_ITEMS = [
  { to: '/batches', label: 'Batches', icon: Database },
  { to: '/upload', label: 'New batch', icon: FilePlus2 },
];

export function AppShell(): JSX.Element {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-full bg-canvas text-zinc-100">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-edge bg-[#151515] px-4 py-6 lg:flex">
        <div>
          <div className="px-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold tracking-widest text-zinc-100 uppercase">
                BFDP
              </span>
              <span className="rounded border border-brand/30 bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-brand uppercase">
                FINANCIAL
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] tracking-wider text-zinc-400 uppercase">
              BATCH FINANCIAL PROCESSOR
            </p>
          </div>

          <nav className="mt-8 space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'border-l-2 border-brand bg-[#222222] pl-2.5 font-semibold text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:bg-[#1A1A1A] hover:text-zinc-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-4 w-4 transition ${
                        isActive ? 'text-brand' : 'text-zinc-400 group-hover:text-zinc-300'
                      }`}
                      aria-hidden
                    />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="rounded-lg border border-edge bg-[#181818] px-3 py-2.5">
          <p className="truncate font-mono text-xs font-medium text-zinc-300">
            {user?.name ?? user?.email ?? 'Signed in'}
          </p>
          {user?.name ? (
            <p className="truncate font-mono text-[11px] text-zinc-400">{user.email}</p>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-edge bg-[#151515]/60 px-4 py-3 backdrop-blur-sm lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
              BFDP
            </span>
            <span className="rounded border border-brand/30 bg-brand/10 px-1 py-0.5 font-mono text-[9px] font-semibold text-brand">
              CORE
            </span>
          </div>
          <nav className="flex gap-1 lg:hidden">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    isActive
                      ? 'bg-[#222222] text-zinc-100 font-semibold border-b-2 border-brand'
                      : 'text-zinc-400'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden font-mono text-xs text-zinc-400 sm:inline">
              {user?.email}
            </span>
            <Button variant="ghost" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
