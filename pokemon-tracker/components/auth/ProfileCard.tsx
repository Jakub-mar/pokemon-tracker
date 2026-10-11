'use client';

import { clearAuthUser, readAuthUser } from '@/lib/auth-session';
import { useEffect, useState } from 'react';
import type { AppUser } from '@/types/user';

export function ProfileCard() {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    setUser(readAuthUser());
  }, []);

  if (!user) {
    return null;
  }

  function handleLogout() {
    clearAuthUser();
    setUser(null);
    window.location.href = '/';
  }

  return (
    <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-yellow-500">Můj profil</p>
          <h2 className="mt-3 text-3xl font-bold text-white">{user.displayName}</h2>
          <p className="mt-1 text-sm text-slate-400">{user.email}</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-500 hover:text-rose-300"
        >
          Odhlásit se
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Role</p>
          <p className="mt-2 text-xl font-semibold text-white">{user.role === 'admin' ? 'Admin' : 'Uživatel'}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tarif</p>
          <p className="mt-2 text-xl font-semibold text-white">{user.plan}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sbírka</p>
          <p className="mt-2 text-xl font-semibold text-white">{user.cardsOwned} kart</p>
        </div>
      </div>
    </section>
  );
}
