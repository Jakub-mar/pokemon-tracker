'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearAuthUser, readAuthUser } from '@/lib/auth-session';
import type { AppUser } from '@/types/user';

export function SiteHeader() {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    setUser(readAuthUser());
  }, []);

  function handleLogout() {
    clearAuthUser();
    setUser(null);
    window.location.href = '/';
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚡</span>
        <h1 className="text-xl font-bold tracking-wider text-yellow-400">PokéTracker</h1>
      </div>

      <nav className="flex items-center gap-4" aria-label="Hlavní navigace">
        <Link href="/" className="text-sm text-slate-300 transition hover:text-white">
          Katalog
        </Link>
        <Link href="/" className="text-sm text-slate-300 transition hover:text-white">
          Moje sbírka
        </Link>
        <Link href="/" className="text-sm text-slate-300 transition hover:text-white">
          Skenování AI
        </Link>

        {user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-yellow-500 hover:text-yellow-300"
            >
              {user.displayName}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500 hover:text-white"
            >
              Odhlásit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-yellow-500 hover:text-yellow-300"
            >
              Přihlášení
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-yellow-500/60 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-300 transition hover:bg-yellow-500 hover:text-slate-950"
            >
              Registrace
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
