'use client';

import { useEffect, useState } from 'react';
import { AdminUsersPanel } from '@/components/auth/AdminUsersPanel';
import { LoginForm } from '@/components/auth/LoginForm';
import { UserPanel } from '@/components/auth/UserPanel';
import { readAuthUser } from '@/lib/auth-session';
import { demoUser } from '@/lib/auth';
import type { AppUser } from '@/types/user';

export default function LoginPage() {
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);

  useEffect(() => {
    setActiveUser(readAuthUser());
  }, []);

  function handleAuthSuccess(user: AppUser) {
    setActiveUser(user);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-yellow-500">PokéTracker</p>
          <h1 className="mt-3 text-4xl font-bold text-white">
            {activeUser?.role === 'admin' ? 'Správa uživatelů' : 'Přihlášení'}
          </h1>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <LoginForm onAuthSuccess={handleAuthSuccess} />
          {activeUser?.role === 'admin' ? (
            <AdminUsersPanel />
          ) : (
            <UserPanel user={activeUser ?? demoUser} />
          )}
        </div>
      </div>
    </main>
  );
}
