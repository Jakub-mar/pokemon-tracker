'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clearAuthUser, useAuthUser } from '@/lib/auth-session';

export function SiteHeader() {
  const user = useAuthUser();
  const [logoutError, setLogoutError] = useState('');
  const router = useRouter();

  async function handleLogout() {
    setLogoutError('');

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Odhlášení se nepodařilo. Zkus to prosím znovu.');
      }

      clearAuthUser();
      router.replace('/');
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Odhlášení se nepodařilo.');
    }
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4 backdrop-blur">
      <Link href="/" aria-label="PokéTracker – domovská stránka" className="flex items-center gap-3">
        <span className="text-2xl">⚡</span>
        <span className="text-xl font-bold tracking-wider text-yellow-400">PokéTracker</span>
      </Link>

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
            {user.role === 'admin' && (
              <Link
                href="/admin"
                className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-300 transition hover:bg-yellow-500 hover:text-slate-950"
              >
                Admin
              </Link>
            )}
            <Link
              href="/account"
              className="rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-yellow-500 hover:text-yellow-300"
            >
              Moje konto
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
      {logoutError && (
        <p className="absolute right-6 top-full mt-2 rounded-lg bg-slate-950 px-3 py-2 text-sm text-rose-400" role="status">
          {logoutError}
        </p>
      )}
    </header>
  );
}
